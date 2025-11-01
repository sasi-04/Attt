import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

export default function DailyTrendChart({ data }){
  // Use provided data or fallback to demo data
  const chartData = data && data.length > 0 ? data.map(item => ({
    date: item.day || new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    pct: item.percentage || 0
  })) : Array.from({ length: 7 }, (_, i) => {
    const day = i + 1
    const pct = 70 + Math.round(Math.random()*25)
    return { date: `Day ${day}`, pct }
  })

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-white rounded-2xl shadow-lg p-5">
      <div className="font-semibold mb-3">Daily Attendance Trend (Last 7 Days)</div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} />
            <Tooltip formatter={(v)=>[`${v}%`, 'Attendance']} />
            <Area type="monotone" dataKey="pct" stroke="#3b82f6" fill="url(#colorPct)" isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}

















