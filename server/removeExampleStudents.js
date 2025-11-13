import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb, listAllStudents, deleteStudent, unenrollStudent, getAllEnrollmentRecords } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function removeExampleStudents() {
  console.log('🧹 Removing example/demo students...\n')
  
  initDb()
  
  try {
    // Get all students
    const allStudents = await listAllStudents()
    console.log(`Total students found: ${allStudents.length}`)
    
    // Patterns to match example students
    const examplePatterns = [
      /^.*Student \d+$/,  // Matches "M.Tech Student 1", "CSE Student 2", etc.
      /^.* Student \d+$/i, // Matches with space variations
      /Demo Student/i,
      /Example Student/i,
      /Test Student/i
    ]
    
    // Also check for students created by seed script pattern
    // e.g., "M.Tech Student 1", "CSE Student 1", "ECE Student 1", etc.
    const exampleStudents = allStudents.filter(student => {
      // Skip year placeholders (those are needed for UI)
      if (student.isYearPlaceholder || student.isPlaceholder) {
        return false
      }
      
      // Check if name matches example patterns
      const name = student.name || ''
      const isExample = examplePatterns.some(pattern => pattern.test(name))
      
      // Also check if it's from seed script (department code + " Student" + number)
      const deptCodes = ['CSE', 'ECE', 'MECH', 'CIVIL', 'M.Tech', 'Mtech', 'MTECH']
      const isSeedStudent = deptCodes.some(code => {
        const pattern = new RegExp(`^${code.replace('.', '\\.')} Student \\d+$`, 'i')
        return pattern.test(name)
      })
      
      return isExample || isSeedStudent
    })
    
    console.log(`Found ${exampleStudents.length} example students to remove:`)
    exampleStudents.forEach(student => {
      console.log(`  - ${student.name} (${student.regNo}) - ${student.department} ${student.year}`)
    })
    
    if (exampleStudents.length === 0) {
      console.log('\n✅ No example students found to remove!')
      return
    }
    
    // Remove enrollments and attendance records for these students
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
removeExampleStudents().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})



