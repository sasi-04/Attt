import { initDb, createStaff, createStudent, enrollStudent } from './db.js'

// Hierarchical College Structure Seeder
async function seedHierarchicalData() {
  console.log('=== SEEDING HIERARCHICAL COLLEGE DATABASE ===')
  
  initDb()
  
  // Define College Structure
  const collegeStructure = {
    name: "Engineering College",
    departments: {
      "CSE": {
        name: "Computer Science Engineering",
        years: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
        studentsPerYear: 15
      },
      "ECE": {
        name: "Electronics & Communication Engineering", 
        years: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
        studentsPerYear: 12
      },
      "MECH": {
        name: "Mechanical Engineering",
        years: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
        studentsPerYear: 10
      },
      "CIVIL": {
        name: "Civil Engineering",
        years: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
        studentsPerYear: 8
      },
      "M.Tech": {
        name: "Master of Technology",
        years: ["1st Year", "2nd Year"],
        studentsPerYear: 6
      }
    }
  }
  
  console.log(`Creating structure for: ${collegeStructure.name}`)
  
  // Create Admin User
  await createStaff({
    id: 'admin@college.edu',
    name: 'System Administrator',
    email: 'admin@college.edu',
    password: 'admin123',
    department: 'Administration',
    designation: 'Administrator',
    contact: '9999999999',
    status: 'Active',
    joiningDate: Date.now(),
    isSystemAdmin: true,
    accessLevel: 'admin'
  })
  console.log('✓ Created System Administrator')
  
  let totalStaff = 1
  let totalStudents = 0
  
  // Create Department Structure
  for (const [deptCode, deptInfo] of Object.entries(collegeStructure.departments)) {
    console.log(`\n--- Creating ${deptCode} Department ---`)
    
    // Create HOD for each department
    const hodEmail = `hod.${deptCode.toLowerCase()}@college.edu`
    await createStaff({
      id: hodEmail,
      name: `Dr. ${deptCode} Head`,
      email: hodEmail,
      password: `${deptCode.toLowerCase()}123`,
      department: deptCode,
      designation: 'Head of Department',
      contact: `98765${String(totalStaff).padStart(5, '0')}`,
      status: 'Active',
      joiningDate: Date.now(),
      isClassAdvisor: false,
      accessLevel: 'hod'
    })
    console.log(`  ✓ Created HOD: ${hodEmail}`)
    totalStaff++
    
    // Create Class Advisors and Students for each year
    for (const year of deptInfo.years) {
      console.log(`    Creating ${year} structure...`)
      
      // Create Class Advisor for this year
      const advisorEmail = `advisor.${deptCode.toLowerCase()}.${year.replace(' ', '').toLowerCase()}@college.edu`
      await createStaff({
        id: advisorEmail,
        name: `Prof. ${deptCode} ${year} Advisor`,
        email: advisorEmail,
        password: `${deptCode.toLowerCase()}123`,
        department: deptCode,
        designation: 'Assistant Professor',
        contact: `98765${String(totalStaff).padStart(5, '0')}`,
        status: 'Active',
        joiningDate: Date.now(),
        isClassAdvisor: true,
        advisorFor: {
          department: deptCode,
          year: year
        },
        accessLevel: 'class_advisor'
      })
      console.log(`      ✓ Created Class Advisor: ${advisorEmail}`)
      totalStaff++
      
      // Create Students for this year
      for (let i = 1; i <= deptInfo.studentsPerYear; i++) {
        const studentRegNo = `${deptCode}${year.charAt(0)}${String(i).padStart(3, '0')}`
        const studentEmail = `${studentRegNo.toLowerCase()}@student.college.edu`
        
        await createStudent({
          regNo: studentRegNo,
          studentId: studentRegNo,
          name: `${deptCode} Student ${i}`,
          password: 'student123',
          email: studentEmail,
          department: deptCode,
          year: year,
          contact: `87654${String(totalStudents).padStart(5, '0')}`,
          status: 'Active',
          joiningDate: Date.now(),
          classAdvisor: advisorEmail
        })
        
        // Enroll student in department course
        const courseId = `${deptCode}${year.replace(' ', '').toUpperCase()}`
        try {
          await enrollStudent(courseId, studentRegNo, `${deptCode} Student ${i}`, studentRegNo)
        } catch (error) {
          // Course enrollment might fail, that's okay
        }
        
        totalStudents++
      }
      console.log(`      ✓ Created ${deptInfo.studentsPerYear} students for ${year}`)
    }
    
    console.log(`  ✓ Completed ${deptCode} department`)
  }
  
  console.log('\n=== HIERARCHICAL DATABASE SEEDING COMPLETE ===')
  console.log(`Total Staff Created: ${totalStaff}`)
  console.log(`Total Students Created: ${totalStudents}`)
  
  console.log('\n=== LOGIN CREDENTIALS ===')
  console.log('System Admin: admin@college.edu / admin123')
  console.log('\nDepartment HODs:')
  for (const deptCode of Object.keys(collegeStructure.departments)) {
    console.log(`  ${deptCode} HOD: hod.${deptCode.toLowerCase()}@college.edu / ${deptCode.toLowerCase()}123`)
  }
  
  console.log('\nClass Advisors (examples):')
  console.log('  CSE 1st Year: advisor.cse.1styear@college.edu / cse123')
  console.log('  ECE 2nd Year: advisor.ece.2ndyear@college.edu / ece123')
  console.log('  M.Tech 1st Year: advisor.m.tech.1styear@college.edu / m.tech123')
  
  console.log('\nStudents (examples):')
  console.log('  CSE1001 / student123')
  console.log('  ECE2001 / student123') 
  console.log('  MECH3001 / student123')
  
  console.log('\n=== HIERARCHY STRUCTURE ===')
  console.log('College')
  for (const [deptCode, deptInfo] of Object.entries(collegeStructure.departments)) {
    console.log(`├── ${deptCode} Department`)
    console.log(`│   ├── HOD: hod.${deptCode.toLowerCase()}@college.edu`)
    for (const year of deptInfo.years) {
      console.log(`│   ├── ${year}`)
      console.log(`│   │   ├── Class Advisor: advisor.${deptCode.toLowerCase()}.${year.replace(' ', '').toLowerCase()}@college.edu`)
      console.log(`│   │   └── ${deptInfo.studentsPerYear} Students`)
    }
  }
}

// Run the seeder
seedHierarchicalData().catch(console.error)
