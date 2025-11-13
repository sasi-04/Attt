import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb, getAllEnrollmentRecords, unenrollStudent, listAllStudents, deleteStudent } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function clearEnrollmentExamples() {
  console.log('🧹 Clearing example students from enrollments...\n')
  
  initDb()
  
  try {
    // Get all enrollments
    const allEnrollments = await getAllEnrollmentRecords()
    console.log(`Total enrollments found: ${allEnrollments.length}`)
    
    // Get all students
    const allStudents = await listAllStudents()
    
    // Find enrollments for example students
    const exampleEnrollments = allEnrollments.filter(enrollment => {
      // Check if the enrollment name matches example patterns
      const name = enrollment.name || ''
      if (/\bStudent\s+\d+\b/i.test(name)) {
        return true
      }
      
      // Also check if student exists and has example name
      const student = allStudents.find(s => 
        s.regNo === enrollment.regNo || s.studentId === enrollment.studentId
      )
      
      if (student && /\bStudent\s+\d+\b/i.test(student.name || '')) {
        return true
      }
      
      return false
    })
    
    console.log(`Found ${exampleEnrollments.length} example enrollments to remove:\n`)
    
    if (exampleEnrollments.length === 0) {
      console.log('✅ No example enrollments found!')
      return
    }
    
    let removed = 0
    for (const enrollment of exampleEnrollments) {
      try {
        await unenrollStudent(enrollment.courseId, enrollment.studentId)
        removed++
        console.log(`  ✓ Removed enrollment: ${enrollment.name || enrollment.studentId} (${enrollment.courseId})`)
      } catch (err) {
        console.error(`  ✗ Error removing enrollment:`, err.message)
      }
    }
    
    console.log(`\n✅ Removed ${removed} example enrollments`)
    
    // Also check and remove any remaining example students
    const exampleStudents = allStudents.filter(s => {
      if (s.isYearPlaceholder || s.isPlaceholder) return false
      const name = (s.name || '').trim()
      return /\bStudent\s+\d+\b/i.test(name)
    })
    
    if (exampleStudents.length > 0) {
      console.log(`\nFound ${exampleStudents.length} additional example students to remove:`)
      for (const student of exampleStudents) {
        try {
          await deleteStudent(student.regNo)
          console.log(`  ✓ Removed: ${student.name} (${student.regNo})`)
        } catch (err) {
          console.error(`  ✗ Error:`, err.message)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

clearEnrollmentExamples().catch(console.error)



