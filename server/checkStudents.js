import { initDb, listAllStudents } from './db.js'

async function checkStudents() {
  initDb()
  const allStudents = await listAllStudents()
  
  console.log(`\nTotal students: ${allStudents.length}\n`)
  
  // Show all students with "Student" in the name
  const studentsWithStudent = allStudents.filter(s => 
    s.name && s.name.toLowerCase().includes('student')
  )
  
  console.log(`Students with "Student" in name: ${studentsWithStudent.length}\n`)
  
  studentsWithStudent.forEach(student => {
    console.log(`  - ${student.name} (${student.regNo}) - ${student.department} ${student.year}`)
  })
  
  // Show M.Tech students specifically
  const mtechStudents = allStudents.filter(s => 
    s.department === 'M.Tech' || s.department === 'Mtech'
  )
  
  console.log(`\nM.Tech students: ${mtechStudents.length}\n`)
  mtechStudents.forEach(student => {
    console.log(`  - ${student.name} (${student.regNo}) - ${student.year}`)
  })
  
  // Show CSE students specifically
  const cseStudents = allStudents.filter(s => 
    s.department === 'CSE' || s.department === 'Computer Science'
  )
  
  console.log(`\nCSE students: ${cseStudents.length}\n`)
  cseStudents.forEach(student => {
    console.log(`  - ${student.name} (${student.regNo}) - ${student.year}`)
  })
}

checkStudents().catch(console.error)
