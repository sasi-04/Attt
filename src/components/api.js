export const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function apiPost(path, body) {
  try {
    // Get staff email from localStorage for authentication
    const user = JSON.parse(localStorage.getItem('ams_user') || localStorage.getItem('user') || '{}')
    const headers = { 'Content-Type': 'application/json' }
    
    // Add staff email to headers if available
    if (user.email) {
      headers['x-staff-email'] = user.email
    }
    
    // Debug logging for face enrollment
    if (path.includes('face-recognition')) {
      console.log('🔧 API DEBUG - Face enrollment request:')
      console.log('- API_BASE:', API_BASE)
      console.log('- Path:', path)
      console.log('- Full URL:', `${API_BASE}${path}`)
      console.log('- Headers:', headers)
      console.log('- Body:', body)
    }
    
    // Add cache busting for face enrollment to ensure fresh requests
    const url = path.includes('face-recognition') 
      ? `${API_BASE}${path}?t=${Date.now()}`
      : `${API_BASE}${path}`
    
    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body || {})
    })
    const text = await res.text()
    let data = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
    
    // Debug logging for face enrollment responses
    if (path.includes('face-recognition')) {
      console.log('🔧 API DEBUG - Response:')
      console.log('- Status:', res.status)
      console.log('- OK:', res.ok)
      console.log('- Response text:', text)
      console.log('- Parsed data:', data)
    }
    
    if (!res.ok) {
      const error = Object.assign(
        new Error(data.message || data.error || 'request_failed'), 
        { 
          code: data.error, 
          status: res.status, 
          details: data.details,
          errorType: data.errorType,
          errorCode: data.errorCode,
          raw: data 
        }
      )
      throw error
    }
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
  // Get staff email from localStorage for authentication
  const user = JSON.parse(localStorage.getItem('ams_user') || localStorage.getItem('user') || '{}')
  const headers = {}
  
  // Add staff email to headers if available
  if (user.email) {
    headers['x-staff-email'] = user.email
  }
  
  const res = await fetch(`${API_BASE}${path}`, { headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || 'request_failed'), { code: data.error })
  return data
}

export async function apiPut(path, body) {
  try {
    // Get staff email from localStorage for authentication
    const user = JSON.parse(localStorage.getItem('ams_user') || localStorage.getItem('user') || '{}')
    const headers = { 'Content-Type': 'application/json' }
    
    // Add staff email to headers if available
    if (user.email) {
      headers['x-staff-email'] = user.email
    }
    
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: headers,
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

export async function apiDelete(path) {
  // Get staff email from localStorage for authentication
  const user = JSON.parse(localStorage.getItem('ams_user') || localStorage.getItem('user') || '{}')
  const headers = {}
  if (user.email) {
    headers['x-staff-email'] = user.email
  }
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers })
  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
  if (!res.ok) throw Object.assign(new Error(data.message || data.error || 'request_failed'), { code: data.error, status: res.status, raw: data })
  return data
}

// Staff API functions (merged - no duplicates)
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
  getRecentActivity: (staffId) => apiGet(`/staff/${staffId}/recent-activity`),

  // Department access control functions
  getStudentsByDepartment: (department, year) => {
    const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
    const staffEmail = user.email
    
    const params = new URLSearchParams()
    if (department) params.append('department', department)
    if (year) params.append('year', year)
    if (staffEmail) params.append('staffEmail', staffEmail)
    
    return fetch(`/staff/students/by-department?${params.toString()}`).then(r => r.json())
  },
  
  getDepartmentsSummary: () => {
    const user = JSON.parse(localStorage.getItem('ams_user') || '{}')
    const staffEmail = user.email
    
    const params = new URLSearchParams()
    if (staffEmail) params.append('staffEmail', staffEmail)
    
    return fetch(`/admin/departments/summary?${params.toString()}`)
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`)
        }
        return r.json()
      })
      .catch(error => {
        console.error('Error loading departments:', error)
        throw error
      })
  }
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
