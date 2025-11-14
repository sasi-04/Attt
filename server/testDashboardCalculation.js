import { initDb, getStaffByEmail, listAllStudents, getAllSessions, getAllAttendanceRecords, createSession, markPresent, getStudentAttendance } from './db.js'

async function testDashboardCalculation() {
  console.log('=== TESTING DASHBOARD CALCULATION ===\n')
  
  initDb()
  
  // Find the staff member "rajesh" 
  const staffEmail = 'rajesh@demo.com' // Try common email patterns
  let staff = await getStaffByEmail(staffEmail)
  
  if (!staff) {
    // Try to find any staff with "rajesh" in name or email
    const allStaff = await (await import('./db.js')).listStaff()
    staff = allStaff.find(s => 
      s.email?.toLowerCase().includes('rajesh') || 
      s.name?.toLowerCase().includes('rajesh')
    )
  }
  
  if (!staff) {
    console.log('❌ Staff member "rajesh" not found. Checking all staff...')
    const allStaff = await (await import('./db.js')).listStaff()
    console.log('Available staff:', allStaff.map(s => ({ email: s.email, name: s.name, isClassAdvisor: s.isClassAdvisor, advisorFor: s.advisorFor })))
    
    // Use first class advisor found
    staff = allStaff.find(s => s.isClassAdvisor && s.advisorFor)
    if (staff) {
      console.log(`\n✅ Using class advisor: ${staff.email} (${staff.name})`)
    } else {
      console.log('❌ No class advisor found. Cannot test.')
      return
    }
  } else {
    console.log(`✅ Found staff: ${staff.email} (${staff.name})`)
  }
  
  console.log(`\nStaff Info:`)
  console.log(`  Email: ${staff.email}`)
  console.log(`  Name: ${staff.name}`)
  console.log(`  Department: ${staff.department}`)
  console.log(`  Is Class Advisor: ${staff.isClassAdvisor}`)
  console.log(`  Advisor For:`, staff.advisorFor)
  
  if (!staff.isClassAdvisor || !staff.advisorFor) {
    console.log('\n❌ Staff is not a class advisor. Cannot test class advisor dashboard.')
    return
  }
  
  // Get all students
  const allStudents = await listAllStudents()
  console.log(`\n📊 Total students in database: ${allStudents.length}`)
  
  // Find students for this class advisor
  const advisorDept = staff.advisorFor.department
  const advisorYear = staff.advisorFor.year
  
  const advisorClassStudents = allStudents.filter(s => {
    const studentDept = s.department || 'Unknown'
    const studentYear = s.year || 'Unknown'
    return studentDept === advisorDept && 
           studentYear === advisorYear &&
           !s.isYearPlaceholder && 
           !s.isDepartmentPlaceholder && 
           !s.isPlaceholder
  })
  
  console.log(`\n👥 Class Advisor's Students (${advisorDept} ${advisorYear}):`)
  console.log(`  Count: ${advisorClassStudents.length}`)
  advisorClassStudents.forEach(s => {
    console.log(`    - ${s.name} (${s.regNo || s.studentId})`)
  })
  
  // Get all sessions and attendance
  const allSessions = await getAllSessions()
  const allAttendance = await getAllAttendanceRecords()
  
  console.log(`\n📅 Total sessions: ${allSessions.length}`)
  console.log(`📝 Total attendance records: ${allAttendance.length}`)
  
  // Calculate today's attendance
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]
  const todayStart = today.getTime()
  const todayEnd = todayStart + (24 * 60 * 60 * 1000)
  
  const todaySessions = allSessions.filter(s => {
    if (!s.startTime) return false
    const sessionDate = new Date(s.startTime).toISOString().split('T')[0]
    if (sessionDate === todayStr) return true
    const sessionTime = new Date(s.startTime).getTime()
    return sessionTime >= todayStart && sessionTime < todayEnd
  })
  
  console.log(`\n📆 Today's sessions (${todayStr}): ${todaySessions.length}`)
  todaySessions.forEach(s => {
    console.log(`    - Session ${s.id}: ${new Date(s.startTime).toISOString()}`)
  })
  
  const todaySessionIds = new Set(todaySessions.map(s => s.id))
  const todayAttendance = allAttendance.filter(a => todaySessionIds.has(a.sessionId))
  
  console.log(`\n✅ Today's attendance records: ${todayAttendance.length}`)
  todayAttendance.forEach(a => {
    console.log(`    - Student: ${a.studentId}, Session: ${a.sessionId}`)
  })
  
  // Calculate present students for class advisor
  const todayPresent = new Set()
  todayAttendance.forEach(a => {
    const student = advisorClassStudents.find(s => {
      const studentRegNo = s.regNo || s.studentId || ''
      const studentId = s.studentId || s.regNo || ''
      const attendanceId = a.studentId || ''
      return studentRegNo === attendanceId || 
             studentId === attendanceId ||
             studentRegNo.toString() === attendanceId.toString() ||
             studentId.toString() === attendanceId.toString()
    })
    if (student) {
      todayPresent.add(a.studentId)
      console.log(`    ✓ Found present: ${a.studentId} (${student.name})`)
    }
  })
  
  const totalStudents = advisorClassStudents.length
  const presentToday = todayPresent.size
  const absentToday = totalStudents - presentToday
  
  console.log(`\n📊 DASHBOARD CALCULATION RESULTS:`)
  console.log(`  Total Students (Class): ${totalStudents}`)
  console.log(`  Present Today: ${presentToday}`)
  console.log(`  Absent Today: ${absentToday}`)
  console.log(`  Today's Attendance Rate: ${totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0}%`)
  
  // Test the actual endpoint
  console.log(`\n🔍 Testing dashboard endpoint...`)
  try {
    const response = await fetch(`http://localhost:3001/staff/dashboard/stats?staffEmail=${encodeURIComponent(staff.email)}`)
    const data = await response.json()
    
    console.log(`\n📋 ENDPOINT RESPONSE:`)
    console.log(`  totalStudents: ${data.totalStudents} (expected: ${totalStudents})`)
    console.log(`  presentToday: ${data.presentToday} (expected: ${presentToday})`)
    console.log(`  absentToday: ${data.absentToday} (expected: ${absentToday})`)
    console.log(`  advisorClassCount: ${data.advisorClassCount} (expected: ${totalStudents})`)
    console.log(`  departmentTotalCount: ${data.departmentTotalCount}`)
    console.log(`  staffInfo.isClassAdvisor: ${data.staffInfo?.isClassAdvisor}`)
    console.log(`  staffInfo.advisorFor:`, data.staffInfo?.advisorFor)
    
    // Verify
    if (data.totalStudents === totalStudents && 
        data.presentToday === presentToday && 
        data.absentToday === absentToday) {
      console.log(`\n✅ CALCULATION IS CORRECT!`)
    } else {
      console.log(`\n❌ CALCULATION MISMATCH!`)
      console.log(`   Expected totalStudents: ${totalStudents}, Got: ${data.totalStudents}`)
      console.log(`   Expected presentToday: ${presentToday}, Got: ${data.presentToday}`)
      console.log(`   Expected absentToday: ${absentToday}, Got: ${data.absentToday}`)
    }
  } catch (error) {
    console.log(`\n⚠️  Could not test endpoint (server may not be running): ${error.message}`)
  }
  
  console.log(`\n=== TEST COMPLETE ===`)
}

testDashboardCalculation().catch(console.error)

