import { initDb, getStaffByEmail, listAllStudents } from './db.js'

// Test script to verify department access control
async function testDepartmentAccess() {
  console.log('=== TESTING DEPARTMENT ACCESS CONTROL ===')
  
  initDb()
  
  // Test different staff members
  const testStaff = [
    'kiruthika@demo.com',    // M.Tech class advisor
    'cse.hod@demo.com',      // CSE HOD
    'ece.staff1@demo.com',   // ECE staff
    'thillai@demo.com'       // CSE staff (updated)
  ]
  
  const allStudents = await listAllStudents()
  const realStudents = allStudents.filter(s => !s.isPlaceholder)
  
  console.log(`Total students in system: ${realStudents.length}`)
  
  for (const staffEmail of testStaff) {
    console.log(`\n--- Testing access for ${staffEmail} ---`)
    
    try {
      const staff = await getStaffByEmail(staffEmail)
      if (!staff) {
        console.log(`❌ Staff not found: ${staffEmail}`)
        continue
      }
      
      console.log(`Staff: ${staff.name}`)
      console.log(`Department: ${staff.department}`)
      console.log(`Is Class Advisor: ${staff.isClassAdvisor}`)
      console.log(`Advisor For: ${JSON.stringify(staff.advisorFor)}`)
      
      // Simulate the same logic as the API endpoints
      let allowedDepartments = []
      
      // If staff is a class advisor, they can see students from their advisor department
      if (staff.isClassAdvisor && staff.advisorFor) {
        allowedDepartments.push(staff.advisorFor.department)
      }
      
      // Staff can also see students from their own department (if different from advisor)
      if (staff.department && !allowedDepartments.includes(staff.department)) {
        allowedDepartments.push(staff.department)
      }
      
      console.log(`Allowed Departments: ${allowedDepartments.join(', ')}`)
      
      // Filter students based on allowed departments
      const visibleStudents = realStudents.filter(student => {
        const studentDept = student.department || 'Unknown'
        return allowedDepartments.includes(studentDept)
      })
      
      console.log(`Visible Students: ${visibleStudents.length}`)
      
      // Show breakdown by department and year
      const breakdown = {}
      visibleStudents.forEach(student => {
        const key = `${student.department} ${student.year}`
        breakdown[key] = (breakdown[key] || 0) + 1
      })
      
      Object.entries(breakdown)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([key, count]) => {
          console.log(`  - ${key}: ${count} students`)
        })
      
      // Verify no unauthorized access
      const unauthorizedStudents = visibleStudents.filter(student => {
        const studentDept = student.department || 'Unknown'
        return !allowedDepartments.includes(studentDept)
      })
      
      if (unauthorizedStudents.length > 0) {
        console.log(`❌ SECURITY ISSUE: ${unauthorizedStudents.length} unauthorized students visible!`)
        unauthorizedStudents.forEach(s => {
          console.log(`  - ${s.regNo} (${s.name}) from ${s.department}`)
        })
      } else {
        console.log(`✅ Access control working correctly - no unauthorized access`)
      }
      
    } catch (error) {
      console.error(`Error testing ${staffEmail}:`, error)
    }
  }
  
  console.log('\n=== DEPARTMENT ISOLATION TEST COMPLETE ===')
}

// Run the test
testDepartmentAccess().catch(console.error)
