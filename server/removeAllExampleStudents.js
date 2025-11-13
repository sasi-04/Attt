import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb, listAllStudents, deleteStudent, unenrollStudent, getAllEnrollmentRecords } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function removeAllExampleStudents() {
  console.log('🧹 Removing ALL example/demo students...\n')
  
  initDb()
  
  try {
    // Get all students
    const allStudents = await listAllStudents()
    console.log(`Total students found: ${allStudents.length}`)
    
    // More comprehensive patterns to match example students
    const examplePatterns = [
      /Student \d+$/i,  // Matches anything ending with "Student 1", "Student 2", etc.
      /.* Student \d+$/i, // Matches with space before "Student"
      /Demo Student/i,
      /Example Student/i,
      /Test Student/i,
      /^CSE Student \d+$/i,
      /^ECE Student \d+$/i,
      /^MECH Student \d+$/i,
      /^CIVIL Student \d+$/i,
      /^M\.Tech Student \d+$/i,
      /^Mtech Student \d+$/i,
      /^MTECH Student \d+$/i
    ]
    
    // Check for students with example names
    const exampleStudents = allStudents.filter(student => {
      // Skip year placeholders (those are needed for UI)
      if (student.isYearPlaceholder || student.isPlaceholder) {
        return false
      }
      
      const name = (student.name || '').trim()
      
      // Check if name matches example patterns
      const isExample = examplePatterns.some(pattern => pattern.test(name))
      
      // Also check if name contains "Student" followed by a number
      if (/\bStudent\s+\d+\b/i.test(name)) {
        return true
      }
      
      return isExample
    })
    
    console.log(`Found ${exampleStudents.length} example students to remove:`)
    exampleStudents.forEach(student => {
      console.log(`  - ${student.name} (${student.regNo}) - ${student.department} ${student.year}`)
    })
    
    if (exampleStudents.length === 0) {
      console.log('\n✅ No example students found to remove!')
      return
    }
    
    // Remove enrollments and students
    let enrollmentRemoved = 0
    let studentsRemoved = 0
    
    for (const student of exampleStudents) {
      try {
        // Get all enrollments for this student
        const allEnrollments = await getAllEnrollmentRecords()
        const studentEnrollments = allEnrollments.filter(e => 
          e.studentId === student.studentId || e.regNo === student.regNo
        )
        
        // Remove enrollments
        for (const enrollment of studentEnrollments) {
          try {
            await unenrollStudent(enrollment.courseId, enrollment.studentId)
            enrollmentRemoved++
          } catch (err) {
            console.error(`  Error removing enrollment for ${student.regNo}:`, err.message)
          }
        }
        
        // Remove student
        await deleteStudent(student.regNo)
        studentsRemoved++
        console.log(`  ✓ Removed: ${student.name} (${student.regNo})`)
        
      } catch (error) {
        console.error(`  ✗ Error removing ${student.name} (${student.regNo}):`, error.message)
      }
    }
    
    console.log(`\n✅ Cleanup complete!`)
    console.log(`   - Students removed: ${studentsRemoved}`)
    console.log(`   - Enrollments removed: ${enrollmentRemoved}`)
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  }
}

// Run the cleanup
removeAllExampleStudents().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})



