import React, { useMemo, useState, useEffect } from 'react'
import { apiGet, apiDelete } from './api.js'
import FaceEnrollmentModal from './FaceEnrollmentModal.jsx'
import AddStudentModal from './AddStudentModal.jsx'
import { getSocket } from './ws.js'

export default function StudentTable(){
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('All')
  const [minAtt, setMinAtt] = useState(0)
  const [maxAtt, setMaxAtt] = useState(100)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showFaceEnrollment, setShowFaceEnrollment] = useState(false)
  const [enrollmentStudent, setEnrollmentStudent] = useState(null)
  const [enrolledStudents, setEnrolledStudents] = useState([])
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [staffInfo, setStaffInfo] = useState(null)

  const fetchStudentData = async () => {
    try {
      // Get staff info from localStorage or context
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const staffEmail = user.email
      
      // Fetch students with staff email for filtering
      const url = staffEmail ? `/students/list?staffEmail=${encodeURIComponent(staffEmail)}` : '/students/list'
      const response = await apiGet(url)
      const students = response.students.map(s => ({
        name: s.name,
        roll: s.regNo,
        dept: s.department,
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

      // Fetch enrolled students for face recognition
      try {
        const faceResponse = await apiGet('/face-recognition/students')
        setEnrolledStudents(faceResponse.students || [])
      } catch (faceError) {
        console.error('Face recognition service not available:', faceError)
        setEnrolledStudents([])
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudentData()
    
    // Load fresh staff info from server
    const loadStaffInfo = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('ams_user') || localStorage.getItem('user') || '{}')
        
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
        console.log('=== STAFF INFO LOADED (StudentTable) ===')
        console.log('Is Class Advisor:', updatedUser.isClassAdvisor)
        console.log('Advisor For:', updatedUser.advisorFor)
        console.log('Can Add Students:', updatedUser.canAddStudents)
      } catch (error) {
        console.error('Failed to load advisor info:', error)
        // Fallback to localStorage
        const user = JSON.parse(localStorage.getItem('ams_user') || localStorage.getItem('user') || '{}')
        setStaffInfo(user)
      }
    }
    
    loadStaffInfo()
    
    // Set up WebSocket listeners for real-time updates
    const socket = getSocket()
    
    const handleAdminUpdate = (update) => {
      if (update.type === 'student-created' || update.type === 'student-deleted' || update.type === 'student-updated' || update.type === 'face_attendance_marked') {
        // Reload students when attendance is marked via face recognition to update attendance status
        setLoading(true)
        fetchStudentData()
      }
    }
    
    socket.on('admin-update', handleAdminUpdate)
    
    // Cleanup on unmount
    return () => {
      socket.off('admin-update', handleAdminUpdate)
    }
  }, [])

  const handleViewProfile = (student) => {
    setSelectedStudent(student)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedStudent(null)
  }

  const handleFaceEnrollment = (student) => {
    setEnrollmentStudent(student)
    setShowFaceEnrollment(true)
  }

  const closeFaceEnrollment = () => {
    setShowFaceEnrollment(false)
    setEnrollmentStudent(null)
  }

  const handleEnrollmentComplete = async (result) => {
    console.log('Enrollment completed:', result)
    // Refresh enrolled students list automatically
    try {
      const enrolledResponse = await apiGet('/face-recognition/students')
      setEnrolledStudents(enrolledResponse.students || [])
    } catch (error) {
      console.error('Failed to refresh enrolled students:', error)
    }
  }

  // Check if student is enrolled in face recognition
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

  const handleAddStudent = () => {
    setShowAddStudent(true)
  }

  const closeAddStudent = () => {
    setShowAddStudent(false)
  }

  const handleStudentAdded = (newStudent) => {
    // Refresh the student list immediately
    setLoading(true)
    fetchStudentData()
  }

  const filtered = useMemo(()=>{
    const q = query.toLowerCase()
    return data.filter(s=>
      (dept==='All' || s.dept===dept) &&
      s.attendance >= minAtt && s.attendance <= maxAtt &&
      (s.name.toLowerCase().includes(q) || s.contact.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q))
    )
  },[query, dept, minAtt, maxAtt, data])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="text-center py-8 text-gray-500">Loading students...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center gap-4">
          <div className="font-semibold text-lg">Students</div>
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
          {staffInfo?.isClassAdvisor && staffInfo?.advisorFor && (
            <div className="text-sm text-gray-600">
              Managing: {staffInfo.advisorFor.department} - {staffInfo.advisorFor.year}
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search name/email/roll" className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50 w-64" />
          <select value={dept} onChange={(e)=>setDept(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50">
            {['All','CS','EE','ME'].map(d=> <option key={d}>{d}</option>)}
          </select>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <span>Attendance</span>
            <input type="number" value={minAtt} onChange={(e)=>setMinAtt(Number(e.target.value)||0)} className="w-16 px-2 py-1 border rounded" />
            <span>-</span>
            <input type="number" value={maxAtt} onChange={(e)=>setMaxAtt(Number(e.target.value)||100)} className="w-16 px-2 py-1 border rounded" />
            <span>%</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-gray-600">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Roll Number</th>
              <th className="py-2 pr-4">Contact</th>
              <th className="py-2 pr-4">Attendance %</th>
              <th className="py-2 pr-4">Last Seen</th>
              <th className="py-2 pr-4">Face Recognition</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length > 0 ? (
              filtered.map(s => (
                <tr key={s.roll}>
                  <td className="py-2 pr-4">{s.name}</td>
                  <td className="py-2 pr-4">{s.roll}</td>
                  <td className="py-2 pr-4">{s.contact}</td>
                  <td className="py-2 pr-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      s.attendance >= 90 ? 'bg-green-100 text-green-800' :
                      s.attendance >= 75 ? 'bg-blue-100 text-blue-800' :
                      s.attendance >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {s.attendance}%
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{s.lastSeen}</td>
                  <td className="py-2 pr-4">
                    {isStudentEnrolled(s.studentId, s.roll) ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Face Recognized
                      </span>
                    ) : staffInfo?.isClassAdvisor ? (
                      <button
                        onClick={() => handleFaceEnrollment(s)}
                        className="px-3 py-1 rounded-md bg-purple-600 text-white text-xs hover:bg-purple-700 transition-colors"
                      >
                        👤 Add Face
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Not Enrolled
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <button 
                      onClick={() => handleViewProfile(s)}
                      className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs hover:bg-indigo-700 transition-colors"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-4 text-center text-gray-500">No students found</td>
              </tr>
            )}
          </tbody>
        </table>
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
                <div className="text-sm text-gray-600 mb-1">Contact</div>
                <div className="font-semibold text-gray-800">{selectedStudent.contact}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Last Seen</div>
                <div className="font-semibold text-gray-800">{selectedStudent.lastSeen}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Status</div>
                <div className="font-semibold text-gray-800">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                    selectedStudent.status === 'excellent' ? 'bg-green-100 text-green-800' :
                    selectedStudent.status === 'good' ? 'bg-blue-100 text-blue-800' :
                    selectedStudent.status === 'average' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedStudent.status ? selectedStudent.status.charAt(0).toUpperCase() + selectedStudent.status.slice(1) : 'N/A'}
                  </span>
                </div>
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
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Face Enrollment Modal */}
      {showFaceEnrollment && enrollmentStudent && (
        <FaceEnrollmentModal
          student={enrollmentStudent}
          onClose={closeFaceEnrollment}
          onEnrollmentComplete={handleEnrollmentComplete}
        />
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <AddStudentModal
          onClose={closeAddStudent}
          onStudentAdded={handleStudentAdded}
        />
      )}
    </div>
  )
}


















