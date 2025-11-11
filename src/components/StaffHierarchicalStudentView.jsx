import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { apiGet, apiPost } from './api.js'
import { getSocket } from './ws.js'
import FaceEnrollmentModal from './FaceEnrollmentModal.jsx'
import AddStudentModal from './AddStudentModal.jsx'

export default function StaffHierarchicalStudentView() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [minAtt, setMinAtt] = useState(0)
  const [maxAtt, setMaxAtt] = useState(100)
  const [staffInfo, setStaffInfo] = useState(null)
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false)
  const [enrollmentStudent, setEnrollmentStudent] = useState(null)
  const [enrolledStudents, setEnrolledStudents] = useState([])
  const [showAddStudent, setShowAddStudent] = useState(false)

  useEffect(() => {
    // Load fresh staff info from server
    const loadStaffInfo = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
        
        // Fetch fresh advisor info from server
        const advisorInfo = await apiGet('/staff/advisor-info')
        
        // Merge with existing user data
        const updatedUser = {
          ...user,
          isClassAdvisor: advisorInfo.isClassAdvisor,
          advisorFor: advisorInfo.advisorFor,
          canAddStudents: advisorInfo.canAddStudents
        }
        
        setStaffInfo(updatedUser)
        
        // Update localStorage with fresh data
        localStorage.setItem('ams_user', JSON.stringify(updatedUser))
        
        // Debug logging
        console.log('=== STAFF INFO LOADED ===')
        console.log('Is Class Advisor:', updatedUser.isClassAdvisor)
        console.log('Advisor For:', updatedUser.advisorFor)
        console.log('Can Add Students:', updatedUser.canAddStudents)
      } catch (error) {
        console.error('Failed to load advisor info:', error)
        // Fallback to localStorage
        const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
        setStaffInfo(user)
      }
    }
    
    loadStaffInfo()
    loadStudents()
    
    // Set up WebSocket listeners for real-time updates
    const socket = getSocket()
    
    const handleAdminUpdate = (update) => {
      if (update.type === 'student-created' || update.type === 'student-deleted' || update.type === 'student-updated') {
        loadStudents()
      }
    }
    
    socket.on('admin-update', handleAdminUpdate)
    
    return () => {
      socket.off('admin-update', handleAdminUpdate)
    }
  }, [])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const user = staffInfo || JSON.parse(localStorage.getItem('ams_user') || '{}')
      
      // Use staff endpoint to get all students for the advisor's department/year
      let url = '/staff/students/by-department'
      if (user?.isClassAdvisor && user?.advisorFor) {
        url = `/staff/students/by-department?department=${encodeURIComponent(user.advisorFor.department)}&year=${encodeURIComponent(user.advisorFor.year)}`
      }
      
      // Fallback to general staff endpoint if department-specific fails
      let fallbackUrl = `/students/list?staffEmail=${encodeURIComponent(user.email || '')}`
      
      console.log('=== STAFF PANEL DEBUG ===')
      console.log('User info:', user)
      console.log('Is class advisor:', user?.isClassAdvisor)
      console.log('Advisor for:', user?.advisorFor)
      console.log('Staff panel loading students from URL:', url)
      
      let response
      
      try {
        response = await apiGet(url)
        console.log('Staff panel received response:', response)
        console.log('Response students count:', response?.students?.length)
      } catch (staffError) {
        console.warn('Staff endpoint failed, trying fallback:', staffError)
        console.log('Staff panel trying fallback URL:', fallbackUrl)
        try {
          response = await apiGet(fallbackUrl)
          console.log('Staff panel fallback response:', response)
        } catch (fallbackError) {
          console.error('Both endpoints failed:', fallbackError)
          throw fallbackError
        }
      }
      
      let studentData = []
      if (response && response.students) {
        console.log('Raw students before filtering:', response.students.length)
        // Filter out placeholder entries and map student data
        studentData = response.students
          .filter(s => {
            const isPlaceholder = s.isYearPlaceholder || s.isDepartmentPlaceholder || 
                                 (s.name && (s.name.includes('[Year:') || s.name.includes('[Department:')))
            if (isPlaceholder) {
              console.log('Filtering out placeholder:', s.name)
            }
            return !isPlaceholder && s.name
          })
          .map(s => ({
            name: s.name,
            roll: s.regNo || s.roll,
            dept: s.department,
            year: s.year,
            contact: s.email || s.contact,
            attendance: s.attendance || 0,
            lastSeen: s.lastSeen || 'Never',
            studentId: s.studentId || s.regNo,
            attendedSessions: s.attendedSessions || 0,
            missedSessions: s.missedSessions || 0,
            totalSessions: s.totalSessions || 0,
            status: s.status || 'active'
          }))
        console.log('Filtered students for staff panel:', studentData.length)
      }
      
      setStudents(studentData)
      
      // Load face recognition data
      try {
        const faceResponse = await apiGet('/face-recognition/students')
        setEnrolledStudents(faceResponse.students || [])
      } catch (faceError) {
        console.error('Face recognition service not available:', faceError)
        setEnrolledStudents([])
      }
    } catch (error) {
      console.error('Failed to load students:', error)
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

  const handleFaceEnrollment = (student) => {
    setEnrollmentStudent(student)
    setShowFaceEnrollment(true)
  }

  const handleEnrollmentComplete = async (result) => {
    console.log('Enrollment completed:', result)
    try {
      const enrolledResponse = await apiGet('/face-recognition/students')
      setEnrolledStudents(enrolledResponse.students || [])
    } catch (error) {
      console.error('Failed to refresh enrolled students:', error)
    }
  }

  const handleAddStudent = () => {
    setShowAddStudent(true)
  }

  const handleStudentAdded = (newStudent) => {
    setLoading(true)
    loadStudents()
  }

  const isStudentEnrolled = (studentId, rollNo) => {
    const normalizeId = (value) => {
      const v = (value || '').toString().trim().toLowerCase()
      if (!v || v === 'nan' || v.length < 4) return ''
      return v
    }

    const sid = normalizeId(studentId)
    const rno = normalizeId(rollNo)
    if (!sid && !rno) return false

    return enrolledStudents.some(enrolled => {
      const eSid = normalizeId(enrolled?.student_id)
      const eRno = normalizeId(enrolled?.roll_no)
      if (!eSid && !eRno) return false
      return (sid && eSid && eSid === sid) ||
             (rno && eSid && eSid === rno) ||
             (rno && eRno && eRno === rno)
    })
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

  // Show student table directly
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Header with Back to Years button like in the image */}
        <div className="flex items-center gap-3 mb-6">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <span>←</span>
            <span>Back to Years</span>
          </button>
        </div>

        {/* Title and controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                {staffInfo?.advisorFor ? `${staffInfo.advisorFor.department} - ${staffInfo.advisorFor.year}` : 'Students'}
              </h2>
              <p className="text-gray-600">{filteredStudents.length} students</p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span>Updating...</span>
              </div>
            )}
            {staffInfo?.isClassAdvisor && staffInfo?.advisorFor && (
              <button
                onClick={handleAddStudent}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ➕ Add Student
              </button>
            )}
          </div>
          
          <div className="flex gap-2 items-center">
            <input 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="Search name/email/roll" 
              className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50 w-64" 
            />
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>Attendance</span>
              <input 
                type="number" 
                value={minAtt} 
                onChange={(e) => setMinAtt(Number(e.target.value) || 0)} 
                className="w-16 px-2 py-1 border rounded" 
              />
              <span>-</span>
              <input 
                type="number" 
                value={maxAtt} 
                onChange={(e) => setMaxAtt(Number(e.target.value) || 100)} 
                className="w-16 px-2 py-1 border rounded" 
              />
              <span>%</span>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading students...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-gray-600">
                <tr>
                  <th className="py-2 pr-4 text-left">Name</th>
                  <th className="py-2 pr-4 text-left">Roll Number</th>
                  <th className="py-2 pr-4 text-left">Contact</th>
                  <th className="py-2 pr-4 text-left">Attendance %</th>
                  <th className="py-2 pr-4 text-left">Last Seen</th>
                  <th className="py-2 pr-4 text-left">Face Recognition</th>
                  <th className="py-2 pr-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-4 text-center text-gray-500">No students found</td>
                  </tr>
                ) : (
                  filteredStudents.map(s => (
                    <tr key={s.roll} className="border-t hover:bg-gray-50">
                      <td className="py-2 pr-4">{s.name}</td>
                      <td className="py-2 pr-4">{s.roll}</td>
                      <td className="py-2 pr-4">{s.contact}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          s.attendance >= 85 ? 'bg-green-100 text-green-800' :
                          s.attendance >= 75 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {s.attendance}%
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-sm text-gray-600">{s.lastSeen}</td>
                      <td className="py-2 pr-4">
                        {isStudentEnrolled(s.studentId, s.roll) ? (
                          <span className="text-green-600 text-sm">✅ Face Recognized</span>
                        ) : staffInfo?.isClassAdvisor ? (
                          <button
                            onClick={() => handleFaceEnrollment(s)}
                            className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm transition-colors"
                          >
                            👤 Add Face
                          </button>
                        ) : (
                          <span className="text-gray-500 text-sm">Not Enrolled</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <button
                          onClick={() => handleViewProfile(s)}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Profile Modal */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Student Profile</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{selectedStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Roll Number:</span>
                <span className="font-medium">{selectedStudent.roll}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Department:</span>
                <span className="font-medium">{selectedStudent.dept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Year:</span>
                <span className="font-medium">{selectedStudent.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Contact:</span>
                <span className="font-medium">{selectedStudent.contact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Attendance:</span>
                <span className={`font-medium ${
                  selectedStudent.attendance >= 85 ? 'text-green-600' :
                  selectedStudent.attendance >= 75 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {selectedStudent.attendance}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sessions:</span>
                <span className="font-medium">
                  {selectedStudent.attendedSessions}/{selectedStudent.totalSessions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Seen:</span>
                <span className="font-medium">{selectedStudent.lastSeen}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Face Enrollment Modal */}
      {showFaceEnrollment && enrollmentStudent && (
        <FaceEnrollmentModal
          student={enrollmentStudent}
          onClose={() => {
            setShowFaceEnrollment(false)
            setEnrollmentStudent(null)
          }}
          onEnrollmentComplete={handleEnrollmentComplete}
        />
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
