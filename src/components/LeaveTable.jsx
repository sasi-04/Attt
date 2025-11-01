import React, { useMemo, useState, useEffect } from 'react'
import { apiGet } from './api.js'

export default function LeaveTable(){
  const [status, setStatus] = useState('all')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaveRequests()
  }, [status])

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true)
      const data = await apiGet(`/leave/requests?status=${status}`)
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Failed to fetch leave requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(()=> requests, [requests])

  const update = async (id, nextStatus) => {
    try {
      const response = await fetch(`/api/leave/request/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus.toLowerCase(), reviewedBy: 'staff' })
      })
      
      if (response.ok) {
        // Refresh the list
        fetchLeaveRequests()
      }
    } catch (error) {
      console.error('Failed to update leave status:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="text-center py-8 text-gray-500">Loading leave requests...</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-lg">Leave Requests</div>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} className="px-3 py-2 rounded-md border border-gray-200 bg-gray-50">
          {['all','pending','approved','rejected'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-gray-600">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Dates</th>
              <th className="py-2 pr-4">Reason</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length > 0 ? (
              filtered.map(r => (
                <tr key={r.id}>
                  <td className="py-2 pr-4">
                    <div className="font-medium">{r.studentName}</div>
                    <div className="text-xs text-gray-500">{r.regNo}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <div>{new Date(r.startDate).toLocaleDateString()}</div>
                    {r.startDate !== r.endDate && (
                      <div className="text-xs text-gray-500">to {new Date(r.endDate).toLocaleDateString()}</div>
                    )}
                    <div className="text-xs text-gray-500">{r.duration}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <div>{r.reason}</div>
                    <div className="text-xs text-gray-500 capitalize">{r.type}</div>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`px-2 py-1 rounded text-xs capitalize ${
                      r.status==='pending'?'bg-yellow-50 text-yellow-700': 
                      r.status==='approved'?'bg-green-50 text-green-700':
                      'bg-red-50 text-red-700'
                    }`}>{r.status}</span>
                  </td>
                  <td className="py-2 pr-4 space-x-2">
                    {r.status === 'pending' && (
                      <>
                        <button 
                          onClick={()=>update(r.id, 'approved')} 
                          className="px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 text-xs"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={()=>update(r.id, 'rejected')} 
                          className="px-2 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 text-xs"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {r.status !== 'pending' && (
                      <span className="text-xs text-gray-500">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="py-8 text-center text-gray-500">
                  <div className="text-3xl mb-2">📋</div>
                  <div>No leave requests found</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


















