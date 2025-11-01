import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext.jsx'
import StatsCard from '../../components/StatsCard.jsx'
import AttendancePieChart from '../../components/AttendancePieChart.jsx'
import DailyTrendChart from '../../components/DailyTrendChart.jsx'
import HourlyBarChart from '../../components/HourlyBarChart.jsx'
import { staffApi } from '../../components/api.js'

export default function Analytics(){
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.email) {
      loadAnalytics()
    }
  }, [user])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await staffApi.getAnalytics(user.email)
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to load analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg">
        {error}
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Students" value={analytics.totalStudents} accent="indigo" />
        <StatsCard title="Average Attendance" value={`${analytics.averageAttendance}%`} sub="Overall" accent="green" />
        <StatsCard title="Total Classes" value={analytics.totalClasses} sub="All Time" accent="blue" />
        <StatsCard title="Low Attendance Alerts" value={analytics.lowAttendanceAlerts} accent="red" flashing={analytics.lowAttendanceAlerts > 0} />
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AttendancePieChart data={analytics.attendanceDistribution} />
        <DailyTrendChart data={analytics.dailyTrend} />
      </div>

      <HourlyBarChart data={analytics.hourlyPattern} />
    </div>
  )
}

















