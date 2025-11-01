import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

export default function HourlyBarChart({ data }){
  // Use provided data or fallback to demo data
  const chartData = data && data.length > 0 ? data.map(item => ({
    time: item.hour || '00:00',
    count: item.attendance || 0,
    sessions: item.sessions || 0
  })) : ['8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => ({ 
    time: t, 
    count: Math.round(Math.random()*50),
    sessions: Math.round(Math.random()*5)
  }))
  
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white rounded-2xl shadow-lg p-5">
      <div className="font-semibold mb-3">Hourly Attendance Pattern</div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis tickFormatter={(v)=>`${v}`} />
            <Tooltip formatter={(v, name)=>[v, name === 'count' ? 'Attendance' : 'Sessions']} />
            <Bar dataKey="count" fill="#22c55e" isAnimationActive name="Attendance" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

















