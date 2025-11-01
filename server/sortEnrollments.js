import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbFile = path.resolve(__dirname, 'data/enrollments.db')

console.log('📚 Sorting enrollments...')
const content = fs.readFileSync(dbFile, 'utf8')
const lines = content.trim().split('\n').filter(line => line.trim())

const enrollments = lines.map(line => JSON.parse(line))
console.log(`Found ${enrollments.length} enrollments`)

// Sort by student ID
enrollments.sort((a, b) => {
  const numA = parseInt(a.studentId.replace('ES22CJ', ''))
  const numB = parseInt(b.studentId.replace('ES22CJ', ''))
  return numA - numB
})

// Write sorted data
const newContent = enrollments.map(e => JSON.stringify(e)).join('\n') + '\n'
fs.writeFileSync(dbFile, newContent)

console.log('✅ Enrollments sorted!')
console.log('\n📋 Sorted list:')
enrollments.forEach((e, i) => {
  console.log(`${String(i + 1).padStart(2, '0')}. ${e.studentId} - ${e.name}`)
})
