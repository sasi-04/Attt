import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { adminApi } from './api.js'
import { useDepartmentUpdates, useStudentUpdates } from '../hooks/useWebSocket.js'

export default function HierarchicalStudentView() {
  const [viewLevel, setViewLevel] = useState('departments') // 'departments', 'years', 'students'
  const [selectedDept, setSelectedDept] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [departments, setDepartments] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [message, setMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [query, setQuery] = useState('')
  const [minAtt, setMinAtt] = useState(0)
  const [maxAtt, setMaxAtt] = useState(100)
  const [showAddYearModal, setShowAddYearModal] = useState(false)
  const [selectedYears, setSelectedYears] = useState([])
  const [showBulkDeleteYearModal, setShowBulkDeleteYearModal] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [addStudentTab, setAddStudentTab] = useState('manual') // 'manual' or 'csv'
  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [hierarchyData, setHierarchyData] = useState({})
  const [newYear, setNewYear] = useState('')
  const [newStudent, setNewStudent] = useState({
    name: '',
    regNo: '',
    studentId: '',
    email: '',
    password: ''
  })

  useEffect(() => {
    loadDepartments()
  }, [])

  // Clear student form when modal closes
  useEffect(() => {
    if (!showAddStudentModal) {
      setNewStudent({
        name: '',
        regNo: '',
        studentId: '',
        email: '',
        password: ''
      })
      setAddStudentTab('manual')
      setCsvFile(null)
      setCsvPreview([])
    }
  }, [showAddStudentModal])

  // Handle CSV file selection
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      parseCSV(file)
    } else {
      setMessage('Please select a valid CSV file')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // Parse CSV file
  const parseCSV = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setMessage('CSV file must have at least a header row and one data row')
        setTimeout(() => setMessage(''), 3000)
        return
      }
      
      const headers = lines[0].split(',').map(h => h.trim())
      const expectedHeaders = ['name', 'regNo', 'studentId', 'email', 'password']
      
      // Check if headers match expected format
      const hasValidHeaders = expectedHeaders.every(header => 
        headers.some(h => h.toLowerCase() === header.toLowerCase())
      )
      
      if (!hasValidHeaders) {
        setMessage('CSV headers must include: name, regNo, studentId, email, password')
        setTimeout(() => setMessage(''), 3000)
        return
      }
      
      // Parse data rows
      const students = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length === headers.length) {
          const student = {}
          headers.forEach((header, index) => {
            student[header.toLowerCase()] = values[index]
          })
          students.push(student)
        }
      }
      
      setCsvPreview(students)
      setMessage(`${students.length} students loaded from CSV`)
      setTimeout(() => setMessage(''), 3000)
    }
    reader.readAsText(file)
  }

  // Download CSV template
  const downloadCSVTemplate = () => {
    const csvContent = 'name,regNo,studentId,email,password\nJohn Doe,ES22CJ01,ES22CJ01,john@example.com,student123\nJane Smith,ES22CJ02,ES22CJ02,jane@example.com,student123'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Handle bulk CSV upload
  const handleBulkUpload = async () => {
    if (csvPreview.length === 0) {
      setMessage('No students to upload')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    try {
      let successCount = 0
      let errorCount = 0
      
      for (const student of csvPreview) {
        try {
          const studentData = {
            ...student,
            department: selectedDept.name,
            year: selectedYear
          }
          await adminApi.createStudent(studentData)
          successCount++
        } catch (error) {
          console.error(`Failed to add student ${student.name}:`, error)
          errorCount++
        }
      }
      
      setMessage(`Successfully added ${successCount} students. ${errorCount > 0 ? `${errorCount} failed.` : ''}`)
      
      if (successCount > 0) {
        // Remove year placeholder if it exists
        const currentStudents = await adminApi.getStudentsByDepartment(selectedDept.name, selectedYear)
        const yearPlaceholder = currentStudents.students.find(s => s.isYearPlaceholder)
        if (yearPlaceholder) {
          try {
            await adminApi.deleteStudent(yearPlaceholder.regNo)
          } catch (placeholderError) {
            console.error('Failed to remove year placeholder:', placeholderError)
          }
        }
        
        setShowAddStudentModal(false)
        loadStudents(selectedDept.name, selectedYear)
      }
      
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      setMessage('Failed to upload students')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  // Handle real-time department updates
  const handleDepartmentUpdate = useCallback((update) => {
    console.log('Department update received in students:', update)
    // Refresh departments when any department-related change occurs
    loadDepartments()
    // If we're viewing a specific department, refresh it
    if (selectedDept) {
      adminApi.getDepartmentsSummary().then(response => {
        const updatedDept = response.departments.find(d => d.name === selectedDept.name)
        if (updatedDept) {
          setSelectedDept(updatedDept)
        }
      }).catch(error => {
        console.error('Failed to refresh department:', error)
      })
    }
    // Also refresh hierarchy data when staff assignments change
    if (update.type === 'hierarchy-updated' || update.type === 'staff-created' || update.type === 'staff-updated') {
      loadHierarchyData()
    }
  }, [selectedDept])

  // Handle real-time student updates
  const handleStudentUpdate = useCallback((update) => {
    console.log('Student update received:', update)
    // Refresh departments to update counts
    loadDepartments()
    // If we're viewing students for a specific department/year, refresh that too
    if (selectedDept && selectedYear && viewLevel === 'students') {
      loadStudents(selectedDept.name, selectedYear)
    }
  }, [selectedDept, selectedYear, viewLevel])

  // Subscribe to WebSocket updates
  useDepartmentUpdates(handleDepartmentUpdate)
  useStudentUpdates(handleStudentUpdate)

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getDepartmentsSummary()
      setDepartments(response.departments)
      // Also load hierarchy data to show class advisors
      await loadHierarchyData()
    } catch (error) {
      console.error('Failed to load departments:', error)
      setMessage('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  const loadHierarchyData = async () => {
    try {
      console.log('Loading hierarchy data for student management...')
      const response = await fetch('/admin/hierarchy/structure')
      const data = await response.json()
      console.log('Hierarchy data response:', data)
      
      if (data && data.hierarchy && typeof data.hierarchy === 'object') {
        console.log('Setting hierarchy data:', data.hierarchy)
        setHierarchyData(data.hierarchy)
      } else {
        console.warn('Invalid hierarchy data format:', data)
        setHierarchyData({})
      }
    } catch (error) {
      console.error('Failed to load hierarchy data:', error)
      setHierarchyData({})
    }
  }

  const loadStudents = async (dept, year) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dept) params.append('department', dept)
      if (year) params.append('year', year)
      
      const response = await adminApi.getStudentsByDepartment(dept, year)
      const mappedStudents = response.students.map(s => ({
        name: s.name,
        roll: s.regNo,
        dept: s.department || 'M.Tech',
        year: s.year || '4th Year',
        contact: s.email,
        attendance: s.attendance || 0,
        lastSeen: s.lastSeen || 'Never',
        studentId: s.studentId,
        attendedSessions: s.attendedSessions || 0,
        missedSessions: s.missedSessions || 0,
        totalSessions: s.totalSessions || 0,
        status: s.status || 'active'
      }))
      setStudents(mappedStudents)
    } catch (error) {
      console.error('Failed to load students:', error)
      setMessage('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleDepartmentClick = (dept) => {
    setSelectedDept(dept)
    setViewLevel('years')
    setMessage('') // Clear message when navigating
  }

  const handleYearClick = (year) => {
    setSelectedYear(year)
    setViewLevel('students')
    setMessage('') // Clear message when navigating
    loadStudents(selectedDept.name, year)
  }

  const handleBack = () => {
    setMessage('') // Clear message when navigating back
    if (viewLevel === 'students') {
      setViewLevel('years')
      setSelectedYear(null)
      setStudents([])
    } else if (viewLevel === 'years') {
      setViewLevel('departments')
      setSelectedDept(null)
    }
  }

  const handleViewProfile = (student) => {
    setSelectedStudent(student)
    setShowModal(true)
    setMessage('')
  }

  const handleDeleteStudent = async () => {
    try {
      await adminApi.deleteStudent(selectedStudent.roll)
      setMessage('Student deleted successfully!')
      setShowDeleteModal(false)
      loadStudents(selectedDept.name, selectedYear)
    } catch (error) {
      setMessage('Failed to delete student')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      await adminApi.resetStudentPassword(selectedStudent.roll, newPassword)
      setMessage('Password reset successfully!')
      setShowPasswordModal(false)
      setNewPassword('')
    } catch (error) {
      setMessage('Failed to reset password')
    }
  }

  const handleAddYear = async (e) => {
    e.preventDefault()
    if (!newYear) {
      setMessage('Please select a year')
      setTimeout(() => setMessage(''), 3000)
      return
    }
    
    try {
      const response = await adminApi.createYear(selectedDept.name, newYear)
      
      setShowAddYearModal(false)
      setMessage(`✓ Year "${newYear}" created successfully for ${selectedDept?.name}! The year card is now available.`)
      setNewYear('')
      
      // Refresh departments list to show the new year
      await loadDepartments()
      
      // Re-select the department to refresh the year view
      const updatedDepts = await adminApi.getDepartmentsSummary()
      const updatedDept = updatedDepts.departments.find(d => d.name === selectedDept.name)
      if (updatedDept) {
        setSelectedDept(updatedDept)
      }
      
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('Year creation error:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error'
      setMessage('Failed to create year: ' + errorMessage)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    try {
      const studentData = {
        ...newStudent,
        department: selectedDept.name,
        year: selectedYear
      }
      await adminApi.createStudent(studentData)
      
      // Remove year placeholder if it exists
      const currentStudents = await adminApi.getStudentsByDepartment(selectedDept.name, selectedYear)
      const yearPlaceholder = currentStudents.students.find(s => s.isYearPlaceholder)
      if (yearPlaceholder) {
        try {
          await adminApi.deleteStudent(yearPlaceholder.regNo)
          console.log('Year placeholder removed:', yearPlaceholder.regNo)
        } catch (placeholderError) {
          console.error('Failed to remove year placeholder:', placeholderError)
        }
      }
      
      setMessage('Student added successfully!')
      setShowAddStudentModal(false)
      setNewStudent({
        name: '',
        regNo: '',
        studentId: '',
        email: '',
        password: ''
      })
      loadStudents(selectedDept.name, selectedYear)
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage(error.message || 'Failed to add student')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleBulkDeleteYears = async () => {
    console.log('=== BULK DELETE YEARS START ===')
    console.log('Selected years to delete:', selectedYears)
    console.log('Department:', selectedDept.name)
    
    try {
      let deletedCount = 0
      let totalStudentsDeleted = 0
      let totalPlaceholdersDeleted = 0
      
      for (const yearName of selectedYears) {
        console.log(`--- Processing year: ${yearName} ---`)
        console.log(`Department: ${selectedDept.name}`)
        
        try {
          // Get ALL students for this department to find both regular students and year placeholders
          const allStudentsResponse = await adminApi.getStudentsByDepartment(selectedDept.name, null)
          const studentsToDelete = allStudentsResponse.students.filter(s => 
            s.year === yearName && s.department === selectedDept.name
          )
          
          console.log(`Found ${studentsToDelete.length} items to delete for year ${yearName}`)
          
          // Delete ALL students and placeholders for this year
          for (const student of studentsToDelete) {
            try {
              await adminApi.deleteStudent(student.regNo)
              if (student.isYearPlaceholder) {
                totalPlaceholdersDeleted++
                console.log(`✓ Deleted year placeholder for: ${yearName} (regNo: ${student.regNo})`)
              } else {
                totalStudentsDeleted++
                console.log(`✓ Deleted student: ${student.name} (regNo: ${student.regNo})`)
              }
            } catch (studentError) {
              console.error(`Failed to delete ${student.isYearPlaceholder ? 'year placeholder' : 'student'} ${student.name}:`, studentError)
            }
          }
          
          deletedCount++
          console.log(`Successfully deleted entire year card: ${yearName} (${studentsToDelete.length} total items removed)`)
          
        } catch (yearError) {
          console.error(`Failed to process year ${yearName}:`, yearError)
        }
      }
      
      setMessage(`${deletedCount} year card(s) completely deleted! (${totalStudentsDeleted} students + ${totalPlaceholdersDeleted} year cards removed)`)
      console.log('=== BULK DELETE YEARS COMPLETED ===')
      console.log(`Year cards deleted: ${deletedCount}`)
      console.log(`Students removed: ${totalStudentsDeleted}`)
      console.log(`Year placeholders removed: ${totalPlaceholdersDeleted}`)
      console.log(`Total items deleted: ${totalStudentsDeleted + totalPlaceholdersDeleted}`)
      setShowBulkDeleteYearModal(false)
      setSelectedYears([])
      await loadDepartments()
      
      // Re-select the department to refresh the year view
      const updatedDepts = await adminApi.getDepartmentsSummary()
      const updatedDept = updatedDepts.departments.find(d => d.name === selectedDept.name)
      if (updatedDept) {
        setSelectedDept(updatedDept)
      }
      
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('Bulk delete years error:', error)
      setMessage('Failed to delete years: ' + (error.message || 'Unknown error'))
      setShowBulkDeleteYearModal(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const toggleYearSelection = (yearName) => {
    setSelectedYears(prev => 
      prev.includes(yearName) 
        ? prev.filter(name => name !== yearName)
        : [...prev, yearName]
    )
  }

  const filteredStudents = useMemo(() => {
    const q = query.toLowerCase()
    return students.filter(s => {
      const matchesAttendance = s.attendance >= minAtt && s.attendance <= maxAtt
      const matchesName = s.name?.toLowerCase().includes(q)
      const matchesContact = s.contact?.toLowerCase().includes(q)
      const matchesRoll = s.roll?.toLowerCase().includes(q)
      
      return matchesAttendance && (matchesName || matchesContact || matchesRoll)
    })
  }, [query, minAtt, maxAtt, students])

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
          <div className="mb-4">
            <h2 className="text-2xl font-bold mb-2">Select Department</h2>
            <p className="text-gray-600">Choose a department to view students by year</p>
            <p className="text-sm text-blue-600 mt-1">💡 Tip: New departments can be created from the Staff Management page</p>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {departments.map(dept => (
              <div
                key={dept.name}
                onClick={() => handleDepartmentClick(dept)}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-500 transform hover:scale-105"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{dept.name}</h3>
                    <span className="text-4xl">🎓</span>
                  </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                    <span className="text-sm text-gray-600">Students</span>
                    <span className="text-lg font-bold text-blue-600">{dept.students.total}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                    <span className="text-sm text-gray-600">Staff</span>
                    <span className="text-lg font-bold text-green-600">{dept.staff.total}</span>
                  </div>
                </div>

                {Object.keys(dept.students.byYear).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-indigo-200">
                    <div className="text-xs text-gray-600 mb-2 font-semibold">Year Distribution:</div>
                    <div className="grid grid-cols-2 gap-1">
                      {Object.entries(dept.students.byYear).map(([year, count]) => (
                        <div key={year} className="text-xs bg-white px-2 py-1 rounded">
                          <span className="text-gray-600">{year}:</span>
                          <span className="font-semibold text-gray-800 ml-1">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    )
  }

  // LEVEL 2: YEARS VIEW
  if (viewLevel === 'years') {
    // Define year order
    const yearOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']
    
    // Get years from data (show all years including empty ones)
    let years = Object.keys(selectedDept.students.byYear)
    
    // Sort years according to the defined order
    years = years.sort((a, b) => {
      const indexA = yearOrder.indexOf(a)
      const indexB = yearOrder.indexOf(b)
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
    })

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span>←</span>
              <span>Back to Departments</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">{selectedDept.name}</h2>
              <p className="text-gray-600">Select a year to view students</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddYearModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span className="text-xl">+</span>
                <span>Add Year</span>
              </button>
              <button
                onClick={() => setShowBulkDeleteYearModal(true)}
                disabled={years.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <span className="text-xl">−</span>
                <span>Delete Years</span>
              </button>
              <button
                onClick={() => {
                  console.log('Manual refresh clicked')
                  loadHierarchyData()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span className="text-xl">🔄</span>
                <span>Refresh Advisors</span>
              </button>
            </div>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.includes('success') || message.includes('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          {years.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Years Yet</h3>
              <p className="text-gray-600 mb-4">This department doesn't have any students yet.</p>
              <p className="text-sm text-gray-500">Click "Add Year" above to prepare a year, then add students to it.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {years.map(year => {
              const count = selectedDept.students.byYear[year] || 0
              // Get class advisor for this department-year combination
              const classAdvisor = hierarchyData[selectedDept.name]?.[year]?.classAdvisor
              
              console.log(`Year card for ${selectedDept.name} ${year}:`, {
                hierarchyData: hierarchyData[selectedDept.name]?.[year],
                classAdvisor: classAdvisor
              })
              
              return (
                <div
                  key={year}
                  onClick={() => handleYearClick(year)}
                  className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-500 transform hover:scale-105"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">📚</div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{year}</h3>
                    <div className="text-3xl font-bold text-green-600 mb-1">{count}</div>
                    <div className="text-sm text-gray-600 mb-3">Students</div>
                    
                    {/* Class Advisor Information */}
                    <div className="border-t pt-3 mt-3">
                      <div className="text-xs font-semibold text-blue-700 mb-1">👨‍🏫 Class Advisor:</div>
                      {classAdvisor ? (
                        <div className="bg-blue-100 rounded-lg p-2 text-xs">
                          <div className="font-semibold text-blue-800">{classAdvisor.name}</div>
                          <div className="text-blue-600">{classAdvisor.designation}</div>
                        </div>
                      ) : (
                        <div className="bg-yellow-100 rounded-lg p-2 text-xs text-yellow-700">
                          Not assigned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>

        {/* Add Year Modal */}
        {showAddYearModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowAddYearModal(false); setMessage(''); }}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">Add Year to {selectedDept?.name}</h2>
              <p className="text-sm text-gray-600 mb-4">
                Create a new year that will appear immediately as a year card. You can then add students to this year.
              </p>
              <form onSubmit={handleAddYear} className="space-y-3">
                <select
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                </select>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowAddYearModal(false); setMessage(''); }} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Create Year</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Delete Years Modal */}
        {showBulkDeleteYearModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowBulkDeleteYearModal(false); setSelectedYears([]); }}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4 text-red-600">⚠️ Delete Years</h2>
              <p className="mb-4 text-gray-700">
                Select year cards to delete from <strong>{selectedDept?.name}</strong>. This will permanently remove the year cards and all students in the selected years.
              </p>
              
              <div className="max-h-60 overflow-y-auto mb-4">
                {years.map(year => {
                  const count = selectedDept.students.byYear[year] || 0
                  return (
                    <div key={year} className="flex items-center p-3 border rounded-lg mb-2 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        id={`year-${year}`}
                        checked={selectedYears.includes(year)}
                        onChange={() => toggleYearSelection(year)}
                        className="mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`year-${year}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{year}</div>
                        <div className="text-sm text-gray-500">
                          {count} students
                        </div>
                      </label>
                    </div>
                  )
                })}
              </div>
              
              {selectedYears.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 text-red-800 rounded-lg text-sm">
                  <strong>Warning:</strong> This will permanently delete {selectedYears.length} year card(s) and all students in those years!
                </div>
              )}
              
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => { setShowBulkDeleteYearModal(false); setSelectedYears([]); }} 
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkDeleteYears} 
                  disabled={selectedYears.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Delete {selectedYears.length} Year{selectedYears.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // LEVEL 3: STUDENTS VIEW
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button
            onClick={() => {
              setViewLevel('departments')
              setSelectedDept(null)
              setSelectedYear(null)
            }}
            className="text-blue-600 hover:underline"
          >
            Departments
          </button>
          <span className="text-gray-400">›</span>
          <button
            onClick={() => {
              setViewLevel('years')
              setSelectedYear(null)
            }}
            className="text-blue-600 hover:underline"
          >
            {selectedDept.name}
          </button>
          <span className="text-gray-400">›</span>
          <span className="text-gray-800 font-semibold">{selectedYear}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{selectedDept.name} - {selectedYear}</h2>
            <p className="text-gray-600">Total Students: {filteredStudents.length}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              <span>Add Student</span>
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ← Back to Years
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or roll number"
            className="flex-1 min-w-64 px-3 py-2 rounded-md border border-gray-200 bg-gray-50"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Attendance:</span>
            <input
              type="number"
              value={minAtt}
              onChange={(e) => setMinAtt(Number(e.target.value))}
              className="w-16 px-2 py-2 rounded-md border border-gray-200 bg-gray-50"
              min="0" max="100"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              value={maxAtt}
              onChange={(e) => setMaxAtt(Number(e.target.value))}
              className="w-16 px-2 py-2 rounded-md border border-gray-200 bg-gray-50"
              min="0" max="100"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Students Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading students...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm border rounded-lg">
              <thead className="text-gray-600 bg-gray-50">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(s => (
                    <tr key={s.roll} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{s.name}</td>
                      <td className="py-3 px-4">{s.roll}</td>
                      <td className="py-3 px-4">{s.contact}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs ${
                          s.attendance >= 90 ? 'bg-green-100 text-green-800' :
                          s.attendance >= 75 ? 'bg-blue-100 text-blue-800' :
                          s.attendance >= 60 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {s.attendance}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{s.lastSeen}</td>
                      <td className="py-3 px-4 space-x-2">
                        <button
                          onClick={() => handleViewProfile(s)}
                          className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs hover:bg-indigo-700"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(s)
                            setShowPasswordModal(true)
                          }}
                          className="px-3 py-1 rounded-md bg-yellow-600 text-white text-xs hover:bg-yellow-700"
                        >
                          Reset Pwd
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(s)
                            setShowDeleteModal(true)
                          }}
                          className="px-3 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals (same as before) */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedStudent.name}</h2>
                <p className="text-gray-600">{selectedStudent.roll}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Department</div>
                <div className="font-semibold text-gray-800">{selectedStudent.dept}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Year</div>
                <div className="font-semibold text-gray-800">{selectedStudent.year}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Contact</div>
                <div className="font-semibold text-gray-800">{selectedStudent.contact}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Last Seen</div>
                <div className="font-semibold text-gray-800">{selectedStudent.lastSeen}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Attendance Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <div className="text-3xl font-bold text-indigo-600">{selectedStudent.attendance}%</div>
                  <div className="text-sm text-gray-600 mt-1">Overall</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{selectedStudent.attendedSessions}</div>
                  <div className="text-sm text-gray-600 mt-1">Present</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{selectedStudent.missedSessions}</div>
                  <div className="text-sm text-gray-600 mt-1">Absent</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{selectedStudent.totalSessions}</div>
                  <div className="text-sm text-gray-600 mt-1">Total</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Delete</h2>
            <p className="mb-4">Are you sure you want to delete <strong>{selectedStudent.name}</strong>?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleDeleteStudent} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
            <p className="mb-4 text-gray-600">Reset password for <strong>{selectedStudent.name}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="password"
                placeholder="New Password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
                minLength="6"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-lg">Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowAddStudentModal(false); setMessage(''); }}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add Students to {selectedDept?.name} - {selectedYear}</h2>
            
            {/* Tab Navigation */}
            <div className="flex mb-6 border-b">
              <button
                type="button"
                onClick={() => setAddStudentTab('manual')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  addStudentTab === 'manual'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📝 Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setAddStudentTab('csv')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  addStudentTab === 'csv'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📄 CSV Upload
              </button>
            </div>

            {/* Manual Entry Tab */}
            {addStudentTab === 'manual' && (
              <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="Student Name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
                <input
                  type="text"
                  placeholder="e.g., ES22CJ01"
                  value={newStudent.regNo}
                  onChange={(e) => setNewStudent({...newStudent, regNo: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                <input
                  type="text"
                  placeholder="e.g., ES22CJ01"
                  value={newStudent.studentId}
                  onChange={(e) => setNewStudent({...newStudent, studentId: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  autocomplete="off"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={newStudent.password}
                  onChange={(e) => setNewStudent({...newStudent, password: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  autocomplete="new-password"
                  required
                  minLength="6"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setShowAddStudentModal(false); setMessage(''); }} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Add Student</button>
              </div>
              </form>
            )}

            {/* CSV Upload Tab */}
            {addStudentTab === 'csv' && (
              <div className="space-y-4">
                {/* CSV Format Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">📋 CSV Format Requirements</h3>
                  <p className="text-sm text-blue-700 mb-2">Your CSV file must include these columns (in any order):</p>
                  <div className="text-xs font-mono bg-white p-2 rounded border">
                    name,regNo,studentId,email,password
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Example: John Doe,ES22CJ01,ES22CJ01,john@example.com,student123
                  </p>
                  <button
                    type="button"
                    onClick={downloadCSVTemplate}
                    className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                  >
                    💾 Download Template
                  </button>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {/* CSV Preview */}
                {csvPreview.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">📊 Preview ({csvPreview.length} students)</h3>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left">Name</th>
                            <th className="px-2 py-1 text-left">Reg No</th>
                            <th className="px-2 py-1 text-left">Student ID</th>
                            <th className="px-2 py-1 text-left">Email</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {csvPreview.slice(0, 10).map((student, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-2 py-1">{student.name}</td>
                              <td className="px-2 py-1">{student.regno || student.regNo}</td>
                              <td className="px-2 py-1">{student.studentid || student.studentId}</td>
                              <td className="px-2 py-1">{student.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {csvPreview.length > 10 && (
                        <div className="text-center py-2 text-gray-500 text-xs">
                          ... and {csvPreview.length - 10} more students
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload Actions */}
                <div className="flex gap-2 justify-end">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddStudentModal(false); setMessage(''); }} 
                    className="px-4 py-2 bg-gray-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleBulkUpload}
                    disabled={csvPreview.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Upload {csvPreview.length} Students
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
