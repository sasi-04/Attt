import React, { useState, useEffect } from 'react'
import { apiPost } from './api.js'

export default function AddStudentModal({ onClose, onStudentAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    regNo: '',
    studentId: '',
    email: '',
    password: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showCredentials, setShowCredentials] = useState(false)
  const [createdStudent, setCreatedStudent] = useState(null)
  const [staffInfo, setStaffInfo] = useState(null)

  // Reset form function
  const resetForm = () => {
    setFormData({
      name: '',
      regNo: '',
      studentId: '',
      email: '',
      password: ''
    })
    setError('')
    // Don't reset credentials immediately - let user see them first
    // setShowCredentials(false)
    // setCreatedStudent(null)
    setIsSubmitting(false)
  }
  
  const handleCloseModal = () => {
    // If we just showed credentials, call the callback to refresh the list
    if (showCredentials && createdStudent && onStudentAdded) {
      console.log('Calling onStudentAdded callback after credentials shown')
      onStudentAdded(createdStudent)
    }
    
    // Reset everything when actually closing
    setShowCredentials(false)
    setCreatedStudent(null)
    resetForm()
    onClose()
  }

  // Get staff info on component mount and reset form
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('ams_user') || localStorage.getItem('user') || '{}')
    setStaffInfo(user)
    resetForm()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Student name is required')
      return false
    }
    if (!formData.regNo.trim()) {
      setError('Registration number is required')
      return false
    }
    if (!formData.studentId.trim()) {
      setError('Student ID is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }
    if (!formData.password.trim()) {
      setError('Password is required')
      return false
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')

    try {
      const studentData = {
        name: formData.name.trim(),
        regNo: formData.regNo.trim().toUpperCase(),
        studentId: formData.studentId.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim()
      }

      // Add department and year from staff advisor assignment if available
      // Also check localStorage directly in case staffInfo wasn't loaded
      const currentUser = JSON.parse(localStorage.getItem('ams_user') || localStorage.getItem('user') || '{}')
      const advisorInfo = staffInfo?.advisorFor || currentUser?.advisorFor
      
      if ((staffInfo?.isClassAdvisor || currentUser?.isClassAdvisor) && advisorInfo) {
        studentData.department = advisorInfo.department
        studentData.year = advisorInfo.year
        console.log('Using advisor info for student:', { department: studentData.department, year: studentData.year })
      } else {
        console.warn('No advisor info found - student may not appear in staff panel!')
        console.log('staffInfo:', staffInfo)
        console.log('currentUser:', currentUser)
      }

      console.log('Submitting student data:', studentData)
      const response = await apiPost('/admin/students/add', studentData)
      console.log('API response:', response)
      
      if (response.success || response.student) {
        // Store created student data and show credentials
        // IMPORTANT: Password is not returned by API for security, so use form data
        const createdData = response.student || studentData
        const credentialData = {
          name: createdData.name || studentData.name,
          regNo: createdData.regNo || studentData.regNo,
          loginId: createdData.regNo || studentData.regNo, // Login ID is the regNo
          email: createdData.email || studentData.email,
          password: studentData.password, // Use password from form (not in API response)
          department: createdData.department || studentData.department,
          year: createdData.year || studentData.year
        }
        
        console.log('Setting credential data:', { ...credentialData, password: '***' })
        console.log('About to show credentials modal...')
        setCreatedStudent(credentialData)
        setShowCredentials(true)
        console.log('Credentials state set - modal should now be visible')
        console.log('Credential data:', {
          name: credentialData.name,
          loginId: credentialData.loginId,
          email: credentialData.email,
          password: credentialData.password ? '***' : 'MISSING',
          hasPassword: !!credentialData.password
        })
        
        // DON'T call onStudentAdded here - it closes the modal immediately!
        // We'll call it when the user clicks "Done" on the credentials view
        // This allows the credentials to be displayed first
      } else {
        // Handle error response
        let errorMsg = response.message || response.error || 'Failed to create student'
        
        // Map error codes to user-friendly messages
        if (response.error === 'invalid_student_name') {
          errorMsg = 'Example or demo student names are not allowed. Please use a real student name.'
        } else if (response.error === 'student_exists') {
          errorMsg = 'A student with this registration number already exists.'
        } else if (response.error === 'missing_required_fields') {
          errorMsg = 'Name, RegNo, and StudentId are required fields.'
        }
        
        setError(errorMsg)
        console.error('Student creation failed:', errorMsg)
      }
    } catch (error) {
      console.error('Error creating student:', error)
      let errorMsg = 'Failed to create student. Please try again.'
      
      // Handle error object with code property
      if (error.code === 'invalid_student_name') {
        errorMsg = 'Example or demo student names are not allowed. Please use a real student name.'
      } else if (error.code === 'student_exists') {
        errorMsg = 'A student with this registration number already exists.'
      } else if (error.code === 'missing_required_fields') {
        errorMsg = 'Name, RegNo, and StudentId are required fields.'
      } else if (error.message) {
        errorMsg = error.message
      }
      
      setError(errorMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Debug logging for credentials view
  if (showCredentials) {
    console.log('Rendering credentials view, createdStudent:', createdStudent ? {
      name: createdStudent.name,
      loginId: createdStudent.loginId,
      hasPassword: !!createdStudent.password,
      email: createdStudent.email
    } : 'NULL')
  }
  
  if (showCredentials && createdStudent) {
    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleCloseModal()
          }
        }}
      >
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-green-600">✅ Student Created Successfully!</h2>
            <button 
              onClick={handleCloseModal}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-3">Student Login Credentials</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{createdStudent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Login ID (RegNo):</span>
                  <span className="font-medium text-blue-600">
                    {createdStudent.loginId || createdStudent.regNo || 'NOT SET'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <span className="font-medium text-red-600">
                    {createdStudent.password || 'NOT SET'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{createdStudent.email}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-700 text-sm">
                <strong>Important:</strong> Please save these credentials and share them with the student. They can use these to log into the student portal.
              </p>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={(e) => {
        // Only close if clicking directly on the backdrop, not when dragging from input
        if (e.target === e.currentTarget) {
          handleCloseModal()
        }
      }}
      onMouseDown={(e) => {
        // Prevent closing when mouse down starts on backdrop
        if (e.target === e.currentTarget) {
          e.preventDefault()
        }
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Add New Student</h2>
          <button
            onClick={handleCloseModal}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Student Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter student's full name"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Registration Number */}
          <div>
            <label htmlFor="regNo" className="block text-sm font-medium text-gray-700 mb-1">
              Registration Number *
            </label>
            <input
              type="text"
              id="regNo"
              name="regNo"
              value={formData.regNo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., CS2021001"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Student ID */}
          <div>
            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
              Student ID *
            </label>
            <input
              type="text"
              id="studentId"
              name="studentId"
              value={formData.studentId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 73042553006"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              onMouseDown={(e) => e.stopPropagation()}
              onSelect={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="student@example.com"
              required
              disabled={isSubmitting}
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              onMouseDown={(e) => e.stopPropagation()}
              onSelect={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter password (min 6 characters)"
              required
              disabled={isSubmitting}
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </div>
              ) : (
                '👤 Create Student'
              )}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-700 text-sm">
            <strong>Note:</strong> The student will be added to the system and can immediately start using the attendance system. Face recognition can be set up later using the "Add Face" button.
          </p>
          {staffInfo?.isClassAdvisor && staffInfo?.advisorFor && (
            <p className="text-blue-700 text-sm mt-2">
              <strong>Department:</strong> {staffInfo.advisorFor.department} | <strong>Year:</strong> {staffInfo.advisorFor.year}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
