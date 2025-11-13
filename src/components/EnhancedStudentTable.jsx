import React, { useMemo, useState, useEffect } from 'react'
import { apiGet, adminApi } from './api.js'

export default function EnhancedStudentTable(){
  const [query, setQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedYear, setSelectedYear] = useState('All')
  const [minAtt, setMinAtt] = useState(0)
  const [maxAtt, setMaxAtt] = useState(100)
  const [data, setData] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [message, setMessage] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [viewMode, setViewMode] = useState('all') // 'all', 'department'

  useEffect(() => {
    loadDepartments()
    loadStudents()
  }, [])

  useEffect(() => {
    if (viewMode === 'department') {
      loadStudentsByDepartment()
    } else {
      loadStudents()
    }
  }, [selectedDept, selectedYear, viewMode])

  const loadDepartments = async () => {
    try {
      const response = await apiGet('/admin/departments/summary')
      setDepartments(response.departments)
    } catch (error) {
      console.error('Failed to load departments:', error)
    }
  }

  const loadStudents = async () => {
    try {
      setLoading(true)
      
      // Get staff email for department filtering
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const staffEmail = user.email
      
      // Fetch students with staff email for filtering
      const url = staffEmail ? `/students/list?staffEmail=${encodeURIComponent(staffEmail)}` : '/students/list'
      const response = await apiGet(url)
      
      // Helper to check if student is example
      const isExampleStudent = (s) => {
        if (!s || !s.name) return false
        const name = (s.name || '').trim()
        return /\bStudent\s+\d+\b/i.test(name) || 
               /Demo Student/i.test(name) || 
               /Example Student/i.test(name) ||
               /Test Student/i.test(name) ||
               /^(CSE|ECE|MECH|CIVIL|M\.Tech|Mtech|MTECH)\s+Student\s+\d+$/i.test(name)
      }
      
      const students = response.students
        .filter(s => !isExampleStudent(s)) // Filter out example students
        .map(s => ({
        name: s.name,
        roll: s.regNo,
        dept: s.department || 'M.Tech',
        year: s.year || '4th Year',
        contact: s.email,
        attendance: s.attendance,
        lastSeen: s.lastSeen,
        studentId: s.studentId,
        attendedSessions: s.attendedSessions,
        missedSessions: s.missedSessions,
        totalSessions: s.totalSessions,
        status: s.status
      }))
      setData(students)
    } catch (error) {
      console.error('Failed to load students:', error)
      setMessage('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const loadStudentsByDepartment = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedDept !== 'All') params.append('department', selectedDept)
      if (selectedYear !== 'All') params.append('year', selectedYear)
      
      const response = await apiGet(`/admin/students/by-department?${params.toString()}`)
      
      // Helper to check if student is example
      const isExampleStudent = (s) => {
        if (!s || !s.name) return false
        const name = (s.name || '').trim()
        return /\bStudent\s+\d+\b/i.test(name) || 
               /Demo Student/i.test(name) || 
               /Example Student/i.test(name) ||
               /Test Student/i.test(name) ||
               /^(CSE|ECE|MECH|CIVIL|M\.Tech|Mtech|MTECH)\s+Student\s+\d+$/i.test(name)
      }
      
      const students = response.students
        .filter(s => !isExampleStudent(s)) // Filter out example students
        .map(s => ({
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
      setData(students)
    } catch (error) {
      console.error('Failed to load students by department:', error)
      setMessage('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const handleViewProfile = (student) => {
    setSelectedStudent(student)
    setShowModal(true)
    setMessage('')
  }

  const handleDeleteStudent = async () => {
    try {
      const regNoToDelete = selectedStudent.roll
      
      // Optimistically remove from UI
      setData(prev => prev.filter(s => s.roll !== regNoToDelete))
      setShowDeleteModal(false)
      setMessage('Student deleted successfully!')
      
      // Delete in background
      await adminApi.deleteStudent(regNoToDelete)
      
      // Reload to ensure consistency (but UI already updated)
      if (viewMode === 'department') {
        loadStudentsByDepartment()
      } else {
        loadStudents()
      }
      
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      // Revert optimistic update on error
      if (viewMode === 'department') {
        loadStudentsByDepartment()
      } else {
        loadStudents()
      }
      setMessage('Failed to delete student')
      setTimeout(() => setMessage(''), 3000)
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

  const closeModal = () => {
    setShowModal(false)
    setSelectedStudent(null)
  }

  const filtered = useMemo(()=>{
    const q = query.toLowerCase()
    return data.filter(s=>
      (selectedDept==='All' || s.dept===selectedDept) &&
      (selectedYear==='All' || s.year===selectedYear) &&
      s.attendance >= minAtt && s.attendance <= maxAtt &&
      (s.name.toLowerCase().includes(q) || s.contact.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q))
    )
  },[query, selectedDept, selectedYear, minAtt, maxAtt, data])

  const departmentOptions = ['All', ...new Set(data.map(s => s.dept))]
  const yearOptions = ['All', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading students...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Department Overview Cards */}
      {departments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {departments.map(dept => (
            <div 
              key={dept.name}
              onClick={() => {
                setSelectedDept(dept.name)
                setViewMode('department')
              }}
              className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-800">{dept.name}</h3>
                <span className="text-2xl">🎓</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Students: <span className="font-semibold text-blue-600">{dept.students.total}</span></div>
                <div>Staff: <span className="font-semibold text-green-600">{dept.staff.total}</span></div>
                {Object.keys(dept.students.byYear).length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    {Object.entries(dept.students.byYear).map(([year, count]) => (
                      <div key={year} className="text-xs">
                        {year}: {count}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Student Table */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedDept !== 'All' ? `${selectedDept} - ` : ''}
                {selectedYear !== 'All' ? `${selectedYear} ` : ''}
                Students ({filtered.length})
              </h2>
              {(selectedDept !== 'All' || selectedYear !== 'All') && (
                <button
                  onClick={() => {
                    setSelectedDept('All')
                    setSelectedYear('All')
                    setViewMode('all')
                  }}
                  className="text-sm text-blue-600 hover:underline mt-1"
                >
                  ← View All Students
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input 
              value={query} 
              onChange={(e)=>setQuery(e.target.value)} 
              placeholder="Search by name, email, or roll number" 
              className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50 flex-1 min-w-64"
            />
            
            <select 
              value={selectedDept} 
              onChange={(e)=> {
                setSelectedDept(e.target.value)
                setViewMode('department')
              }} 
              className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50"
            >
              {departmentOptions.map(d => <option key={d}>{d}</option>)}
            </select>

            <select 
              value={selectedYear} 
              onChange={(e)=> {
                setSelectedYear(e.target.value)
                setViewMode('department')
              }} 
              className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50"
            >
              {yearOptions.map(y => <option key={y}>{y}</option>)}
            </select>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Attendance:</span>
              <input 
                type="number" 
                value={minAtt} 
                onChange={(e)=>setMinAtt(Number(e.target.value))} 
                className="w-16 px-2 py-2 rounded-md border border-gray-200 bg-gray-50"
                min="0" max="100"
              />
              <span className="text-gray-500">-</span>
              <input 
                type="number" 
                value={maxAtt} 
                onChange={(e)=>setMaxAtt(Number(e.target.value))} 
                className="w-16 px-2 py-2 rounded-md border border-gray-200 bg-gray-50"
                min="0" max="100"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm border rounded-lg">
            <thead className="text-gray-600 bg-gray-50">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length > 0 ? (
                filtered.map(s => (
                  <tr key={s.roll} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{s.name}</td>
                    <td className="py-3 px-4">{s.roll}</td>
                    <td className="py-3 px-4">{s.dept}</td>
                    <td className="py-3 px-4">{s.year}</td>
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
                  <td colSpan="8" className="py-4 text-center text-gray-500">No students found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{selectedStudent.name}</h2>
                <p className="text-gray-600">{selectedStudent.roll}</p>
              </div>
              <button 
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
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
                  <div className="text-3xl font-bold text-green-600">{selectedStudent.attendedSessions || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Present</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{selectedStudent.missedSessions || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Absent</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{selectedStudent.totalSessions || 0}</div>
                  <div className="text-sm text-gray-600 mt-1">Total</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button 
                onClick={closeModal}
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Delete</h2>
            <p className="mb-4">Are you sure you want to delete <strong>{selectedStudent.name}</strong> ({selectedStudent.roll})?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
              <button onClick={handleDeleteStudent} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
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
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
