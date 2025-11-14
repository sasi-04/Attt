import React, { useRef, useEffect, useState, useCallback } from 'react'
import { apiPost, apiGet } from './api.js'

export default function FaceRecognitionCamera({ 
  sessionId, 
  courseId = '21CS701',
  onRecognitionSuccess, 
  onRecognitionError,
  onClose,
  department = "Computer Science",
  year = "4th Year",
  studentId = ""
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState('initializing')
  const [recognitionState, setRecognitionState] = useState({
    isProcessing: false,
    lastRecognition: null,
    confidence: 0,
    message: 'Position your face in the camera'
  })
  const [serviceStatus, setServiceStatus] = useState(null)
  const recognitionIntervalRef = useRef(null)
  const streamRef = useRef(null)

  // Check face recognition service status
  useEffect(() => {
    const checkServiceStatus = async () => {
      try {
        const response = await apiGet('/face-recognition/status')
        setServiceStatus(response)
        if (!response.service_available) {
          setStatus('service_unavailable')
          setRecognitionState(prev => ({
            ...prev,
            message: 'Face recognition service is not available'
          }))
        }
      } catch (error) {
        console.error('Failed to check face recognition service:', error)
        setServiceStatus(null)
        setStatus('service_unavailable')
        setRecognitionState(prev => ({
          ...prev,
          message: 'Cannot connect to face recognition service'
        }))
      }
    }

    checkServiceStatus()
  }, [])

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    try {
      setStatus('requesting_camera')
      setRecognitionState(prev => ({ ...prev, message: 'Requesting camera access...' }))

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
          setStatus('ready')
          setRecognitionState(prev => ({
            ...prev,
            message: 'Camera ready. Position your face in the frame.'
          }))
        }
      }
    } catch (error) {
      console.error('Camera initialization error:', error)
      setStatus('camera_error')
      setRecognitionState(prev => ({
        ...prev,
        message: 'Camera access denied. Please allow camera permissions.'
      }))
      if (onRecognitionError) {
        onRecognitionError('Camera access denied')
      }
    }
  }, [onRecognitionError])

  // Start face recognition session
  const startRecognitionSession = useCallback(async () => {
    if (!sessionId) return

    try {
      await apiPost('/face-recognition/session/start', {
        sessionId,
        courseId,
        department,
        year
      })
      console.log('Face recognition session started')
    } catch (error) {
      console.error('Failed to start face recognition session:', error)
      setRecognitionState(prev => ({
        ...prev,
        message: 'Failed to start recognition session'
      }))
    }
  }, [sessionId, courseId, department, year])

  // Capture and process frame
  const captureAndRecognize = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isActive || recognitionState.isProcessing) {
      return
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

    setRecognitionState(prev => ({ ...prev, isProcessing: true }))

    try {
      // Send to face recognition service via backend proxy
      // The backend will forward to the face service on port 5001
      const response = await fetch('/face-recognition/recognize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          session_id: sessionId,
          // Hint for simple service to validate enrollment for this student id
          expected_student_id: (studentId || '').toString().trim(),
          department,
          year
        })
      })

      const result = await response.json()

      if (result.success && result.student_id) {
        // Recognition successful
        setRecognitionState(prev => ({
          ...prev,
          isProcessing: false,
          lastRecognition: result.student_id,
          confidence: result.confidence,
          message: 'Face detected, attendance marked'
        }))

        // Stop recognition
        if (recognitionIntervalRef.current) {
          clearInterval(recognitionIntervalRef.current)
          recognitionIntervalRef.current = null
        }

        if (onRecognitionSuccess) {
          onRecognitionSuccess({
            studentId: result.student_id,
            confidence: result.confidence,
            markedAt: result.marked_at,
            alreadyMarked: result.already_marked
          })
        }

        // Auto-close after success
        setTimeout(() => {
          if (onClose) onClose()
        }, 3000)

      } else if (result.faces_detected === 0) {
        setRecognitionState(prev => ({
          ...prev,
          isProcessing: false,
          message: 'No face detected. Please position your face in the camera.'
        }))
      } else {
        setRecognitionState(prev => ({
          ...prev,
          isProcessing: false,
          message: "Didn't recognize your face"
        }))
        if (result.attendance_error && onRecognitionError) {
          onRecognitionError(result.message || 'Attendance logging failed.')
        }
      }
    } catch (error) {
      console.error('Recognition error:', error)
      setRecognitionState(prev => ({
        ...prev,
        isProcessing: false,
        message: 'Recognition failed. Please try again.'
      }))

      if (onRecognitionError) {
        onRecognitionError('Recognition service error')
      }
    }
  }, [isActive, recognitionState.isProcessing, sessionId, onRecognitionSuccess, onRecognitionError, onClose])

  // Start/stop recognition loop
  const toggleRecognition = useCallback(() => {
    if (recognitionIntervalRef.current) {
      // Stop recognition
      clearInterval(recognitionIntervalRef.current)
      recognitionIntervalRef.current = null
      setRecognitionState(prev => ({
        ...prev,
        message: 'Recognition paused. Click Start to continue.'
      }))
    } else {
      // Start recognition
      setRecognitionState(prev => ({
        ...prev,
        message: 'Scanning for faces...'
      }))
      recognitionIntervalRef.current = setInterval(captureAndRecognize, 2000) // Every 2 seconds - optimized for fast recognition
    }
  }, [captureAndRecognize])

  // Initialize everything
  useEffect(() => {
    if (serviceStatus?.service_available) {
      initializeCamera()
      startRecognitionSession()
    }
  }, [serviceStatus, initializeCamera, startRecognitionSession])

  // Auto-start recognition when camera is ready
  useEffect(() => {
    if (isActive && status === 'ready' && !recognitionIntervalRef.current) {
      // Auto-start recognition after 2 seconds
      setTimeout(() => {
        if (!recognitionIntervalRef.current) {
          toggleRecognition()
        }
      }, 2000)
    }
  }, [isActive, status, toggleRecognition])

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionIntervalRef.current) {
        clearInterval(recognitionIntervalRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const getStatusColor = () => {
    if (recognitionState.lastRecognition) return 'text-green-600'
    if (recognitionState.isProcessing) return 'text-blue-600'
    if (status === 'camera_error' || status === 'service_unavailable') return 'text-red-600'
    return 'text-gray-600'
  }

  const getStatusIcon = () => {
    if (recognitionState.lastRecognition) return '✅'
    if (recognitionState.isProcessing) return '🔍'
    if (status === 'camera_error' || status === 'service_unavailable') return '❌'
    return '📷'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Face Recognition Attendance</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Service Status */}
        {serviceStatus && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              Service Status: 
              <span className={serviceStatus.service_available ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                {serviceStatus.service_available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            {serviceStatus.service_status && (
              <div className="text-xs text-gray-500 mt-1">
                Enrolled Students: {serviceStatus.service_status.enrolled_students}
              </div>
            )}
          </div>
        )}

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
          
          {/* Overlay */}
          <div className="absolute inset-0 border-2 border-dashed border-white opacity-30 rounded-lg pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-48 h-36 border-2 border-white rounded-lg"></div>
            </div>
          </div>

          {/* Status Overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black bg-opacity-75 text-white p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getStatusIcon()}</span>
                <span className={getStatusColor()}>{recognitionState.message}</span>
              </div>
              {recognitionState.confidence > 0 && (
                <div className="text-sm mt-1 text-gray-300">
                  Confidence: {(recognitionState.confidence * 100).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={toggleRecognition}
            disabled={!isActive || status !== 'ready'}
            className={`flex-1 py-2 px-4 rounded-lg font-medium ${
              recognitionIntervalRef.current
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300'
            }`}
          >
            {recognitionIntervalRef.current ? 'Stop Recognition' : 'Start Recognition'}
          </button>
          
          <button
            onClick={captureAndRecognize}
            disabled={!isActive || recognitionState.isProcessing}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:bg-gray-300"
          >
            {recognitionState.isProcessing ? 'Processing...' : 'Capture Now'}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">Instructions:</h4>
          <ul className="space-y-1">
            <li>• Position your face clearly in the camera frame</li>
            <li>• Ensure good lighting on your face</li>
            <li>• Look directly at the camera</li>
            <li>• Stay still during recognition</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
