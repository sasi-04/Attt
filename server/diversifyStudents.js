import { initDb, listAllStudents, updateStudent } from './db.js'

// Script to diversify students across different departments and years
async function diversifyStudents() {
  console.log('=== DIVERSIFYING STUDENT DATA ACROSS DEPARTMENTS ===')
  
  initDb()
  
  // Define department structure (4-5 years each)
  const departments = {
    'CSE': ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    'ECE': ['1st Year', '2nd Year', '3rd Year', '4th Year'], 
    'MECH': ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    'CIVIL': ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    'M.Tech': ['1st Year', '2nd Year', '4th Year'] // 3 years for M.Tech
  }
  
  const allStudents = await listAllStudents()
  
  // Filter out placeholder students
  const realStudents = allStudents.filter(s => 
    !s.isPlaceholder && 
    !s.isYearPlaceholder && 
    !s.isDepartmentPlaceholder
  )
  
  console.log(`Found ${realStudents.length} real students to diversify`)
  
  // Distribute students across departments and years
  const departmentNames = Object.keys(departments)
  let studentIndex = 0
  let updatedCount = 0
  
  for (const student of realStudents) {
    // Assign department cyclically
    const deptIndex = studentIndex % departmentNames.length
    const department = departmentNames[deptIndex]
    
    // Assign year within department cyclically
    const years = departments[department]
    const yearIndex = Math.floor(studentIndex / departmentNames.length) % years.length
    const year = years[yearIndex]
    
    try {
      await updateStudent(student.regNo, {
        department: department,
        year: year
      })
      
      console.log(`Updated ${student.regNo} (${student.name}) -> ${department} ${year}`)
      updatedCount++
    } catch (error) {
      console.error(`Error updating student ${student.regNo}:`, error)
    }
    
    studentIndex++
  }
  
  console.log(`\n=== DIVERSIFICATION COMPLETE ===`)
  console.log(`Updated ${updatedCount} students across ${departmentNames.length} departments`)
  
  // Show final distribution
  const finalStudents = await listAllStudents()
  const distribution = {}
  
  for (const student of finalStudents) {
    if (student.isPlaceholder) continue
    
    const dept = student.department || 'Unknown'
    const year = student.year || 'Unknown'
    const key = `${dept} - ${year}`
    
    if (!distribution[key]) {
      distribution[key] = 0
    }
    distribution[key]++
  }
  
  console.log('\n=== FINAL DISTRIBUTION ===')
  Object.entries(distribution)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, count]) => {
      console.log(`${key}: ${count} students`)
    })
}

// Run the diversification
diversifyStudents().catch(console.error)
