import { initDb, listAllStudents } from './db.js'
import fetch from 'node-fetch'

async function testFaceEnrollment() {
  console.log('=== TESTING FACE ENROLLMENT AND RECOGNITION ===\n')
  
  initDb()
  
  // Get a test student
  const allStudents = await listAllStudents()
  const testStudent = allStudents.find(s => 
    s.name?.toLowerCase().includes('kamalesh') || 
    s.regNo === '730422553080'
  )
  
  if (!testStudent) {
    console.log('❌ Test student not found')
    return
  }
  
  console.log(`✅ Test Student: ${testStudent.name} (${testStudent.regNo || testStudent.studentId})`)
  console.log(`   Department: ${testStudent.department}, Year: ${testStudent.year}\n`)
  
  // Check enrolled students
  try {
    const enrolledResponse = await fetch('http://localhost:5001/students')
    const enrolledData = await enrolledResponse.json()
    
    console.log(`📋 Enrolled Students in Face Service:`)
    console.log(`   Count: ${enrolledData.count || enrolledData.students?.length || 0}`)
    if (enrolledData.students) {
      enrolledData.students.forEach(s => {
        console.log(`   - ${s.name || s.student_id} (${s.student_id || s.roll_no})`)
      })
    }
    
    const isEnrolled = enrolledData.students?.some(s => 
      (s.student_id === testStudent.regNo || s.student_id === testStudent.studentId) ||
      (s.roll_no === testStudent.regNo || s.roll_no === testStudent.studentId)
    )
    
    console.log(`\n✅ Student enrolled: ${isEnrolled ? 'YES' : 'NO'}`)
    
    if (!isEnrolled) {
      console.log(`\n⚠️  Student is not enrolled. Enrollment is required for face recognition.`)
    } else {
      // Check health/status
      const healthResponse = await fetch('http://localhost:5001/health')
      const healthData = await healthResponse.json()
      
      console.log(`\n📊 Face Service Status:`)
      console.log(`   Status: ${healthData.status}`)
      console.log(`   Recognizer Trained: ${healthData.recognizer_trained}`)
      console.log(`   Enrolled Count: ${healthData.enrolled_count}`)
      console.log(`   Using: ${healthData.using}`)
    }
  } catch (error) {
    console.log(`\n❌ Error checking enrollment: ${error.message}`)
  }
  
  console.log(`\n=== TEST COMPLETE ===`)
}

testFaceEnrollment().catch(console.error)

