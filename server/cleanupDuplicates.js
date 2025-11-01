import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function cleanupStudents() {
  console.log('🔍 Starting duplicate cleanup...\n')
  
  const studentsDb = Datastore.create({ 
    filename: path.resolve(__dirname, 'data/students.db'), 
    autoload: true 
  })
  
  // Get all students
  const allStudents = await studentsDb.find({})
  console.log(`📊 Found ${allStudents.length} total records`)
  
  // Group by studentId to find duplicates
  const studentMap = new Map()
  const duplicates = []
  const toKeep = []
  
  for (const student of allStudents) {
    const studentId = student.studentId
    
    if (studentMap.has(studentId)) {
      // Duplicate found
      const existing = studentMap.get(studentId)
      
      // Keep the one with proper regNo (starts with 730422553) and real name
      if (student.regNo.startsWith('730422553') && student.name !== studentId) {
        // This is the good one, mark old one for deletion
        duplicates.push(existing._id)
        studentMap.set(studentId, student)
        console.log(`✓ Keeping: ${student.name} (${studentId}) - proper data`)
        console.log(`✗ Removing duplicate: ${existing.name} (${existing.regNo})`)
      } else {
        // Existing is better, mark this one for deletion
        duplicates.push(student._id)
        console.log(`✗ Removing duplicate: ${student.name} (${student.regNo})`)
      }
    } else {
      // First occurrence
      studentMap.set(studentId, student)
      
      // If this has proper data, keep it
      if (student.regNo.startsWith('730422553') && student.name !== studentId) {
        toKeep.push(student)
      } else if (!student.regNo.startsWith('730422553')) {
        // This might be a duplicate entry with bad data
        duplicates.push(student._id)
        console.log(`✗ Removing bad entry: ${student.name} (${student.regNo})`)
      } else {
        toKeep.push(student)
      }
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`   Valid students to keep: ${toKeep.length}`)
  console.log(`   Duplicates to remove: ${duplicates.length}`)
  
  // Remove duplicates
  if (duplicates.length > 0) {
    console.log(`\n🗑️  Removing ${duplicates.length} duplicate records...`)
    for (const id of duplicates) {
      await studentsDb.remove({ _id: id })
    }
    console.log('✅ Duplicates removed!')
  }
  
  // Verify final count
  const finalStudents = await studentsDb.find({})
  console.log(`\n✅ Final count: ${finalStudents.length} unique students`)
  
  // Sort and display
  finalStudents.sort((a, b) => {
    const numA = parseInt(a.studentId.replace('ES22CJ', ''))
    const numB = parseInt(b.studentId.replace('ES22CJ', ''))
    return numA - numB
  })
  
  console.log('\n📋 Final student list (sorted):')
  finalStudents.forEach((s, i) => {
    console.log(`${String(i + 1).padStart(2, '0')}. ${s.studentId} - ${s.name} (${s.regNo})`)
  })
  
  console.log('\n✅ Cleanup completed successfully!')
}

cleanupStudents().catch(err => {
  console.error('❌ Error during cleanup:', err)
  process.exit(1)
})
