import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiGet } from '../components/api.js'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [attendanceData, setAttendanceData] = useState({
    totalClasses: 0,
    attendedClasses: 0,
    missedClasses: 0,
    attendancePercentage: 0,
    recentAttendance: [],
    monthlyAttendance: [],
    loading: true
  })

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!user?.regNo && !user?.studentId) return
      
      try {
        const studentId = user.regNo || user.studentId
        
        // Fetch real data from API
        const data = await apiGet(`/student/${studentId}/stats`)
        
        setAttendanceData({
          ...data,
          loading: false
        })
        
      } catch (error) {
        console.error('Failed to fetch attendance data:', error)
        setAttendanceData(prev => ({ ...prev, loading: false }))
      }
    }

    fetchAttendanceData()
  }, [user])

  const personalStats = [
    { label: 'Total Classes', value: attendanceData.totalClasses },
    { label: 'Classes Attended', value: attendanceData.attendedClasses },
    { label: 'Classes Missed', value: attendanceData.missedClasses },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800">Welcome, {user?.name || 'Student'}!</h1>
        <p className="text-gray-600">Registration No: {user?.regNo}</p>
      </div>


      {/* Personal Attendance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {personalStats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="text-2xl font-semibold mt-1">{s.value}</div>
          </div>
        ))}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="text-sm text-gray-500">My Attendance Rate</div>
          <div className="text-2xl font-semibold mt-1">{attendanceData.attendancePercentage}%</div>
          <div className="h-3 bg-gray-100 rounded mt-3">
            <div 
              className={`h-3 rounded ${attendanceData.attendancePercentage >= 75 ? 'bg-green-500' : 'bg-red-500'}`} 
              style={{ width: `${attendanceData.attendancePercentage}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Attendance Summary */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Monthly Attendance</h2>
            <span className="text-sm text-gray-500">Last 3 months</span>
          </div>
          <div className="divide-y">
            {attendanceData.loading ? (
              <div className="py-4 text-center text-gray-500">Loading...</div>
            ) : attendanceData.monthlyAttendance.length > 0 ? (
              attendanceData.monthlyAttendance.map((month) => (
                <div key={month.month} className="py-3 flex items-center justify-between">
                  <div className="font-medium text-gray-800">{month.month}</div>
                  <div className="text-sm text-gray-600">{month.attended}/{month.total}</div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    month.percentage >= 75 
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {month.percentage}%
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-gray-500">No attendance data available</div>
            )}
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold mb-3">Recent Attendance</h2>
          <div className="space-y-3">
            {attendanceData.loading ? (
              <div className="py-4 text-center text-gray-500">Loading...</div>
            ) : attendanceData.recentAttendance.length > 0 ? (
              attendanceData.recentAttendance.map((record, idx) => (
                <div key={record.sessionId || idx} className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-800 font-medium">{record.subject}</div>
                    <div className="text-sm text-gray-500">{record.date} • {record.time}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    record.status === 'Present' 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {record.status}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-gray-500">No recent attendance records</div>
            )}
          </div>
        </div>
      </div>

      {/* My Leave Applications */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold mb-3">My Leave Applications</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="py-2 pr-4">Duration</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 pr-4">2 days</td>
                <td className="py-2 pr-4">Medical</td>
                <td className="py-2 pr-4">2025-10-20</td>
                <td className="py-2 pr-4">
                  <span className="px-2 py-1 rounded text-xs bg-yellow-50 text-yellow-700">Pending</span>
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">1 day</td>
                <td className="py-2 pr-4">Personal</td>
                <td className="py-2 pr-4">2025-10-15</td>
                <td className="py-2 pr-4">
                  <span className="px-2 py-1 rounded text-xs bg-green-50 text-green-700">Approved</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


















