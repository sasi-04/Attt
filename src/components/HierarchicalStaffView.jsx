import React, { useState, useEffect } from 'react'
import { apiGet, adminApi } from './api.js'

export default function HierarchicalStaffView() {
  const [viewLevel, setViewLevel] = useState('departments') // 'departments', 'staff'
  const [selectedDept, setSelectedDept] = useState(null)
  const [departments, setDepartments] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'M.Tech',
    designation: 'Assistant Professor',
    contact: ''
  })

  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    try {
      setLoading(true)
      const response = await apiGet('/admin/departments/summary')
      setDepartments(response.departments)
    } catch (error) {
      console.error('Failed to load departments:', error)
      setMessage('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }

  const loadStaff = async (dept) => {
    try {
      setLoading(true)
      const response = await apiGet(`/admin/staff/by-department?department=${dept}`)
      // Sort by name
      const sortedStaff = response.staff.sort((a, b) => a.name.localeCompare(b.name))
      setStaff(sortedStaff)
    } catch (error) {
      console.error('Failed to load staff:', error)
      setMessage('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  const handleDepartmentClick = (dept) => {
    setSelectedDept(dept)
    setViewLevel('staff')
    loadStaff(dept.name)
  }

  const handleBack = () => {
    setViewLevel('departments')
    setSelectedDept(null)
    setStaff([])
  }

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      department: selectedDept?.name || 'M.Tech',
      designation: 'Assistant Professor',
      contact: ''
    })
    setShowAddModal(true)
    setMessage('')
  }

  const openEditModal = (staffMember) => {
    setSelectedStaff(staffMember)
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      department: staffMember.department,
      designation: staffMember.designation,
      contact: staffMember.contact || ''
    })
    setShowEditModal(true)
    setMessage('')
  }

  const openDeleteModal = (staffMember) => {
    setSelectedStaff(staffMember)
    setShowDeleteModal(true)
    setMessage('')
  }

  const openPasswordModal = (staffMember) => {
    setSelectedStaff(staffMember)
    setFormData({ ...formData, password: '' })
    setShowPasswordModal(true)
    setMessage('')
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    try {
      await adminApi.addStaff(formData)
      setMessage('Staff added successfully!')
      setShowAddModal(false)
      loadStaff(selectedDept.name)
    } catch (error) {
      setMessage('Failed to add staff')
    }
  }

  const handleEditStaff = async (e) => {
    e.preventDefault()
    try {
      await adminApi.updateStaff(selectedStaff.id, formData)
      setMessage('Staff updated successfully!')
      setShowEditModal(false)
      loadStaff(selectedDept.name)
    } catch (error) {
      setMessage('Failed to update staff')
    }
  }

  const handleDeleteStaff = async () => {
    try {
      await adminApi.deleteStaff(selectedStaff.id)
      setMessage('Staff deleted successfully!')
      setShowDeleteModal(false)
      loadStaff(selectedDept.name)
    } catch (error) {
      setMessage('Failed to delete staff')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      await adminApi.resetStaffPassword(selectedStaff.id, formData.password)
      setMessage('Password reset successfully!')
      setShowPasswordModal(false)
      setFormData({ ...formData, password: '' })
    } catch (error) {
      setMessage('Failed to reset password')
    }
  }

  if (loading && viewLevel === 'departments') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading departments...</div>
      </div>
    )
  }

  // LEVEL 1: DEPARTMENTS VIEW
  if (viewLevel === 'departments') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-2">Select Department</h2>
          <p className="text-gray-600 mb-6">Choose a department to manage staff</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {departments.map(dept => (
              <div
                key={dept.name}
                onClick={() => handleDepartmentClick(dept)}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-purple-500 transform hover:scale-105"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{dept.name}</h3>
                  <span className="text-4xl">👩‍🏫</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                    <span className="text-sm text-gray-600">Staff Members</span>
                    <span className="text-lg font-bold text-purple-600">{dept.staff.total}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                    <span className="text-sm text-gray-600">Students</span>
                    <span className="text-lg font-bold text-blue-600">{dept.students.total}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // LEVEL 2: STAFF LIST VIEW
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button
            onClick={handleBack}
            className="text-blue-600 hover:underline"
          >
            Departments
          </button>
          <span className="text-gray-400">›</span>
          <span className="text-gray-800 font-semibold">{selectedDept.name}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{selectedDept.name} - Staff</h2>
            <p className="text-gray-600">Total Staff: {staff.length}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              ← Back to Departments
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Staff
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        {/* Staff Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading staff...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm border rounded-lg">
              <thead className="text-gray-600 bg-gray-50">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staff.length > 0 ? staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{s.name}</td>
                    <td className="py-3 px-4">{s.email}</td>
                    <td className="py-3 px-4">{s.designation}</td>
                    <td className="py-3 px-4">{s.contact || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${s.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 space-x-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openPasswordModal(s)}
                        className="px-3 py-1 rounded-md bg-yellow-600 text-white text-xs hover:bg-yellow-700"
                      >
                        Reset Pwd
                      </button>
                      <button
                        onClick={() => openDeleteModal(s)}
                        className="px-3 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">No staff found in this department</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add New Staff</h2>
            <form onSubmit={handleAddStaff} className="space-y-3">
              <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="password" placeholder="Password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="text" placeholder="Contact" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              <select value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option>Assistant Professor</option>
                <option>Associate Professor</option>
                <option>Professor</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Edit Staff</h2>
            <form onSubmit={handleEditStaff} className="space-y-3">
              <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              <input type="text" placeholder="Contact" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              <select value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option>Assistant Professor</option>
                <option>Associate Professor</option>
                <option>Professor</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Delete</h2>
            <p className="mb-4">Are you sure you want to delete <strong>{selectedStaff.name}</strong>?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleDeleteStaff} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
            <p className="mb-4 text-gray-600">Reset password for <strong>{selectedStaff.name}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <input type="password" placeholder="New Password (min 6 characters)" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required minLength="6" />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-lg">Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
