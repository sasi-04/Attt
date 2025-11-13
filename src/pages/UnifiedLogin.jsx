import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function UnifiedLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, logout } = useAuth()
  const navigate = useNavigate()

  // Clear any existing session when visiting login page
  useEffect(() => {
    localStorage.removeItem('ams_user')
    setUsername('')
    setPassword('')
    setError('')
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('[LOGIN] Username:', username, 'Contains @:', username.includes('@'))

    try {
      // Try to authenticate as staff first (email format)
      if (username.includes('@')) {
        console.log('[LOGIN] Trying staff/admin login...')
        const staffResp = await fetch('/api/auth/staff/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username, password })
        })
        
        if (staffResp.ok) {
          const profile = await staffResp.json()
          login(profile)
          navigate('/staff/dashboard')
          return
        }

        // Try admin if staff failed
        const adminResp = await fetch('/api/auth/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username, password })
        })
        
        if (adminResp.ok) {
          const profile = await adminResp.json()
          login(profile)
          navigate('/admin/dashboard')
          return
        }
      } else {
        // Try student (regNo format - no @ symbol)
        console.log('[LOGIN] Trying student login...')
        const studentResp = await fetch('/api/auth/student/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regNo: username, password })
        })
        
        if (studentResp.ok) {
          const profile = await studentResp.json()
          login(profile)
          navigate('/student/dashboard')
          return
        }
      }

      // If we get here, all attempts failed
      setError('Invalid username or password')
    } catch (err) {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎓</div>
          <h1 className="text-2xl font-bold">Attendance Monitor</h1>
          <p className="text-gray-600">Sign in with Student, Staff, or Admin</p>
        </div>

        <form onSubmit={onSubmit}>
          <h2 className="text-lg font-semibold mb-4">Sign In</h2>
          <p className="text-sm text-gray-500 mb-4">
            Enter your credentials to access the attendance monitoring system
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">User Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="staff@demo.com or ES22CJ01"
              className="w-full px-4 py-2 border rounded bg-gray-100"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              className="w-full px-4 py-2 border rounded bg-gray-100"
            />
          </div>

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-3 bg-gray-50 rounded text-xs">
          <p className="font-semibold mb-2">Demo Credentials:</p>
          <p>Staff: kiruthika@demo.com / kiruthika123</p>
          <p>Admin: admin@demo.com / admin123</p>
          <p>Student: ES22CJ01 / student123 (default)</p>
        </div>
      </div>
    </div>
  )
}
