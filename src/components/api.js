export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export async function apiPost(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    })
    const text = await res.text()
    let data = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
    if (!res.ok) throw Object.assign(new Error(data.message || data.error || 'request_failed'), { code: data.error, status: res.status, raw: data.raw })
    return data
  } catch (err) {
    if (err.name === 'TypeError') {
      // Network or CORS error
      throw Object.assign(new Error('network_error'), { code: 'network_error' })
    }
    throw err
  }
}

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'request_failed'), { code: data.error })
  return data
}

export async function apiPut(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    })
    const text = await res.text()
    let data = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
    if (!res.ok) throw Object.assign(new Error(data.message || data.error || 'request_failed'), { code: data.error, status: res.status, raw: data.raw })
    return data
  } catch (err) {
    if (err.name === 'TypeError') {
      throw Object.assign(new Error('network_error'), { code: 'network_error' })
    }
    throw err
  }
}

// Staff API functions
export const staffApi = {
  // Get staff profile
  getProfile: (staffId) => apiGet(`/staff/${staffId}/profile`),
  
  // Update staff profile
  updateProfile: (staffId, updates) => apiPut(`/staff/${staffId}/profile`, updates),
  
  // Change staff password
  changePassword: (staffId, currentPassword, newPassword) => 
    apiPost(`/staff/${staffId}/change-password`, { currentPassword, newPassword }),
  
  // Get staff analytics
  getAnalytics: (staffId) => apiGet(`/staff/${staffId}/analytics`),
  
  // Get staff recent activity
  getRecentActivity: (staffId) => apiGet(`/staff/${staffId}/recent-activity`)
}

// Admin API functions
export const adminApi = {
  // Dashboard
  getDashboardStats: () => apiGet('/admin/dashboard/stats'),
  
  // Departments
  getDepartmentsSummary: () => apiGet('/admin/departments/summary'),
  getStudentsByDepartment: (department, year) => {
    const params = new URLSearchParams()
    if (department) params.append('department', department)
    if (year) params.append('year', year)
    return apiGet(`/admin/students/by-department?${params.toString()}`)
  },
  getStaffByDepartment: (department) => apiGet(`/admin/staff/by-department?department=${department}`),
  
  // Staff Management
  getStaffList: () => apiGet('/admin/staff/list'),
  addStaff: (data) => apiPost('/admin/staff/add', data),
  updateStaff: (id, updates) => apiPut(`/admin/staff/${id}`, updates),
  deleteStaff: (id) => fetch(`${API_BASE}/admin/staff/${id}`, { method: 'DELETE' }).then(r => r.json()),
  resetStaffPassword: (id, newPassword) => apiPost(`/admin/staff/${id}/reset-password`, { newPassword }),
  
  // Student Management
  deleteStudent: (regNo) => fetch(`${API_BASE}/admin/students/${regNo}`, { method: 'DELETE' }).then(r => r.json()),
  resetStudentPassword: (regNo, newPassword) => apiPost(`/admin/students/${regNo}/reset-password`, { newPassword }),
  
  // Settings
  getSettings: () => apiGet('/admin/settings'),
  updateSettings: (updates) => apiPut('/admin/settings', updates),
  
  // Attendance Reports
  getAttendanceReports: (params) => {
    const query = new URLSearchParams(params).toString()
    return apiGet(`/admin/attendance/reports${query ? '?' + query : ''}`)
  }
}


