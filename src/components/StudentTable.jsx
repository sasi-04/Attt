import React, { useMemo, useState, useEffect } from 'react'
import { apiGet } from './api.js'

export default function StudentTable(){
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('All')
  const [minAtt, setMinAtt] = useState(0)
  const [maxAtt, setMaxAtt] = useState(100)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await apiGet('/students/list')
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
      } catch (error) {
        console.error('Failed to fetch students:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [])

  const handleViewProfile = (student) => {
    setSelectedStudent(student)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedStudent(null)
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
        <div className="font-semibold text-lg">Students</div>
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
              <th className="py-2 pr-4">Department</th>
              <th className="py-2 pr-4">Contact</th>
              <th className="py-2 pr-4">Attendance %</th>
              <th className="py-2 pr-4">Last Seen</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length > 0 ? (
              filtered.map(s => (
                <tr key={s.roll}>
                  <td className="py-2 pr-4">{s.name}</td>
                  <td className="py-2 pr-4">{s.roll}</td>
                  <td className="py-2 pr-4">{s.dept}</td>
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
    </div>
  )
}


















