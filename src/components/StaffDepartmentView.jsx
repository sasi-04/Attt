import React, { useState, useEffect, useCallback } from 'react'
import { staffApi, adminApi } from './api.js'
import AddStudentModal from './AddStudentModal.jsx'

export default function StaffDepartmentView() {
  const [viewLevel, setViewLevel] = useState('years') // 'years', 'students' - removed 'departments'
  const [selectedYear, setSelectedYear] = useState(null)
  const [years, setYears] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [staffInfo, setStaffInfo] = useState(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [staffDepartment, setStaffDepartment] = useState(null)

  // Load years directly from staff's department
  const loadYears = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get fresh staff info from localStorage
      const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
      
      if (!user.email) {
        setMessage('Please log in again')
        setLoading(false)
        return
      }
      
      setStaffInfo(user)
      
      // Determine staff's department
      let deptName = null
      if (user.isClassAdvisor && user.advisorFor) {
        deptName = user.advisorFor.department
      } else if (user.department) {
        deptName = user.department
      }
      
      if (!deptName) {
        setMessage('No department assigned to your account')
        setLoading(false)
        return
      }
      
      setStaffDepartment(deptName)
      console.log('Loading years for staff department:', deptName)
      
      // Get department summary to get all years
      const response = await staffApi.getDepartmentsSummary()
      
      if (response && response.departments) {
        const staffDept = response.departments.find(d => d.name === deptName)
        
        if (staffDept && staffDept.years) {
          // Get all years from the department
          const availableYears = staffDept.years || []
          console.log('Available years for', deptName, ':', availableYears)
          
          // Get student counts for each year
          const yearsWithCounts = await Promise.all(
            availableYears.map(async (year) => {
              try {
                console.log(`Loading student count for ${deptName} - ${year}`)
                const studentsResponse = await staffApi.getStudentsByDepartment(deptName, year)
                console.log(`Response for ${year}:`, studentsResponse)
                
                if (studentsResponse && studentsResponse.students && Array.isArray(studentsResponse.students)) {
                  const studentCount = studentsResponse.students.filter(s => 
                    s && 
                    !s.isYearPlaceholder && 
                    !s.isDepartmentPlaceholder && 
                    !s.isPlaceholder &&
                    s.name &&
                    !s.name.includes('[Year:') && 
                    !s.name.includes('[Department:')
                  ).length
                  console.log(`Student count for ${year}: ${studentCount}`)
                  return {
                    name: year,
                    department: deptName,
                    studentCount: studentCount
                  }
                } else {
                  console.warn(`No students in response for ${year}`)
                  return {
                    name: year,
                    department: deptName,
                    studentCount: 0
                  }
                }
              } catch (error) {
                console.error(`Error loading students for ${year}:`, error)
                console.error(`Error details:`, error.message)
                return {
                  name: year,
                  department: deptName,
                  studentCount: 0
                }
              }
            })
          )
          
          setYears(yearsWithCounts)
          setMessage('')
          
          // Don't auto-select - always show years view first
          // User must click on a year to see students
        } else {
          setMessage(`No years available for ${deptName}`)
          setYears([])
        }
      } else {
        setMessage('Failed to load department information')
        setYears([])
      }
    } catch (error) {
      console.error('Failed to load years:', error)
      setMessage('Failed to load years')
      setYears([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Get staff info and load years
    const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
    setStaffInfo(user)
    
    if (user.email) {
      loadYears()
    } else {
      setLoading(false)
      setMessage('Authentication required. Please log in again.')
    }
  }, [loadYears])

  const loadStudents = async (department, year) => {
    try {
      setLoading(true)
      setMessage('')
      console.log('=== LOADING STUDENTS ===')
      console.log('Department:', department)
      console.log('Year:', year)
      
      const response = await staffApi.getStudentsByDepartment(department, year)
      console.log('Students API response:', response)
      console.log('Response students array:', response?.students)
      console.log('Response students count:', response?.students?.length)
      
      // Check for API errors first
      if (response.error) {
        console.error('API error:', response.error, response.message)
        if (response.error === 'year_access_denied' || response.error === 'department_access_denied') {
          setMessage(`Access denied: ${response.message || 'You do not have permission to view students in this year'}`)
        } else {
          setMessage(`Error: ${response.message || response.error}`)
        }
        setStudents([])
        return
      }
      
      if (response && response.students && Array.isArray(response.students)) {
        // Filter out placeholder entries
        const filteredStudents = response.students.filter(s => {
          if (!s) return false
          const isValid = !s.isYearPlaceholder && 
                         !s.isDepartmentPlaceholder && 
                         !s.isPlaceholder &&
                         s.name && 
                         !s.name.includes('[Year:') && 
                         !s.name.includes('[Department:')
          if (!isValid) {
            console.log('Filtered out student:', s)
          }
          return isValid
        })
        
        console.log('Filtered students count:', filteredStudents.length)
        console.log('Student names:', filteredStudents.map(s => `${s.name} (${s.regNo || s.studentId})`))
        setStudents(filteredStudents)
        
        if (filteredStudents.length === 0) {
          setMessage('No students found for this year')
        } else {
          setMessage('') // Clear any previous messages
        }
      } else {
        console.warn('No students in response or invalid response format')
        console.warn('Response structure:', response)
        setStudents([])
        setMessage('No students found for this year')
      }
    } catch (error) {
      console.error('Failed to load students:', error)
      console.error('Error details:', error.message, error.stack)
      setMessage('Failed to load students: ' + (error.message || 'Unknown error'))
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const handleYearClick = (year) => {
    console.log('Year clicked:', year)
    setSelectedYear(year)
    setViewLevel('students')
    setMessage('Loading students...')
    loadStudents(year.department, year.name)
  }

  const handleBackToYears = () => {
    setViewLevel('years')
    setSelectedYear(null)
    setMessage('')
  }

  const handleAddStudent = () => {
    setShowAddStudent(true)
  }

  const handleStudentAdded = (newStudent) => {
    console.log('Student added callback received:', newStudent)
    setMessage('✓ Student added successfully!')
    setTimeout(() => setMessage(''), 5000)
    
    // Close modal
    setShowAddStudent(false)
    
    // Reload students after a delay to ensure database updates are complete
    setTimeout(() => {
      if (selectedYear && staffDepartment) {
        console.log('Reloading students for:', staffDepartment, selectedYear.name)
        loadStudents(staffDepartment, selectedYear.name)
      }
    }, 300)
    
    // Also reload after a longer delay as backup
    setTimeout(() => {
      if (selectedYear && staffDepartment) {
        console.log('Second reload attempt for:', staffDepartment, selectedYear.name)
        loadStudents(staffDepartment, selectedYear.name)
      }
    }, 1500)
  }

  // Check if staff can add students to this year
  // Only class advisors can add students, and only for their assigned year
  const canAddStudents = () => {
    if (!staffInfo || !selectedYear) return false
    
    // Only class advisors can add students
    if (!staffInfo.isClassAdvisor || !staffInfo.advisorFor) {
      return false
    }
    
    // Class advisor can only add students to their assigned year
    return staffInfo.advisorFor.department === selectedYear.department &&
           staffInfo.advisorFor.year === selectedYear.name
  }

  // Check if staff is class advisor for this year
  const isClassAdvisorForYear = (yearName) => {
    if (!staffInfo || !staffInfo.isClassAdvisor || !staffInfo.advisorFor) {
      return false
    }
    return staffInfo.advisorFor.department === staffDepartment &&
           staffInfo.advisorFor.year === yearName
  }

  if (loading && viewLevel === 'years') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.includes('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* Years View - Now the main/default view */}
      {viewLevel === 'years' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              {staffDepartment ? `${staffDepartment} - Years` : 'Years'}
            </h2>
            <p className="text-gray-600 text-sm">
              {staffInfo?.isClassAdvisor 
                ? `You are the class advisor for ${staffInfo.advisorFor?.year}. You can add students and manage your class.`
                : 'You can view all years in your department. Only class advisors can add students.'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {years.map(year => {
              const isAdvisor = isClassAdvisorForYear(year.name)
              return (
                <div
                  key={year.name}
                  onClick={() => handleYearClick(year)}
                  className={`p-6 border rounded-lg hover:bg-green-50 hover:border-green-300 cursor-pointer transition-colors ${
                    isAdvisor ? 'border-blue-300 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{year.name}</h3>
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    <span>{year.studentCount} Students</span>
                  </div>
                  {isAdvisor && (
                    <div className="mt-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                        👨‍🏫 Your Class - Can Add Students
                      </span>
                    </div>
                  )}
                  {!isAdvisor && staffInfo?.isClassAdvisor && (
                    <div className="mt-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        View Only
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {years.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No years available for your department
            </div>
          )}
        </div>
      )}

      {/* Students View */}
      {viewLevel === 'students' && selectedYear && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={handleBackToYears}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span>←</span>
              <span>Back to Years</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                {staffDepartment} - {selectedYear.name}
              </h2>
              <p className="text-gray-600">{students.length} students</p>
              {isClassAdvisorForYear(selectedYear.name) && (
                <p className="text-blue-600 text-sm mt-1">
                  👨‍🏫 You are the class advisor for this year
                </p>
              )}
            </div>
            
            {canAddStudents() && (
              <button
                onClick={handleAddStudent}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                ➕ Add Student
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-gray-600 border-b">
                <tr>
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">Roll Number</th>
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-left">Attendance</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      No students found
                      {canAddStudents() && (
                        <div className="mt-2">
                          <button
                            onClick={handleAddStudent}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Add the first student
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  students.map(student => (
                    <tr key={student.regNo || student.studentId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{student.name}</td>
                      <td className="py-3 px-4">{student.regNo || student.studentId}</td>
                      <td className="py-3 px-4 text-gray-600">{student.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          (student.attendance || 0) >= 85 ? 'bg-green-100 text-green-800' :
                          (student.attendance || 0) >= 75 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {student.attendance || 0}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm transition-colors">
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <AddStudentModal
          key={showAddStudent ? 'add-student-modal' : null}
          onClose={() => setShowAddStudent(false)}
          onStudentAdded={handleStudentAdded}
        />
      )}
    </div>
  )
}
