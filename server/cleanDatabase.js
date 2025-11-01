import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbFile = path.resolve(__dirname, 'data/students.db')

console.log('🔍 Reading database file...')
const content = fs.readFileSync(dbFile, 'utf8')
const lines = content.trim().split('\n').filter(line => line.trim())

console.log(`📊 Found ${lines.length} lines`)

const students = lines.map(line => JSON.parse(line))
console.log(`📊 Parsed ${students.length} student records`)

// Keep only valid students (proper regNo starting with 730422553)
const validStudents = []
const seen = new Set()

for (const student of students) {
  // Skip if already processed this studentId
  if (seen.has(student.studentId)) {
    console.log(`❌ Skipping duplicate: ${student.studentId} - ${student.name}`)
    continue
  }
  
  // Keep only students with proper registration numbers and real names
  if (student.regNo && student.regNo.startsWith('730422553') && student.name !== student.studentId) {
    validStudents.push(student)
    seen.add(student.studentId)
    console.log(`✅ Keeping: ${student.studentId} - ${student.name} (${student.regNo})`)
  } else {
    console.log(`❌ Removing invalid: ${student.studentId} - ${student.name} (${student.regNo || 'NO REGNO'})`)
  }
}

// Sort by student ID
validStudents.sort((a, b) => {
  const numA = parseInt(a.studentId.replace('ES22CJ', ''))
  const numB = parseInt(b.studentId.replace('ES22CJ', ''))
  return numA - numB
})

console.log(`\n📊 Summary:`)
console.log(`   Original records: ${students.length}`)
console.log(`   Valid students: ${validStudents.length}`)
console.log(`   Removed: ${students.length - validStudents.length}`)

// Create backup
const backupFile = path.resolve(__dirname, 'data/students.db.backup')
fs.writeFileSync(backupFile, content)
console.log(`\n💾 Backup created: students.db.backup`)

// Write clean database
const newContent = validStudents.map(s => JSON.stringify(s)).join('\n') + '\n'
fs.writeFileSync(dbFile, newContent)

console.log(`\n✅ Database cleaned successfully!`)
console.log(`\n📋 Final ${validStudents.length} students (sorted):`)
validStudents.forEach((s, i) => {
  console.log(`${String(i + 1).padStart(2, '0')}. ${s.studentId} - ${s.name}`)
})
