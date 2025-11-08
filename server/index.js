import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import QRCode from 'qrcode'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb, createSession as dbCreateSession, saveToken as dbSaveToken, saveShortCode as dbSaveShortCode, deactivateToken as dbDeactivateToken, deleteShortCode as dbDeleteShortCode, markPresent as dbMarkPresent, enrollStudent, unenrollStudent, getEnrollments as dbGetEnrollments, isEnrolled as dbIsEnrolled, getEnrollmentRecords as dbGetEnrollmentRecords, getAllEnrollmentRecords, createStudent, getStudentByRegNo, dbGetStudentByRegNo, dbCreateStudent, dbUpdateStudentPassword, createStaff, getStaffByEmail, getStaffById, listStaff, updateStaff, deleteStaff, getStaffCount, listAllStudents, updateStudent, deleteStudent, getStudentCount, getStudentAttendance, getAllAttendanceRecords, getSessionById, getAllSessions, createLeaveRequest, getAllLeaveRequests, getLeaveRequestsByStudent, getLeaveRequestsByStatus, updateLeaveStatus, deleteLeaveRequest, getSystemSettings, updateSystemSettings } from './db.js'

const app = express()
initDb()
const server = http.createServer(app)
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map(s => s.trim())
const io = new SocketIOServer(server, { cors: { origin: allowedOrigins, methods: ['GET','POST'] } })

// WebSocket connection handling for real-time updates
io.on('connection', (socket) => {
  console.log('Admin panel connected:', socket.id)
  
  // Join admin room for broadcasts
  socket.join('admin-panel')
  
  socket.on('disconnect', () => {
    console.log('Admin panel disconnected:', socket.id)
  })
})

// Helper function to broadcast admin updates
function broadcastAdminUpdate(eventType, data) {
  console.log('Broadcasting admin update:', eventType, data)
  io.to('admin-panel').emit('admin-update', {
    type: eventType,
    data: data,
    timestamp: Date.now()
  })
}

app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

// Debug endpoint to check what's connected vs what should be connected
app.get('/debug/connection-status', async (req, res) => {
  try {
    const kiruthikaEmail = 'kiruthika@demo.com'
    const courseId = '21CS701'
    
    // Get admin students (what SHOULD be connected)
    const adminStudents = await listAllStudents()
    
    // Get enrolled students (what IS currently connected)
    const enrollmentRecords = await dbGetEnrollmentRecords(courseId)
    
    // Get Kiruthika's assignment
    const kiruthika = await getStaffByEmail(kiruthikaEmail)
    
    // Find students that are enrolled but NOT in admin
    const enrolledNotInAdmin = enrollmentRecords.filter(enrollment => {
      return !adminStudents.find(admin => admin.regNo === enrollment.regNo)
    })
    
    // Find admin students that are NOT enrolled
    const adminNotEnrolled = adminStudents.filter(admin => {
      return !enrollmentRecords.find(enrollment => enrollment.regNo === admin.regNo)
    })
    
    return res.json({
      kiruthikaAssignment: kiruthika?.advisorFor,
      adminStudents: {
        count: adminStudents.length,
        students: adminStudents.map(s => ({ regNo: s.regNo, name: s.name }))
      },
      currentlyEnrolled: {
        count: enrollmentRecords.length,
        students: enrollmentRecords.map(e => ({ regNo: e.regNo, name: e.name, studentId: e.studentId }))
      },
      problems: {
        enrolledButNotInAdmin: {
          count: enrolledNotInAdmin.length,
          students: enrolledNotInAdmin.map(e => ({ regNo: e.regNo, name: e.name, studentId: e.studentId }))
        },
        adminButNotEnrolled: {
          count: adminNotEnrolled.length,
          students: adminNotEnrolled.map(s => ({ regNo: s.regNo, name: s.name }))
        }
      },
      isClean: enrolledNotInAdmin.length === 0 && adminNotEnrolled.length === 0
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Debug endpoint to check database contents
app.get('/debug/students', async (req, res) => {
  try {
    const allStudents = await listAllStudents()
    const enrollmentRecords = await dbGetEnrollmentRecords('21CS701')
    
    // Check Kiruthika's students specifically
    const kiruthikaEmail = 'kiruthika@demo.com'
    const kiruthika = await getStaffByEmail(kiruthikaEmail)
    let kiruthikaStudents = []
    
    if (kiruthika && kiruthika.isClassAdvisor && kiruthika.advisorFor) {
      kiruthikaStudents = allStudents.filter(s => {
        const dept = s.department || 'M.Tech'
        const year = s.year || '4th Year'
        return dept === kiruthika.advisorFor.department && year === kiruthika.advisorFor.year
      })
    }
    
    return res.json({
      studentsInDb: allStudents.length,
      enrollmentsInDb: enrollmentRecords.length,
      kiruthikaInfo: {
        email: kiruthikaEmail,
        isClassAdvisor: kiruthika?.isClassAdvisor,
        advisorFor: kiruthika?.advisorFor,
        studentsCount: kiruthikaStudents.length,
        students: kiruthikaStudents.map(s => ({ 
          regNo: s.regNo, 
          name: s.name, 
          department: s.department, 
          year: s.year 
        }))
      },
      students: allStudents.map(s => ({ 
        regNo: s.regNo, 
        name: s.name, 
        studentId: s.studentId, 
        department: s.department, 
        year: s.year 
      })),
      enrollments: enrollmentRecords.map(e => ({ studentId: e.studentId, name: e.name, regNo: e.regNo }))
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Debug endpoint to manually enroll all students
app.post('/debug/enroll-all', async (req, res) => {
  try {
    const allStudents = await listAllStudents()
    const courseId = '21CS701'
    let enrolled = 0
    
    for (const student of allStudents) {
      try {
        await enrollStudent(courseId, student.studentId, student.name, student.regNo)
        enrolled++
      } catch (error) {
        console.error('Error enrolling student:', student.regNo, error)
      }
    }
    
    return res.json({ 
      message: `Enrolled ${enrolled} out of ${allStudents.length} students`,
      enrolled,
      total: allStudents.length
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Update all admin students to match Kiruthika's assignment
app.post('/debug/update-admin-students', async (req, res) => {
  try {
    const kiruthikaEmail = 'kiruthika@demo.com'
    
    // Get Kiruthika's advisor assignment
    const staff = await getStaffByEmail(kiruthikaEmail)
    if (!staff || !staff.isClassAdvisor || !staff.advisorFor) {
      return res.status(400).json({ error: 'Staff is not a class advisor' })
    }
    
    const { department, year } = staff.advisorFor
    console.log(`Updating all admin students to: ${department} ${year}`)
    
    const allStudents = await listAllStudents()
    let updated = 0
    
    for (const student of allStudents) {
      try {
        // Update all students to match Kiruthika's assignment
        const updates = {
          department: department,
          year: year
        }
        await updateStudent(student.regNo, updates)
        updated++
        console.log(`Updated student ${student.regNo} to ${department} ${year}`)
      } catch (error) {
        console.error('Error updating student:', student.regNo, error)
      }
    }
    
    return res.json({
      message: `Updated ${updated} students to match advisor assignment`,
      advisor: kiruthikaEmail,
      department,
      year,
      updated,
      total: allStudents.length
    })
  } catch (error) {
    console.error('Update admin students error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// Sync admin students with staff visibility
app.post('/debug/sync-admin-staff', async (req, res) => {
  try {
    const allStudents = await listAllStudents()
    const courseId = '21CS701'
    let synced = 0
    let updated = 0
    
    console.log(`Found ${allStudents.length} students in admin database`)
    
    for (const student of allStudents) {
      try {
        // Ensure student has proper department and year
        if (!student.department || !student.year) {
          const updates = {
            department: student.department || 'M.Tech',
            year: student.year || '4th Year'
          }
          await updateStudent(student.regNo, updates)
          updated++
          console.log(`Updated student ${student.regNo} with dept/year`)
        }
        
        // Enroll in course for staff visibility
        await enrollStudent(courseId, student.studentId || student.regNo, student.name, student.regNo)
        synced++
        console.log(`Synced student ${student.regNo}`)
      } catch (error) {
        console.error('Error syncing student:', student.regNo, error)
      }
    }
    
    return res.json({ 
      message: `Synced ${synced} students, updated ${updated} with dept/year`,
      synced,
      updated,
      total: allStudents.length
    })
  } catch (error) {
    console.error('Sync error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// Get staff advisor info
app.get('/staff/advisor-info', async (req, res) => {
  try {
    const staffEmail = req.headers['x-staff-email'] || req.query.staffEmail
    
    if (!staffEmail) {
      return res.status(400).json({ error: 'staff_email_required' })
    }
    
    const staff = await getStaffByEmail(staffEmail)
    if (!staff) {
      return res.status(404).json({ error: 'staff_not_found' })
    }
    
    return res.json({
      isClassAdvisor: staff.isClassAdvisor || false,
      advisorFor: staff.advisorFor || null,
      canAddStudents: staff.isClassAdvisor && staff.advisorFor,
      assignedDepartment: staff.advisorFor?.department,
      assignedYear: staff.advisorFor?.year
    })
  } catch (error) {
    console.error('Get staff advisor info error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Complete reset - Clear ALL old data and connect only admin students
app.post('/debug/complete-reset', async (req, res) => {
  try {
    const kiruthikaEmail = 'kiruthika@demo.com'
    const courseId = '21CS701'
    
    console.log('=== COMPLETE RESET STARTING ===')
    
    // Step 1: Get Kiruthika's advisor info
    const staff = await getStaffByEmail(kiruthikaEmail)
    if (!staff || !staff.isClassAdvisor || !staff.advisorFor) {
      return res.status(400).json({ error: 'Staff is not a class advisor' })
    }
    
    const { department, year } = staff.advisorFor
    console.log(`Advisor assignment: ${department} ${year}`)
    
    // Step 2: COMPLETELY CLEAR the enrollments database
    console.log('Clearing ALL enrollments...')
    const allEnrollments = await dbGetEnrollmentRecords(courseId)
    let totalCleared = 0
    
    // Clear all enrollments completely
    for (const enrollment of allEnrollments) {
      try {
        await unenrollStudent(courseId, enrollment.studentId)
        totalCleared++
        console.log(`Cleared enrollment: ${enrollment.studentId}`)
      } catch (error) {
        console.error('Error clearing enrollment:', enrollment.studentId, error)
      }
    }
    
    console.log(`Total enrollments cleared: ${totalCleared}`)
    
    // Step 3: Get ONLY admin panel students
    const adminStudents = await listAllStudents()
    console.log(`Found ${adminStudents.length} students in admin database`)
    
    // Step 4: Update ALL admin students to match advisor assignment
    let updatedStudents = 0
    for (const student of adminStudents) {
      try {
        const updates = {
          department: department,
          year: year
        }
        await updateStudent(student.regNo, updates)
        updatedStudents++
        console.log(`Updated ${student.regNo} to ${department} ${year}`)
      } catch (error) {
        console.error('Error updating student:', student.regNo, error)
      }
    }
    
    // Step 5: Enroll ONLY the admin students
    let enrolledCount = 0
    for (const student of adminStudents) {
      try {
        await enrollStudent(courseId, student.studentId || student.regNo, student.name, student.regNo)
        enrolledCount++
        console.log(`Enrolled admin student: ${student.regNo} - ${student.name}`)
      } catch (error) {
        console.error('Error enrolling admin student:', student.regNo, error)
      }
    }
    
    console.log('=== COMPLETE RESET FINISHED ===')
    
    return res.json({
      message: `Complete reset completed - Only admin students connected`,
      advisor: kiruthikaEmail,
      department,
      year,
      totalClearedEnrollments: totalCleared,
      adminStudentsFound: adminStudents.length,
      studentsUpdated: updatedStudents,
      studentsEnrolled: enrolledCount,
      adminStudents: adminStudents.map(s => ({
        regNo: s.regNo,
        name: s.name,
        studentId: s.studentId
      }))
    })
  } catch (error) {
    console.error('Complete reset error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// Clean and sync advisor student data
app.post('/debug/clean-advisor-data', async (req, res) => {
  try {
    const kiruthikaEmail = 'kiruthika@demo.com'
    const courseId = '21CS701'
    
    // Get Kiruthika's advisor info
    const staff = await getStaffByEmail(kiruthikaEmail)
    if (!staff || !staff.isClassAdvisor || !staff.advisorFor) {
      return res.status(400).json({ error: 'Staff is not a class advisor' })
    }
    
    const { department, year } = staff.advisorFor
    console.log(`Cleaning data for advisor: ${department} ${year}`)
    
    // Step 1: Clear all existing enrollments for this course
    const allEnrollments = await dbGetEnrollmentRecords(courseId)
    let clearedCount = 0
    
    for (const enrollment of allEnrollments) {
      try {
        await unenrollStudent(courseId, enrollment.studentId)
        clearedCount++
      } catch (error) {
        console.error('Error clearing enrollment:', enrollment.studentId, error)
      }
    }
    
    console.log(`Cleared ${clearedCount} old enrollments`)
    
    // Step 2: Get all students from admin panel that match advisor's assignment
    const allStudents = await listAllStudents()
    const matchingStudents = allStudents.filter(student => {
      const studentDept = student.department || 'M.Tech'
      const studentYear = student.year || '4th Year'
      return studentDept === department && studentYear === year
    })
    
    console.log(`Found ${matchingStudents.length} students matching ${department} ${year}`)
    
    // Step 3: Enroll only the matching students
    let enrolledCount = 0
    for (const student of matchingStudents) {
      try {
        await enrollStudent(courseId, student.studentId || student.regNo, student.name, student.regNo)
        enrolledCount++
        console.log(`Enrolled student: ${student.regNo} - ${student.name}`)
      } catch (error) {
        console.error('Error enrolling student:', student.regNo, error)
      }
    }
    
    return res.json({
      message: `Cleaned and synced advisor data for ${department} ${year}`,
      advisor: kiruthikaEmail,
      department,
      year,
      clearedEnrollments: clearedCount,
      matchingStudents: matchingStudents.length,
      enrolledStudents: enrolledCount,
      students: matchingStudents.map(s => ({
        regNo: s.regNo,
        name: s.name,
        department: s.department,
        year: s.year
      }))
    })
  } catch (error) {
    console.error('Clean advisor data error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// Test endpoint for Kiruthika's student visibility
app.get('/debug/kiruthika-students', async (req, res) => {
  try {
    const kiruthikaEmail = 'kiruthika@demo.com'
    
    // Simulate the same logic as /students/list
    const staff = await getStaffByEmail(kiruthikaEmail)
    let staffFilter = null
    
    if (staff && staff.isClassAdvisor && staff.advisorFor) {
      staffFilter = staff.advisorFor
    }
    
    const courseId = '21CS701'
    const enrollmentRecords = await dbGetEnrollmentRecords(courseId)
    const visibleStudents = []
    
    for (const enrollment of enrollmentRecords) {
      const studentId = enrollment.studentId
      const studentData = await dbGetStudentByRegNo(enrollment.regNo || studentId)
      
      if (staffFilter && studentData) {
        const studentDepartment = studentData.department || 'M.Tech'
        const studentYear = studentData.year || '4th Year'
        
        if (studentDepartment === staffFilter.department && studentYear === staffFilter.year) {
          visibleStudents.push({
            studentId,
            regNo: enrollment.regNo,
            name: enrollment.name,
            department: studentDepartment,
            year: studentYear
          })
        }
      }
    }
    
    return res.json({
      staffEmail: kiruthikaEmail,
      staffFilter,
      totalEnrollments: enrollmentRecords.length,
      visibleStudents: visibleStudents.length,
      students: visibleStudents
    })
  } catch (error) {
    console.error('Kiruthika students test error:', error)
    return res.status(500).json({ error: error.message })
  }
})

// Log all requests
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// Allow clients to call API under '/api' as well as root paths
// This rewrites '/api/qr/generate' -> '/qr/generate', etc.
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4)
  } else if (req.url === '/api') {
    req.url = '/'
  }
  next()
})

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

// One-time seed for demo data - DISABLED (data already exists in enrollments.db)
;(async function seedOnce(){
  try {
    // Seed is disabled - all student data is already in enrollments.db
    // This prevents duplicate student creation
    console.log('[seed] Seed disabled - using existing enrollment data')
    
    // Create demo staff user
    const staffEmail = 'staff@demo.com'
    const found = await getStaffByEmail(staffEmail)
    if (!found) {
      await createStaff({ 
        id: staffEmail, 
        name: 'Demo Staff', 
        email: staffEmail, 
        password: 'staff123',
        department: 'Computer Science',
        designation: 'Assistant Professor',
        accessLevel: 'staff'
      })
      console.log('[seed] Created demo staff user: staff@demo.com / staff123')
    }
    
    // Create admin user
    const adminEmail = 'admin@attendance.edu'
    const adminFound = await getStaffByEmail(adminEmail)
    if (!adminFound) {
      await createStaff({ 
        id: adminEmail, 
        name: 'System Administrator', 
        email: adminEmail, 
        password: 'admin@2024',
        department: 'Administration',
        designation: 'System Administrator',
        accessLevel: 'admin',
        isSystemAdmin: true
      })
      console.log('[seed] Created admin user: admin@attendance.edu / admin@2024')
    }
  } catch (e) {
    console.warn('[seed] skipped or failed:', e?.message)
  }
})()

// In-memory stores for demo
const sessions = new Map() // sessionId -> { courseId, startTime, endTime, status, windowSeconds, present:Set<string>, enrolled:Set<string>, currentTokenJti, tokenExpiresAt }
const tokens = new Map() // jti -> { sessionId, expiresAt, active, code? }
const shortCodes = new Map() // code -> jti 

function generateToken(sessionId) {
  const jti = `${sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 30
  const token = jwt.sign({ jti, sid: sessionId, iat, exp, ver: 1 }, JWT_SECRET, { algorithm: 'HS256' })
  // create 6-char short code [A-Z0-9]
  let code
  do {
    code = Math.random().toString(36).slice(2, 8).toUpperCase()
  } while (shortCodes.has(code))
  tokens.set(jti, { sessionId, expiresAt: exp * 1000, active: true, code })
  shortCodes.set(code, jti)
  // persist
  try { dbSaveToken({ jti, sessionId, expiresAt: exp * 1000, active: 1, code }); dbSaveShortCode(code, jti) } catch {}
  return { token, jti, exp }
}

function scheduleExpiry(jti) {
  const t = tokens.get(jti)
  if (!t) return
  const delay = Math.max(0, t.expiresAt - Date.now())
  setTimeout(() => {
    const tok = tokens.get(jti)
    if (tok) tok.active = false
    if (tok?.code) shortCodes.delete(tok.code)
    try { if (tok) dbDeactivateToken(jti); if (tok?.code) dbDeleteShortCode(tok.code) } catch {}
    const sess = sessions.get(t.sessionId)
    if (sess && sess.currentTokenJti === jti) {
      // window expired; keep session active to allow new generations
      io.to(`session:${t.sessionId}`).emit('session_closed', {
        sessionId: t.sessionId,
        summary: {
          present: sess.present.size,
          total: sess.enrolled.size,
          absent: Math.max(0, sess.enrolled.size - sess.present.size)
        }
      })
      // clear the current QR marker so clients know it's gone
      sess.currentTokenJti = null
      sess.tokenExpiresAt = null
    }
  }, delay)
}

// Socket.IO
io.on('connection', (socket) => {
  socket.on('subscribe', ({ sessionId }) => {
    socket.join(`session:${sessionId}`)
    const sess = sessions.get(sessionId)
    if (sess && sess.currentTokenJti) {
      const expMs = sess.tokenExpiresAt
      const secondsRemaining = Math.max(0, Math.ceil((expMs - Date.now()) / 1000))
      socket.emit('countdown', { secondsRemaining })
    }
  })
  socket.on('unsubscribe', ({ sessionId }) => {
    socket.leave(`session:${sessionId}`)
  })
})

// Routes

// Create session (teacher/admin)
app.post('/sessions', async (req, res) => {
  const { courseId, windowSeconds = 30 } = req.body || {}
  if (!courseId) return res.status(400).json({ error: 'courseId_required' })
  const sessionId = `S_${Date.now()}`
  const enrolledList = await dbGetEnrollments(courseId)
  const enrolled = new Set(enrolledList)
  const session = {
    courseId,
    startTime: Date.now(),
    endTime: null,
    status: 'active',
    windowSeconds,
    present: new Set(),
    enrolled: new Set(enrolled),
    currentTokenJti: null,
    tokenExpiresAt: null
  }
  sessions.set(sessionId, session)
  try { dbCreateSession({ id: sessionId, courseId, startTime: session.startTime, endTime: null, status: 'active', windowSeconds, currentTokenJti: null, tokenExpiresAt: null }) } catch {}

  const { token, jti, exp } = generateToken(sessionId)
  session.currentTokenJti = jti
  session.tokenExpiresAt = exp * 1000
  scheduleExpiry(jti)

  QRCode.toDataURL(token).then((imageDataUrl) => {
    const code = tokens.get(jti)?.code
    io.to(`session:${sessionId}`).emit('qr_updated', { imageDataUrl, token, code, expiresAt: new Date(exp * 1000).toISOString(), jti })
  }).catch(() => {})

  return res.json({ sessionId, status: session.status, startTime: session.startTime, windowSeconds })
})

// Current QR fetch (optional)
app.get('/sessions/:sessionId/qr', (req, res) => {
  const { sessionId } = req.params
  const sess = sessions.get(sessionId)
  if (!sess) return res.status(404).json({ error: 'not_found' })
  const jti = sess.currentTokenJti
  if (!jti) return res.status(404).json({ error: 'no_token' })
  const exp = Math.floor(sess.tokenExpiresAt / 1000)
  const token = jwt.sign({ jti, sid: sessionId, iat: Math.floor(Date.now()/1000), exp, ver: 1 }, JWT_SECRET)
  const code = tokens.get(jti)?.code
  QRCode.toDataURL(token).then((imageDataUrl) => {
    res.json({ imageDataUrl, token, code, expiresAt: new Date(exp * 1000).toISOString(), jti })
  }).catch(() => res.status(500).json({ error: 'qr_error' }))
})

// Student scan with hierarchical access control
app.post('/attendance/scan', async (req, res) => {
  const { token, studentId = 'student1', sessionDepartment, sessionYear } = req.body || {}
  if (!token) return res.status(400).json({ error: 'token_required' })
  if (!sessionDepartment || !sessionYear) {
    return res.status(400).json({ error: 'session_context_required', message: 'Session department and year are required' })
  }
  
  try {
    // First check hierarchical access
    const student = await dbGetStudentByRegNo(studentId)
    if (!student) {
      return res.status(404).json({ error: 'student_not_found' })
    }
    
    const studentDept = student.department || 'M.Tech'
    const studentYear = student.year || '4th Year'
    
    // Enforce hierarchical access control
    if (studentDept !== sessionDepartment || studentYear !== sessionYear) {
      console.log(`Access denied: Student ${studentId} (${studentDept} ${studentYear}) tried to access ${sessionDepartment} ${sessionYear} session`)
      return res.status(403).json({ 
        error: 'access_denied',
        message: `Access denied. This QR code is for ${sessionDepartment} ${sessionYear} students only.`,
        studentDepartment: studentDept,
        studentYear: studentYear,
        sessionDepartment,
        sessionYear
      })
    }
    
    const cleaned = String(token).trim().toUpperCase()
    let jti
    let sessionId
    if (cleaned.includes('.')) {
      const payload = jwt.verify(cleaned, JWT_SECRET)
      jti = payload.jti
      sessionId = payload.sid
    } else {
      const mapped = shortCodes.get(cleaned)
      if (!mapped) return res.status(400).json({ error: 'invalid_code' })
      jti = mapped
      const tokRec = tokens.get(jti)
      sessionId = tokRec?.sessionId
    }
    const tok = tokens.get(jti)
    if (!tok || tok.sessionId !== sessionId) return res.status(400).json({ error: 'invalid_code' })
    if (!tok.active) return res.status(409).json({ error: 'already_used' })
    const sess = sessions.get(sessionId)
    if (!sess) return res.status(410).json({ error: 'session_closed' })
    if (Date.now() >= tok.expiresAt) return res.status(410).json({ error: 'expired_code' })
    const enrolled = await dbIsEnrolled(sess.courseId, studentId)
    if (!enrolled) return res.status(403).json({ error: 'not_enrolled' })

    sess.present.add(studentId)
    tok.active = false
    if (tok.code) shortCodes.delete(tok.code)
    try { dbMarkPresent(sessionId, studentId); dbDeactivateToken(jti); if (tok.code) dbDeleteShortCode(tok.code) } catch {}

    io.to(`session:${sessionId}`).emit('scan_confirmed', {
      sessionId,
      countPresent: sess.present.size,
      countRemaining: Math.max(0, sess.enrolled.size - sess.present.size)
    })

    console.log(`Access granted: Student ${studentId} (${studentDept} ${studentYear}) marked present in ${sessionDepartment} ${sessionYear} session`)
    return res.json({ 
      status: 'present', 
      sessionId, 
      markedAt: new Date().toISOString(),
      studentDepartment: studentDept,
      studentYear: studentYear
    })
  } catch (e) {
    console.error('Scan validate error:', e)
    if (e.name === 'TokenExpiredError') return res.status(410).json({ error: 'expired_code' })
    return res.status(400).json({ error: 'invalid_code', message: e?.message })
  }
})

// Generate QR on-demand (new token per click). If sessionId missing or invalid, start new session
app.post('/qr/generate', async (req, res) => {
  try {
    const { sessionId: providedSessionId, courseId = 'COURSE1', sessionDepartment, sessionYear } = req.body || {}
    if (!courseId) return res.status(400).json({ error: 'course_required', message: 'courseId is required' })
    let sessionId = providedSessionId
    let sess = sessionId && sessions.get(sessionId)
    if (!sess) {
      // create new session
      sessionId = `S_${Date.now()}`
      const enrolledList = await dbGetEnrollments(courseId)
      const enrolled = new Set(enrolledList)
      sess = {
        courseId,
        startTime: Date.now(),
        endTime: null,
        status: 'active',
        windowSeconds: 30,
        present: new Set(),
        enrolled: new Set(enrolled),
        currentTokenJti: null,
        tokenExpiresAt: null
      }
      sessions.set(sessionId, sess)
    }

    // Deactivate any previously active token for this session
    if (sess.currentTokenJti && tokens.has(sess.currentTokenJti)) {
      const prev = tokens.get(sess.currentTokenJti)
      prev.active = false
      if (prev.code) shortCodes.delete(prev.code)
    }
    const { token, jti, exp } = generateToken(sessionId)
    sess.currentTokenJti = jti
    sess.tokenExpiresAt = exp * 1000
    scheduleExpiry(jti)

    try {
      const imageDataUrl = await QRCode.toDataURL(token)
      const code = tokens.get(jti)?.code
      io.to(`session:${sessionId}`).emit('qr_updated', { imageDataUrl, token, code, expiresAt: new Date(exp * 1000).toISOString(), jti })
      io.to(`session:${sessionId}`).emit('countdown', { secondsRemaining: 30 })
      return res.json({ sessionId, imageDataUrl, token, code, expiresAt: new Date(exp * 1000).toISOString(), jti })
    } catch (imgErr) {
      console.error('QR image generation failed, falling back to token-only:', imgErr)
      // Emit token so clients can render QR locally
      const code = tokens.get(jti)?.code
      io.to(`session:${sessionId}`).emit('qr_updated', { imageDataUrl: null, token, code, expiresAt: new Date(exp * 1000).toISOString(), jti })
      io.to(`session:${sessionId}`).emit('countdown', { secondsRemaining: 30 })
      return res.json({ sessionId, imageDataUrl: null, token, code, expiresAt: new Date(exp * 1000).toISOString(), jti, clientRender: true })
    }
  } catch (e) {
    console.error('QR generate error:', e)
    return res.status(500).json({ error: 'qr_error', message: e?.message || 'QR generation failed' })
  }
})

// Close session explicitly (teacher/admin)
app.post('/sessions/:sessionId/close', (req, res) => {
  const { sessionId } = req.params
  const sess = sessions.get(sessionId)
  if (!sess) return res.status(404).json({ error: 'not_found' })
  if (sess.status === 'closed' || sess.status === 'expired') {
    return res.json({ sessionId, status: sess.status, endTime: sess.endTime })
  }
  sess.status = 'closed'
  sess.endTime = Date.now()
  // deactivate current token
  if (sess.currentTokenJti && tokens.has(sess.currentTokenJti)) {
    tokens.get(sess.currentTokenJti).active = false
  }
  io.to(`session:${sessionId}`).emit('session_closed', {
    sessionId,
    summary: {
      present: sess.present.size,
      total: sess.enrolled.size,
      absent: Math.max(0, sess.enrolled.size - sess.present.size)
    }
  })
  return res.json({ sessionId, status: sess.status, endTime: sess.endTime })
})

// Staff auth
app.post('/auth/staff/login', async (req, res) => {
  console.log('[AUTH] Staff login attempt:', req.body)
  const { email, password } = req.body || {}
  if (!email || !password) {
    console.log('[AUTH] Missing email or password')
    return res.status(400).json({ error: 'email_password_required' })
  }
  const staff = await getStaffByEmail(String(email).trim().toLowerCase())
  console.log('[AUTH] Staff found:', staff ? staff.email : 'null')
  if (!staff || staff.password !== password) {
    console.log('[AUTH] Invalid credentials - staff exists:', !!staff, 'password match:', staff?.password === password)
    return res.status(401).json({ error: 'invalid_credentials' })
  }
  console.log('[AUTH] Login successful for:', staff.email)
  console.log('[AUTH] Staff details:', { 
    isClassAdvisor: staff.isClassAdvisor, 
    advisorFor: staff.advisorFor 
  })
  return res.json({ 
    id: staff.id, 
    name: staff.name, 
    email: staff.email, 
    role: 'staff',
    department: staff.department,
    isClassAdvisor: staff.isClassAdvisor || false,
    advisorFor: staff.advisorFor || null
  })
})

// Student auth
app.post('/auth/student/login', async (req, res) => {
  const { regNo, password } = req.body || {}
  if (!regNo || !password) return res.status(400).json({ error: 'regno_password_required' })
  const normalized = String(regNo).replace(/\s+/g, '').trim()
  const student = await dbGetStudentByRegNo(normalized)
  if (!student || student.password !== password) return res.status(401).json({ error: 'invalid_credentials' })
  return res.json({ role: 'student', regNo: student.regNo, studentId: student.studentId, name: student.name })
})

// Student password change
app.post('/auth/student/change-password', async (req, res) => {
  console.log('Password change request received:', {
    body: req.body,
    studentId: req.body?.studentId,
    hasCurrentPassword: !!req.body?.currentPassword,
    hasNewPassword: !!req.body?.newPassword
  })
  
  const { studentId, currentPassword, newPassword } = req.body || {}
  
  if (!studentId || !currentPassword || !newPassword) {
    console.log('Missing required fields')
    return res.status(400).json({ error: 'missing_required_fields' })
  }
  
  if (newPassword.length < 6) {
    console.log('Password too short')
    return res.status(400).json({ error: 'password_too_short' })
  }
  
  try {
    const normalized = String(studentId).replace(/\s+/g, '').trim()
    console.log('Looking for student:', normalized)
    const student = await dbGetStudentByRegNo(normalized)
    
    if (!student) {
      console.log('Student not found')
      return res.status(404).json({ error: 'student_not_found' })
    }
    
    console.log('Student found:', { regNo: student.regNo, hasPassword: !!student.password })
    
    if (student.password !== currentPassword) {
      console.log('Current password incorrect')
      return res.status(401).json({ error: 'current_password_incorrect' })
    }
    
    console.log('Updating password...')
    await dbUpdateStudentPassword(normalized, newPassword)
    console.log('Password updated successfully')
    
    return res.json({ message: 'password_updated_successfully' })
    
  } catch (error) {
    console.error('Password update error:', error)
    return res.status(500).json({ error: 'internal_server_error' })
  }
})

// Admin auth
app.post('/auth/admin/login', async (req, res) => {
  console.log('[ADMIN AUTH] Admin login attempt:', req.body)
  const { email, password } = req.body || {}
  if (!email || !password) {
    console.log('[ADMIN AUTH] Missing email or password')
    return res.status(400).json({ error: 'email_password_required' })
  }
  
  // Check demo admin credentials
  if (email === 'admin@demo.com' && password === 'admin123') {
    console.log('[ADMIN AUTH] Demo admin login successful')
    return res.json({ id: 'admin', name: 'Demo Admin', email: 'admin@demo.com', role: 'admin' })
  }
  
  // Check database admin users
  try {
    const staff = await getStaffByEmail(String(email).trim().toLowerCase())
    console.log('[ADMIN AUTH] Staff found:', staff ? staff.email : 'null')
    
    if (!staff || staff.password !== password) {
      console.log('[ADMIN AUTH] Invalid credentials - staff exists:', !!staff, 'password match:', staff?.password === password)
      return res.status(401).json({ error: 'invalid_credentials' })
    }
    
    // Check if user has admin access
    if (staff.accessLevel !== 'admin' && !staff.isSystemAdmin) {
      console.log('[ADMIN AUTH] Access denied - user is not admin:', staff.accessLevel)
      return res.status(403).json({ error: 'access_denied', message: 'Admin access required' })
    }
    
    console.log('[ADMIN AUTH] Admin login successful for:', staff.email)
    return res.json({ 
      id: staff.id, 
      name: staff.name, 
      email: staff.email, 
      role: 'admin',
      accessLevel: staff.accessLevel,
      isSystemAdmin: staff.isSystemAdmin || false
    })
    
  } catch (error) {
    console.error('[ADMIN AUTH] Database error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Staff Profile & Analytics APIs

// Get staff profile by ID
app.get('/staff/:staffId/profile', async (req, res) => {
  try {
    const { staffId } = req.params
    const staff = await getStaffByEmail(staffId)
    
    if (!staff) {
      return res.status(404).json({ error: 'staff_not_found' })
    }
    
    // Return profile data without password
    const profile = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      department: staff.department || 'Computer Science',
      contact: staff.contact || '',
      designation: staff.designation || 'Assistant Professor',
      experience: staff.experience || '5 years',
      qualifications: staff.qualifications || ['M.Sc. in Computer Science', 'B.Sc. in Information Technology'],
      teachingSubjects: staff.teachingSubjects || ['Database Systems', 'Software Engineering'],
      joiningDate: staff.joiningDate || null
    }
    
    return res.json({ profile })
  } catch (error) {
    console.error('Get staff profile error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Update staff profile
app.put('/staff/:staffId/profile', async (req, res) => {
  try {
    const { staffId } = req.params
    const updates = req.body
    
    // Remove sensitive fields
    delete updates.password
    delete updates.id
    delete updates.email
    
    const staff = await getStaffByEmail(staffId)
    if (!staff) {
      return res.status(404).json({ error: 'staff_not_found' })
    }
    
    // Update staff record
    const updatedStaff = { ...staff, ...updates }
    await createStaff(updatedStaff)
    
    // Return updated profile without password
    const profile = {
      id: updatedStaff.id,
      name: updatedStaff.name,
      email: updatedStaff.email,
      department: updatedStaff.department,
      contact: updatedStaff.contact,
      designation: updatedStaff.designation,
      experience: updatedStaff.experience,
      qualifications: updatedStaff.qualifications,
      teachingSubjects: updatedStaff.teachingSubjects
    }
    
    return res.json({ profile, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update staff profile error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Change staff password
app.post('/staff/:staffId/change-password', async (req, res) => {
  try {
    const { staffId } = req.params
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'password_too_short' })
    }
    
    const staff = await getStaffByEmail(staffId)
    if (!staff) {
      return res.status(404).json({ error: 'staff_not_found' })
    }
    
    if (staff.password !== currentPassword) {
      return res.status(401).json({ error: 'current_password_incorrect' })
    }
    
    // Update password
    const updatedStaff = { ...staff, password: newPassword }
    await createStaff(updatedStaff)
    
    return res.json({ message: 'password_updated_successfully' })
  } catch (error) {
    console.error('Staff password change error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Get staff analytics
app.get('/staff/:staffId/analytics', async (req, res) => {
  try {
    const courseId = '21CS701'
    const enrollmentRecords = await dbGetEnrollmentRecords(courseId)
    const allAttendance = await getAllAttendanceRecords()
    const allSessions = await getAllSessions()
    
    const totalStudents = enrollmentRecords.length
    const totalClasses = allSessions.length
    
    // Calculate average attendance across all sessions
    const sessionAttendance = new Map()
    for (const record of allAttendance) {
      const count = sessionAttendance.get(record.sessionId) || 0
      sessionAttendance.set(record.sessionId, count + 1)
    }
    
    let totalAttendanceSum = 0
    let validSessionsCount = 0
    for (const [sessionId, presentCount] of sessionAttendance.entries()) {
      if (totalStudents > 0) {
        totalAttendanceSum += (presentCount / totalStudents) * 100
        validSessionsCount++
      }
    }
    
    const averageAttendance = validSessionsCount > 0 
      ? Math.round(totalAttendanceSum / validSessionsCount) 
      : 0
    
    // Low attendance alerts (students below 75%)
    let lowAttendanceCount = 0
    for (const enrollment of enrollmentRecords) {
      const studentAttendance = await getStudentAttendance(enrollment.studentId)
      const percentage = totalClasses > 0 
        ? Math.round((studentAttendance.length / totalClasses) * 100) 
        : 0
      if (percentage < 75 && totalClasses > 0) {
        lowAttendanceCount++
      }
    }
    
    // Attendance distribution (present vs absent vs on leave)
    let totalPossibleAttendance = totalStudents * totalClasses
    let totalPresent = allAttendance.length
    let totalAbsent = totalPossibleAttendance - totalPresent
    
    // Daily trend data (last 7 days)
    const today = new Date()
    const dailyTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      const dateStr = date.toISOString().split('T')[0]
      
      const daySessions = allSessions.filter(s => {
        if (!s.startTime) return false
        const sessionDate = new Date(s.startTime).toISOString().split('T')[0]
        return sessionDate === dateStr
      })
      
      const daySessionIds = new Set(daySessions.map(s => s.id))
      const dayAttendance = allAttendance.filter(a => daySessionIds.has(a.sessionId))
      
      const dayTotal = daySessions.length * totalStudents
      const dayPresent = dayAttendance.length
      const dayPercentage = dayTotal > 0 ? Math.round((dayPresent / dayTotal) * 100) : 0
      
      dailyTrend.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        percentage: dayPercentage,
        present: dayPresent,
        total: dayTotal
      })
    }
    
    // Hourly attendance pattern (0-23 hours)
    const hourlyPattern = Array(24).fill(0).map((_, hour) => {
      const hourSessions = allSessions.filter(s => {
        if (!s.startTime) return false
        const sessionHour = new Date(s.startTime).getHours()
        return sessionHour === hour
      })
      
      const hourSessionIds = new Set(hourSessions.map(s => s.id))
      const hourAttendance = allAttendance.filter(a => hourSessionIds.has(a.sessionId))
      
      return {
        hour: `${hour}:00`,
        sessions: hourSessions.length,
        attendance: hourAttendance.length
      }
    }).filter(h => h.sessions > 0)
    
    return res.json({
      totalStudents,
      averageAttendance,
      totalClasses,
      lowAttendanceAlerts: lowAttendanceCount,
      attendanceDistribution: {
        present: totalPresent,
        absent: totalAbsent,
        onLeave: 0 // Can be calculated from leave requests if needed
      },
      dailyTrend,
      hourlyPattern,
      stats: {
        totalSessions: totalClasses,
        averageClassSize: totalStudents,
        attendanceRate: averageAttendance,
        activeStudents: enrollmentRecords.length
      }
    })
  } catch (error) {
    console.error('Staff analytics error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Get staff recent activity
app.get('/staff/:staffId/recent-activity', async (req, res) => {
  try {
    const allAttendance = await getAllAttendanceRecords()
    const allSessions = await getAllSessions()
    const enrollmentRecords = await dbGetEnrollmentRecords('21CS701')
    const leaveRequests = await getAllLeaveRequests()
    
    const activities = []
    
    // Add recent attendance records
    const recentAttendance = allAttendance.slice(-10).reverse()
    for (const record of recentAttendance) {
      const enrollment = enrollmentRecords.find(e => e.studentId === record.studentId)
      const session = await getSessionById(record.sessionId)
      activities.push({
        type: 'attendance',
        icon: '✅',
        text: `Marked attendance for ${enrollment?.name || record.studentId}`,
        course: session?.courseId || 'Class',
        time: getTimeAgo(record.timestamp || Date.now()),
        timestamp: record.timestamp || Date.now()
      })
    }
    
    // Add recent leave approvals/rejections
    const recentLeaves = leaveRequests.slice(-5).reverse()
    for (const leave of recentLeaves) {
      if (leave.status !== 'pending') {
        activities.push({
          type: 'leave',
          icon: leave.status === 'approved' ? '✅' : '❌',
          text: `${leave.status === 'approved' ? 'Approved' : 'Rejected'} leave request from ${leave.studentName}`,
          time: getTimeAgo(leave.reviewedAt || leave.updatedAt || Date.now()),
          timestamp: leave.reviewedAt || leave.updatedAt || Date.now()
        })
      }
    }
    
    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp)
    
    return res.json({ activities: activities.slice(0, 15) })
  } catch (error) {
    console.error('Staff recent activity error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Enrollment routes
app.get('/courses/:courseId/enrollments', async (req, res) => {
  const { courseId } = req.params
  const records = await dbGetEnrollmentRecords(courseId)
  return res.json({ courseId, students: records })
})

app.post('/courses/:courseId/enroll', async (req, res) => {
  const { courseId } = req.params
  const { studentId, name, regNo } = req.body || {}
  if (!studentId) return res.status(400).json({ error: 'studentId_required' })
  await dbEnrollStudent(courseId, studentId, name, regNo)
  return res.json({ courseId, studentId, name, regNo, status: 'enrolled' })
})

app.delete('/courses/:courseId/enroll', async (req, res) => {
  const { courseId } = req.params
  const { studentId } = req.body || {}
  if (!studentId) return res.status(400).json({ error: 'studentId_required' })
  await dbUnenrollStudent(courseId, studentId)
  return res.json({ courseId, studentId, status: 'unenrolled' })
})

// Helper function to calculate attendance statistics
function calculateAttendanceStats(attendedCount, totalSessions) {
  if (totalSessions === 0) {
    return {
      percentage: 0,
      attended: 0,
      missed: 0,
      total: 0,
      status: 'no_data'
    }
  }
  
  const percentage = Math.round((attendedCount / totalSessions) * 100)
  let status = 'excellent'
  if (percentage < 75) status = 'poor'
  else if (percentage < 85) status = 'average'
  else if (percentage < 95) status = 'good'
  
  return {
    percentage,
    attended: attendedCount,
    missed: totalSessions - attendedCount,
    total: totalSessions,
    status
  }
}

// Helper function to get date range statistics
function getDateRangeStats(attendance, sessions, startDate, endDate) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  
  const relevantSessions = sessions.filter(s => {
    if (!s.startTime) return false
    const sessionTime = new Date(s.startTime).getTime()
    return sessionTime >= start && sessionTime <= end
  })
  
  const sessionIds = new Set(relevantSessions.map(s => s.id))
  const attendedInRange = attendance.filter(a => sessionIds.has(a.sessionId))
  
  return calculateAttendanceStats(attendedInRange.length, relevantSessions.length)
}

// Dashboard statistics endpoints
app.get('/dashboard/stats', async (req, res) => {
  try {
    const courseId = '21CS701'
    const enrollmentRecords = await dbGetEnrollmentRecords(courseId)
    const allAttendance = await getAllAttendanceRecords()
    const allSessions = await getAllSessions()
    
    // Calculate today's attendance
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    const todaySessions = allSessions.filter(s => {
      if (!s.startTime) return false
      const sessionDate = new Date(s.startTime).toISOString().split('T')[0]
      return sessionDate === todayStr
    })
    
    const todayPresent = new Set()
    const todaySessionIds = new Set(todaySessions.map(s => s.id))
    allAttendance.filter(a => todaySessionIds.has(a.sessionId))
      .forEach(a => todayPresent.add(a.studentId))
    
    const totalStudents = enrollmentRecords.length
    const presentToday = todayPresent.size
    const absentToday = totalStudents - presentToday
    const todayAttendanceRate = todaySessions.length > 0 && totalStudents > 0 
      ? Math.round((presentToday / totalStudents) * 100) 
      : 0
    
    // Overall attendance rate (all sessions)
    const totalSessionCount = allSessions.length
    let overallPresentCount = 0
    let overallTotalPossible = totalStudents * totalSessionCount
    
    for (const enrollment of enrollmentRecords) {
      const studentAttendance = await getStudentAttendance(enrollment.studentId)
      overallPresentCount += studentAttendance.length
    }
    
    const overallAttendanceRate = overallTotalPossible > 0 
      ? Math.round((overallPresentCount / overallTotalPossible) * 100) 
      : 0
    
    // Low attendance students (below 75%)
    const lowAttendanceStudents = []
    const studentStats = []
    
    for (const enrollment of enrollmentRecords) {
      const studentAttendance = await getStudentAttendance(enrollment.studentId)
      const stats = calculateAttendanceStats(studentAttendance.length, totalSessionCount)
      
      const studentData = {
        name: enrollment.name || enrollment.studentId,
        regNo: enrollment.regNo || enrollment.studentId,
        studentId: enrollment.studentId,
        ...stats
      }
      
      studentStats.push(studentData)
      
      if (stats.percentage < 75 && totalSessionCount > 0) {
        lowAttendanceStudents.push(studentData)
      }
    }
    
    // Sort low attendance by percentage (lowest first)
    lowAttendanceStudents.sort((a, b) => a.percentage - b.percentage)
    
    // Recent activity with names and details
    const recentActivity = []
    const recentRecords = allAttendance.slice(-20).reverse()
    
    for (const record of recentRecords) {
      const enrollment = enrollmentRecords.find(e => e.studentId === record.studentId)
      const session = await getSessionById(record.sessionId)
      
      recentActivity.push({
        studentId: record.studentId,
        studentName: enrollment ? enrollment.name : record.studentId,
        sessionId: record.sessionId,
        courseId: session?.courseId || 'Unknown',
        timestamp: record.timestamp || Date.now(),
        timeAgo: getTimeAgo(record.timestamp || Date.now())
      })
    }
    
    // Weekly statistics (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekStats = getDateRangeStats(allAttendance, allSessions, weekAgo, new Date())
    
    // Monthly statistics (last 30 days)
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthStats = getDateRangeStats(allAttendance, allSessions, monthAgo, new Date())
    
    return res.json({
      totalStudents,
      presentToday,
      absentToday,
      todayAttendanceRate,
      overallAttendanceRate,
      totalSessions: totalSessionCount,
      lowAttendanceStudents: lowAttendanceStudents.slice(0, 15),
      recentActivity: recentActivity.slice(0, 10),
      weeklyStats: weekStats,
      monthlyStats: monthStats,
      studentStats: studentStats.slice(0, 5).sort((a, b) => b.percentage - a.percentage) // Top 5 students
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Helper function for relative time
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds} seconds ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

// Student list with attendance (STRICT department access control)
app.get('/students/list', async (req, res) => {
  try {
    // Get staff info from request headers or session for department filtering
    const staffEmail = req.headers['x-staff-email'] || req.query.staffEmail
    let allowedDepartments = []
    let staffInfo = null
    
    if (staffEmail) {
      const staff = await getStaffByEmail(staffEmail)
      if (staff) {
        staffInfo = staff
        
        // STRICT DEPARTMENT ACCESS CONTROL
        // If staff is a class advisor, they can see students from their advisor department
        if (staff.isClassAdvisor && staff.advisorFor) {
          allowedDepartments.push(staff.advisorFor.department)
        }
        
        // Staff can also see students from their own department (if different from advisor)
        if (staff.department && !allowedDepartments.includes(staff.department)) {
          allowedDepartments.push(staff.department)
        }
        
        console.log(`Staff ${staffEmail} allowed departments for student list:`, allowedDepartments)
      }
    }
    
    // If no allowed departments and staff is authenticated, deny access
    if (staffEmail && allowedDepartments.length === 0) {
      return res.status(403).json({ 
        error: 'no_department_access', 
        message: 'Staff member has no department assignments' 
      })
    }
    
    // Get all enrollment data (not just one course)
    const enrollmentRecords = await getAllEnrollmentRecords()
    const allSessions = await getAllSessions()
    
    const studentsWithAttendance = []
    
    // Create a unique map to avoid duplicates
    const studentMap = new Map()
    
    for (const enrollment of enrollmentRecords) {
      const studentId = enrollment.studentId
      
      // Skip if already processed
      if (studentMap.has(studentId)) continue
      
      // Get full student data from database to get department and year info
      const studentData = await dbGetStudentByRegNo(enrollment.regNo || studentId)
      
      // Apply STRICT department filtering if staff is authenticated
      if (staffEmail && allowedDepartments.length > 0) {
        if (!studentData) {
          console.log(`Student ${studentId} filtered out - no student data found`)
          continue
        }
        
        const studentDepartment = studentData.department || 'Unknown'
        
        console.log(`Checking student ${studentId}: dept=${studentDepartment} vs allowed departments=${allowedDepartments.join(', ')}`)
        
        // STRICT FILTER: Only show students from allowed departments
        if (!allowedDepartments.includes(studentDepartment)) {
          console.log(`Student ${studentId} filtered out - department ${studentDepartment} not in allowed list`)
          continue
        }
        console.log(`Student ${studentId} included - department ${studentDepartment} is allowed`)
      }
      
      const attendance = await getStudentAttendance(studentId)
      const stats = calculateAttendanceStats(attendance.length, allSessions.length)
      
      // Get last attendance
      const lastAttendance = attendance.length > 0 ? attendance[attendance.length - 1] : null
      let lastSeen = 'Never'
      let lastSeenDate = null
      
      if (lastAttendance && lastAttendance.timestamp) {
        const date = new Date(lastAttendance.timestamp)
        lastSeen = date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        lastSeenDate = lastAttendance.timestamp
      }
      
      // Calculate monthly attendance
      const now = new Date()
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthStats = getDateRangeStats(attendance, allSessions, monthAgo, now)
      
      // Calculate weekly attendance
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      const weekStats = getDateRangeStats(attendance, allSessions, weekAgo, now)
      
      studentMap.set(studentId, {
        name: enrollment.name || studentId,
        regNo: enrollment.regNo || studentId,
        studentId: studentId,
        email: studentData?.email || (enrollment.regNo ? `${enrollment.regNo}@student.edu` : `${studentId}@student.edu`),
        department: studentData?.department || 'M.Tech',
        year: studentData?.year || '4th Year',
        attendance: stats.percentage,
        attendedSessions: stats.attended,
        missedSessions: stats.missed,
        totalSessions: stats.total,
        status: stats.status,
        lastSeen,
        lastSeenDate,
        monthlyAttendance: monthStats.percentage,
        weeklyAttendance: weekStats.percentage,
        trend: getTrend(weekStats.percentage, monthStats.percentage)
      })
    }
    
    // Convert to array and sort by student ID
    const studentsList = Array.from(studentMap.values())
    studentsList.sort((a, b) => {
      const idA = a.studentId || a.regNo
      const idB = b.studentId || b.regNo
      return idA.localeCompare(idB, undefined, { numeric: true })
    })
    
    return res.json({ students: studentsList })
  } catch (error) {
    console.error('Student list error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})


// Helper function to determine attendance trend
function getTrend(weeklyPercentage, monthlyPercentage) {
  const diff = weeklyPercentage - monthlyPercentage
  if (diff > 5) return 'improving'
  if (diff < -5) return 'declining'
  return 'stable'
}

// Student individual dashboard stats
app.get('/student/:studentId/stats', async (req, res) => {
  try {
    const { studentId } = req.params
    const student = await getStudentByRegNo(studentId)
    
    if (!student) {
      return res.status(404).json({ error: 'student_not_found' })
    }
    
    const attendance = await getStudentAttendance(studentId)
    const allSessions = await getAllSessions()
    
    // Overall statistics
    const overallStats = calculateAttendanceStats(attendance.length, allSessions.length)
    
    // Weekly stats (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekStats = getDateRangeStats(attendance, allSessions, weekAgo, new Date())
    
    // Monthly stats (current month)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthStats = getDateRangeStats(attendance, allSessions, monthStart, now)
    
    // Today's attendance
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    const todayStats = getDateRangeStats(attendance, allSessions, todayStart, todayEnd)
    
    // Recent attendance records (last 15)
    const recentAttendance = []
    const sortedAttendance = [...attendance].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    
    for (const record of sortedAttendance.slice(0, 15)) {
      const session = await getSessionById(record.sessionId)
      if (session) {
        const sessionDate = new Date(session.startTime)
        recentAttendance.push({
          date: sessionDate.toISOString().split('T')[0],
          dateFormatted: sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          subject: session.courseId || 'Class Session',
          time: sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: 'Present',
          sessionId: session.id,
          timeAgo: getTimeAgo(record.timestamp || session.startTime)
        })
      }
    }
    
    // Get missed sessions (sessions where student was absent)
    const attendedSessionIds = new Set(attendance.map(a => a.sessionId))
    const missedSessions = []
    
    for (const session of allSessions) {
      if (session.startTime && !attendedSessionIds.has(session.id)) {
        const sessionDate = new Date(session.startTime)
        missedSessions.push({
          date: sessionDate.toISOString().split('T')[0],
          dateFormatted: sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          subject: session.courseId || 'Class Session',
          time: sessionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: 'Absent',
          sessionId: session.id
        })
      }
    }
    
    // Sort missed sessions by date (most recent first)
    missedSessions.sort((a, b) => new Date(b.date) - new Date(a.date))
    
    // Monthly breakdown (last 6 months)
    const monthlyAttendance = []
    const monthsData = {}
    
    // Initialize last 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthsData[monthKey] = { attended: 0, total: 0, month: date }
    }
    
    // Count attended sessions per month
    for (const record of attendance) {
      const session = await getSessionById(record.sessionId)
      if (session && session.startTime) {
        const date = new Date(session.startTime)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (monthsData[monthKey]) {
          monthsData[monthKey].attended++
        }
      }
    }
    
    // Count total sessions per month
    for (const session of allSessions) {
      if (session.startTime) {
        const date = new Date(session.startTime)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (monthsData[monthKey]) {
          monthsData[monthKey].total++
        }
      }
    }
    
    // Format monthly data
    Object.entries(monthsData).sort((a, b) => b[0].localeCompare(a[0])).forEach(([key, data]) => {
      const percentage = data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0
      monthlyAttendance.push({
        month: data.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        monthShort: data.month.toLocaleDateString('en-US', { month: 'short' }),
        attended: data.attended,
        total: data.total,
        missed: data.total - data.attended,
        percentage
      })
    })
    
    return res.json({
      // Overall stats
      totalClasses: overallStats.total,
      attendedClasses: overallStats.attended,
      missedClasses: overallStats.missed,
      attendancePercentage: overallStats.percentage,
      status: overallStats.status,
      
      // Time-based stats
      weeklyStats: {
        attended: weekStats.attended,
        total: weekStats.total,
        percentage: weekStats.percentage
      },
      monthlyStats: {
        attended: monthStats.attended,
        total: monthStats.total,
        percentage: monthStats.percentage
      },
      todayStats: {
        attended: todayStats.attended,
        total: todayStats.total,
        percentage: todayStats.percentage
      },
      
      // Detailed records
      recentAttendance,
      missedSessions: missedSessions.slice(0, 10),
      monthlyAttendance,
      
      // Insights
      trend: getTrend(weekStats.percentage, monthStats.percentage),
      daysUntilCritical: calculateDaysUntilCritical(overallStats.percentage, overallStats.total)
    })
  } catch (error) {
    console.error('Student stats error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Helper function to calculate days until attendance becomes critical
function calculateDaysUntilCritical(currentPercentage, totalSessions) {
  if (currentPercentage >= 75 || totalSessions === 0) {
    return null // Not critical or no data
  }
  
  // Calculate how many consecutive sessions needed to reach 75%
  const requiredAttendance = Math.ceil(totalSessions * 0.75)
  const currentAttendance = Math.floor(totalSessions * (currentPercentage / 100))
  const sessionsNeeded = requiredAttendance - currentAttendance
  
  return sessionsNeeded > 0 ? sessionsNeeded : null
}

// Update student profile
app.put('/students/:regNo', async (req, res) => {
  try {
    const { regNo } = req.params
    const updates = req.body
    
    // Remove sensitive fields
    delete updates.password
    delete updates.regNo
    
    await updateStudent(regNo, updates)
    const updated = await getStudentByRegNo(regNo)
    
    return res.json({ student: updated })
  } catch (error) {
    console.error('Update student error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Leave Management APIs

// Get all leave requests (for staff)
app.get('/leave/requests', async (req, res) => {
  try {
    const { status } = req.query
    let requests
    
    if (status && status !== 'all') {
      requests = await getLeaveRequestsByStatus(status)
    } else {
      requests = await getAllLeaveRequests()
    }
    
    // Format the data
    const formatted = requests.map(r => ({
      id: r._id,
      studentId: r.studentId,
      studentName: r.studentName,
      regNo: r.regNo,
      startDate: r.startDate,
      endDate: r.endDate,
      reason: r.reason,
      type: r.type,
      status: r.status,
      submittedAt: r.submittedAt,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      duration: calculateDuration(r.startDate, r.endDate)
    }))
    
    return res.json({ requests: formatted })
  } catch (error) {
    console.error('Get leave requests error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Get leave requests for a specific student
app.get('/leave/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params
    const requests = await getLeaveRequestsByStudent(studentId)
    
    const formatted = requests.map(r => ({
      id: r._id,
      startDate: r.startDate,
      endDate: r.endDate,
      reason: r.reason,
      type: r.type,
      status: r.status,
      submittedAt: r.submittedAt,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      duration: calculateDuration(r.startDate, r.endDate)
    }))
    
    return res.json({ requests: formatted })
  } catch (error) {
    console.error('Get student leave requests error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Create leave request
app.post('/leave/request', async (req, res) => {
  try {
    const { studentId, studentName, regNo, startDate, endDate, reason, type } = req.body
    
    if (!studentId || !startDate || !endDate || !reason) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }
    
    const leave = await createLeaveRequest({
      studentId,
      studentName: studentName || studentId,
      regNo: regNo || studentId,
      startDate,
      endDate,
      reason,
      type: type || 'sick'
    })
    
    return res.json({
      success: true,
      leave: {
        id: leave._id,
        ...leave
      }
    })
  } catch (error) {
    console.error('Create leave request error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Update leave status (approve/reject)
app.put('/leave/request/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, reviewedBy } = req.body
    
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'invalid_status' })
    }
    
    await updateLeaveStatus(id, status, reviewedBy || 'staff')
    
    return res.json({ success: true, status })
  } catch (error) {
    console.error('Update leave status error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Delete leave request
app.delete('/leave/request/:id', async (req, res) => {
  try {
    const { id } = req.params
    await deleteLeaveRequest(id)
    return res.json({ success: true })
  } catch (error) {
    console.error('Delete leave request error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Admin Dashboard APIs

// Get admin dashboard statistics
app.get('/admin/dashboard/stats', async (req, res) => {
  try {
    const staffCount = await getStaffCount()
    const studentCount = await getStudentCount()
    const allAttendance = await getAllAttendanceRecords()
    const allLeaves = await getAllLeaveRequests()
    const allSessions = await getAllSessions()
    
    // Get department count
    const allStudents = await listAllStudents() // This gets all students
    const allStaffList = await listStaff() // This gets all staff
    const departments = new Set()
    
    // Add departments from students
    allStudents.forEach(student => {
      if (student.department) departments.add(student.department)
    })
    
    // Add departments from staff
    allStaffList.forEach(staff => {
      if (staff.department) departments.add(staff.department)
    })
    
    const departmentCount = departments.size
    
    const pendingLeaves = allLeaves.filter(l => l.status === 'pending').length
    const attendanceRecordsCount = allAttendance.length
    
    // Recent activities
    const recentActivities = []
    
    // Add recent attendance marks
    const recentAttendance = allAttendance.slice(-5).reverse()
    const enrollments = await dbGetEnrollmentRecords('21CS701')
    for (const record of recentAttendance) {
      const enrollment = enrollments.find(e => e.studentId === record.studentId)
      recentActivities.push({
        type: 'attendance',
        icon: '✅',
        text: `${enrollment?.name || record.studentId} marked present`,
        time: getTimeAgo(record.timestamp || Date.now()),
        timestamp: record.timestamp || Date.now()
      })
    }
    
    // Add recent leave requests
    const recentLeaves = allLeaves.slice(-5).reverse()
    for (const leave of recentLeaves) {
      recentActivities.push({
        type: 'leave',
        icon: leave.status === 'approved' ? '✅' : leave.status === 'rejected' ? '❌' : '⏳',
        text: `Leave request from ${leave.studentName} - ${leave.status}`,
        time: getTimeAgo(leave.submittedAt || Date.now()),
        timestamp: leave.submittedAt || Date.now()
      })
    }
    
    // Sort by timestamp
    recentActivities.sort((a, b) => b.timestamp - a.timestamp)
    
    // Today's stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    const todaySessions = allSessions.filter(s => {
      if (!s.startTime) return false
      const sessionDate = new Date(s.startTime).toISOString().split('T')[0]
      return sessionDate === todayStr
    })
    
    const todayAttendance = allAttendance.filter(a => {
      const sessionIds = new Set(todaySessions.map(s => s.id))
      return sessionIds.has(a.sessionId)
    })
    
    return res.json({
      staffCount,
      studentCount,
      departmentCount,
      attendanceRecordsCount,
      pendingLeaves,
      totalSessions: allSessions.length,
      todaySessionsCount: todaySessions.length,
      todayAttendanceCount: todayAttendance.length,
      recentActivities: recentActivities.slice(0, 10),
      stats: {
        averageAttendanceRate: studentCount > 0 && allSessions.length > 0 
          ? Math.round((allAttendance.length / (studentCount * allSessions.length)) * 100)
          : 0
      }
    })
  } catch (error) {
    console.error('Admin dashboard stats error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Admin Staff Management APIs

// Get all staff
app.get('/admin/staff/list', async (req, res) => {
  try {
    const staff = await listStaff()
    const staffList = staff.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      department: s.department || 'Not specified',
      designation: s.designation || 'Staff',
      contact: s.contact || '',
      status: s.status || 'Active',
      joiningDate: s.joiningDate || null,
      // Include hierarchical fields
      assignedDepartments: s.assignedDepartments || [],
      assignedYears: s.assignedYears || [],
      isClassAdvisor: s.isClassAdvisor || false,
      advisorFor: s.advisorFor || null,
      accessLevel: s.accessLevel || 'staff',
      isDepartmentPlaceholder: s.isDepartmentPlaceholder || false
    }))
    return res.json({ staff: staffList })
  } catch (error) {
    console.error('Get staff list error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Add new staff
app.post('/admin/staff/add', async (req, res) => {
  try {
    const { name, email, password, department, designation, contact } = req.body
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }
    
    // Check if email already exists
    const existing = await getStaffByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'email_already_exists' })
    }
    
    const staff = await createStaff({
      id: email,
      name,
      email,
      password,
      department: department || 'Computer Science',
      designation: designation || 'Assistant Professor',
      contact: contact || '',
      status: 'Active',
      joiningDate: Date.now(),
      // Initialize hierarchical fields
      assignedDepartments: [],
      assignedYears: [],
      isClassAdvisor: false,
      advisorFor: null,
      accessLevel: 'staff'
    })
    
    // Broadcast staff creation to all admin panels
    broadcastAdminUpdate('staff-created', {
      staff: { id: staff.id, name: staff.name, email: staff.email, department: staff.department }
    })
    
    return res.json({ 
      success: true, 
      staff: { id: staff.id, name: staff.name, email: staff.email }
    })
  } catch (error) {
    console.error('Add staff error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Update staff
app.put('/admin/staff/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    // Remove sensitive/immutable fields
    delete updates.id
    delete updates.email
    delete updates.password
    
    const staff = await getStaffById(id)
    if (!staff) {
      return res.status(404).json({ error: 'staff_not_found' })
    }
    
    await updateStaff(id, updates)
    
    // Broadcast staff update to all admin panels
    broadcastAdminUpdate('staff-updated', {
      staffId: id,
      staffName: staff.name,
      updates: updates
    })
    
    return res.json({ success: true, message: 'Staff updated successfully' })
  } catch (error) {
    console.error('Update staff error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Delete staff
app.delete('/admin/staff/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const staff = await getStaffById(id)
    if (!staff) {
      return res.status(404).json({ error: 'staff_not_found' })
    }
    
    await deleteStaff(id)
    
    // Broadcast staff deletion to all admin panels
    broadcastAdminUpdate('staff-deleted', {
      staffId: id,
      staffName: staff.name,
      department: staff.department
    })
    
    return res.json({ success: true, message: 'Staff deleted successfully' })
  } catch (error) {
    console.error('Delete staff error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Reset staff password
app.post('/admin/staff/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params
    const { newPassword } = req.body
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'invalid_password' })
    }
    
    const staff = await getStaffById(id)
    if (!staff) {
      return res.status(404).json({ error: 'staff_not_found' })
    }
    
    await updateStaff(id, { password: newPassword })
    
    return res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Admin Student Management APIs (additional to existing)

// Delete student
app.delete('/admin/students/:regNo', async (req, res) => {
  try {
    const { regNo } = req.params
    
    const student = await dbGetStudentByRegNo(regNo)
    if (!student) {
      return res.status(404).json({ error: 'student_not_found' })
    }
    
    await deleteStudent(regNo)
    
    // Broadcast student deletion to all admin panels
    broadcastAdminUpdate('student-deleted', {
      studentRegNo: regNo,
      studentName: student.name,
      department: student.department,
      year: student.year
    })
    
    return res.json({ success: true, message: 'Student deleted successfully' })
  } catch (error) {
    console.error('Delete student error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Reset student password
app.post('/admin/students/:regNo/reset-password', async (req, res) => {
  try {
    const { regNo } = req.params
    const { newPassword } = req.body
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'invalid_password' })
    }
    
    const student = await dbGetStudentByRegNo(regNo)
    if (!student) {
      return res.status(404).json({ error: 'student_not_found' })
    }
    
    await dbUpdateStudentPassword(regNo, newPassword)
    
    return res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset student password error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Add student
app.post('/admin/students/add', async (req, res) => {
  try {
    const { name, regNo, studentId, email, password, department, year } = req.body
    
    // Debug logging for name field
    console.log('=== STUDENT CREATION REQUEST ===')
    console.log('Full request body:', req.body)
    console.log('Name field received:', `"${name}"`, 'Length:', name?.length, 'Type:', typeof name)
    console.log('RegNo:', regNo, 'StudentId:', studentId)
    
    if (!name || !regNo || !studentId) {
      console.log('Missing required fields - name:', !!name, 'regNo:', !!regNo, 'studentId:', !!studentId)
      return res.status(400).json({ error: 'missing_required_fields', message: 'Name, RegNo, and StudentId are required' })
    }
    
    // Check if student already exists
    console.log('Checking for existing student with regNo:', regNo, 'Type:', typeof regNo)
    const existing = await dbGetStudentByRegNo(regNo)
    console.log('Existing student found:', existing ? 'YES' : 'NO')
    if (existing) {
      console.log('Existing student details:', existing)
      return res.status(400).json({ error: 'student_exists', message: `A student with this registration number already exists: ${existing.name}` })
    }
    
    // Create student
    const studentData = {
      regNo,
      studentId,
      name,
      password: password || 'student123',
      email: email || '',
      department: department || 'M.Tech',
      year: year || '4th Year'
    }
    
    console.log('Student data being created:', studentData)
    const createdStudent = await dbCreateStudent(studentData)
    console.log('Student created successfully:', createdStudent)
    console.log('Created student name:', `"${createdStudent.name}"`, 'Length:', createdStudent.name?.length)
    
    // Auto-enroll in default course so student appears in staff panel
    const courseId = '21CS701'
    try {
      console.log('Enrolling student:', { courseId, studentId, name, regNo })
      await enrollStudent(courseId, studentId, name, regNo)
      console.log('Student enrolled in course:', courseId)
      
      // Verify enrollment
      const enrollmentRecords = await dbGetEnrollmentRecords(courseId)
      const studentEnrollment = enrollmentRecords.find(e => e.studentId === studentId)
      console.log('Enrollment verification:', studentEnrollment ? 'SUCCESS' : 'FAILED')
    } catch (enrollError) {
      console.error('Error enrolling student in course:', enrollError)
    }
    
    // Small delay to ensure database writes are complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Broadcast student creation to all admin panels
    broadcastAdminUpdate('student-created', {
      student: { regNo, studentId, name, department: studentData.department, year: studentData.year }
    })
    
    return res.json({ 
      success: true, 
      message: 'Student added successfully',
      student: {
        regNo,
        studentId,
        name,
        email: studentData.email,
        department: studentData.department,
        year: studentData.year
      }
    })
  } catch (error) {
    console.error('Add student error:', error)
    return res.status(500).json({ error: 'internal_error', message: error.message })
  }
})

// Hierarchical Access Control APIs

// Assign staff to department-year combination
app.post('/admin/hierarchy/assign-staff', async (req, res) => {
  try {
    const { staffId, department, year, isClassAdvisor = false } = req.body
    
    if (!staffId || !department || !year) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }
    
    // Get current staff record
    console.log('Looking for staff with ID:', staffId)
    const staff = await getStaffById(staffId)
    console.log('Found staff:', staff)
    if (!staff) {
      console.log('Staff not found with ID:', staffId)
      return res.status(404).json({ error: 'staff_not_found' })
    }
    
    // If making class advisor, check if department-year already has one
    if (isClassAdvisor) {
      const allStaff = await listStaff()
      const existingAdvisor = allStaff.find(s => 
        s.advisorFor?.department === department && 
        s.advisorFor?.year === year && 
        s.id !== staffId
      )
      
      if (existingAdvisor) {
        return res.status(409).json({ 
          error: 'advisor_exists', 
          message: `${existingAdvisor.name} is already class advisor for ${department} ${year}` 
        })
      }
    }
    
    // Update staff with hierarchical assignments
    const updates = {
      assignedDepartments: staff.assignedDepartments || [],
      assignedYears: staff.assignedYears || [],
      isClassAdvisor: isClassAdvisor,
      advisorFor: isClassAdvisor ? { department, year } : staff.advisorFor,
      accessLevel: isClassAdvisor ? 'class_advisor' : (staff.accessLevel || 'staff')
    }
    
    // Add department and year to assignments if not already present
    const deptYearKey = `${department}:${year}`
    if (!updates.assignedDepartments.includes(department)) {
      updates.assignedDepartments.push(department)
    }
    if (!updates.assignedYears.includes(deptYearKey)) {
      updates.assignedYears.push(deptYearKey)
    }
    
    console.log('Updating staff with:', updates)
    await updateStaff(staffId, updates)
    console.log('Staff updated successfully')
    
    // Verify the update
    const updatedStaff = await getStaffById(staffId)
    console.log('Updated staff record:', updatedStaff)
    
    // Broadcast hierarchy update
    broadcastAdminUpdate('hierarchy-updated', {
      staffId,
      staffName: staff.name,
      department,
      year,
      isClassAdvisor,
      action: 'assigned'
    })
    
    return res.json({ 
      success: true, 
      message: `Staff ${isClassAdvisor ? 'assigned as class advisor' : 'assigned'} to ${department} ${year}` 
    })
    
  } catch (error) {
    console.error('Assign staff error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Get hierarchy structure
app.get('/admin/hierarchy/structure', async (req, res) => {
  try {
    const allStaff = await listStaff()
    const allStudents = await listAllStudents()
    
    // Build hierarchy structure
    const hierarchy = {}
    
    // Process students to build department-year structure
    for (const student of allStudents) {
      if (student.isYearPlaceholder) continue
      
      const dept = student.department || 'M.Tech'
      const year = student.year || '4th Year'
      
      if (!hierarchy[dept]) {
        hierarchy[dept] = {}
      }
      
      if (!hierarchy[dept][year]) {
        hierarchy[dept][year] = {
          classAdvisor: null,
          staff: [],
          students: [],
          studentCount: 0
        }
      }
      
      hierarchy[dept][year].students.push({
        regNo: student.regNo,
        name: student.name,
        email: student.email,
        studentId: student.studentId
      })
      hierarchy[dept][year].studentCount++
    }
    
    // Process staff assignments
    console.log('Processing staff for hierarchy:', allStaff.length, 'staff members')
    for (const staff of allStaff) {
      if (staff.isDepartmentPlaceholder) continue
      
      console.log('Processing staff:', staff.name, 'isClassAdvisor:', staff.isClassAdvisor, 'advisorFor:', staff.advisorFor)
      
      // Check if staff is class advisor
      if (staff.isClassAdvisor && staff.advisorFor) {
        const { department, year } = staff.advisorFor
        
        // Ensure department exists
        if (!hierarchy[department]) {
          hierarchy[department] = {}
        }
        
        // Ensure department-year combination exists
        if (!hierarchy[department][year]) {
          hierarchy[department][year] = {
            classAdvisor: null,
            staff: [],
            students: [],
            studentCount: 0
          }
        }
        
        // Set class advisor
        hierarchy[department][year].classAdvisor = {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          designation: staff.designation
        }
      }
      
      // Add staff to assigned years
      if (staff.assignedYears) {
        for (const deptYear of staff.assignedYears) {
          const [department, year] = deptYear.split(':')
          
          // Ensure department exists
          if (!hierarchy[department]) {
            hierarchy[department] = {}
          }
          
          // Ensure department-year combination exists
          if (!hierarchy[department][year]) {
            hierarchy[department][year] = {
              classAdvisor: null,
              staff: [],
              students: [],
              studentCount: 0
            }
          }
          
          hierarchy[department][year].staff.push({
            id: staff.id,
            name: staff.name,
            email: staff.email,
            designation: staff.designation,
            isClassAdvisor: staff.isClassAdvisor && 
              staff.advisorFor?.department === department && 
              staff.advisorFor?.year === year
          })
        }
      }
    }
    
    console.log('Hierarchy structure generated:', JSON.stringify(hierarchy, null, 2))
    return res.json({ hierarchy })
    
  } catch (error) {
    console.error('Get hierarchy error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Check access permissions for QR scanning
app.post('/attendance/check-access', async (req, res) => {
  try {
    const { studentId, sessionDepartment, sessionYear } = req.body
    
    if (!studentId || !sessionDepartment || !sessionYear) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }
    
    // Get student details
    const student = await dbGetStudentByRegNo(studentId)
    if (!student) {
      return res.status(404).json({ error: 'student_not_found' })
    }
    
    // Check if student belongs to the same department and year
    const studentDept = student.department || 'M.Tech'
    const studentYear = student.year || '4th Year'
    
    const hasAccess = studentDept === sessionDepartment && studentYear === sessionYear
    
    return res.json({ 
      hasAccess,
      studentDepartment: studentDept,
      studentYear: studentYear,
      sessionDepartment,
      sessionYear,
      message: hasAccess ? 'Access granted' : 'Access denied - wrong department or year'
    })
    
  } catch (error) {
    console.error('Check access error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// System Settings APIs

// Get system settings
app.get('/admin/settings', async (req, res) => {
  try {
    const settings = await getSystemSettings()
    return res.json({ settings })
  } catch (error) {
    console.error('Get settings error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Update system settings
app.put('/admin/settings', async (req, res) => {
  try {
    const updates = req.body
    await updateSystemSettings(updates)
    const settings = await getSystemSettings()
    return res.json({ success: true, settings, message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Update settings error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Department Navigation APIs

// Test endpoint
app.get('/admin/departments/test', (req, res) => {
  res.json({ message: 'Department API is working' })
})

// Test endpoint for years
app.get('/admin/years/test', (req, res) => {
  res.json({ message: 'Years API is working' })
})

// Create a new empty year in a department
app.post('/admin/years/create', async (req, res) => {
  console.log('=== YEAR CREATION START ===')
  console.log('Year creation request received:', req.body)
  console.log('Request headers:', req.headers['content-type'])
  
  try {
    const { department, year } = req.body
    
    if (!department || !department.trim()) {
      console.log('Missing department name')
      return res.status(400).json({ error: 'Department name is required' })
    }
    
    if (!year || !year.trim()) {
      console.log('Missing year name')
      return res.status(400).json({ error: 'Year is required' })
    }
    
    console.log(`Creating year: ${year} in department: ${department}`)
    
    // Check if year already exists in this department
    const allStudents = await listAllStudents()
    const existingYearInDept = allStudents.some(student => 
      student.department === department && student.year === year
    )
    
    if (existingYearInDept) {
      console.log('Year already exists in department:', year, department)
      return res.status(400).json({ error: `Year "${year}" already exists in department "${department}"` })
    }
    
    // Create a year placeholder using student creation method
    const placeholderRegNo = `year_${department.toLowerCase().replace(/\s+/g, '')}_${year.toLowerCase().replace(/\s+/g, '')}_placeholder`
    console.log('Creating placeholder with regNo:', placeholderRegNo)
    
    // Check if placeholder already exists
    const existing = await dbGetStudentByRegNo(placeholderRegNo)
    if (existing) {
      console.log('Year placeholder already exists')
      return res.status(400).json({ error: `Year "${year}" already exists in department "${department}"` })
    }
    
    // Create year placeholder
    console.log('Creating student placeholder for year...')
    try {
      const student = await dbCreateStudent({
        regNo: placeholderRegNo,
        studentId: placeholderRegNo,
        name: `[Year: ${year} - ${department}]`,
        password: 'system_placeholder',
        email: `year.${department.toLowerCase().replace(/\s+/g, '')}.${year.toLowerCase().replace(/\s+/g, '')}.placeholder@system.internal`,
        department: department,
        year: year,
        status: 'placeholder',
        isPlaceholder: true,
        isYearPlaceholder: true,
        createdAt: new Date().toISOString()
      })
      
      console.log('Year placeholder created:', student)
    } catch (studentError) {
      console.error('Student creation error:', studentError)
      return res.status(500).json({ error: 'Failed to create year placeholder: ' + studentError.message })
    }
    
    console.log('Year created successfully:', year, 'in', department)
    
    const response = { 
      success: true, 
      message: `Year "${year}" created successfully in department "${department}"`,
      year: {
        name: year,
        department: department,
        students: { total: 0 }
      }
    }
    
    console.log('Sending response:', response)
    console.log('=== YEAR CREATION END ===')
    
    // Broadcast year creation to all admin panels
    broadcastAdminUpdate('year-created', {
      department: department,
      year: year
    })
    
    return res.json(response)
    
  } catch (error) {
    console.error('Create year error:', error)
    console.error('Error stack:', error.stack)
    return res.status(500).json({ error: 'Internal server error: ' + error.message })
  }
})

// Create a new empty department
app.post('/admin/departments/create', async (req, res) => {
  console.log('Department creation request received:', req.body)
  
  try {
    const { name } = req.body
    
    if (!name || !name.trim()) {
      console.log('Missing department name')
      return res.status(400).json({ error: 'Department name is required' })
    }
    
    console.log('Creating department:', name.trim())
    
    // Check if department already exists
    console.log('Checking existing departments...')
    const allStudents = await listAllStudents()
    const allStaff = await listStaff()
    const existingDepts = new Set()
    
    allStudents.forEach(student => {
      if (student.department) existingDepts.add(student.department.toLowerCase())
    })
    allStaff.forEach(staff => {
      if (staff.department) existingDepts.add(staff.department.toLowerCase())
    })
    
    console.log('Existing departments:', Array.from(existingDepts))
    
    if (existingDepts.has(name.trim().toLowerCase())) {
      console.log('Department already exists:', name.trim())
      return res.status(400).json({ error: 'Department already exists' })
    }
    
    // Create a simple department placeholder using the staff creation method
    const placeholderEmail = `dept.${name.toLowerCase().replace(/\s+/g, '')}.placeholder@system.internal`
    console.log('Creating placeholder with email:', placeholderEmail)
    
    // Check if placeholder email already exists
    const existing = await getStaffByEmail(placeholderEmail)
    if (existing) {
      console.log('Placeholder already exists')
      return res.status(400).json({ error: 'Department already exists' })
    }
    
    // Create department placeholder
    console.log('Creating staff placeholder...')
    try {
      const staff = await createStaff({
        id: placeholderEmail,
        name: `[Department: ${name.trim()}]`,
        email: placeholderEmail,
        password: 'system_placeholder',
        department: name.trim(),
        designation: 'Department Placeholder',
        contact: '',
        status: 'Active',
        isPlaceholder: true,
        isDepartmentPlaceholder: true,
        joiningDate: Date.now()
      })
      
      console.log('Staff placeholder created:', staff)
    } catch (staffError) {
      console.error('Staff creation error:', staffError)
      return res.status(500).json({ error: 'Failed to create department placeholder: ' + staffError.message })
    }
    
    console.log('Department created successfully:', name.trim())
    
    // Broadcast department creation to all admin panels
    broadcastAdminUpdate('department-created', {
      name: name.trim()
    })
    
    return res.json({ 
      success: true, 
      message: `Department "${name.trim()}" created successfully`,
      department: {
        name: name.trim(),
        staff: { total: 0 },
        students: { total: 0, byYear: {} }
      }
    })
    
  } catch (error) {
    console.error('Create department error:', error)
    console.error('Error stack:', error.stack)
    return res.status(500).json({ error: 'Internal server error: ' + error.message })
  }
})

app.get('/admin/departments/summary', async (req, res) => {
  try {
    const staffEmail = req.headers['x-staff-email'] || req.query.staffEmail
    let allowedDepartment = null
    
    // Check if this is a staff request (not admin) - original simple logic
    if (staffEmail) {
      const staff = await getStaffByEmail(staffEmail)
      if (staff && staff.role !== 'admin') {
        allowedDepartment = staff.department
        console.log(`Staff ${staffEmail} requesting departments, restricted to: ${allowedDepartment}`)
      }
    }
    
    const allStudents = await listAllStudents()
    const allStaff = await listStaff()
    
    // Group by department and year
    const departments = {}
    
    // Process students
    for (const student of allStudents) {
      const dept = student.department || 'M.Tech'
      const year = student.year || '4th Year'
      
      if (!departments[dept]) {
        departments[dept] = {
          name: dept,
          students: { total: 0, byYear: {} },
          staff: { total: 0 }
        }
      }
      
      if (!departments[dept].students.byYear[year]) {
        departments[dept].students.byYear[year] = 0
      }
      
      // Don't count year placeholders in the total
      if (!student.isYearPlaceholder) {
        departments[dept].students.total++
        departments[dept].students.byYear[year]++
      }
    }
    
    // Process staff
    for (const staff of allStaff) {
      if (!staff.department) continue
      
      const dept = staff.department
      if (!departments[dept]) {
        departments[dept] = {
          name: dept,
          staff: { total: 0 },
          students: { total: 0, byYear: {} }
        }
      }
      
      // Don't count placeholder staff in the total
      if (!staff.isDepartmentPlaceholder) {
        departments[dept].staff.total++
      }
    }
    
    // Filter departments if staff access control is active (original simple logic)
    let departmentList = Object.values(departments).map(dept => ({
      name: dept.name,
      totalStudents: dept.students.total,
      totalStaff: dept.staff.total,
      years: Object.keys(dept.students.byYear),
      yearData: dept.students.byYear,
      students: dept.students,
      staff: dept.staff
    }))
    
    if (allowedDepartment) {
      departmentList = departmentList.filter(dept => dept.name === allowedDepartment)
      console.log(`Filtered to ${departmentList.length} departments for staff access`)
    }
    
    return res.json({ departments: departmentList })
  } catch (error) {
    console.error('Department summary error:', error)
    console.error('Error stack:', error.stack)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Get students by department and year (Admin)
app.get('/admin/students/by-department', async (req, res) => {
  try {
    const { department, year } = req.query
    const allStudents = await listAllStudents()
    
    let filtered = allStudents
    
    // Filter out year placeholders from student lists
    filtered = filtered.filter(s => !s.isYearPlaceholder)
    
    if (department && department !== 'All') {
      filtered = filtered.filter(s => (s.department || 'M.Tech') === department)
    }
    if (year && year !== 'All') {
      filtered = filtered.filter(s => (s.year || '4th Year') === year)
    }
    
    // Sort by student ID in ascending order
    filtered.sort((a, b) => {
      const idA = a.studentId || a.regNo
      const idB = b.studentId || b.regNo
      return idA.localeCompare(idB, undefined, { numeric: true })
    })
    
    return res.json({ 
      students: filtered.map(s => ({
        ...s,
        department: s.department || 'M.Tech',
        year: s.year || '4th Year'
      })),
      count: filtered.length 
    })
  } catch (error) {
    console.error('Get students by department error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Get students by department and year (Staff - STRICT department access control)
app.get('/staff/students/by-department', async (req, res) => {
  try {
    const { department, year } = req.query
    const staffEmail = req.headers['x-staff-email'] || req.query.staffEmail
    
    if (!staffEmail) {
      return res.status(401).json({ error: 'staff_email_required', message: 'Staff authentication required' })
    }
    
    // Get staff info to determine access permissions
    const staff = await getStaffByEmail(staffEmail)
    if (!staff) {
      return res.status(404).json({ error: 'staff_not_found', message: 'Staff member not found' })
    }
    
    console.log(`Staff ${staffEmail} access check:`, { 
      staffDepartment: staff.department, 
      isClassAdvisor: staff.isClassAdvisor,
      advisorFor: staff.advisorFor 
    })
    
    // STRICT DEPARTMENT ACCESS CONTROL
    // Staff can ONLY see students from their own department
    let allowedDepartments = []
    
    // If staff is a class advisor, they can see students from their advisor department
    if (staff.isClassAdvisor && staff.advisorFor) {
      allowedDepartments.push(staff.advisorFor.department)
    }
    
    // Staff can also see students from their own department (if different from advisor)
    if (staff.department && !allowedDepartments.includes(staff.department)) {
      allowedDepartments.push(staff.department)
    }
    
    // If no allowed departments, deny access
    if (allowedDepartments.length === 0) {
      return res.status(403).json({ 
        error: 'no_department_access', 
        message: 'Staff member has no department assignments' 
      })
    }
    
    console.log(`Staff ${staffEmail} allowed departments:`, allowedDepartments)
    
    // If a specific department is requested, verify access
    if (department && department !== 'All') {
      if (!allowedDepartments.includes(department)) {
        console.log(`Access denied: Staff cannot access ${department}. Allowed: ${allowedDepartments.join(', ')}`)
        return res.status(403).json({ 
          error: 'department_access_denied', 
          message: `Access denied. You can only access students from: ${allowedDepartments.join(', ')}`,
          allowedDepartments
        })
      }
    }
    
    // STRICT YEAR ACCESS CONTROL for Class Advisors
    console.log(`Year access check: isClassAdvisor=${staff.isClassAdvisor}, advisorFor=${JSON.stringify(staff.advisorFor)}, requestedYear="${year}"`)
    if (staff.isClassAdvisor && staff.advisorFor && year && year !== 'All') {
      console.log(`Comparing advisor year "${staff.advisorFor.year}" with requested year "${year}"`)
      if (staff.advisorFor.year !== year) {
        console.log(`Year access denied: Staff ${staffEmail} (advisor for ${staff.advisorFor.year}) cannot access ${year}`)
        return res.status(403).json({ 
          error: 'year_access_denied', 
          message: `Access denied. You can only access students from ${staff.advisorFor.year}. Requested: ${year}`,
          allowedYear: staff.advisorFor.year
        })
      }
      console.log(`Year access granted: Staff can access ${year}`)
    }
    
    const allStudents = await listAllStudents()
    let filtered = allStudents
    
    // Filter out placeholders
    filtered = filtered.filter(s => !s.isYearPlaceholder && !s.isDepartmentPlaceholder && !s.isPlaceholder)
    
    // ENFORCE STRICT DEPARTMENT FILTERING
    // Only show students from allowed departments
    filtered = filtered.filter(s => {
      const studentDept = s.department || 'Unknown'
      return allowedDepartments.includes(studentDept)
    })
    
    // Apply additional filters if requested
    if (department && department !== 'All') {
      filtered = filtered.filter(s => (s.department || 'Unknown') === department)
    }
    if (year && year !== 'All') {
      filtered = filtered.filter(s => (s.year || 'Unknown') === year)
    }
    
    // Sort by student ID in ascending order
    filtered.sort((a, b) => {
      const idA = a.studentId || a.regNo
      const idB = b.studentId || b.regNo
      return idA.localeCompare(idB, undefined, { numeric: true })
    })
    
    console.log(`Staff ${staffEmail}: Found ${filtered.length} students (filtered by departments: ${allowedDepartments.join(', ')})`)
    
    return res.json({ 
      students: filtered.map(s => ({
        ...s,
        department: s.department || 'Unknown',
        year: s.year || 'Unknown'
      })),
      count: filtered.length,
      allowedDepartments,
      staffInfo: {
        email: staff.email,
        name: staff.name,
        department: staff.department,
        isClassAdvisor: staff.isClassAdvisor,
        advisorFor: staff.advisorFor
      }
    })
  } catch (error) {
    console.error('Get students by department error (staff):', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Get staff by department
app.get('/admin/staff/by-department', async (req, res) => {
  try {
    const { department } = req.query
    const allStaff = await listStaff()
    
    let filtered = allStaff
    if (department && department !== 'All') {
      filtered = filtered.filter(s => (s.department || 'Computer Science') === department)
    }
    
    return res.json({ 
      staff: filtered,
      count: filtered.length 
    })
  } catch (error) {
    console.error('Get staff by department error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Attendance Reports API
app.get('/admin/attendance/reports', async (req, res) => {
  try {
    const { startDate, endDate, courseId } = req.query
    const allAttendance = await getAllAttendanceRecords()
    const allSessions = await getAllSessions()
    const enrollments = await dbGetEnrollmentRecords('21CS701')
    
    let filteredSessions = allSessions
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate).getTime()
      const end = new Date(endDate).getTime()
      filteredSessions = allSessions.filter(s => {
        if (!s.startTime) return false
        const sessionTime = new Date(s.startTime).getTime()
        return sessionTime >= start && sessionTime <= end
      })
    }
    
    // Filter by course if provided
    if (courseId && courseId !== 'all') {
      filteredSessions = filteredSessions.filter(s => s.courseId === courseId)
    }
    
    const sessionIds = new Set(filteredSessions.map(s => s.id))
    const filteredAttendance = allAttendance.filter(a => sessionIds.has(a.sessionId))
    
    // Generate report data
    const reportData = []
    for (const session of filteredSessions) {
      const sessionAttendance = filteredAttendance.filter(a => a.sessionId === session.id)
      const presentCount = sessionAttendance.length
      const totalStudents = enrollments.length
      const absentCount = totalStudents - presentCount
      const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
      
      reportData.push({
        sessionId: session.id,
        courseId: session.courseId || 'Unknown',
        date: new Date(session.startTime).toLocaleDateString(),
        time: new Date(session.startTime).toLocaleTimeString(),
        present: presentCount,
        absent: absentCount,
        total: totalStudents,
        percentage
      })
    }
    
    return res.json({ 
      reports: reportData,
      summary: {
        totalSessions: filteredSessions.length,
        totalAttendanceRecords: filteredAttendance.length,
        averageAttendance: reportData.length > 0 
          ? Math.round(reportData.reduce((sum, r) => sum + r.percentage, 0) / reportData.length)
          : 0
      }
    })
  } catch (error) {
    console.error('Attendance reports error:', error)
    return res.status(500).json({ error: 'internal_error' })
  }
})

// Helper function to calculate duration
function calculateDuration(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end - start)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end days
  
  if (diffDays === 1) return '1 day'
  return `${diffDays} days`
}

// Face Recognition Integration Endpoints
const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:5001'

// Start face recognition session
app.post('/face-recognition/session/start', async (req, res) => {
  try {
    const { sessionId, courseId, department, year } = req.body
    
    if (!sessionId || !courseId || !department || !year) {
      return res.status(400).json({ 
        error: 'missing_fields', 
        message: 'sessionId, courseId, department, and year are required' 
      })
    }
    
    // Check if session exists
    const session = sessions.get(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'session_not_found' })
    }
    
    // Call face recognition service to start session
    const response = await fetch(`${FACE_SERVICE_URL}/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, courseId, department, year })
    })
    
    if (!response.ok) {
      const error = await response.json()
      return res.status(response.status).json(error)
    }
    
    const result = await response.json()
    
    // Broadcast to admin panel that face recognition is active
    broadcastAdminUpdate('face_recognition_started', {
      sessionId,
      courseId,
      department,
      year,
      timestamp: Date.now()
    })
    
    return res.json({
      success: true,
      message: 'Face recognition session started',
      sessionId,
      faceServiceStatus: result
    })
    
  } catch (error) {
    console.error('Face recognition session start error:', error)
    return res.status(500).json({ 
      error: 'internal_error',
      message: 'Failed to start face recognition session'
    })
  }
})

// Handle face recognition attendance
app.post('/attendance/face-recognition', async (req, res) => {
  try {
    const { sessionId, studentId, confidence, source, department, year, timestamp } = req.body
    
    if (!sessionId || !studentId) {
      return res.status(400).json({ error: 'missing_required_fields' })
    }
    
    // Verify session exists and is active
    const session = sessions.get(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'session_not_found' })
    }
    
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'session_not_active' })
    }
    
    // Check if student is enrolled
    const enrolled = await dbIsEnrolled(session.courseId, studentId)
    if (!enrolled) {
      return res.status(403).json({ error: 'student_not_enrolled' })
    }
    
    // Check hierarchical access (same as QR scan)
    const student = await dbGetStudentByRegNo(studentId)
    if (student) {
      const studentDept = student.department || 'Computer Science'
      const studentYear = student.year || '4th Year'
      
      if (studentDept !== department || studentYear !== year) {
        console.log(`Face recognition access denied: Student ${studentId} (${studentDept} ${studentYear}) tried to access ${department} ${year} session`)
        return res.status(403).json({ 
          error: 'access_denied',
          message: `Access denied. This session is for ${department} ${year} students only.`,
          studentDepartment: studentDept,
          studentYear: studentYear,
          sessionDepartment: department,
          sessionYear: year
        })
      }
    }
    
    // Check if already marked present
    if (session.present.has(studentId)) {
      return res.status(409).json({ 
        error: 'already_present',
        message: 'Student already marked present in this session'
      })
    }
    
    // Mark present
    session.present.add(studentId)
    
    // Save to database
    try {
      await dbMarkPresent(sessionId, studentId)
    } catch (dbError) {
      console.error('Database error marking present:', dbError)
    }
    
    const markedAt = new Date().toISOString()
    
    // Broadcast attendance update
    io.to(`session:${sessionId}`).emit('face_recognition_attendance', {
      sessionId,
      studentId,
      confidence,
      markedAt,
      countPresent: session.present.size,
      countRemaining: Math.max(0, session.enrolled.size - session.present.size)
    })
    
    // Broadcast to admin panel
    broadcastAdminUpdate('face_attendance_marked', {
      sessionId,
      studentId,
      confidence,
      source: 'face_recognition',
      markedAt,
      timestamp: Date.now()
    })
    
    console.log(`Face recognition attendance: Student ${studentId} marked present in session ${sessionId} (confidence: ${confidence})`)
    
    return res.json({
      success: true,
      status: 'present',
      sessionId,
      studentId,
      markedAt,
      confidence,
      source: 'face_recognition',
      message: 'Attendance marked successfully via face recognition'
    })
    
  } catch (error) {
    console.error('Face recognition attendance error:', error)
    return res.status(500).json({ 
      error: 'internal_error',
      message: 'Failed to mark attendance via face recognition'
    })
  }
})

// Get face recognition service status
app.get('/face-recognition/status', async (req, res) => {
  try {
    const response = await fetch(`${FACE_SERVICE_URL}/health`)
    
    if (!response.ok) {
      return res.status(503).json({ 
        error: 'service_unavailable',
        message: 'Face recognition service is not available'
      })
    }
    
    const serviceStatus = await response.json()
    
    return res.json({
      success: true,
      service_available: true,
      service_status: serviceStatus,
      service_url: FACE_SERVICE_URL
    })
    
  } catch (error) {
    console.error('Face recognition service status error:', error)
    return res.status(503).json({ 
      error: 'service_unavailable',
      message: 'Cannot connect to face recognition service',
      service_url: FACE_SERVICE_URL
    })
  }
})

// Proxy face recognition enrollment requests
app.post('/face-recognition/enroll', async (req, res) => {
  try {
    const response = await fetch(`${FACE_SERVICE_URL}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return res.status(response.status).json(result)
    }
    
    // Broadcast enrollment update to admin
    broadcastAdminUpdate('face_recognition_enrollment', {
      studentId: req.body.student_id,
      name: req.body.name,
      imagesProcessed: result.images_processed,
      timestamp: Date.now()
    })
    
    return res.json(result)
    
  } catch (error) {
    console.error('Face recognition enrollment proxy error:', error)
    return res.status(500).json({ 
      error: 'internal_error',
      message: 'Failed to process face recognition enrollment'
    })
  }
})

// Get enrolled students for face recognition
app.get('/face-recognition/students', async (req, res) => {
  try {
    const response = await fetch(`${FACE_SERVICE_URL}/students`)
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'service_error',
        message: 'Failed to get enrolled students from face recognition service'
      })
    }
    
    const result = await response.json()
    return res.json(result)
    
  } catch (error) {
    console.error('Face recognition students proxy error:', error)
    return res.status(500).json({ 
      error: 'internal_error',
      message: 'Failed to get face recognition students'
    })
  }
})


// Serve frontend build (same-origin) if available
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../dist')

// Only serve static files if dist folder exists (production mode)
import fs from 'fs'
if (fs.existsSync(distPath)) {
  console.log('Serving static files from dist folder (production mode)')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
} else {
  console.log('Dist folder not found - running in development mode')
  // In development, just serve API endpoints
  app.get('*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' })
  })
}

const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'
server.listen(PORT, HOST, () => console.log(`Attendance server (API + SPA) on http://${HOST}:${PORT}`))


