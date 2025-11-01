import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { adminApi } from '../../components/api.js'

function Card({ title, value, icon }){
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
      <div className="text-3xl">{icon}</div>
    </motion.div>
  )
}

export default function AdminDashboard(){
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await adminApi.getDashboardStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">{error}</div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title="Total Staff" value={stats.staffCount} icon="👩‍🏫" />
        <Card title="Total Students" value={stats.studentCount} icon="👨‍🎓" />
        <Card title="Attendance Records" value={stats.attendanceRecordsCount} icon="🗂️" />
        <Card title="Pending Leaves" value={stats.pendingLeaves} icon="📝" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-lg font-semibold mb-4">System Overview</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Total Sessions</span>
              <span className="font-semibold text-gray-800">{stats.totalSessions}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Today's Sessions</span>
              <span className="font-semibold text-gray-800">{stats.todaySessionsCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Average Attendance</span>
              <span className="font-semibold text-green-600">{stats.stats.averageAttendanceRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="text-lg font-semibold mb-4">Recent Activity</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <span className="text-xl">{activity.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm text-gray-800">{activity.text}</div>
                    <div className="text-xs text-gray-500">{activity.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-lg font-semibold mb-3">Quick Actions</div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => window.location.href = '/admin/staff'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Staff
          </button>
          <button 
            onClick={() => window.location.href = '/admin/students'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Manage Students
          </button>
          <button 
            onClick={() => window.location.href = '/admin/attendance'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Reports
          </button>
          <button 
            onClick={() => window.location.href = '/admin/leave'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Review Leaves
          </button>
        </div>
      </div>
    </div>
  )
}

















