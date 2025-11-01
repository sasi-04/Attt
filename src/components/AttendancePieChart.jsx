import React from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'

const COLORS = ['#ef4444','#f59e0b','#eab308','#22c55e','#3b82f6']

export default function AttendancePieChart({ data }){
  // Use provided data or fallback to demo data
  const chartData = data ? [
    { name: 'Present', value: data.present || 0 },
    { name: 'Absent', value: data.absent || 0 },
    { name: 'On Leave', value: data.onLeave || 0 },
  ].filter(item => item.value > 0) : [
    { name: 'Present', value: 85 },
    { name: 'Absent', value: 12 },
    { name: 'On Leave', value: 3 },
  ]

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="bg-white rounded-2xl shadow-lg p-5">
      <div className="font-semibold mb-3">Attendance Distribution</div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={chartData} dataKey="value" cx="50%" cy="50%" outerRadius={110} isAnimationActive>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}


















