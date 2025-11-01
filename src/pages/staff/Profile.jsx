import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import ProfileCard from '../../components/ProfileCard.jsx'
import TeachingDetails from '../../components/TeachingDetails.jsx'
import RecentActivity from '../../components/RecentActivity.jsx'
import { staffApi } from '../../components/api.js'

export default function Profile(){
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [activities, setActivities] = useState([])
  const [name, setName] = useState('')
  const [dept, setDept] = useState('')
  const [contact, setContact] = useState('')
  const [designation, setDesignation] = useState('')
  const [experience, setExperience] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user?.email) {
      loadProfile()
      loadActivities()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const data = await staffApi.getProfile(user.email)
      setProfile(data.profile)
      setName(data.profile.name || '')
      setDept(data.profile.department || '')
      setContact(data.profile.contact || '')
      setDesignation(data.profile.designation || '')
      setExperience(data.profile.experience || '')
    } catch (error) {
      console.error('Failed to load profile:', error)
      setMessage('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const loadActivities = async () => {
    try {
      const data = await staffApi.getRecentActivity(user.email)
      setActivities(data.activities || [])
    } catch (error) {
      console.error('Failed to load activities:', error)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage('')
      await staffApi.updateProfile(user.email, {
        name,
        department: dept,
        contact,
        designation,
        experience
      })
      setMessage('Profile updated successfully!')
      await loadProfile()
    } catch (error) {
      console.error('Failed to save profile:', error)
      setMessage('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const changePw = async (e) => {
    e.preventDefault()
    if (!currentPassword || !password) {
      setMessage('Please fill in all password fields')
      return
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }
    try {
      setSaving(true)
      setMessage('')
      await staffApi.changePassword(user.email, currentPassword, password)
      setMessage('Password updated successfully!')
      setPassword('')
      setCurrentPassword('')
    } catch (error) {
      console.error('Failed to change password:', error)
      if (error.code === 'current_password_incorrect') {
        setMessage('Current password is incorrect')
      } else {
        setMessage('Failed to change password')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}
      <ProfileCard name={name} email={user?.email || 'staff@demo.com'} department={dept} role="Staff" onEdit={()=>{}} onLogout={logout} />

      <TeachingDetails profile={profile} />

      <RecentActivity activities={activities} />

      <form onSubmit={save} className="bg-white rounded-xl shadow-md p-6 max-w-xl space-y-3">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Edit Profile</h2>
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Name</div>
          <input className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Department</div>
          <input className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" value={dept} onChange={(e)=>setDept(e.target.value)} />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Designation</div>
          <input className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" value={designation} onChange={(e)=>setDesignation(e.target.value)} placeholder="e.g., Assistant Professor" />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Experience</div>
          <input className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" value={experience} onChange={(e)=>setExperience(e.target.value)} placeholder="e.g., 5 years" />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Contact</div>
          <input className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" value={contact} onChange={(e)=>setContact(e.target.value)} />
        </label>
        <div className="pt-2">
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <form onSubmit={changePw} className="bg-white rounded-xl shadow-md p-6 max-w-xl space-y-3">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Security</h2>
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Current Password</div>
          <input type="password" className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} placeholder="Enter current password" required />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">New Password</div>
          <input type="password" className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter new password (min 6 characters)" required />
        </label>
        <div className="pt-2 flex gap-2">
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Updating...' : 'Change Password'}
          </button>
          <button type="button" onClick={logout} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Logout</button>
        </div>
      </form>
    </div>
  )
}


