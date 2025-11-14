import { initDb, getAllSessions, getAllAttendanceRecords, createSession, markPresent } from './db.js'

async function testSessionMatching() {
  console.log('=== TESTING SESSION DATE MATCHING ===\n')
  
  initDb()
  
  // Create a test session for today
  const today = new Date()
  const sessionId = `S_TEST_${Date.now()}`
  
  const session = {
    id: sessionId,
    courseId: 'TEST_COURSE',
    startTime: today.toISOString(),
    endTime: null,
    status: 'active'
  }
  
  await createSession(session)
  console.log(`✅ Created session: ${sessionId}`)
  console.log(`   startTime: ${session.startTime}`)
  console.log(`   Today: ${today.toISOString()}\n`)
  
  // Mark attendance
  await markPresent(sessionId, '730422553080')
  console.log(`✅ Marked attendance for student: 730422553080\n`)
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Get all sessions and check date matching
  const allSessions = await getAllSessions()
  const allAttendance = await getAllAttendanceRecords()
  
  console.log(`📊 Total sessions: ${allSessions.length}`)
  console.log(`📝 Total attendance records: ${allAttendance.length}\n`)
  
  // Test date matching logic
  const todayForMatch = new Date()
  todayForMatch.setHours(0, 0, 0, 0)
  const todayStr = todayForMatch.toISOString().split('T')[0]
  const todayStart = todayForMatch.getTime()
  const todayEnd = todayStart + (24 * 60 * 60 * 1000)
  
  console.log(`📅 Date matching parameters:`)
  console.log(`   todayStr: ${todayStr}`)
  console.log(`   todayStart: ${todayStart} (${new Date(todayStart).toISOString()})`)
  console.log(`   todayEnd: ${todayEnd} (${new Date(todayEnd).toISOString()})\n`)
  
  const todaySessions = allSessions.filter(s => {
    if (!s.startTime) {
      console.log(`   ❌ Session ${s.id} has no startTime`)
      return false
    }
    const sessionDate = new Date(s.startTime).toISOString().split('T')[0]
    const sessionTime = new Date(s.startTime).getTime()
    const matchesDateStr = sessionDate === todayStr
    const matchesTimeRange = sessionTime >= todayStart && sessionTime < todayEnd
    
    console.log(`   Session ${s.id}:`)
    console.log(`     startTime: ${s.startTime}`)
    console.log(`     sessionDate: ${sessionDate}`)
    console.log(`     sessionTime: ${sessionTime}`)
    console.log(`     matchesDateStr: ${matchesDateStr}`)
    console.log(`     matchesTimeRange: ${matchesTimeRange}`)
    console.log(`     RESULT: ${matchesDateStr || matchesTimeRange}\n`)
    
    return matchesDateStr || matchesTimeRange
  })
  
  console.log(`✅ Today's sessions found: ${todaySessions.length}`)
  todaySessions.forEach(s => {
    console.log(`   - ${s.id}: ${s.startTime}`)
  })
  
  const todaySessionIds = new Set(todaySessions.map(s => s.id))
  const todayAttendance = allAttendance.filter(a => todaySessionIds.has(a.sessionId))
  
  console.log(`\n✅ Today's attendance records: ${todayAttendance.length}`)
  todayAttendance.forEach(a => {
    console.log(`   - Student: ${a.studentId}, Session: ${a.sessionId}`)
  })
  
  console.log(`\n=== TEST COMPLETE ===`)
}

testSessionMatching().catch(console.error)

