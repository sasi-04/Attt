import React, { useMemo, useState, useEffect } from 'react'
import { apiGet, apiPut } from '../../components/api.js'

export default function LeaveRequests(){
  const [status, setStatus] = useState('All')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const response = await apiGet('/leave/requests')
      setRequests(response.requests)
    } catch (error) {
      console.error('Failed to load leave requests:', error)
      setMessage('Failed to load leave requests')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(()=> requests.filter(r => status==='All' || r.status===status), [status, requests])
  
  const update = async (id, next) => {
    try {
      await apiPut(`/leave/request/${id}/status`, { status: next, reviewedBy: 'Admin' })
      setMessage(`Leave request ${next}!`)
      await loadRequests()
    } catch (error) {
      setMessage('Failed to update leave status')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="text-center py-8 text-gray-500">Loading leave requests...</div>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold">Leave Requests</div>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="px-3 py-2 rounded-md border bg-gray-50">
          {['All','pending','approved','rejected'].map(s => <option key={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.includes('approved') || message.includes('rejected') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm border rounded-lg">
          <thead className="text-gray-600">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Dates</th>
              <th className="py-2 pr-4">Reason</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length > 0 ? filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="py-2 pr-4">{r.studentName}</td>
                <td className="py-2 pr-4">Student</td>
                <td className="py-2 pr-4">{r.startDate} to {r.endDate} ({r.duration})</td>
                <td className="py-2 pr-4">{r.reason}</td>
                <td className="py-2 pr-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    r.status === 'approved' ? 'bg-green-100 text-green-800' :
                    r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </span>
                </td>
                <td className="py-2 pr-4 space-x-2">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={()=>update(r.id,'approved')} className="px-2 py-1 rounded-md bg-green-600 text-white text-xs hover:bg-green-700">Approve</button>
                      <button onClick={()=>update(r.id,'rejected')} className="px-2 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500">No leave requests found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

















