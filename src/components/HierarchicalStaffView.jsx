import React, { useState, useEffect, useCallback } from 'react'
import { adminApi, staffApi } from './api.js'
import { useDepartmentUpdates, useStaffUpdates } from '../hooks/useWebSocket.js'

export default function HierarchicalStaffView() {
  const [viewLevel, setViewLevel] = useState('departments') // 'departments', 'staff'
  const [selectedDept, setSelectedDept] = useState(null)
  const [departments, setDepartments] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showAddDeptModal, setShowAddDeptModal] = useState(false)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const [message, setMessage] = useState('')
  const [newDeptName, setNewDeptName] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'M.Tech',
    designation: 'Assistant Professor',
    contact: '',
    isClassAdvisor: false,
    advisorYear: ''
  })
  const [availableYears, setAvailableYears] = useState([])
  const [loadingYears, setLoadingYears] = useState(false)

  useEffect(() => {
    loadDepartments()
  }, [])

  // Clear form when modal closes
  useEffect(() => {
    if (!showAddModal) {
      console.log('Modal closed, clearing form data')
      setFormData({
        name: '',
        email: '',
        password: '',
        department: 'M.Tech',
        designation: 'Assistant Professor',
        contact: '',
        isClassAdvisor: false,
        advisorYear: ''
      })
      setAvailableYears([])
    } else {
      console.log('Modal opened, current form data:', formData)
    }
  }, [showAddModal])

  // Handle real-time department updates
  const handleDepartmentUpdate = useCallback((update) => {
    console.log('Department update received:', update)
    // Refresh departments when any department-related change occurs
    loadDepartments()
  }, [])

  // Handle real-time staff updates
  const handleStaffUpdate = useCallback((update) => {
    console.log('Staff update received:', update)
    // Refresh departments to update counts
    loadDepartments()
    // If we're viewing staff for a specific department, refresh that too
    if (selectedDept && viewLevel === 'staff') {
      loadStaff(selectedDept.name)
    }
  }, [selectedDept, viewLevel])

  // Subscribe to WebSocket updates
  useDepartmentUpdates(handleDepartmentUpdate)
  useStaffUpdates(handleStaffUpdate)

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const response = await staffApi.getDepartmentsSummary()
      setDepartments(response.departments)
    } catch (error) {
      console.error('Failed to load departments:', error)
      setMessage('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  const loadStaff = async (dept) => {
    try {
      setLoading(true)
      const response = await adminApi.getStaffByDepartment(dept)
      // Sort by name
      const sortedStaff = response.staff.sort((a, b) => a.name.localeCompare(b.name))
      setStaff(sortedStaff)
    } catch (error) {
      console.error('Failed to load staff:', error)
      setMessage('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableYears = async (department) => {
    try {
      setLoadingYears(true)
      console.log('Loading available years for department:', department)
      // Get students to find available years in this department (with staff access control)
      const response = await staffApi.getStudentsByDepartment(department, null)
      console.log('Students response:', response)
      
      if (response && response.students && Array.isArray(response.students)) {
        const years = [...new Set(response.students
          .filter(s => !s.isYearPlaceholder)
          .map(s => s.year)
          .filter(year => year && year.trim() !== '')
        )].sort()
        console.log('Available years found:', years)
        setAvailableYears(years)
        
        // If no years found, add some default years
        if (years.length === 0) {
          const defaultYears = ['1st Year', '2nd Year', '3rd Year', '4th Year']
          console.log('No years found, using default years:', defaultYears)
          setAvailableYears(defaultYears)
        }
      } else {
        console.warn('Invalid response format:', response)
        // Fallback to default years
        const defaultYears = ['1st Year', '2nd Year', '3rd Year', '4th Year']
        setAvailableYears(defaultYears)
      }
    } catch (error) {
      console.error('Failed to load years:', error)
      // Fallback to default years on error
      const defaultYears = ['1st Year', '2nd Year', '3rd Year', '4th Year']
      setAvailableYears(defaultYears)
    } finally {
      setLoadingYears(false)
    }
  }

  const handleDepartmentClick = (dept) => {
    setSelectedDept(dept)
    setViewLevel('staff')
    loadStaff(dept.name)
  }

  const handleBack = () => {
    setViewLevel('departments')
    setSelectedDept(null)
    setStaff([])
  }

  const testDirectAPI = async () => {
    console.log('=== TESTING DIRECT API CALL ===')
    try {
      const testData = {
        name: 'Direct Test Staff',
        email: 'directtest@example.com',
        password: 'test123',
        department: selectedDept?.name || 'M.Tech',
        designation: 'Assistant Professor',
        contact: '1234567890'
      }
      console.log('Testing with data:', testData)
      const response = await adminApi.addStaff(testData)
      console.log('Direct API response:', response)
      setMessage('Direct API test successful!')
      await loadStaff(selectedDept.name)
    } catch (error) {
      console.error('Direct API test failed:', error)
      setMessage('Direct API test failed: ' + error.message)
    }
  }

  const openAddModal = () => {
    // Force clear all form data
    const cleanFormData = {
      name: '',
      email: '',
      password: '',
      department: selectedDept?.name || 'M.Tech',
      designation: 'Assistant Professor',
      contact: '',
      isClassAdvisor: false,
      advisorYear: ''
    }
    console.log('Opening add modal with clean form data:', cleanFormData)
    setFormData(cleanFormData)
    setAvailableYears([])
    setShowAddModal(true)
    setMessage('')
  }

  const openEditModal = (staffMember) => {
    setSelectedStaff(staffMember)
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      department: staffMember.department || 'M.Tech',
      designation: staffMember.designation,
      contact: staffMember.contact || '',
      isClassAdvisor: staffMember.isClassAdvisor || false,
      advisorYear: staffMember.advisorFor?.year || ''
    })
    
    // Load available years if staff is currently a class advisor
    if (staffMember.isClassAdvisor && staffMember.department) {
      loadAvailableYears(staffMember.department)
    }
    
    setShowEditModal(true)
    setMessage('')
  }

  const openDeleteModal = (staffMember) => {
    setSelectedStaff(staffMember)
    setShowDeleteModal(true)
    setMessage('')
  }

  const openPasswordModal = (staffMember) => {
    setSelectedStaff(staffMember)
    setFormData({ ...formData, password: '' })
    setShowPasswordModal(true)
    setMessage('')
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    console.log('=== ADD STAFF FORM SUBMISSION ===')
    console.log('Form data:', formData)
    console.log('Selected department:', selectedDept)
    
    // Validate required fields
    if (!formData.name || !formData.email || !formData.password) {
      console.error('Missing required fields:', {
        name: !formData.name,
        email: !formData.email,
        password: !formData.password
      })
      setMessage('Please fill in all required fields (Name, Email, Password)')
      return
    }
    
    if (!selectedDept || !selectedDept.name) {
      console.error('No department selected')
      setMessage('No department selected. Please go back and select a department.')
      return
    }
    
    try {
      const staffData = {
        ...formData,
        department: selectedDept.name
      }
      
      console.log('Sending staff data to API:', staffData)
      
      // Add staff first
      const addResponse = await adminApi.addStaff(staffData)
      console.log('API response:', addResponse)
      
      // If this staff is assigned as class advisor, assign them to hierarchy
      if (formData.isClassAdvisor && formData.advisorYear) {
        try {
          console.log('Assigning class advisor to hierarchy:', {
            staffId: formData.email,
            department: selectedDept.name,
            year: formData.advisorYear,
            isClassAdvisor: true
          })
          
          const hierarchyResponse = await fetch('/admin/hierarchy/assign-staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staffId: formData.email, // Staff ID is their email
              department: selectedDept.name,
              year: formData.advisorYear,
              isClassAdvisor: true
            })
          })
          
          const hierarchyData = await hierarchyResponse.json()
          console.log('Hierarchy assignment response:', hierarchyData)
          
          if (!hierarchyResponse.ok) {
            console.error('Hierarchy assignment failed:', hierarchyData)
          } else {
            console.log('✓ Class advisor assigned to hierarchy successfully')
          }
        } catch (hierarchyError) {
          console.error('Failed to assign class advisor:', hierarchyError)
          // Don't fail the whole operation if hierarchy assignment fails
        }
      }
      
      // Remove department placeholder if it exists
      const currentStaff = await adminApi.getStaffByDepartment(selectedDept.name)
      const placeholderStaff = currentStaff.staff.find(s => s.isDepartmentPlaceholder || s.designation === 'Department Placeholder')
      if (placeholderStaff) {
        await adminApi.deleteStaff(placeholderStaff.id)
      }
      
      setMessage(`Staff added successfully!${formData.isClassAdvisor ? ' Assigned as class advisor for ' + formData.advisorYear : ''}`)
      setShowAddModal(false)
      setFormData({
        name: '',
        email: '',
        password: '',
        department: 'M.Tech',
        designation: 'Assistant Professor',
        contact: '',
        isClassAdvisor: false,
        advisorYear: ''
      })
      await loadStaff(selectedDept.name)
      // Also refresh departments to update counts
      await loadDepartments()
    } catch (error) {
      console.error('Add staff error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        raw: error.raw
      })
      
      let errorMessage = 'Failed to add staff'
      if (error.code === 'email_already_exists') {
        errorMessage = 'Email already exists. Please use a different email.'
      } else if (error.code === 'network_error') {
        errorMessage = 'Network error. Please check your connection.'
      } else if (error.message) {
        errorMessage = `Failed to add staff: ${error.message}`
      }
      
      setMessage(errorMessage)
    }
  }

  const handleEditStaff = async (e) => {
    e.preventDefault()
    try {
      // Update staff basic information
      await adminApi.updateStaff(selectedStaff.id, formData)
      
      // If this staff is assigned as class advisor, assign them to hierarchy
      if (formData.isClassAdvisor && formData.advisorYear) {
        try {
          console.log('Assigning class advisor to hierarchy:', {
            staffId: formData.email,
            department: formData.department,
            year: formData.advisorYear,
            isClassAdvisor: true
          })
          
          const hierarchyResponse = await fetch('/admin/hierarchy/assign-staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staffId: formData.email,
              department: formData.department,
              year: formData.advisorYear,
              isClassAdvisor: true
            })
          })
          
          if (!hierarchyResponse.ok) {
            console.error('Failed to assign hierarchy')
          }
        } catch (hierarchyError) {
          console.error('Hierarchy assignment error:', hierarchyError)
        }
      }
      
      setMessage(`Staff updated successfully!${formData.isClassAdvisor ? ' Assigned as class advisor for ' + formData.advisorYear : ''}`)
      setShowEditModal(false)
      loadStaff(selectedDept.name)
    } catch (error) {
      console.error('Edit staff error:', error)
      setMessage('Failed to update staff')
    }
  }

  const handleDeleteStaff = async () => {
    try {
      await adminApi.deleteStaff(selectedStaff.id)
      setMessage('Staff deleted successfully!')
      setShowDeleteModal(false)
      loadStaff(selectedDept.name)
    } catch (error) {
      setMessage('Failed to delete staff')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      await adminApi.resetStaffPassword(selectedStaff.id, formData.password)
      setMessage('Password reset successfully!')
      setShowPasswordModal(false)
      setFormData({ ...formData, password: '' })
    } catch (error) {
      setMessage('Failed to reset password')
    }
  }

  const handleAddDepartment = async (e) => {
    e.preventDefault()
    if (!newDeptName.trim()) {
      setMessage('Please enter a department name')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    try {
      const response = await adminApi.createDepartment(newDeptName.trim())
      
      setShowAddDeptModal(false)
      setMessage(`✓ Department "${newDeptName}" created successfully! The department card is now available.`)
      setNewDeptName('')
      
      // Refresh departments list
      await loadDepartments()
      
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('Department creation error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
      setMessage('Failed to create department: ' + errorMessage)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleBulkDeleteDepartments = async () => {
    try {
      let deletedCount = 0
      let totalStaffDeleted = 0
      let totalStudentsDeleted = 0
      
      for (const deptName of selectedDepartments) {
        console.log(`Deleting department: ${deptName}`)
        
        try {
          // Delete all staff in this department
          console.log(`Getting staff for department: ${deptName}`)
          const staffResponse = await adminApi.getStaffByDepartment(deptName)
          console.log(`Found ${staffResponse.staff.length} staff members`)
          
          for (const staff of staffResponse.staff) {
            try {
              await adminApi.deleteStaff(staff.id)
              totalStaffDeleted++
              console.log(`Deleted staff: ${staff.name}`)
            } catch (staffError) {
              console.error(`Failed to delete staff ${staff.name}:`, staffError)
            }
          }
          
          // Delete all students in this department
          console.log(`Getting students for department: ${deptName}`)
          const studentsResponse = await adminApi.getStudentsByDepartment(deptName, null)
          console.log(`Found ${studentsResponse.students.length} students`)
          
          for (const student of studentsResponse.students) {
            try {
              await adminApi.deleteStudent(student.regNo)
              totalStudentsDeleted++
              console.log(`Deleted student: ${student.name}`)
            } catch (studentError) {
              console.error(`Failed to delete student ${student.name}:`, studentError)
            }
          }
          
          deletedCount++
          console.log(`Successfully processed department: ${deptName}`)
          
        } catch (deptError) {
          console.error(`Failed to process department ${deptName}:`, deptError)
        }
      }
      
      setMessage(`${deletedCount} department(s) deleted successfully! (${totalStaffDeleted} staff, ${totalStudentsDeleted} students)`)
      setShowBulkDeleteModal(false)
      setSelectedDepartments([])
      await loadDepartments()
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('Bulk delete error:', error)
      setMessage('Failed to delete departments: ' + (error.message || 'Unknown error'))
      setShowBulkDeleteModal(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const toggleDepartmentSelection = (deptName) => {
    setSelectedDepartments(prev => 
      prev.includes(deptName) 
        ? prev.filter(name => name !== deptName)
        : [...prev, deptName]
    )
  }

  if (loading && viewLevel === 'departments') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading departments...</div>
      </div>
    )
  }


  // LEVEL 1: DEPARTMENTS VIEW
  if (viewLevel === 'departments') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">Select Department</h2>
              <p className="text-gray-600">Choose a department to manage staff</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                <span>Add Department</span>
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                disabled={departments.length === 0}
              >
                <span className="text-xl">−</span>
                <span>Delete Departments</span>
              </button>
            </div>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.includes('success') || message.includes('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {departments.map(dept => (
              <div
                key={dept.name}
                onClick={() => handleDepartmentClick(dept)}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-purple-500 transform hover:scale-105"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{dept.name}</h3>
                  <span className="text-4xl">👩‍🏫</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                    <span className="text-sm text-gray-600">Staff Members</span>
                    <span className="text-lg font-bold text-purple-600">{dept.staff.total}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                    <span className="text-sm text-gray-600">Students</span>
                    <span className="text-lg font-bold text-blue-600">{dept.students.total}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Department Modal */}
        {showAddDeptModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowAddDeptModal(false); setMessage(''); }}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">Add New Department</h2>
              <p className="text-sm text-gray-600 mb-4">
                Create a new department that will appear immediately as a department card. You can then add staff to this department.
              </p>
              <form onSubmit={handleAddDepartment} className="space-y-3">
                <input
                  type="text"
                  placeholder="Department Name (e.g., Computer Science)"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowAddDeptModal(false); setMessage(''); }} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg">Create Department</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Delete Departments Modal */}
        {showBulkDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowBulkDeleteModal(false); setSelectedDepartments([]); }}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-red-600">⚠️ Delete Departments</h2>
              <p className="mb-4 text-gray-700">
                Select departments to delete. This will permanently remove all staff and data in the selected departments.
              </p>
              
              <div className="max-h-60 overflow-y-auto mb-4">
                {departments.map(dept => (
                  <div key={dept.name} className="flex items-center p-3 border rounded-lg mb-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`dept-${dept.name}`}
                      checked={selectedDepartments.includes(dept.name)}
                      onChange={() => toggleDepartmentSelection(dept.name)}
                      className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`dept-${dept.name}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">{dept.name}</div>
                      <div className="text-sm text-gray-500">
                        {dept.staff.total} staff, {dept.students.total} students
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              
              {selectedDepartments.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                  <strong>Warning:</strong> This will delete {selectedDepartments.length} department(s) and all their associated staff and student data!
                </div>
              )}
              
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => { setShowBulkDeleteModal(false); setSelectedDepartments([]); }} 
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkDeleteDepartments} 
                  disabled={selectedDepartments.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Delete {selectedDepartments.length} Department{selectedDepartments.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // LEVEL 2: STAFF LIST VIEW
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button
            onClick={handleBack}
            className="text-blue-600 hover:underline"
          >
            Departments
          </button>
          <span className="text-gray-400">›</span>
          <span className="text-gray-800 font-semibold">{selectedDept.name}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{selectedDept.name} - Staff</h2>
            <p className="text-gray-600">Total Staff: {staff.length}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ← Back to Departments
            </button>
            <button
              onClick={testDirectAPI}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 mr-2"
            >
              🧪 Test API
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Staff
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Staff Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading staff...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm border rounded-lg">
              <thead className="text-gray-600 bg-gray-50">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.length > 0 ? staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{s.name}</td>
                    <td className="py-3 px-4">{s.email}</td>
                    <td className="py-3 px-4">{s.designation}</td>
                    <td className="py-3 px-4">{s.contact || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${s.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 space-x-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openPasswordModal(s)}
                        className="px-3 py-1 rounded-md bg-yellow-600 text-white text-xs hover:bg-yellow-700"
                      >
                        Reset Pwd
                      </button>
                      <button
                        onClick={() => openDeleteModal(s)}
                        className="px-3 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">No staff found in this department</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddModal(false)
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" 
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <h2 className="text-xl font-bold mb-4">Add New Staff</h2>
            <form key="add-staff-form" onSubmit={(e) => {
              console.log('FORM SUBMIT TRIGGERED')
              handleAddStaff(e)
            }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" placeholder="Enter full name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input 
                  type="email" 
                  placeholder="Enter email address" 
                  value={formData.email} 
                  onChange={(e) => {
                    e.stopPropagation()
                    setFormData({...formData, email: e.target.value})
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                  }}
                  onFocus={(e) => {
                    e.stopPropagation()
                  }}
                  className="w-full px-3 py-2 border rounded-lg" 
                  autoComplete="new-email"
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input 
                  type="password" 
                  placeholder="Enter password" 
                  value={formData.password} 
                  onChange={(e) => {
                    e.stopPropagation()
                    setFormData({...formData, password: e.target.value})
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                  }}
                  onFocus={(e) => {
                    e.stopPropagation()
                  }}
                  className="w-full px-3 py-2 border rounded-lg" 
                  autoComplete="new-password"
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input type="text" placeholder="Enter contact number" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation *</label>
                <select value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  <option>Assistant Professor</option>
                  <option>Associate Professor</option>
                  <option>Professor</option>
                </select>
              </div>
              
              {/* Class Advisor Assignment */}
              <div className="bg-blue-50 p-3 rounded-lg border">
                <div className="flex items-center mb-2">
                  <input 
                    type="checkbox" 
                    id="isClassAdvisor" 
                    checked={formData.isClassAdvisor}
                    onChange={(e) => {
                      console.log('Class advisor checkbox changed:', e.target.checked)
                      console.log('Selected department:', selectedDept?.name)
                      setFormData({...formData, isClassAdvisor: e.target.checked})
                      if (e.target.checked && selectedDept?.name) {
                        console.log('Loading years for department:', selectedDept.name)
                        loadAvailableYears(selectedDept.name)
                      } else if (e.target.checked) {
                        console.warn('No department selected, cannot load years')
                      }
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isClassAdvisor" className="text-sm font-medium text-blue-800">
                    👨‍🏫 Assign as Class Advisor
                  </label>
                </div>
                
                {formData.isClassAdvisor && (
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Select Year:</label>
                    {loadingYears ? (
                      <div className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-gray-50 text-gray-500 text-center">
                        Loading years...
                      </div>
                    ) : (
                      <select 
                        value={formData.advisorYear} 
                        onChange={(e) => setFormData({...formData, advisorYear: e.target.value})}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required={formData.isClassAdvisor}
                        disabled={loadingYears}
                      >
                        <option value="">Select Year</option>
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    )}
                    {availableYears.length === 0 && !loadingYears && (
                      <p className="text-xs text-orange-600 mt-1">
                        No years found. Default years will be available.
                      </p>
                    )}
                    {formData.advisorYear && (
                      <p className="text-xs text-blue-600 mt-1">
                        This staff will be assigned as class advisor for {selectedDept.name} {formData.advisorYear}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button 
                  type="submit" 
                  onClick={(e) => {
                    console.log('SUBMIT BUTTON CLICKED')
                    console.log('Form data at click:', formData)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Add Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Edit Staff</h2>
            <form onSubmit={handleEditStaff} className="space-y-3">
              <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="text" placeholder="Contact" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              <select value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option>Assistant Professor</option>
                <option>Associate Professor</option>
                <option>Professor</option>
              </select>
              
              {/* Department Selection */}
              <select 
                value={formData.department} 
                onChange={(e) => setFormData({...formData, department: e.target.value})} 
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="M.Tech">M.Tech</option>
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>
              
              {/* Class Advisor Assignment */}
              <div className="border-t pt-3">
                <div className="flex items-center mb-2">
                  <input 
                    type="checkbox" 
                    id="editIsClassAdvisor" 
                    checked={formData.isClassAdvisor}
                    onChange={(e) => {
                      setFormData({...formData, isClassAdvisor: e.target.checked})
                      if (e.target.checked && formData.department) {
                        loadAvailableYears(formData.department)
                      }
                    }}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="editIsClassAdvisor" className="text-sm font-medium text-blue-800">
                    👨‍🏫 Assign as Class Advisor
                  </label>
                </div>
                
                {formData.isClassAdvisor && (
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">Select Year:</label>
                    {loadingYears ? (
                      <div className="text-sm text-gray-500">Loading years...</div>
                    ) : (
                      <select 
                        value={formData.advisorYear} 
                        onChange={(e) => setFormData({...formData, advisorYear: e.target.value})}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required={formData.isClassAdvisor}
                        disabled={loadingYears}
                      >
                        <option value="">Select Year</option>
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Delete</h2>
            <p className="mb-4">Are you sure you want to delete <strong>{selectedStaff.name}</strong>?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleDeleteStaff} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
            <p className="mb-4 text-gray-600">Reset password for <strong>{selectedStaff.name}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input type="password" placeholder="New Password (min 6 characters)" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required minLength="6" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-lg">Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
