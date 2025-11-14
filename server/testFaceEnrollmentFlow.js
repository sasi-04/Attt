import { initDb, listAllStudents } from './db.js'

const FACE_SERVICE_URL = 'http://localhost:5001'
const BACKEND_URL = 'http://localhost:3001'

// Helper to make fetch requests
async function fetchAPI(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    const text = await response.text()
    let data = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch (e) {
      data = { raw: text }
    }
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, error: error.message }
  }
}

// Create a sample base64 image (simple 1x1 pixel image)
function createSampleImage() {
  // This is a minimal valid JPEG image (1x1 pixel, white)
  const base64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=='
  return base64Image
}

async function testFaceEnrollmentFlow() {
  console.log('=== TESTING FACE ENROLLMENT AND RECOGNITION FLOW ===\n')
  
  initDb()
  
  // Get a test student
  const allStudents = await listAllStudents()
  const testStudent = allStudents.find(s => 
    s.name?.toLowerCase().includes('kamalesh') || 
    s.regNo === '730422553080' ||
    s.regNo === 'ES22CJ80'
  )
  
  if (!testStudent) {
    console.log('❌ Test student not found')
    return
  }
  
  const studentId = testStudent.regNo || testStudent.studentId
  console.log(`✅ Test Student: ${testStudent.name} (${studentId})`)
  console.log(`   Department: ${testStudent.department}, Year: ${testStudent.year}\n`)
  
  // Step 1: Check current enrollment status
  console.log('📋 Step 1: Checking current enrollment status...')
  const enrolledCheck = await fetchAPI(`${FACE_SERVICE_URL}/students`)
  let enrolledStudentId = studentId
  if (enrolledCheck.ok) {
    const enrolledStudent = enrolledCheck.data.students?.find(s => 
      (s.student_id === studentId || s.roll_no === studentId) ||
      (s.student_id === testStudent.studentId || s.roll_no === testStudent.studentId) ||
      (s.name?.toLowerCase() === testStudent.name?.toLowerCase())
    )
    const isEnrolled = !!enrolledStudent
    console.log(`   Currently enrolled: ${isEnrolled ? 'YES' : 'NO'}`)
    if (isEnrolled) {
      enrolledStudentId = enrolledStudent.student_id || enrolledStudent.roll_no || studentId
      console.log(`   Enrolled with ID: ${enrolledStudentId}`)
      console.log(`   ⚠️  Student is already enrolled. Will test recognition first, then delete.\n`)
    }
  }
  
  // Step 2: Test recognition (before enrollment if not enrolled, or with existing enrollment)
  console.log('🔍 Step 2: Testing face recognition...')
  console.log('   Note: This will fail if student is not enrolled or face doesn\'t match\n')
  
  // Create a sample image (in real scenario, this would be from camera)
  const sampleImage = createSampleImage()
  
  const recognizeResponse = await fetchAPI(`${BACKEND_URL}/face-recognition/recognize`, {
    method: 'POST',
    body: JSON.stringify({
      image: sampleImage,
      expected_student_id: studentId,
      session_id: 'TEST_SESSION',
      department: testStudent.department || 'M.Tech',
      year: testStudent.year || '2nd Year'
    })
  })
  
  console.log(`   Recognition Status: ${recognizeResponse.status}`)
  if (recognizeResponse.ok) {
    console.log(`   ✅ Recognition Response:`, recognizeResponse.data)
  } else {
    console.log(`   ⚠️  Recognition Response:`, recognizeResponse.data)
    console.log(`   (This is expected if student is not enrolled or face doesn't match)\n`)
  }
  
  // Step 3: Enroll the student (if not already enrolled)
  console.log('📸 Step 3: Enrolling student face...')
  
  // Create 5 sample images (simulating the enrollment process)
  const enrollmentImages = Array(5).fill(sampleImage)
  
  const enrollResponse = await fetchAPI(`${BACKEND_URL}/face-recognition/enroll`, {
    method: 'POST',
    body: JSON.stringify({
      student_id: studentId,
      roll_no: studentId,
      name: testStudent.name,
      department: testStudent.department || 'M.Tech',
      email: testStudent.email || testStudent.contact || 'test@demo.com',
      images: enrollmentImages
    })
  })
  
  if (enrollResponse.ok) {
    console.log(`   ✅ Enrollment successful!`)
    console.log(`   Images processed: ${enrollResponse.data.images_processed || enrollResponse.data.faces_detected || 0}`)
    console.log(`   Faces detected: ${enrollResponse.data.faces_detected || 0}\n`)
  } else {
    console.log(`   ⚠️  Enrollment response:`, enrollResponse.data)
    console.log(`   Status: ${enrollResponse.status}\n`)
    
    // If enrollment failed, we can't continue with recognition test
    if (enrollResponse.status === 400 && enrollResponse.data.error === 'no_faces_detected') {
      console.log('   ℹ️  Note: Enrollment failed because sample image has no face.')
      console.log('   This is expected with a minimal test image. In real usage, camera images would work.\n')
    }
  }
  
  // Step 4: Wait a moment for processing
  console.log('⏳ Step 4: Waiting for face recognizer to train...')
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Step 5: Test recognition again (after enrollment)
  console.log('🔍 Step 5: Testing face recognition after enrollment...')
  
  const recognizeResponse2 = await fetchAPI(`${BACKEND_URL}/face-recognition/recognize`, {
    method: 'POST',
    body: JSON.stringify({
      image: sampleImage,
      expected_student_id: studentId,
      session_id: 'TEST_SESSION_2',
      department: testStudent.department || 'M.Tech',
      year: testStudent.year || '2nd Year'
    })
  })
  
  console.log(`   Recognition Status: ${recognizeResponse2.status}`)
  if (recognizeResponse2.ok) {
    console.log(`   ✅ Recognition Response:`, recognizeResponse2.data)
  } else {
    console.log(`   ⚠️  Recognition Response:`, recognizeResponse2.data)
    console.log(`   (This might fail if sample image doesn't match enrolled face)\n`)
  }
  
  // Step 6: Delete the enrollment
  console.log('🗑️  Step 6: Deleting face enrollment...')
  console.log(`   Using enrolled student ID: ${enrolledStudentId}`)
  
  const deleteResponse = await fetchAPI(`${BACKEND_URL}/face-recognition/unenroll/${encodeURIComponent(enrolledStudentId)}`, {
    method: 'DELETE'
  })
  
  if (deleteResponse.ok) {
    console.log(`   ✅ Enrollment deleted successfully!\n`)
  } else {
    console.log(`   ⚠️  Delete response:`, deleteResponse.data)
    console.log(`   Status: ${deleteResponse.status}\n`)
  }
  
  // Step 7: Verify deletion
  console.log('✅ Step 7: Verifying deletion...')
  const finalCheck = await fetchAPI(`${FACE_SERVICE_URL}/students`)
  if (finalCheck.ok) {
    const stillEnrolled = finalCheck.data.students?.some(s => 
      (s.student_id === enrolledStudentId || s.roll_no === enrolledStudentId) ||
      (s.student_id === studentId || s.roll_no === studentId) ||
      (s.student_id === testStudent.studentId || s.roll_no === testStudent.studentId) ||
      (s.name?.toLowerCase() === testStudent.name?.toLowerCase())
    )
    console.log(`   Still enrolled: ${stillEnrolled ? 'YES (deletion failed)' : 'NO (deletion successful)'}\n`)
  }
  
  console.log('=== TEST COMPLETE ===')
}

testFaceEnrollmentFlow().catch(console.error)

