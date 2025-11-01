import React, { useMemo, useState, useEffect } from 'react'
import { adminApi, apiGet } from './api.js'

export default function StaffTable(){
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('All')
  const [desig, setDesig] = useState('All')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [message, setMessage] = useState('')
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Computer Science',
    designation: 'Assistant Professor',
    contact: ''
  })

  useEffect(() => {
    loadStaff()
  }, [dept])

  const loadStaff = async () => {
    try {
      setLoading(true)
      let response
      if (dept !== 'All') {
        response = await apiGet(`/admin/staff/by-department?department=${dept}`)
        setData(response.staff)
      } else {
        response = await adminApi.getStaffList()
        setData(response.staff)
      }
    } catch (error) {
      console.error('Failed to load staff:', error)
      setMessage('Failed to load staff data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async (e) => {
    e.preventDefault()
    try {
      await adminApi.addStaff(formData)
      setMessage('Staff added successfully!')
      setShowAddModal(false)
      setFormData({ name: '', email: '', password: '', department: 'Computer Science', designation: 'Assistant Professor', contact: '' })
      await loadStaff()
    } catch (error) {
      setMessage(error.code === 'email_already_exists' ? 'Email already exists' : 'Failed to add staff')
    }
  }

  const handleEditStaff = async (e) => {
    e.preventDefault()
    try {
      await adminApi.updateStaff(selectedStaff.id, formData)
      setMessage('Staff updated successfully!')
      setShowEditModal(false)
      await loadStaff()
    } catch (error) {
      setMessage('Failed to update staff')
    }
  }

  const handleDeleteStaff = async () => {
    try {
      await adminApi.deleteStaff(selectedStaff.id)
      setMessage('Staff deleted successfully!')
      setShowDeleteModal(false)
      await loadStaff()
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

  const openAddModal = () => {
    setFormData({ name: '', email: '', password: '', department: 'Computer Science', designation: 'Assistant Professor', contact: '' })
    setShowAddModal(true)
    setMessage('')
  }

  const openEditModal = (staff) => {
    setSelectedStaff(staff)
    setFormData({
      name: staff.name,
      email: staff.email,
      department: staff.department,
      designation: staff.designation,
      contact: staff.contact || ''
    })
    setShowEditModal(true)
    setMessage('')
  }

  const openDeleteModal = (staff) => {
    setSelectedStaff(staff)
    setShowDeleteModal(true)
    setMessage('')
  }

  const openPasswordModal = (staff) => {
    setSelectedStaff(staff)
    setFormData({ ...formData, password: '' })
    setShowPasswordModal(true)
    setMessage('')
  }

  const filtered = useMemo(()=>{
    const q = query.toLowerCase()
    return data.filter(s =>
      (dept==='All' || s.department===dept) &&
      (desig==='All' || s.designation===desig) &&
      (s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    )
  },[query, dept, desig, data])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center py-8 text-gray-500">Loading staff...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="text-lg font-semibold">Staff Members</div>
        <div className="flex gap-2">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search name/email" className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50 w-64" />
          <select value={dept} onChange={(e)=>setDept(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50">
            {['All','Computer Science','Electrical Engineering','Mechanical Engineering','M.Tech','Civil Engineering'].map(d=> <option key={d}>{d}</option>)}
          </select>
          <select value={desig} onChange={(e)=>setDesig(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50">
            {['All','Professor','Associate Professor','Assistant Professor'].map(d=> <option key={d}>{d}</option>)}
          </select>
          <button onClick={openAddModal} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Staff</button>
        </div>
      </div>
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm border rounded-lg">
          <thead className="text-gray-600 bg-gray-50">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Designation</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length > 0 ? filtered.map((s)=> (
              <tr key={s.id} className="hover:bg-gray-50">
                <td className="py-3 px-4">{s.name}</td>
                <td className="py-3 px-4">{s.email}</td>
                <td className="py-3 px-4">{s.department}</td>
                <td className="py-3 px-4">{s.designation}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded text-xs ${s.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="py-3 px-4 space-x-2">
                  <button onClick={() => openEditModal(s)} className="px-2 py-1 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700">Edit</button>
                  <button onClick={() => openPasswordModal(s)} className="px-2 py-1 rounded-md bg-yellow-600 text-white text-xs hover:bg-yellow-700">Reset Pwd</button>
                  <button onClick={() => openDeleteModal(s)} className="px-2 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700">Delete</button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500">No staff found</td>
              </tr>
            )}
          </tbody>
        </table>
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
              <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option>Computer Science</option>
                <option>Electrical Engineering</option>
                <option>Mechanical Engineering</option>
              </select>
              <select value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option>Assistant Professor</option>
                <option>Associate Professor</option>
                <option>Professor</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Staff</button>
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
              <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option>Computer Science</option>
                <option>Electrical Engineering</option>
                <option>Mechanical Engineering</option>
              </select>
              <select value={formData.designation} onChange={(e) => setFormData({...formData, designation: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option>Assistant Professor</option>
                <option>Associate Professor</option>
                <option>Professor</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-red-600">Confirm Delete</h2>
            <p className="mb-4">Are you sure you want to delete <strong>{selectedStaff.name}</strong>?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
              <button onClick={handleDeleteStaff} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
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
                <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

















