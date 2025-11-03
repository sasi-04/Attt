import React, { useState, useEffect } from 'react'
import { adminApi } from '../../components/api.js'

export default function QRGenerator() {
  const [hierarchy, setHierarchy] = useState({})
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [courseId, setCourseId] = useState('COURSE1')
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [sessionActive, setSessionActive] = useState(false)

  useEffect(() => {
    loadHierarchy()
  }, [])

  const loadHierarchy = async () => {
    try {
      const response = await fetch('/admin/hierarchy/structure')
      const data = await response.json()
      
      // Add null checks and default to empty object
      if (data && data.hierarchy && typeof data.hierarchy === 'object') {
        setHierarchy(data.hierarchy)
      } else {
        console.warn('Invalid hierarchy data received:', data)
        setHierarchy({})
      }
    } catch (error) {
      console.error('Failed to load hierarchy:', error)
      setMessage('Failed to load hierarchy structure')
      setHierarchy({}) // Set to empty object on error
    }
  }

  const generateQR = async () => {
    if (!selectedDept || !selectedYear) {
      setMessage('Please select both department and year')
      setTimeout(() => setMessage(''), 3000)
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          sessionDepartment: selectedDept,
          sessionYear: selectedYear
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate QR code')
      }

      setQrData(data)
      setSessionActive(true)
      setMessage(`✓ QR code generated for ${selectedDept} ${selectedYear}`)
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('QR generation error:', error)
      setMessage(`Failed to generate QR: ${error.message}`)
      setTimeout(() => setMessage(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const closeSession = async () => {
    if (!qrData?.sessionId) return

    try {
      const response = await fetch(`/sessions/${qrData.sessionId}/close`, {
        method: 'POST'
      })

      if (response.ok) {
        setSessionActive(false)
        setQrData(null)
        setMessage('✓ Session closed successfully')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      console.error('Close session error:', error)
      setMessage('Failed to close session')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const selectedYearData = selectedDept && selectedYear && hierarchy[selectedDept]?.[selectedYear]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📱 Hierarchical QR Code Generator</h1>
          <p className="text-gray-600">Generate QR codes with department-year access control</p>
          <div className="mt-3 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
            <strong>Security:</strong> Generated QR codes can only be scanned by students from the selected department and year
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.includes('✓') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message}
          </div>
        )}
      </div>

      {/* QR Generation Controls */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">🎯 Select Target Class</h2>
        
        {/* Department and Year Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">🏢 Department</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value)
                setSelectedYear('') // Reset year when department changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Department</option>
              {Object.keys(hierarchy || {}).map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📚 Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!selectedDept}
            >
              <option value="">Select Year</option>
              {selectedDept && hierarchy && hierarchy[selectedDept] && Object.keys(hierarchy[selectedDept]).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">📖 Course ID</label>
            <input
              type="text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="COURSE1"
            />
          </div>
        </div>

        {/* Selected Class Info */}
        {selectedYearData && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-800 mb-3">📋 Selected Class: {selectedDept} {selectedYear}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded-lg">
                <span className="font-medium text-blue-700">👨‍🎓 Students:</span>
                <span className="ml-2 text-blue-600 font-semibold">{selectedYearData.studentCount}</span>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <span className="font-medium text-blue-700">👨‍🏫 Class Advisor:</span>
                <span className="ml-2 text-blue-600">
                  {selectedYearData.classAdvisor ? selectedYearData.classAdvisor.name : 'Not assigned'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg">
                <span className="font-medium text-blue-700">👥 Staff:</span>
                <span className="ml-2 text-blue-600 font-semibold">{selectedYearData.staff.length}</span>
              </div>
            </div>
            <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
              <strong>🔒 Access Control:</strong> Only {selectedDept} {selectedYear} students can scan this QR code
            </div>
          </div>
        )}

        {/* Generate QR Button */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={generateQR}
            disabled={loading || !selectedDept || !selectedYear || sessionActive}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span className="text-xl">📱</span>
                <span>Generate QR Code</span>
              </>
            )}
          </button>

          {sessionActive && (
            <button
              onClick={closeSession}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 shadow-md"
            >
              <span className="text-xl">⏹️</span>
              <span>Close Session</span>
            </button>
          )}
        </div>
      </div>

      {/* QR Code Display */}
      {qrData && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">
              🎯 QR Code for {selectedDept} {selectedYear}
            </h3>
            
            {qrData.imageDataUrl ? (
              <div className="mb-6">
                <img 
                  src={qrData.imageDataUrl} 
                  alt="QR Code" 
                  className="mx-auto border-4 border-gray-300 rounded-lg shadow-lg"
                  style={{ maxWidth: '300px', maxHeight: '300px' }}
                />
              </div>
            ) : (
              <div className="mb-6 p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium">⚠️ QR image generation failed. Use the code below:</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border-2">
                <span className="font-medium text-gray-700">📱 Short Code:</span>
                <div className="mt-2 font-mono text-2xl text-blue-600 font-bold">{qrData.code}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-2">
                <span className="font-medium text-gray-700">🆔 Session ID:</span>
                <div className="mt-2 font-mono text-sm text-gray-600 break-all">{qrData.sessionId}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-2">
                <span className="font-medium text-gray-700">⏰ Expires:</span>
                <div className="mt-2 text-sm text-gray-600">{new Date(qrData.expiresAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">🔒 Access Control Active</h4>
              <p className="text-green-700 text-sm">
                Only students from <strong>{selectedDept} {selectedYear}</strong> can scan this QR code.
                Students from other departments or years will be denied access with a clear error message.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-3">📋 How Hierarchical QR Codes Work:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h5 className="font-semibold mb-2">🎯 For Teachers/Staff:</h5>
            <ul className="space-y-1">
              <li>• Select the specific department and year for your class</li>
              <li>• Generate a QR code that's restricted to that combination</li>
              <li>• Only assigned students can scan successfully</li>
              <li>• Monitor attendance in real-time</li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold mb-2">🔒 For Students:</h5>
            <ul className="space-y-1">
              <li>• Can only scan QR codes for their own department-year</li>
              <li>• Cross-department/year scanning shows "Access Denied"</li>
              <li>• Clear error messages explain why access was denied</li>
              <li>• Prevents attendance fraud across classes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
