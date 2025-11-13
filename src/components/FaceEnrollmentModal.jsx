import React, { useRef, useEffect, useState, useCallback } from 'react'
import { apiPost, apiGet } from './api.js'

export default function FaceEnrollmentModal({ 
  student, 
  onClose, 
  onEnrollmentComplete 
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [enrollmentState, setEnrollmentState] = useState({
    status: 'initializing', // initializing, ready, capturing, processing, completed, error
    capturedImages: [],
    currentStep: 1,
    totalSteps: 5,
    message: 'Initializing camera...'
  })
  const streamRef = useRef(null)
  const captureIntervalRef = useRef(null)

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      setEnrollmentState(prev => ({ 
        ...prev, 
        status: 'initializing',
        message: 'Requesting camera access...' 
      }))

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          setIsActive(true)
          setEnrollmentState(prev => ({
            ...prev,
            status: 'ready',
            message: 'Camera ready. Click "Start Capture" to begin.'
          }))
        }
      }
    } catch (error) {
      console.error('Camera initialization error:', error)
      setEnrollmentState(prev => ({
        ...prev,
        status: 'error',
        message: 'Camera access denied. Please allow camera permissions.'
      }))
    }
  }, [])

  // Capture image from video
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isActive) {
      return null
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    const base64Data = imageData.split(',')[1]

    return base64Data
  }, [isActive])

  // Start automatic enrollment process
  const startEnrollment = useCallback(() => {
    if (enrollmentState.status !== 'ready') return

    setEnrollmentState(prev => ({
      ...prev,
      status: 'capturing',
      currentStep: 1,
      capturedImages: [],
      message: 'Look directly at the camera. Capturing image 1 of 5...'
    }))

    let captureCount = 0
    const images = []

    captureIntervalRef.current = setInterval(() => {
      const imageData = captureImage()
      if (imageData) {
        captureCount++
        images.push(imageData)
        
        setEnrollmentState(prev => ({
          ...prev,
          currentStep: captureCount,
          capturedImages: [...images],
          message: captureCount < 5 
            ? `Capturing image ${captureCount + 1} of 5... ${
                captureCount === 1 ? 'Turn head slightly left' :
                captureCount === 2 ? 'Turn head slightly right' :
                captureCount === 3 ? 'Tilt head slightly up' :
                'Look directly at camera'
              }`
            : 'All images captured! Processing...'
        }))

        if (captureCount >= 5) {
          clearInterval(captureIntervalRef.current)
          captureIntervalRef.current = null
          processEnrollment(images)
        }
      }
    }, 2000) // Capture every 2 seconds
  }, [enrollmentState.status, captureImage])

  // Process enrollment with captured images
  const processEnrollment = async (images) => {
    setEnrollmentState(prev => ({
      ...prev,
      status: 'processing',
      message: 'Processing face enrollment...'
    }))

    try {
      // Resolve a valid string ID for enrollment, avoiding invalid values like 'NaN'
      const candidates = [
        student?.studentId,
        student?.roll,
        student?.regNo
      ]
      const resolvedId = candidates
        .map(v => (v !== undefined && v !== null) ? String(v).trim() : '')
        .find(v => v && v.toLowerCase() !== 'nan')

      if (!resolvedId) {
        throw Object.assign(new Error('invalid_student_id'), { code: 'invalid_student_id' })
      }

      const enrollmentData = {
        student_id: resolvedId,
        roll_no: resolvedId,
        name: student.name,
        department: student.dept || student.department,
        email: student.contact || student.email,
        images: images
      }

      console.log('=== FACE ENROLLMENT REQUEST ===')
      console.log('Student object:', student)
      console.log('Enrollment data:', enrollmentData)
      console.log('Number of images:', images.length)
      console.log('API endpoint will be called:', '/face-recognition/enroll')

      const response = await apiPost('/face-recognition/enroll', enrollmentData)
      console.log('Enrollment response:', response)

      if (response.success) {
        setEnrollmentState(prev => ({
          ...prev,
          status: 'completed',
          message: `✅ Enrollment successful! ${response.images_processed} images processed.`
        }))

        if (onEnrollmentComplete) {
          onEnrollmentComplete({
            studentId: resolvedId,
            name: student.name,
            success: true
          })
        }

        // Auto-close after success
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        throw new Error(response.error || 'Enrollment failed')
      }
    } catch (error) {
      console.error('Enrollment error:', error)
      console.error('Error code:', error.code)
      console.error('Error status:', error.status)
      console.error('Error message:', error.message)
      
      let errorMessage = 'Unknown error'
      
      // Check for authorization errors first
      if (error.status === 401 || error.code === 'authentication_required') {
        errorMessage = 'Authentication required. Please log out and log back in.'
      } else if (error.status === 403 || error.code === 'access_denied') {
        const details = error.details || error.raw?.details || ''
        errorMessage = `Access denied. Only class advisors can enroll student faces. ${details}`
        if (details.includes('not currently assigned')) {
          errorMessage += ' Please ensure you are assigned as an advisor in the admin panel, then log out and log back in.'
        }
      } else if (error.code === 'staff_not_found') {
        errorMessage = 'Staff member not found. Please contact administrator.'
      } else if (error.status === 503 || error.code === 'service_unavailable') {
        // Check if it's actually unavailable or just missing dependencies
        if (error.code === 'face_recognition_unavailable' || error.raw?.error === 'face_recognition_unavailable') {
          const details = error.details || error.raw?.details || ''
          errorMessage = '⚠️ Face recognition system is not available. ' + (details || 'Install insightface to enable face recognition features.')
        } else {
          errorMessage = '⚠️ Face Recognition Service is NOT running! Start the Python service on port 5001.'
        }
      } else if (error.code === 'face_recognition_unavailable' || error.raw?.error === 'face_recognition_unavailable') {
        const details = error.details || error.raw?.details || ''
        errorMessage = '⚠️ Face recognition system is not available. ' + (details || 'Install insightface to enable face recognition features.')
      } else if (error.code === 'network_error' || error.message.includes('network_error')) {
        errorMessage = 'Face recognition service is not running. Please start the face recognition service first.'
      } else if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Cannot connect to face recognition service. Please ensure it is running on port 5001.'
      } else if (error.message.includes('network') || error.message.includes('connection')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (error.status === 500 || error.status === 504) {
        const details = error.details || error.raw?.details || ''
        const errorType = error.errorType || error.raw?.errorType || ''
        const errorCode = error.errorCode || error.raw?.errorCode || ''
        
        if (error.status === 504 || error.code === 'service_timeout') {
          errorMessage = '⏱️ Face recognition service timeout. The service may be overloaded. Please try again.'
        } else if (error.code === 'service_error' || errorType === 'service_error') {
          errorMessage = '⚠️ Face recognition service error. The service may not be running correctly.'
        } else {
          errorMessage = `Server error during enrollment: ${details || error.message || 'Please try again.'}`
        }
        
        // Add more context if available
        if (errorCode && errorCode !== 'UNKNOWN') {
          errorMessage += ` (Error: ${errorCode})`
        }
      } else if (error.code === 'invalid_student_id') {
        errorMessage = 'Missing or invalid student ID. Please ensure the student has a valid roll number/student ID.'
      } else if (error.code === 'request_failed') {
        errorMessage = 'API request failed. This was likely due to incorrect API path (now fixed). Please try again.'
      } else {
        errorMessage = error.message || error.code || 'Enrollment failed'
      }
      
      setEnrollmentState(prev => ({
        ...prev,
        status: 'error',
        message: `❌ Enrollment failed: ${errorMessage}`
      }))
    }
  }

  // Reset enrollment
  const resetEnrollment = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current)
      captureIntervalRef.current = null
    }
    
    setEnrollmentState(prev => ({
      ...prev,
      status: 'ready',
      capturedImages: [],
      currentStep: 1,
      message: 'Ready to start enrollment. Click "Start Capture" to begin.'
    }))
  }

  // Initialize camera on mount
  useEffect(() => {
    initializeCamera()
  }, [initializeCamera])

  // Cleanup
  useEffect(() => {
    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const getStatusColor = () => {
    switch (enrollmentState.status) {
      case 'completed': return 'text-green-600'
      case 'processing': return 'text-blue-600'
      case 'capturing': return 'text-purple-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Face Enrollment</h2>
            <p className="text-gray-600">{student.name} ({student.roll})</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Camera Feed */}
        <div className="relative mb-4">
          <video
            ref={videoRef}
            className="w-full h-64 bg-gray-900 rounded-lg object-cover"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />
          
          {/* Face guide overlay */}
          <div className="absolute inset-0 border-2 border-dashed border-white opacity-30 rounded-lg pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-48 h-36 border-2 border-white rounded-lg"></div>
            </div>
          </div>

          {/* Status Overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black bg-opacity-75 text-white p-3 rounded-lg">
              <div className={`${getStatusColor()}`}>{enrollmentState.message}</div>
              {enrollmentState.status === 'capturing' && (
                <div className="mt-2">
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(enrollmentState.currentStep / enrollmentState.totalSteps) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs mt-1 text-center">
                    Step {enrollmentState.currentStep} of {enrollmentState.totalSteps}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {enrollmentState.status === 'ready' && (
            <button
              onClick={startEnrollment}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              📸 Start Capture
            </button>
          )}
          
          {(enrollmentState.status === 'error' || enrollmentState.status === 'completed') && (
            <button
              onClick={resetEnrollment}
              className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
            >
              🔄 Try Again
            </button>
          )}
          
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium"
          >
            Cancel
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">Instructions:</h4>
          <ul className="space-y-1">
            <li>• Position student's face clearly in the camera frame</li>
            <li>• Ensure good lighting on the face</li>
            <li>• Follow the prompts for different angles</li>
            <li>• Stay still during each capture (2 seconds each)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
