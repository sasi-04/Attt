import React, { useState, useEffect, useMemo } from 'react'
import { apiGet, adminApi } from './api.js'

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

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const response = await apiGet('/admin/departments/summary')
      setDepartments(response.departments)
    } catch (error) {
      console.error('Failed to load departments:', error)
      setMessage('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async (dept, year) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (dept) params.append('department', dept)
      if (year) params.append('year', year)
      
      const response = await apiGet(`/admin/students/by-department?${params.toString()}`)
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
  }

  const handleYearClick = (year) => {
    setSelectedYear(year)
    setViewLevel('students')
    loadStudents(selectedDept.name, year)
  }

  const handleBack = () => {
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

  const filteredStudents = useMemo(() => {
    const q = query.toLowerCase()
    return students.filter(s =>
      s.attendance >= minAtt && s.attendance <= maxAtt &&
      (s.name.toLowerCase().includes(q) || s.contact.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q))
    )
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
          <h2 className="text-2xl font-bold mb-2">Select Department</h2>
          <p className="text-gray-600 mb-6">Choose a department to view students by year</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {departments.map(dept => (
              <div
                key={dept.name}
                onClick={() => handleDepartmentClick(dept)}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-indigo-500 transform hover:scale-105"
              >
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
            ))}
          </div>
        </div>
      </div>
    )
  }

  // LEVEL 2: YEARS VIEW
  if (viewLevel === 'years') {
    const years = Object.keys(selectedDept.students.byYear).length > 0
      ? Object.keys(selectedDept.students.byYear)
      : ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']

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

          <h2 className="text-2xl font-bold mb-2">{selectedDept.name}</h2>
          <p className="text-gray-600 mb-6">Select a year to view students</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {years.map(year => {
              const count = selectedDept.students.byYear[year] || 0
              return (
                <div
                  key={year}
                  onClick={() => handleYearClick(year)}
                  className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-green-500 transform hover:scale-105"
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">📚</div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">{year}</h3>
                    <div className="text-3xl font-bold text-green-600">{count}</div>
                    <div className="text-sm text-gray-600 mt-1">Students</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
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
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← Back to Years
          </button>
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
    </div>
  )
}
