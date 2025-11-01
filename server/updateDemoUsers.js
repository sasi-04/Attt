import Datastore from 'nedb-promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function updateDemoUsers() {
  console.log('🔧 Updating demo users...\n')
  
  // Update staff
  const staffDb = Datastore.create({ 
    filename: path.resolve(__dirname, 'data/staff.db'), 
    autoload: true 
  })
  
  const staff = await staffDb.findOne({ email: 'staff@demo.com' })
  if (staff) {
    await staffDb.update(
      { email: 'staff@demo.com' }, 
      { $set: { department: 'M.Tech', designation: 'Assistant Professor', contact: '9876543210' } }
    )
    console.log('✅ Updated staff@demo.com:')
    console.log('   Department: M.Tech')
    console.log('   Designation: Assistant Professor')
  } else {
    console.log('⚠️  staff@demo.com not found')
  }
  
  // Update student
  const studentsDb = Datastore.create({ 
    filename: path.resolve(__dirname, 'data/students.db'), 
    autoload: true 
  })
  
  // Since students are identified by regNo, and we don't have a specific student@demo.com
  // Let's create one if it doesn't exist
  const studentRegNo = 'DEMO001'
  const existingStudent = await studentsDb.findOne({ regNo: studentRegNo })
  
  if (!existingStudent) {
    await studentsDb.insert({
      regNo: studentRegNo,
      studentId: 'DEMO001',
      name: 'Demo Student',
      password: 'student123',
      department: 'M.Tech',
      year: '4th Year',
      email: 'student@demo.com'
    })
    console.log('\n✅ Created student@demo.com:')
    console.log('   RegNo: DEMO001')
    console.log('   Department: M.Tech')
    console.log('   Year: 4th Year')
  } else {
    await studentsDb.update(
      { regNo: studentRegNo },
      { $set: { department: 'M.Tech', year: '4th Year' } }
    )
    console.log('\n✅ Updated demo student')
  }
  
  console.log('\n✅ Demo users updated successfully!')
}

updateDemoUsers().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
