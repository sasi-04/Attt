import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function StaffLayout(){
  const { user, logout } = useAuth()

  const items = [
    { to: '/staff/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/staff/students', label: 'Students', icon: '👥' },
    { to: '/staff/attendance', label: 'Attendance', icon: '📝' },
    { to: '/staff/leave', label: 'Leave', icon: '📅' },
    { to: '/staff/profile', label: 'Profile', icon: '👤' },
    { to: '/staff/analytics', label: 'Analytics', icon: '📊' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex min-h-screen">
        <Sidebar items={items} title="Attendance" subtitle="Staff Panel" />
        <main className="flex-1">
          <Topbar name={user?.name} role={user?.isClassAdvisor ? "Class Advisor" : "Staff"} right={<button onClick={logout} className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white text-sm transition-colors">Logout</button>} />
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}


