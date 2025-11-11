// Quick script to test if face recognition service is running
const fetch = require('node-fetch')

const FACE_SERVICE_URL = process.env.FACE_SERVICE_URL || 'http://localhost:5001'

async function checkService() {
  console.log('🔍 Checking Face Recognition Service...')
  console.log('Service URL:', FACE_SERVICE_URL)
  console.log('')
  
  try {
    console.log('Testing /health endpoint...')
    const response = await fetch(`${FACE_SERVICE_URL}/health`, {
      timeout: 5000
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Service is RUNNING!')
      console.log('Response:', data)
      console.log('')
      console.log('✅ Face enrollment should work!')
    } else {
      console.log('❌ Service responded but with error')
      console.log('Status:', response.status)
      console.log('')
      console.log('⚠️ Face enrollment will fail!')
    }
  } catch (error) {
    console.log('❌ CANNOT CONNECT to Face Recognition Service')
    console.log('Error:', error.message)
    console.log('')
    console.log('🔧 SOLUTION:')
    console.log('1. Navigate to your face recognition service folder')
    console.log('2. Run: python app.py')
    console.log('3. Make sure it starts on port 5001')
    console.log('')
    console.log('⚠️ Face enrollment WILL NOT WORK until service is running!')
  }
}

checkService()
