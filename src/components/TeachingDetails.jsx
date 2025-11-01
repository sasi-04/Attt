import React from 'react'
import { motion } from 'framer-motion'

export default function TeachingDetails({ profile }){
  if (!profile) return null
  
  const details = [
    { icon: '🎓', title: 'Academic Qualifications', items: profile.qualifications || ['Not specified'] },
    { icon: '⌛', title: 'Experience', items: [profile.experience || 'Not specified'] },
    { icon: '🏅', title: 'Designation', items: [profile.designation || 'Not specified'] },
    { icon: '📚', title: 'Teaching Subjects', items: profile.teachingSubjects || ['Not specified'] },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="bg-white shadow-md rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Technical & Teaching Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {details.map((d) => (
          <div key={d.title} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{d.icon}</span>
              <div className="font-medium text-gray-800">{d.title}</div>
            </div>
            <ul className="list-disc ml-6 text-gray-700 space-y-1">
              {d.items.map((i)=> <li key={i}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

















