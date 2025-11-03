import React, { useState, useEffect, useCallback } from 'react'
import { adminApi } from './api.js'
import { useAdminUpdates } from '../hooks/useWebSocket.js'

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
      setHierarchy(data.hierarchy)
    } catch (error) {
      console.error('Failed to load hierarchy:', error)
      setMessage('Failed to load hierarchy structure')
    } finally {
      setLoading(false)
    }
  }

  const loadAllStaff = async () => {
    try {
      const response = await adminApi.getStaffList()
      setAllStaff(response.staff.filter(s => !s.isDepartmentPlaceholder))
    } catch (error) {
      console.error('Failed to load staff:', error)
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
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hierarchical Access Control</h1>
            <p className="text-gray-600">Manage department-year-staff assignments and class advisors</p>
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            <span>Assign Staff</span>
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.includes('✓') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Hierarchy Structure Display */}
        <div className="space-y-6">
          {Object.keys(hierarchy).length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Hierarchy Data</h3>
              <p className="text-gray-600">Create departments and years first, then assign staff to them.</p>
            </div>
          ) : (
            Object.entries(hierarchy).map(([department, years]) => (
              <div key={department} className="border rounded-xl p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-2xl">🏢</span>
                  {department}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(years).map(([year, data]) => (
                    <div key={year} className="bg-white rounded-lg p-4 shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="text-xl">📚</span>
                        {year}
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {data.studentCount} students
                        </span>
                      </h3>

                      {/* Class Advisor */}
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-600 mb-1">Class Advisor:</h4>
                        {data.classAdvisor ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                            <div className="font-medium text-green-800">{data.classAdvisor.name}</div>
                            <div className="text-sm text-green-600">{data.classAdvisor.designation}</div>
                            <div className="text-xs text-green-500">{data.classAdvisor.email}</div>
                          </div>
                        ) : (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-yellow-700 text-sm">
                            No class advisor assigned
                          </div>
                        )}
                      </div>

                      {/* Other Staff */}
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-600 mb-1">
                          Other Staff ({data.staff.filter(s => !s.isClassAdvisor).length}):
                        </h4>
                        {data.staff.filter(s => !s.isClassAdvisor).length > 0 ? (
                          <div className="space-y-1">
                            {data.staff.filter(s => !s.isClassAdvisor).map(staff => (
                              <div key={staff.id} className="bg-gray-50 border rounded p-2 text-sm">
                                <div className="font-medium text-gray-700">{staff.name}</div>
                                <div className="text-xs text-gray-500">{staff.designation}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic">No other staff assigned</div>
                        )}
                      </div>

                      {/* Access Control Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs">
                        <div className="font-medium text-blue-800">Access Control:</div>
                        <div className="text-blue-600">
                          Only {department} {year} students can scan QR codes for this class
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Assign Staff Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAssignModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Assign Staff to Department-Year</h2>
            <form onSubmit={handleAssignStaff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Department</option>
                  {Object.keys(hierarchy).map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!selectedDept}
                >
                  <option value="">Select Year</option>
                  {selectedDept && hierarchy[selectedDept] && Object.keys(hierarchy[selectedDept]).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Staff</option>
                  {allStaff.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} - {staff.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isClassAdvisor"
                  checked={isClassAdvisor}
                  onChange={(e) => setIsClassAdvisor(e.target.checked)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isClassAdvisor" className="text-sm font-medium text-gray-700">
                  Assign as Class Advisor
                </label>
              </div>

              {isClassAdvisor && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  <strong>Note:</strong> Each department-year can have only one class advisor. 
                  If one already exists, they will be replaced.
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAssignModal(false)} 
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Assign Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
