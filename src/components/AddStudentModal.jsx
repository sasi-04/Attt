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

  // Get staff info on component mount
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    setStaffInfo(user)
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
      if (staffInfo?.isClassAdvisor && staffInfo?.advisorFor) {
        studentData.department = staffInfo.advisorFor.department
        studentData.year = staffInfo.advisorFor.year
      }

      const response = await apiPost('/admin/students/add', studentData)
      
      if (response.success) {
        // Store created student data and show credentials
        setCreatedStudent({
          ...studentData,
          loginId: studentData.regNo,
          password: studentData.password
        })
        setShowCredentials(true)
        
        if (onStudentAdded) {
          onStudentAdded(response.student)
        }
      } else {
        setError(response.error || 'Failed to create student')
      }
    } catch (error) {
      console.error('Error creating student:', error)
      setError(error.message || 'Failed to create student. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showCredentials && createdStudent) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-green-600">✅ Student Created Successfully!</h2>
            <button 
              onClick={onClose}
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
                  <span className="text-gray-600">Login ID:</span>
                  <span className="font-medium text-blue-600">{createdStudent.loginId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <span className="font-medium text-red-600">{createdStudent.password}</span>
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
              onClick={onClose}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Add New Student</h2>
          <button
            onClick={onClose}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="student@example.com"
              required
              disabled={isSubmitting}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter password (min 6 characters)"
              required
              disabled={isSubmitting}
              minLength={6}
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
              onClick={onClose}
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
