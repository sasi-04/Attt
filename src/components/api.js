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
  getDashboardStats: () => fetch('/admin/dashboard/stats').then(r => r.json()),
  
  // Departments
  testDepartmentAPI: () => fetch('/admin/departments/test').then(r => r.json()),
  testYearAPI: () => fetch('/admin/years/test').then(r => r.json()),
  createDepartment: (name) => {
    return fetch('/admin/departments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).then(async res => {
      const text = await res.text()
      let data = {}
      
      try {
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', text)
        throw new Error('Invalid response from server')
      }
      
      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`)
      }
      
      return data
    }).catch(error => {
      console.error('Create department API error:', error)
      throw error
    })
  },
  createYear: (department, year) => {
    return fetch('/admin/years/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department, year })
    }).then(async res => {
      const text = await res.text()
      let data = {}
      
      try {
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response text:', text)
        throw new Error('Invalid response from server')
      }
      
      if (!res.ok) {
        throw new Error(data.error || `Server error: ${res.status}`)
      }
      
      return data
    }).catch(error => {
      console.error('Create year API error:', error)
      throw error
    })
  },
  getDepartmentsSummary: () => fetch('/admin/departments/summary').then(r => r.json()),
  getStudentsByDepartment: (department, year) => {
    const params = new URLSearchParams()
    if (department) params.append('department', department)
    if (year) params.append('year', year)
    return fetch(`/admin/students/by-department?${params.toString()}`).then(r => r.json())
  },
  getStaffByDepartment: (department) => fetch(`/admin/staff/by-department?department=${department}`).then(r => r.json()),
  
  // Staff Management
  getStaffList: () => fetch('/admin/staff/list').then(r => r.json()),
  addStaff: (data) => apiPost('/admin/staff/add', data),
  updateStaff: (id, updates) => apiPut(`/admin/staff/${id}`, updates),
  deleteStaff: (id) => fetch(`/admin/staff/${id}`, { method: 'DELETE' }).then(r => r.json()),
  resetStaffPassword: (id, newPassword) => apiPost(`/admin/staff/${id}/reset-password`, { newPassword }),
  
  // Student Management
  createStudent: (data) => apiPost('/admin/students/add', data),
  deleteStudent: (regNo) => fetch(`/admin/students/${regNo}`, { method: 'DELETE' }).then(r => r.json()),
  resetStudentPassword: (regNo, newPassword) => apiPost(`/admin/students/${regNo}/reset-password`, { newPassword }),
  
  // Settings
  getSettings: () => fetch('/admin/settings').then(r => r.json()),
  updateSettings: (updates) => apiPut('/admin/settings', updates),
  
  // Attendance Reports
  getAttendanceReports: (params) => {
    const query = new URLSearchParams(params).toString()
    return fetch(`/admin/attendance/reports${query ? '?' + query : ''}`).then(r => r.json())
  },

  // Hierarchical Access Control
  getHierarchyStructure: () => fetch('/admin/hierarchy/structure').then(r => r.json()),
  assignStaffToHierarchy: (staffId, department, year, isClassAdvisor = false) => {
    return fetch('/admin/hierarchy/assign-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, department, year, isClassAdvisor })
    }).then(r => r.json())
  },
  checkStudentAccess: (studentId, sessionDepartment, sessionYear) => {
    return fetch('/attendance/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, sessionDepartment, sessionYear })
    }).then(r => r.json())
  }
}


