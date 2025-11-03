import React, { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import AdminSidebar from '../components/AdminSidebar.jsx'
import AdminTopbar from '../components/AdminTopbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function AdminLayout(){
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(()=>{
    const stored = localStorage.getItem('ams_theme')
    if (stored === 'dark') setDark(true)
  },[])
  useEffect(()=>{
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark'); localStorage.setItem('ams_theme','dark')
    } else {
      root.classList.remove('dark'); localStorage.setItem('ams_theme','light')
    }
  },[dark])
  const items = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/admin/staff', label: 'Manage Staff', icon: '👩‍🏫' },
    { to: '/admin/students', label: 'Manage Students', icon: '👨‍🎓' },
    { to: '/admin/hierarchy', label: 'Hierarchy Management', icon: '🏢' },
    { to: '/admin/attendance', label: 'Attendance Reports', icon: '🗂️' },
    { to: '/admin/leave', label: 'Leave Requests', icon: '📝' },
    { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ]
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex min-h-screen">
        <AdminSidebar items={items} collapsed={collapsed} onToggle={()=>setCollapsed(c=>!c)} />
        <main className="flex-1">
          <AdminTopbar name={user?.name || 'Admin User'} role="Admin" onLogout={logout} onToggleTheme={()=>setDark(d=>!d)} />
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}


