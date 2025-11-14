import React, { useEffect, useMemo, useRef, useState } from 'react'
import { apiGet, apiPost } from './api.js'
import { getSocket } from './ws.js'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '../context/AuthContext.jsx'

export default function QRGeneratorPanel({ heading = 'Live Attendance QR' }){
  const { user } = useAuth()
  const courseId = user?.advisorFor?.courseId || '21CS701'
  const [sessionId, setSessionId] = useState(null)
  const [qr, setQr] = useState(null)
  const [secondsRemaining, setSecondsRemaining] = useState(null)
  const [stats, setStats] = useState({ present: 0, remaining: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const socket = useMemo(() => getSocket(), [])
  const imgRef = useRef(null)
  const assignedDepartment = user?.advisorFor?.department || user?.department || null
  const assignedYear = user?.advisorFor?.year || user?.year || null

  useEffect(() => {
    if (!sessionId) return
    socket.emit('subscribe', { sessionId })
    const onQR = (payload) => {
      // Prefer server-provided 6-char code; do not fallback to JWT slice to avoid confusion
      setQr({ ...payload, code: payload?.code || null })
    }
    const onCountdown = ({ secondsRemaining }) => setSecondsRemaining(secondsRemaining)
    const onScan = ({ countPresent, countRemaining }) => setStats({ present: countPresent, remaining: countRemaining })
    const onFaceRecognition = ({ countPresent, countRemaining }) => {
      // Update stats when face recognition marks attendance
      setStats({ present: countPresent, remaining: countRemaining })
    }
    const onClosed = () => { setSecondsRemaining(0); setQr(null) }
    socket.on('qr_updated', onQR)
    socket.on('countdown', onCountdown)
    socket.on('scan_confirmed', onScan)
    socket.on('face_recognition_attendance', onFaceRecognition)
    socket.on('session_closed', onClosed)
    return () => {
      socket.emit('unsubscribe', { sessionId })
      socket.off('qr_updated', onQR)
      socket.off('countdown', onCountdown)
      socket.off('scan_confirmed', onScan)
      socket.off('face_recognition_attendance', onFaceRecognition)
      socket.off('session_closed', onClosed)
    }
  }, [sessionId, socket])

  // Backfill code via REST if not present in WS/initial response
  useEffect(() => {
    let cancelled = false
    async function backfill() {
      if (!sessionId) return
      if (qr && qr.code) return
      try {
        const res = await apiGet(`/sessions/${sessionId}/qr`)
        if (cancelled) return
        setQr((prev) => ({ ...(prev || {}), imageDataUrl: prev?.imageDataUrl || res.imageDataUrl, token: prev?.token || res.token, code: res.code || prev?.code || null, expiresAt: prev?.expiresAt || res.expiresAt, jti: prev?.jti || res.jti }))
      } catch {}
    }
    backfill()
    return () => { cancelled = true }
  }, [sessionId, qr?.code])

  // Local countdown ticker driven by expiresAt
  useEffect(() => {
    if (!qr?.expiresAt) return
    const expiryMs = new Date(qr.expiresAt).getTime()
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiryMs - Date.now()) / 1000))
      setSecondsRemaining(remaining)
      if (remaining <= 0) {
        setQr(null)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [qr?.expiresAt])

  const startSession = async () => {
    try {
      setQr(null)
      setSecondsRemaining(null)
      setLoading(true)
      setError('')
      const res = await apiPost('/qr/generate', { 
        courseId,
        sessionDepartment: assignedDepartment,
        sessionYear: assignedYear
      })
      setSessionId(res.sessionId)
      setQr({ imageDataUrl: res.imageDataUrl, token: res.token, code: res.code || null, expiresAt: res.expiresAt, jti: res.jti })
      // Ensure any clipboard/manual use has the fresh token
      try { await navigator.clipboard.writeText(res.token) } catch {}
    } catch (e) {
      console.error('Generate QR error:', e)
      setError(e.message || e.code || 'Failed to generate QR')
    } finally {
      setLoading(false)
    }
  }

  const regenerateQR = async () => {
    try {
      setQr(null)
      setSecondsRemaining(null)
      setLoading(true)
      setError('')
      const res = await apiPost('/qr/generate', { 
        courseId, 
        sessionId,
        sessionDepartment: assignedDepartment,
        sessionYear: assignedYear
      })
      setSessionId(res.sessionId)
      setQr({ imageDataUrl: res.imageDataUrl, token: res.token, code: res.code || null, expiresAt: res.expiresAt, jti: res.jti })
      try { await navigator.clipboard.writeText(res.token) } catch {}
    } catch (e) {
      console.error('Regenerate QR error:', e)
      setError(e.message || e.code || 'Failed to generate QR')
    } finally {
      setLoading(false)
    }
  }
  const closeSession = async () => {
    if (!sessionId) return
    await apiPost(`/sessions/${sessionId}/close`)
  }
  const copySessionId = async () => {
    if (sessionId) await navigator.clipboard.writeText(sessionId)
  }
  const downloadQR = async () => {
    if (!qr?.imageDataUrl) return
    const a = document.createElement('a')
    a.href = qr.imageDataUrl
    a.download = `${sessionId || 'session'}-qr.png`
    a.click()
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">{heading}</div>
        <div className="flex gap-2">
          <button onClick={sessionId ? regenerateQR : startSession} disabled={loading} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">{loading ? 'Generating…' : 'Generate QR (30s)'}</button>
          {sessionId && (
            <button onClick={closeSession} className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Close</button>
          )}
          {sessionId && (
            <button onClick={copySessionId} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Copy ID</button>
          )}
          {qr?.code && (
            <button onClick={() => navigator.clipboard.writeText(qr.code)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Copy Token</button>
          )}
          {qr?.imageDataUrl && (
            <button onClick={downloadQR} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Download QR</button>
          )}
        </div>
      </div>
      {error && <div className="mb-3 text-sm text-red-700 dark:text-red-400">{String(error)}</div>}
      {sessionId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col items-center">
            {qr?.imageDataUrl ? (
              <img key={qr?.jti || 'qr'} ref={imgRef} src={qr.imageDataUrl} alt="QR" className="w-64 h-64 object-contain border rounded-lg" />
            ) : qr?.token ? (
              <div className="w-64 h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center">
                <QRCodeCanvas value={qr.token} size={224} includeMargin={false} />
              </div>
            ) : (
              <div className="w-64 h-64 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400">Waiting for QR...</div>
            )}
            <div className="mt-3 countdown text-gray-700 dark:text-gray-300">{secondsRemaining !== null ? `${secondsRemaining}s remaining` : 'Connecting...'}</div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">Token: <span className="font-mono text-lg tracking-widest text-gray-900 dark:text-white">{qr?.code || '—'}</span></div>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-gray-500 dark:text-gray-400">Session</div>
            <div className="font-mono text-gray-800 dark:text-gray-200 break-all">{sessionId}</div>
            {qr?.code && (
              <div className="mt-2 text-sm"><span className="text-gray-500 dark:text-gray-400 mr-2">Token:</span><span className="font-mono text-xl tracking-widest text-gray-900 dark:text-white">{qr.code}</span></div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">Present: {stats.present}</div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg">Remaining: {stats.remaining}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-600 dark:text-gray-400">Choose a course and click Start to generate a QR valid for 30 seconds.</div>
      )}
    </div>
  )
}


