import fs from 'fs'

const studentsData = fs.readFileSync('server/data/students.db', 'utf8')
const enrollmentsData = fs.readFileSync('server/data/enrollments.db', 'utf8')

const studentsLines = studentsData.trim().split('\n').filter(l => l.trim())
const enrollmentsLines = enrollmentsData.trim().split('\n').filter(l => l.trim())

console.log('📊 Current Database Status:')
console.log(`students.db: ${studentsLines.length} lines`)
console.log(`enrollments.db: ${enrollmentsLines.length} lines`)

console.log('\nFirst 5 students in students.db:')
studentsLines.slice(0, 5).forEach((line, i) => {
  const s = JSON.parse(line)
  console.log(`${i+1}. ${s.studentId} - ${s.name}`)
})
