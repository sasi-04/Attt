
import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
let sessionsDb, tokensDb, codesDb, presentsDb, enrollmentsDb, staffDb, studentsDb

export function initDb(){
  if (sessionsDb) return
  sessionsDb = Datastore.create({ filename: path.resolve(__dirname, 'data/sessions.db'), autoload: true })
  tokensDb   = Datastore.create({ filename: path.resolve(__dirname, 'data/tokens.db'), autoload: true })
  codesDb    = Datastore.create({ filename: path.resolve(__dirname, 'data/codes.db'), autoload: true })
  presentsDb = Datastore.create({ filename: path.resolve(__dirname, 'data/presents.db'), autoload: true })
  enrollmentsDb = Datastore.create({ filename: path.resolve(__dirname, 'data/enrollments.db'), autoload: true })
  staffDb       = Datastore.create({ filename: path.resolve(__dirname, 'data/staff.db'), autoload: true })
  studentsDb    = Datastore.create({ filename: path.resolve(__dirname, 'data/students.db'), autoload: true })
}

export function createSession(session){
  return sessionsDb.update({ id: session.id }, { $set: session }, { upsert: true })
}

export function setCurrentToken(sessionId, jti, tokenExpiresAt){
  return sessionsDb.update({ id: sessionId }, { $set: { currentTokenJti: jti, tokenExpiresAt } })
}

export function clearCurrentToken(sessionId){
  return sessionsDb.update({ id: sessionId }, { $set: { currentTokenJti: null, tokenExpiresAt: null } })
}

export function saveToken(record){
  return tokensDb.update({ jti: record.jti }, { $set: record }, { upsert: true })
}

export function deactivateToken(jti){
  return tokensDb.update({ jti }, { $set: { active: 0 } })
}

export async function getToken(jti){
  return tokensDb.findOne({ jti })
}

export function saveShortCode(code, jti){
  return codesDb.update({ code }, { $set: { code, jti } }, { upsert: true })
}

export function deleteShortCode(code){
  return codesDb.remove({ code }, { multi: false })
}

export async function getJtiByCode(code){
  const row = await codesDb.findOne({ code })
  return row?.jti
}

export function markPresent(sessionId, studentId){
  return presentsDb.update(
    { sessionId, studentId }, 
    { $set: { sessionId, studentId, timestamp: Date.now() } }, 
    { upsert: true }
  )
}

export async function getPresentCount(sessionId){
  return presentsDb.count({ sessionId })
}

// Enrollment management
export function enrollStudent(courseId, studentId, name, regNo){
  const doc = { courseId, studentId }
  if (typeof name === 'string' && name.trim()) doc.name = name.trim()
  if (typeof regNo === 'string' && regNo.trim()) doc.regNo = regNo.trim()
  return enrollmentsDb.update({ courseId, studentId }, { $set: doc }, { upsert: true })
}

export function unenrollStudent(courseId, studentId){
  return enrollmentsDb.remove({ courseId, studentId }, { multi: false })
}

export async function getEnrollments(courseId){
  const rows = await enrollmentsDb.find({ courseId })
  return rows.map(r => r.studentId)
}

export async function isEnrolled(courseId, studentId){
  const row = await enrollmentsDb.findOne({ courseId, studentId })
  return !!row
}

export async function getEnrollmentRecords(courseId){
  const rows = await enrollmentsDb.find({ courseId })
  return rows.map(r => ({ studentId: r.studentId, name: r.name, regNo: r.regNo }))
}

export function setEnrollmentName(courseId, studentId, name){
  return enrollmentsDb.update({ courseId, studentId }, { $set: { name } }, { upsert: false })
}

export async function clearEnrollments(courseId){
  return enrollmentsDb.remove({ courseId }, { multi: true })
}

// Staff management
export async function createStaff({ id, name, email, password }){
  const doc = { id, name, email: email?.toLowerCase(), password }
  await staffDb.update({ id }, { $set: doc }, { upsert: true })
  return doc
}

export async function listStaff(){
  return staffDb.find({})
}

export async function getStaffByEmail(email){
  return staffDb.findOne({ email: String(email).toLowerCase() })
}

// Additional staff management functions
export async function getStaffById(id){
  return staffDb.findOne({ id })
}

export async function updateStaff(id, updates){
  return staffDb.update({ id }, { $set: updates })
}

export async function deleteStaff(id){
  return staffDb.remove({ id }, { multi: false })
}

export async function getStaffCount(){
  return staffDb.count({})
}

// Students auth store
export async function createStudent({ regNo, studentId, name, password }){
  const doc = { regNo: String(regNo), studentId, name, password }
  await studentsDb.update({ regNo: doc.regNo }, { $set: doc }, { upsert: true })
  return doc
}

export async function getStudentByRegNo(regNo){
  return studentsDb.findOne({ regNo: String(regNo) })
}

export async function updateStudentPassword(regNo, newPassword){
  return studentsDb.update({ regNo: String(regNo) }, { $set: { password: newPassword } })
}

export async function listAllStudents(){
  return studentsDb.find({})
}

export async function updateStudent(regNo, updates){
  return studentsDb.update({ regNo: String(regNo) }, { $set: updates })
}

// Additional student management functions
export async function deleteStudent(regNo){
  return studentsDb.remove({ regNo: String(regNo) }, { multi: false })
}

export async function getStudentCount(){
  return studentsDb.count({})
}

// Get attendance records for a specific student
export async function getStudentAttendance(studentId){
  return presentsDb.find({ studentId })
}

// Get all attendance records
export async function getAllAttendanceRecords(){
  return presentsDb.find({})
}

// Get session by ID
export async function getSessionById(sessionId){
  return sessionsDb.findOne({ id: sessionId })
}

// Get all sessions
export async function getAllSessions(){
  return sessionsDb.find({})
}

// Leave management
let leavesDb
export function initLeavesDb() {
  if (!leavesDb) {
    leavesDb = Datastore.create({ filename: path.resolve(__dirname, 'data/leaves.db'), autoload: true })
  }
  return leavesDb
}

export async function createLeaveRequest({ studentId, studentName, regNo, startDate, endDate, reason, type }) {
  initLeavesDb()
  const leave = {
    studentId,
    studentName,
    regNo,
    startDate,
    endDate,
    reason,
    type: type || 'sick',
    status: 'pending',
    submittedAt: Date.now(),
    updatedAt: Date.now()
  }
  return leavesDb.insert(leave)
}

export async function getAllLeaveRequests() {
  initLeavesDb()
  return leavesDb.find({}).sort({ submittedAt: -1 })
}

export async function getLeaveRequestsByStudent(studentId) {
  initLeavesDb()
  return leavesDb.find({ studentId }).sort({ submittedAt: -1 })
}

export async function getLeaveRequestsByStatus(status) {
  initLeavesDb()
  return leavesDb.find({ status }).sort({ submittedAt: -1 })
}

export async function updateLeaveStatus(leaveId, status, reviewedBy) {
  initLeavesDb()
  return leavesDb.update(
    { _id: leaveId },
    { $set: { status, reviewedBy, reviewedAt: Date.now(), updatedAt: Date.now() } }
  )
}

export async function deleteLeaveRequest(leaveId) {
  initLeavesDb()
  return leavesDb.remove({ _id: leaveId })
}

// System settings management
let settingsDb
export function initSettingsDb() {
  if (!settingsDb) {
    settingsDb = Datastore.create({ filename: path.resolve(__dirname, 'data/settings.db'), autoload: true })
  }
  return settingsDb
}

export async function getSystemSettings() {
  initSettingsDb()
  const settings = await settingsDb.findOne({ type: 'system' })
  if (!settings) {
    // Return default settings
    return {
      type: 'system',
      institutionName: 'Demo College',
      academicYear: '2024-2025',
      semesterStart: '2024-08-01',
      semesterEnd: '2024-12-31',
      departments: ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering'],
      minimumAttendance: 75,
      notificationsEnabled: true,
      emailNotifications: false
    }
  }
  return settings
}

export async function updateSystemSettings(updates) {
  initSettingsDb()
  return settingsDb.update(
    { type: 'system' },
    { $set: { ...updates, type: 'system', updatedAt: Date.now() } },
    { upsert: true }
  )
}
