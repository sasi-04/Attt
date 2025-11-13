import React, { useCallback, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import StudentQrScanner from '../../components/StudentQrScanner.jsx'
import AutoFullScreenQrScanner from '../../components/AutoFullScreenQrScanner.jsx'
import FaceRecognitionCamera from '../../components/FaceRecognitionCamera.jsx'
import { apiPost, apiGet } from '../../components/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function StudentScanAttendance(){
  const { user } = useAuth()
  const [scanState, setScanState] = useState({ status: 'idle', message: '' })
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const mode = searchParams.get('mode') || 'both' // 'scanner', 'manual', 'face', or 'both'
  const [showFullScreenScanner, setShowFullScreenScanner] = useState(false)
  const [showFaceRecognition, setShowFaceRecognition] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [faceServiceStatus, setFaceServiceStatus] = useState(null)
  const inputRef = useRef(null)

  const handleModeChange = (newMode) => {
    console.log('Changing mode to:', newMode)
    if (newMode === 'scanner') {
      // Directly open full screen scanner instead of navigating
      setShowFullScreenScanner(true)
    } else if (newMode === 'face') {
      // Check face recognition service and start face recognition
      checkFaceServiceAndStart()
    } else {
      navigate(`/student/attendance?mode=${newMode}`, { replace: true })
    }
  }

  const checkFaceServiceAndStart = async () => {
    try {
      setScanState({ status: 'validating', message: 'Checking face recognition service...' })
      
      // Check if face recognition service is available
      const serviceStatus = await apiGet('/face-recognition/status')
      setFaceServiceStatus(serviceStatus)
      
      if (!serviceStatus.service_available) {
        setScanState({ 
          status: 'error', 
          message: 'Face recognition service is not available. Please try QR code or manual entry.' 
        })
        return
      }
      
      // For demo purposes, we'll use a mock session ID
      // In a real app, this would come from an active session
      const mockSessionId = `S_${Date.now()}`
      setCurrentSessionId(mockSessionId)
      setShowFaceRecognition(true)
      setScanState({ status: 'idle', message: '' })
      
    } catch (error) {
      console.error('Face service check failed:', error)
      setScanState({ 
        status: 'error', 
        message: 'Cannot connect to face recognition service. Please try another method.' 
      })
    }
  }

  const handleCloseScanner = () => {
    setShowFullScreenScanner(false)
    setScanState({ status: 'idle', message: '' })
  }

  const handleCloseFaceRecognition = () => {
    setShowFaceRecognition(false)
    setCurrentSessionId(null)
    setScanState({ status: 'idle', message: '' })
  }

  const handleFaceRecognitionSuccess = (result) => {
    console.log('Face recognition success:', result)
    setScanState({ 
      status: 'success', 
      message: result.alreadyMarked 
        ? `Already marked present: ${result.studentId}`
        : `Face recognized! Marked present: ${result.studentId} (${(result.confidence * 100).toFixed(1)}% confidence)`
    })
  }

  const handleFaceRecognitionError = (error) => {
    console.error('Face recognition error:', error)
    setScanState({ 
      status: 'error', 
      message: `Face recognition failed: ${error}` 
    })
  }

  const validateToken = async (token) => {
    try {
      setScanState({ status: 'validating', message: 'Validating…' })
      const res = await apiPost('/attendance/scan', { token })
      setScanState({ status: 'success', message: `Marked present at ${new Date(res.markedAt).toLocaleTimeString()}` })
    } catch (err) {
      const code = err.code
      const msg = code === 'expired_code' ? 'QR expired. Ask staff to regenerate.'
        : code === 'already_used' ? 'Code already used.'
        : code === 'not_enrolled' ? 'You are not enrolled for this session.'
        : code === 'session_closed' ? 'Session closed.'
        : code === 'network_error' ? 'Network error. Check your connection.'
        : 'Invalid QR code.'
      setScanState({ status: 'error', message: msg })
    }
  }

  const onSubmitToken = useCallback(async (e) => {
    e.preventDefault()
    const token = inputRef.current?.value?.trim()
    if (!token) return
    inputRef.current.value = ''
    await validateToken(token)
  }, [])

  const getTitle = () => {
    switch(mode) {
      case 'scanner': return 'QR Code Scanner'
      case 'manual': return 'Manual Token Entry'
      case 'face': return 'Face Recognition'
      default: return 'Select Attendance Method'
    }
  }

  return (
    <div className="space-y-6">
      {/* Full Screen QR Scanner Overlay */}
      {showFullScreenScanner && (
        <AutoFullScreenQrScanner
          onDecode={(result) => validateToken(String(result))}
          onError={() => {}}
          onClose={handleCloseScanner}
          constraints={{ facingMode: 'environment' }}
          autoStart={true}
        />
      )}

      {/* Face Recognition Camera Overlay */}
      {showFaceRecognition && (
        <FaceRecognitionCamera
          sessionId={currentSessionId}
          onRecognitionSuccess={handleFaceRecognitionSuccess}
          onRecognitionError={handleFaceRecognitionError}
          onClose={handleCloseFaceRecognition}
          department={user?.department || "Computer Science"}
          year={user?.year || "4th Year"}
          studentId={(user?.regNo || user?.studentId || user?.roll || '').toString()}
        />
      )}
      {/* Mode Selection Buttons */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Choose Attendance Method</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleModeChange('scanner')}
            className={`flex items-center justify-center gap-3 p-4 rounded-lg transition-colors ${
              mode === 'scanner' 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h-4.01M12 12v4m6-7h2M6 5h2m0 0h2m0 0h2m-6 0h2" />
            </svg>
            <div className="text-left">
              <div className="font-medium">QR Code Scanner</div>
              <div className="text-sm opacity-75">Scan QR code with camera</div>
            </div>
          </button>
          
          <button
            onClick={() => handleModeChange('manual')}
            className={`flex items-center justify-center gap-3 p-4 rounded-lg transition-colors ${
              mode === 'manual' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <div className="text-left">
              <div className="font-medium">Manual Token Entry</div>
              <div className="text-sm opacity-75">Enter token code manually</div>
            </div>
          </button>

          <button
            onClick={() => handleModeChange('face')}
            className={`flex items-center justify-center gap-3 p-4 rounded-lg transition-colors ${
              mode === 'face' 
                ? 'bg-purple-600 text-white' 
                : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="text-left">
              <div className="font-medium">Face Recognition</div>
              <div className="text-sm opacity-75">Use camera for face detection</div>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">{getTitle()}</h2>
        </div>
        
        {/* QR Scanner Instructions - Show ONLY if mode is 'scanner' */}
        {mode === 'scanner' && (
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <div className="text-center space-y-4">
                <button
                  onClick={() => setShowFullScreenScanner(true)}
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
                >
                  📷 Open QR Scanner
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Token Entry Section - Show ONLY if mode is 'manual' */}
        {mode === 'manual' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">⌨️ Manual Token Entry</h3>
            <form onSubmit={onSubmitToken} className="flex gap-2 mb-2">
              <input 
                ref={inputRef} 
                placeholder="Enter the 6-digit code from teacher" 
                className="flex-1 px-3 py-2 rounded-md border focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                maxLength="6"
                style={{ textTransform: 'uppercase' }}
              />
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Submit Code
              </button>
            </form>
            <div className="text-xs text-gray-500">Enter the 6-character code shown by your teacher if camera scanning doesn't work.</div>
          </div>
        )}

        {/* Face Recognition Section - Show ONLY if mode is 'face' */}
        {mode === 'face' && (
          <div className="mb-6">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
              <div className="text-center space-y-4">
                <div className="text-purple-600 dark:text-purple-400">
                  <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-purple-800 dark:text-purple-200">Face Recognition Attendance</h3>
                <p className="text-sm text-purple-600 dark:text-purple-300 mb-4">
                  Click the button below to start face recognition. Make sure you have good lighting and look directly at the camera.
                </p>
                <button
                  onClick={() => checkFaceServiceAndStart()}
                  disabled={scanState.status === 'validating'}
                  className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-lg disabled:bg-gray-400"
                >
                  {scanState.status === 'validating' ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Checking Service...
                    </div>
                  ) : (
                    <>👤 Start Face Recognition</>
                  )}
                </button>
                {faceServiceStatus && (
                  <div className="mt-3 text-xs text-purple-600 dark:text-purple-300">
                    Service Status: {faceServiceStatus.service_available ? '✅ Available' : '❌ Unavailable'}
                    {faceServiceStatus.service_status && (
                      <span className="ml-2">
                        ({faceServiceStatus.service_status.enrolled_students} students enrolled)
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Default message when no mode is selected */}
        {mode === 'both' && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">👆 Please select an attendance method above</div>
            <div className="text-sm text-gray-400">Choose QR Scanner, Face Recognition, or Manual Token Entry to mark your attendance</div>
          </div>
        )}

        {/* Status Messages */}
        <div className="mt-4 text-sm">
          {scanState.status === 'validating' && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              {scanState.message}
            </div>
          )}
          {scanState.status === 'success' && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {scanState.message}
            </div>
          )}
          {scanState.status === 'error' && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {scanState.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


