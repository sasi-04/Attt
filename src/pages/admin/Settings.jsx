import React, { useState, useEffect } from 'react'
import { adminApi } from '../../components/api.js'

export default function Settings(){
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState({
    institutionName: '',
    academicYear: '',
    semesterStart: '',
    semesterEnd: '',
    departments: [],
    minimumAttendance: 75,
    notificationsEnabled: true,
    emailNotifications: false
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await adminApi.getSettings()
      setSettings(response.settings)
    } catch (error) {
      console.error('Failed to load settings:', error)
      setMessage('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage('')
      await adminApi.updateSettings(settings)
      setMessage('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field, value) => {
    setSettings({ ...settings, [field]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
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
      
      <form onSubmit={save} className="bg-white rounded-xl shadow-md p-6 max-w-2xl space-y-4">
        <div className="text-xl font-bold mb-4">Institution Settings</div>
        
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Institution Name</div>
          <input 
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" 
            value={settings.institutionName} 
            onChange={(e)=>handleChange('institutionName', e.target.value)} 
            placeholder="Enter institution name"
          />
        </label>
        
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Academic Year</div>
          <input 
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" 
            value={settings.academicYear} 
            onChange={(e)=>handleChange('academicYear', e.target.value)}
            placeholder="e.g., 2024-2025" 
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <div className="text-sm text-gray-600 mb-1">Semester Start</div>
            <input 
              type="date"
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" 
              value={settings.semesterStart} 
              onChange={(e)=>handleChange('semesterStart', e.target.value)} 
            />
          </label>
          
          <label className="block">
            <div className="text-sm text-gray-600 mb-1">Semester End</div>
            <input 
              type="date"
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" 
              value={settings.semesterEnd} 
              onChange={(e)=>handleChange('semesterEnd', e.target.value)} 
            />
          </label>
        </div>
        
        <label className="block">
          <div className="text-sm text-gray-600 mb-1">Minimum Attendance Required (%)</div>
          <input 
            type="number"
            min="0"
            max="100"
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2" 
            value={settings.minimumAttendance} 
            onChange={(e)=>handleChange('minimumAttendance', parseInt(e.target.value))} 
          />
        </label>

        <div className="border-t pt-4 mt-4">
          <div className="text-lg font-semibold mb-3">Notification Settings</div>
          
          <label className="flex items-center gap-3 mb-3">
            <input 
              type="checkbox"
              className="w-5 h-5"
              checked={settings.notificationsEnabled} 
              onChange={(e)=>handleChange('notificationsEnabled', e.target.checked)} 
            />
            <div>
              <div className="font-medium">Enable Notifications</div>
              <div className="text-sm text-gray-500">Send system notifications to users</div>
            </div>
          </label>
          
          <label className="flex items-center gap-3">
            <input 
              type="checkbox"
              className="w-5 h-5"
              checked={settings.emailNotifications} 
              onChange={(e)=>handleChange('emailNotifications', e.target.checked)} 
            />
            <div>
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-gray-500">Send email alerts for important events</div>
            </div>
          </label>
        </div>

        <div className="pt-4">
          <button 
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

















