import { initDb, getStaffByEmail, listAllStudents, getAllSessions, createSession, markPresent, getStudentAttendance } from './db.js'

async function testDashboardWithAttendance() {
  console.log('=== TESTING DASHBOARD WITH ATTENDANCE MARKED ===\n')
  
  initDb()
  
  // Find rajesh staff
  const staff = await getStaffByEmail('rajesh@demo.com')
  if (!staff || !staff.isClassAdvisor) {
    console.log('❌ Staff not found or not a class advisor')
    return
  }
  
  console.log(`✅ Testing with staff: ${staff.email} (${staff.name})`)
  console.log(`   Advisor for: ${staff.advisorFor.department} ${staff.advisorFor.year}\n`)
  
  // Get class advisor's students
  const allStudents = await listAllStudents()
  const advisorClassStudents = allStudents.filter(s => {
    const studentDept = s.department || 'Unknown'
    const studentYear = s.year || 'Unknown'
    return studentDept === staff.advisorFor.department && 
           studentYear === staff.advisorFor.year &&
           !s.isYearPlaceholder && 
           !s.isDepartmentPlaceholder && 
           !s.isPlaceholder
  })
  
  if (advisorClassStudents.length === 0) {
    console.log('❌ No students found for class advisor')
    return
  }
  
  const testStudent = advisorClassStudents[0]
  console.log(`📝 Test Student: ${testStudent.name} (${testStudent.regNo || testStudent.studentId})`)
  
  // Create a test session for today
  const today = new Date()
  const sessionId = `S_TEST_${Date.now()}`
  const session = {
    id: sessionId,
    courseId: 'TEST_COURSE',
    startTime: today.toISOString(),
    endTime: null,
    status: 'active',
    sessionDepartment: staff.advisorFor.department,
    sessionYear: staff.advisorFor.year
  }
  
  await createSession(session)
  console.log(`✅ Created test session: ${sessionId}\n`)
  
  // Mark attendance for the student
  const studentId = testStudent.regNo || testStudent.studentId
  await markPresent(sessionId, studentId)
  console.log(`✅ Marked attendance for: ${studentId}\n`)
  
  // Wait a moment for database to update
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Test the dashboard endpoint
  console.log('🔍 Testing dashboard endpoint after marking attendance...\n')
  try {
    const response = await fetch(`http://localhost:3001/staff/dashboard/stats?staffEmail=${encodeURIComponent(staff.email)}`)
    const data = await response.json()
    
    console.log(`📋 DASHBOARD RESULTS AFTER ATTENDANCE MARKED:`)
    console.log(`  totalStudents: ${data.totalStudents} (expected: ${advisorClassStudents.length})`)
    console.log(`  presentToday: ${data.presentToday} (expected: 1)`)
    console.log(`  absentToday: ${data.absentToday} (expected: ${advisorClassStudents.length - 1})`)
    console.log(`  advisorClassCount: ${data.advisorClassCount} (expected: ${advisorClassStudents.length})`)
    console.log(`  departmentTotalCount: ${data.departmentTotalCount}`)
    console.log(`  staffInfo.isClassAdvisor: ${data.staffInfo?.isClassAdvisor}`)
    console.log(`  staffInfo.advisorFor:`, data.staffInfo?.advisorFor)
    
    // Verify
    const expectedPresent = 1
    const expectedAbsent = advisorClassStudents.length - 1
    
    if (data.totalStudents === advisorClassStudents.length && 
        data.presentToday === expectedPresent && 
        data.absentToday === expectedAbsent) {
      console.log(`\n✅✅✅ ALL CALCULATIONS ARE CORRECT! ✅✅✅`)
      console.log(`   ✓ totalStudents matches class count`)
      console.log(`   ✓ presentToday shows 1 (student marked present)`)
      console.log(`   ✓ absentToday shows ${expectedAbsent} (remaining students)`)
    } else {
      console.log(`\n❌ CALCULATION MISMATCH!`)
      if (data.totalStudents !== advisorClassStudents.length) {
        console.log(`   ❌ totalStudents: Expected ${advisorClassStudents.length}, Got ${data.totalStudents}`)
      }
      if (data.presentToday !== expectedPresent) {
        console.log(`   ❌ presentToday: Expected ${expectedPresent}, Got ${data.presentToday}`)
      }
      if (data.absentToday !== expectedAbsent) {
        console.log(`   ❌ absentToday: Expected ${expectedAbsent}, Got ${data.absentToday}`)
      }
    }
  } catch (error) {
    console.log(`\n⚠️  Could not test endpoint: ${error.message}`)
  }
  
  console.log(`\n=== TEST COMPLETE ===`)
}

testDashboardWithAttendance().catch(console.error)

