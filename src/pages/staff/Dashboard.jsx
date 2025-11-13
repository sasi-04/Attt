import React, { useState, useEffect } from 'react'
import { apiGet } from '../../components/api.js'

export default function Dashboard(){
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    presentToday: 0,
    absentToday: 0,
    attendanceRate: 0,
    lowAttendanceStudents: [],
    recentActivity: []
  })
  const [pendingLeaves, setPendingLeaves] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('=== FETCHING STAFF DASHBOARD DATA ===')
        
        // Get staff email from localStorage
        const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
        const staffEmail = user.email
        
        if (!staffEmail) {
          console.error('No staff email found in localStorage')
          setLoading(false)
          return
        }
        
        console.log('Staff email:', staffEmail)
        
        // Use staff-specific dashboard endpoint
        const params = new URLSearchParams()
        params.append('staffEmail', staffEmail)
        
        console.log('Making API call to:', `/staff/dashboard/stats?${params.toString()}`)
        const data = await apiGet(`/staff/dashboard/stats?${params.toString()}`)
        console.log('Staff dashboard data received:', data)
        console.log('Total Students in department:', data.totalStudents)
        console.log('Allowed departments:', data.allowedDepartments)
        console.log('Full response object:', JSON.stringify(data, null, 2))
        
        setDashboardData(data)
        
        // Fetch pending leave requests
        const leaveData = await apiGet('/leave/requests?status=pending')
        setPendingLeaves(leaveData.requests || [])
      } catch (error) {
        console.error('Failed to fetch staff dashboard stats:', error)
        // Fallback to general dashboard if staff endpoint fails
        try {
          console.log('Trying fallback to general dashboard...')
          const fallbackData = await apiGet('/dashboard/stats')
          setDashboardData(fallbackData)
        } catch (fallbackError) {
          console.error('Fallback dashboard also failed:', fallbackError)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  // Create stats array based on whether user is a class advisor
  const isClassAdvisor = dashboardData.staffInfo?.isClassAdvisor
  const advisorFor = dashboardData.staffInfo?.advisorFor
  
  const stats = []
  
  if (isClassAdvisor && advisorFor) {
    // For class advisors: show both department total and their specific class
    stats.push(
      { 
        label: `Department Total (${advisorFor.department})`, 
        value: dashboardData.departmentTotalCount || dashboardData.totalStudents, 
        icon: '🏢',
        sub: 'All students in department'
      },
      { 
        label: `My Class (${advisorFor.year})`, 
        value: dashboardData.advisorClassCount || 0, 
        icon: '👥',
        sub: `${advisorFor.department} ${advisorFor.year} students`
      }
    )
  } else {
    // For regular staff: show department total
    stats.push(
      { 
        label: 'Department Students', 
        value: dashboardData.totalStudents, 
        icon: '👥' 
      }
    )
  }
  
  // Add common stats
  stats.push(
    { label: 'Present Today', value: dashboardData.presentToday, sub: `${dashboardData.todayAttendanceRate}%`, icon: '✓' },
    { label: 'Absent Today', value: dashboardData.absentToday, icon: '✗' },
    { label: 'Total Sessions', value: dashboardData.totalSessions || 0, icon: '📅' }
  )
  const average = dashboardData.overallAttendanceRate || 0
  const lowAttendance = dashboardData.lowAttendanceStudents
  const recentActivity = dashboardData.recentActivity.map(a => ({
    name: a.studentName || a.studentId,
    time: new Date(a.timestamp).toLocaleTimeString(),
    status: 'Checked In'
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-1 gap-4 ${isClassAdvisor ? 'md:grid-cols-5' : 'md:grid-cols-4'}`}>
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">{s.label}</div>
              {s.icon && <span className="text-xl">{s.icon}</span>}
            </div>
            <div className="text-2xl font-semibold mt-1">{s.value}</div>
            {s.sub && <div className="text-xs text-gray-500 mt-1">{s.sub}</div>}
          </div>
        ))}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">Overall Attendance</div>
            <span className="text-xl">📊</span>
          </div>
          <div className="text-2xl font-semibold mt-1">{average}%</div>
          <div className="h-3 bg-gray-100 rounded mt-3">
            <div 
              className={`h-3 rounded transition-all ${
                average >= 75 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(average, 100)}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Low Attendance Alert</h2>
            <span className="text-sm text-gray-500">Below 75%</span>
          </div>
          <div className="divide-y">
            {lowAttendance.length > 0 ? (
              lowAttendance.map((s) => (
                <div key={s.regNo} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-800">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.regNo} • {s.attended}/{s.total} classes</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      s.percentage < 50 ? 'bg-red-100 text-red-700' :
                      s.percentage < 65 ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {s.percentage}%
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-gray-500">
                <div className="text-3xl mb-2">✨</div>
                <div>All students have good attendance!</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold mb-3">Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((a, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="text-gray-800">{a.name}</div>
                  <div className="text-sm text-gray-500">{a.time}</div>
                  <div className="px-2 py-1 rounded text-xs bg-indigo-50 text-indigo-700">{a.status}</div>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-gray-500">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Pending Leave Applications</h2>
          <span className="text-sm text-gray-500">{pendingLeaves.length} pending</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-gray-600">
              <tr>
                <th className="py-2 pr-4">Student</th>
                <th className="py-2 pr-4">Duration</th>
                <th className="py-2 pr-4">Reason</th>
                <th className="py-2 pr-4">Submitted</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pendingLeaves.length > 0 ? (
                pendingLeaves.slice(0, 5).map((leave) => (
                  <tr key={leave.id}>
                    <td className="py-2 pr-4">
                      <div className="font-medium">{leave.studentName}</div>
                      <div className="text-xs text-gray-500">{leave.regNo}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <div>{leave.duration}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(leave.startDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div>{leave.reason}</div>
                      <div className="text-xs text-gray-500 capitalize">{leave.type}</div>
                    </td>
                    <td className="py-2 pr-4">
                      {new Date(leave.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-4">
                      <a 
                        href="#/staff/leave" 
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Review
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-gray-500">
                    <div className="text-3xl mb-2">✅</div>
                    <div>No pending leave applications</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


















