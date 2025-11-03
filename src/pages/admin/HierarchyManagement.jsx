import React, { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../../components/api.js'
import { useAdminUpdates } from '../../hooks/useWebSocket.js'

export default function HierarchyManagement() {
  const [hierarchy, setHierarchy] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [allStaff, setAllStaff] = useState([])
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('')
  const [isClassAdvisor, setIsClassAdvisor] = useState(false)

  useEffect(() => {
    loadHierarchy()
    loadAllStaff()
  }, [])

  // Handle real-time updates
  const handleAdminUpdate = useCallback((update) => {
    if (update.type === 'hierarchy-updated') {
      console.log('Hierarchy update received:', update)
      loadHierarchy()
    }
  }, [])

  useAdminUpdates(handleAdminUpdate)

  const loadHierarchy = async () => {
    try {
      setLoading(true)
      const response = await fetch('/admin/hierarchy/structure')
      const data = await response.json()
      
      // Add null checks and default to empty object
      if (data && data.hierarchy && typeof data.hierarchy === 'object') {
        setHierarchy(data.hierarchy)
      } else {
        console.warn('Invalid hierarchy data received:', data)
        setHierarchy({})
      }
    } catch (error) {
      console.error('Failed to load hierarchy:', error)
      setMessage('Failed to load hierarchy structure')
      setHierarchy({}) // Set to empty object on error
    } finally {
      setLoading(false)
    }
  }

  const loadAllStaff = async () => {
    try {
      const response = await adminApi.getStaffList()
      
      // Add null checks for staff data
      if (response && response.staff && Array.isArray(response.staff)) {
        setAllStaff(response.staff.filter(s => !s.isDepartmentPlaceholder))
      } else {
        console.warn('Invalid staff data received:', response)
        setAllStaff([])
      }
    } catch (error) {
      console.error('Failed to load staff:', error)
      setAllStaff([]) // Set to empty array on error
    }
  }

  const handleAssignStaff = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('/admin/hierarchy/assign-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaff,
          department: selectedDept,
          year: selectedYear,
          isClassAdvisor
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Assignment failed')
      }

      setMessage(`✓ ${data.message}`)
      setShowAssignModal(false)
      setSelectedStaff('')
      setSelectedDept('')
      setSelectedYear('')
      setIsClassAdvisor(false)
      
      await loadHierarchy()
      setTimeout(() => setMessage(''), 5000)
    } catch (error) {
      console.error('Assignment error:', error)
      setMessage(`Failed to assign staff: ${error.message}`)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading hierarchy...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🏢 Hierarchical Access Control</h1>
            <p className="text-gray-600 mt-2">Manage department-year-staff assignments and class advisors</p>
            <div className="mt-3 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
              <strong>Purpose:</strong> Control QR code access so only students from specific department+year can scan their class QR codes
            </div>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md"
          >
            <span className="text-xl">➕</span>
            <span>Assign Staff</span>
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded-lg ${message.includes('✓') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {message}
          </div>
        )}
      </div>

      {/* Hierarchy Structure Display */}
      <div className="space-y-6">
        {(!hierarchy || Object.keys(hierarchy).length === 0) ? (
          <div className="bg-white rounded-xl shadow-md p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Hierarchy Data</h3>
              <p className="text-gray-600 mb-4">Create departments and years first, then assign staff to them.</p>
              <div className="text-sm text-gray-500">
                Go to <strong>Manage Staff</strong> → <strong>Manage Students</strong> to create the basic structure first.
              </div>
            </div>
          </div>
        ) : (
          Object.entries(hierarchy || {}).map(([department, years]) => (
            <div key={department} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Department Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <span className="text-3xl">🏢</span>
                  {department}
                  <span className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded-full">
                    {Object.keys(years || {}).length} year{Object.keys(years || {}).length !== 1 ? 's' : ''}
                  </span>
                </h2>
              </div>
              
              {/* Years Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(years || {}).map(([year, data]) => (
                    <div key={year} className="border-2 border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors">
                      {/* Year Header */}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                          <span className="text-xl">📚</span>
                          {year}
                        </h3>
                        <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                          {(data && data.studentCount) || 0} students
                        </span>
                      </div>

                      {/* Class Advisor */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                          <span>👨‍🏫</span> Class Advisor:
                        </h4>
                        {(data && data.classAdvisor) ? (
                          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                            <div className="font-semibold text-green-800">{data.classAdvisor.name}</div>
                            <div className="text-sm text-green-600">{data.classAdvisor.designation}</div>
                            <div className="text-xs text-green-500 mt-1">{data.classAdvisor.email}</div>
                          </div>
                        ) : (
                          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 text-yellow-700 text-sm">
                            ⚠️ No class advisor assigned
                          </div>
                        )}
                      </div>

                      {/* Other Staff */}
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                          <span>👥</span> Other Staff ({(data && data.staff ? data.staff.filter(s => !s.isClassAdvisor) : []).length}):
                        </h4>
                        {(data && data.staff && data.staff.filter(s => !s.isClassAdvisor).length > 0) ? (
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {data.staff.filter(s => !s.isClassAdvisor).map(staff => (
                              <div key={staff.id} className="bg-gray-50 border rounded-lg p-2 text-sm">
                                <div className="font-medium text-gray-700">{staff.name}</div>
                                <div className="text-xs text-gray-500">{staff.designation}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic bg-gray-50 p-2 rounded">
                            No other staff assigned
                          </div>
                        )}
                      </div>

                      {/* Access Control Info */}
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                        <div className="text-xs font-semibold text-blue-800 mb-1">🔒 Access Control:</div>
                        <div className="text-xs text-blue-600">
                          Only <strong>{department} {year}</strong> students can scan QR codes for this class
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assign Staff Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-gray-800">👨‍🏫 Assign Staff to Department-Year</h2>
            <form onSubmit={handleAssignStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🏢 Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Department</option>
                  {Object.keys(hierarchy || {}).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📚 Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!selectedDept}
                >
                  <option value="">Select Year</option>
                  {selectedDept && hierarchy && hierarchy[selectedDept] && Object.keys(hierarchy[selectedDept]).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">👨‍🏫 Staff Member</label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Staff</option>
                  {(allStaff || []).map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} - {staff.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center bg-yellow-50 p-3 rounded-lg">
                <input
                  type="checkbox"
                  id="isClassAdvisor"
                  checked={isClassAdvisor}
                  onChange={(e) => setIsClassAdvisor(e.target.checked)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isClassAdvisor" className="text-sm font-medium text-gray-700">
                  👨‍🏫 Assign as Class Advisor
                </label>
              </div>

              {isClassAdvisor && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                  <strong>⚠️ Note:</strong> Each department-year can have only one class advisor. 
                  If one already exists, they will be replaced.
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAssignModal(false)} 
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Assign Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 How Hierarchical Access Control Works:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h4 className="font-semibold mb-2">🎯 For Admins:</h4>
            <ul className="space-y-1">
              <li>• Assign staff to specific department-year combinations</li>
              <li>• Designate one class advisor per department-year</li>
              <li>• Control who can generate QR codes for which classes</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🔒 For Students:</h4>
            <ul className="space-y-1">
              <li>• Can only scan QR codes for their own department-year</li>
              <li>• Cross-department/year scanning is blocked</li>
              <li>• Clear error messages for unauthorized access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
