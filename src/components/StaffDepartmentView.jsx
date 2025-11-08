import React, { useState, useEffect, useCallback } from 'react'
import { staffApi, adminApi } from './api.js'
import AddStudentModal from './AddStudentModal.jsx'

export default function StaffDepartmentView() {
  const [viewLevel, setViewLevel] = useState('departments') // 'departments', 'years', 'students'
  const [selectedDept, setSelectedDept] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)
  const [departments, setDepartments] = useState([])
  const [years, setYears] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [staffInfo, setStaffInfo] = useState(null)
  const [showAddStudent, setShowAddStudent] = useState(false)

  const loadDepartments = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get fresh staff info from localStorage
      const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
      
      if (!user.email) {
        setMessage('Please log in again')
        setLoading(false)
        return
      }
      
      const response = await staffApi.getDepartmentsSummary()
      
      if (response && response.departments && response.departments.length > 0) {
        setDepartments(response.departments)
        setMessage('') // Clear any previous error messages
        
        // If staff is a class advisor, auto-select their department
        if (user.isClassAdvisor && user.advisorFor) {
          const staffDept = response.departments.find(d => d.name === user.advisorFor.department)
          if (staffDept) {
            setSelectedDept(staffDept)
            setViewLevel('years')
            loadYears(staffDept)
          }
        }
      } else {
        setMessage('No departments available for your account')
        setDepartments([])
      }
    } catch (error) {
      console.error('Failed to load departments:', error)
      setMessage('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Get staff info
    const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
    setStaffInfo(user)
    
    // Load departments after staff info is set
    if (user.email) {
      loadDepartments()
    } else {
      setLoading(false)
      setMessage('Authentication required. Please log in again.')
    }
  }, [loadDepartments])

  const loadYears = async (department) => {
    try {
      setLoading(true)
      console.log('Loading years for department:', department.name)
      
      // Get years from department data
      const availableYears = department.years || []
      console.log('Available years:', availableYears)
      
      setYears(availableYears.map(year => ({
        name: year,
        department: department.name,
        studentCount: department.yearData?.[year]?.studentCount || 0
      })))
      
      // If staff is a class advisor for a specific year, auto-select it
      if (staffInfo?.isClassAdvisor && staffInfo?.advisorFor && 
          staffInfo.advisorFor.department === department.name) {
        const staffYear = availableYears.find(y => y === staffInfo.advisorFor.year)
        if (staffYear) {
          setSelectedYear({ name: staffYear, department: department.name })
          setViewLevel('students')
          loadStudents(department.name, staffYear)
        }
      }
    } catch (error) {
      console.error('Failed to load years:', error)
      setMessage('Failed to load years')
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async (department, year) => {
    try {
      setLoading(true)
      console.log('Loading students for:', department, year)
      
      const response = await staffApi.getStudentsByDepartment(department, year)
      console.log('Students response:', response)
      
      if (response.students) {
        // Filter out placeholder entries
        const filteredStudents = response.students.filter(s => 
          !s.isYearPlaceholder && 
          !s.isDepartmentPlaceholder && 
          !s.isPlaceholder &&
          s.name && 
          !s.name.includes('[Year:') && 
          !s.name.includes('[Department:')
        )
        
        setStudents(filteredStudents)
        console.log('Filtered students:', filteredStudents.length)
      }
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
    loadYears(dept)
    setMessage('')
  }

  const handleYearClick = (year) => {
    setSelectedYear(year)
    setViewLevel('students')
    loadStudents(year.department, year.name)
    setMessage('')
  }

  const handleBackToDepartments = () => {
    setViewLevel('departments')
    setSelectedDept(null)
    setSelectedYear(null)
    setMessage('')
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
    setMessage('✓ Student added successfully!')
    setTimeout(() => setMessage(''), 3000)
    
    // Reload students
    if (selectedYear && selectedDept) {
      loadStudents(selectedDept.name, selectedYear.name)
    }
  }

  // Check if staff can access this department/year
  const canAccessDepartment = (deptName) => {
    // Get fresh staff info from localStorage
    const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
    if (!user.email) return false
    
    // If staff is class advisor, they can only access their assigned department
    if (user.isClassAdvisor && user.advisorFor) {
      return user.advisorFor.department === deptName
    }
    
    // Regular staff can access their own department
    return user.department === deptName
  }

  const canAccessYear = (yearName) => {
    const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
    if (!user.email || !selectedDept) return false
    
    // If staff is class advisor, they can only access their assigned year
    if (user.isClassAdvisor && user.advisorFor) {
      return user.advisorFor.department === selectedDept.name && 
             user.advisorFor.year === yearName
    }
    
    // Regular staff can access all years in their department
    return user.department === selectedDept.name
  }

  const canAddStudents = () => {
    return staffInfo?.isClassAdvisor && 
           staffInfo?.advisorFor && 
           selectedDept?.name === staffInfo.advisorFor.department &&
           selectedYear?.name === staffInfo.advisorFor.year
  }

  if (loading) {
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

      {/* Departments View */}
      {viewLevel === 'departments' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6">Departments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.filter(dept => canAccessDepartment(dept.name)).map(dept => (
              <div
                key={dept.name}
                onClick={() => handleDepartmentClick(dept)}
                className="p-6 border rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{dept.name}</h3>
                  <span className="text-2xl">🏛️</span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{dept.fullName || dept.name}</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{dept.years?.length || 0} Years</span>
                  <span>{dept.totalStudents || 0} Students</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Years View */}
      {viewLevel === 'years' && selectedDept && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={handleBackToDepartments}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span>←</span>
              <span>Back to Departments</span>
            </button>
          </div>

          <h2 className="text-2xl font-bold mb-6">{selectedDept.name} - Years</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {years.filter(year => canAccessYear(year.name)).map(year => (
              <div
                key={year.name}
                onClick={() => handleYearClick(year)}
                className="p-6 border rounded-lg hover:bg-green-50 hover:border-green-300 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{year.name}</h3>
                  <span className="text-2xl">📚</span>
                </div>
                <div className="text-sm text-gray-500">
                  <span>{year.studentCount} Students</span>
                </div>
                {staffInfo?.isClassAdvisor && staffInfo?.advisorFor?.year === year.name && (
                  <div className="mt-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      👨‍🏫 Your Class
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students View */}
      {viewLevel === 'students' && selectedDept && selectedYear && (
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
              <h2 className="text-2xl font-bold">{selectedDept.name} - {selectedYear.name}</h2>
              <p className="text-gray-600">{students.length} students</p>
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
          onClose={() => setShowAddStudent(false)}
          onStudentAdded={handleStudentAdded}
        />
      )}
    </div>
  )
}
