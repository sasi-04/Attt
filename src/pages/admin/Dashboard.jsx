import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { adminApi } from '../../components/api.js'
import { useAdminUpdates } from '../../hooks/useWebSocket.js'

function Card({ title, value, icon, onClick, clickable = false }){
  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35 }}
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex items-center justify-between ${
        clickable ? 'cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200' : ''
      }`}
    >
      <div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
        <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
        {clickable && <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">Click to view details</div>}
      </div>
      <div className="text-3xl">{icon}</div>
    </motion.div>
  )
}

export default function AdminDashboard(){
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [departments, setDepartments] = useState([])
  const [showDeptModal, setShowDeptModal] = useState(false)
  const [deptLoading, setDeptLoading] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [deptAnalytics, setDeptAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  // Handle real-time admin updates
  const handleAdminUpdate = useCallback((update) => {
    console.log('Admin update received in dashboard:', update)
    // Refresh dashboard stats when any admin change occurs
    loadStats()
    // If departments modal is open, refresh departments too
    if (showDeptModal && !selectedDepartment) {
      loadDepartments()
    }
  }, [showDeptModal, selectedDepartment])

  // Subscribe to WebSocket updates
  useAdminUpdates(handleAdminUpdate)

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

  const loadDepartments = async () => {
    try {
      setDeptLoading(true)
      const data = await adminApi.getDepartmentsSummary()
      setDepartments(data.departments || [])
    } catch (err) {
      console.error('Failed to load departments:', err)
    } finally {
      setDeptLoading(false)
    }
  }

  const handleDepartmentsClick = () => {
    setShowDeptModal(true)
    setSelectedDepartment(null)
    setDeptAnalytics(null)
    loadDepartments()
  }

  const handleDepartmentSelect = async (department) => {
    setSelectedDepartment(department)
    setAnalyticsLoading(true)
    try {
      // Load students for this department to get year-wise data
      const studentsData = await adminApi.getStudentsByDepartment(department.name, null)
      
      // Group students by year and calculate attendance percentages
      const yearData = {}
      for (const student of studentsData.students) {
        const year = student.year || '4th Year'
        if (!yearData[year]) {
          yearData[year] = {
            students: [],
            totalStudents: 0,
            averageAttendance: 0
          }
        }
        yearData[year].students.push(student)
        yearData[year].totalStudents++
      }
      
      // Calculate average attendance for each year
      Object.keys(yearData).forEach(year => {
        const students = yearData[year].students
        const totalAttendance = students.reduce((sum, student) => sum + (student.attendance || 0), 0)
        yearData[year].averageAttendance = students.length > 0 ? Math.round(totalAttendance / students.length) : 0
      })
      
      setDeptAnalytics({
        department: department.name,
        yearData,
        totalStudents: studentsData.students.length,
        overallAverage: studentsData.students.length > 0 
          ? Math.round(studentsData.students.reduce((sum, s) => sum + (s.attendance || 0), 0) / studentsData.students.length)
          : 0
      })
    } catch (error) {
      console.error('Failed to load department analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleBackToDepartments = () => {
    setSelectedDepartment(null)
    setDeptAnalytics(null)
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card 
          title="Departments" 
          value={stats.departmentCount || 0} 
          icon="🏢" 
          onClick={handleDepartmentsClick}
          clickable={true}
        />
        <Card title="Total Staff" value={stats.staffCount || 0} icon="👩‍🏫" />
        <Card title="Total Students" value={stats.studentCount || 0} icon="👨‍🎓" />
        <Card title="Attendance Records" value={stats.attendanceRecordsCount || 0} icon="🗂️" />
        <Card title="Pending Leaves" value={stats.pendingLeaves || 0} icon="📝" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Overview</div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Total Sessions</span>
              <span className="font-semibold text-gray-800 dark:text-white">{stats.totalSessions}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Today's Sessions</span>
              <span className="font-semibold text-gray-800 dark:text-white">{stats.todaySessionsCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Average Attendance</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{stats.stats.averageAttendanceRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recent Activity</div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  <span className="text-xl">{activity.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm text-gray-800 dark:text-gray-200">{activity.text}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">No recent activity</div>
            )}
          </div>
        </div>
      </div>


      {/* Enhanced Departments Analytics Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeptModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                {selectedDepartment && (
                  <button 
                    onClick={handleBackToDepartments}
                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <span>←</span>
                    <span>Back</span>
                  </button>
                )}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedDepartment ? `${selectedDepartment.name} - Year Analysis` : 'Department Analytics'}
                </h2>
              </div>
              <button 
                onClick={() => setShowDeptModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>

            {!selectedDepartment ? (
              // Department Overview
              deptLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading departments...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{departments.length}</div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">Total Departments</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {departments.reduce((sum, dept) => sum + dept.staff.total, 0)}
                      </div>
                      <div className="text-sm text-green-800 dark:text-green-300">Total Staff</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {departments.reduce((sum, dept) => sum + dept.students.total, 0)}
                      </div>
                      <div className="text-sm text-purple-800 dark:text-purple-300">Total Students</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Click on a department to view detailed year-wise analysis</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map((dept) => (
                      <div 
                        key={dept.name} 
                        onClick={() => handleDepartmentSelect(dept)}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-600 cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                          <span className="text-2xl">🏢</span>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-600 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Staff Members</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{dept.staff.total}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-600 rounded-lg">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Students</span>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">{dept.students.total}</span>
                          </div>
                          
                          {dept.students.byYear && Object.keys(dept.students.byYear).length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-semibold">Years Available:</div>
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(dept.students.byYear).map((year) => (
                                  <span key={year} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                    {year}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">Click to view year-wise analysis →</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {departments.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🏢</div>
                      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Departments Yet</h3>
                      <p className="text-gray-600 dark:text-gray-400">Departments will appear automatically when you add staff or students.</p>
                    </div>
                  )}
                </div>
              )
            ) : (
              // Department Year-wise Analysis
              analyticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading year-wise analytics...</div>
                </div>
              ) : deptAnalytics ? (
                <div className="space-y-6">
                  {/* Department Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Object.keys(deptAnalytics.yearData).length}</div>
                      <div className="text-sm text-blue-800 dark:text-blue-300">Active Years</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{deptAnalytics.totalStudents}</div>
                      <div className="text-sm text-green-800 dark:text-green-300">Total Students</div>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{deptAnalytics.overallAverage}%</div>
                      <div className="text-sm text-purple-800 dark:text-purple-300">Overall Attendance</div>
                    </div>
                  </div>

                  {/* Year-wise Analysis with Visual Graphs */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Year-wise Attendance Analysis</h3>
                    
                    {Object.entries(deptAnalytics.yearData)
                      .sort(([a], [b]) => {
                        const yearOrder = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']
                        return (yearOrder.indexOf(a) || 999) - (yearOrder.indexOf(b) || 999)
                      })
                      .map(([year, data]) => (
                        <div key={year} className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{year}</h4>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-600 dark:text-gray-400">{data.totalStudents} students</span>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                data.averageAttendance >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                data.averageAttendance >= 75 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                data.averageAttendance >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {data.averageAttendance}% Average
                              </span>
                            </div>
                          </div>
                          
                          {/* Visual Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <span>Attendance Progress</span>
                              <span>{data.averageAttendance}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  data.averageAttendance >= 90 ? 'bg-green-500' :
                                  data.averageAttendance >= 75 ? 'bg-blue-500' :
                                  data.averageAttendance >= 60 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${data.averageAttendance}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* Student Distribution */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {data.students.filter(s => (s.attendance || 0) >= 90).length}
                              </div>
                              <div className="text-xs text-green-800 dark:text-green-300">Excellent (≥90%)</div>
                            </div>
                            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {data.students.filter(s => (s.attendance || 0) >= 75 && (s.attendance || 0) < 90).length}
                              </div>
                              <div className="text-xs text-blue-800 dark:text-blue-300">Good (75-89%)</div>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                {data.students.filter(s => (s.attendance || 0) >= 60 && (s.attendance || 0) < 75).length}
                              </div>
                              <div className="text-xs text-yellow-800 dark:text-yellow-300">Average (60-74%)</div>
                            </div>
                            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                                {data.students.filter(s => (s.attendance || 0) < 60).length}
                              </div>
                              <div className="text-xs text-red-800 dark:text-red-300">Poor (&lt;60%)</div>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-500">No analytics data available</div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

















