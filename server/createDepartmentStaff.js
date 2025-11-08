import { initDb, createStaff, updateStaff, getStaffByEmail } from './db.js'

// Script to create staff members for different departments
async function createDepartmentStaff() {
  console.log('=== CREATING DEPARTMENT STAFF ===')
  
  initDb()
  
  // Define staff for each department
  const departmentStaff = [
    // CSE Department
    {
      email: 'cse.hod@demo.com',
      name: 'Dr. Rajesh Kumar',
      password: 'cse123',
      department: 'CSE',
      designation: 'Head of Department',
      isClassAdvisor: true,
      advisorFor: { department: 'CSE', year: '4th Year' },
      accessLevel: 'class_advisor'
    },
    {
      email: 'cse.staff1@demo.com',
      name: 'Prof. Priya Sharma',
      password: 'cse123',
      department: 'CSE',
      designation: 'Assistant Professor',
      isClassAdvisor: true,
      advisorFor: { department: 'CSE', year: '2nd Year' },
      accessLevel: 'class_advisor'
    },
    
    // ECE Department
    {
      email: 'ece.hod@demo.com',
      name: 'Dr. Suresh Babu',
      password: 'ece123',
      department: 'ECE',
      designation: 'Head of Department',
      isClassAdvisor: true,
      advisorFor: { department: 'ECE', year: '4th Year' },
      accessLevel: 'class_advisor'
    },
    {
      email: 'ece.staff1@demo.com',
      name: 'Dr. Lakshmi Devi',
      password: 'ece123',
      department: 'ECE',
      designation: 'Associate Professor',
      isClassAdvisor: true,
      advisorFor: { department: 'ECE', year: '3rd Year' },
      accessLevel: 'class_advisor'
    },
    
    // MECH Department
    {
      email: 'mech.hod@demo.com',
      name: 'Dr. Venkatesh Raman',
      password: 'mech123',
      department: 'MECH',
      designation: 'Head of Department',
      isClassAdvisor: true,
      advisorFor: { department: 'MECH', year: '4th Year' },
      accessLevel: 'class_advisor'
    },
    
    // CIVIL Department
    {
      email: 'civil.hod@demo.com',
      name: 'Dr. Anitha Krishnan',
      password: 'civil123',
      department: 'CIVIL',
      designation: 'Head of Department',
      isClassAdvisor: true,
      advisorFor: { department: 'CIVIL', year: '4th Year' },
      accessLevel: 'class_advisor'
    },
    
    // Update existing staff
    {
      email: 'thillai@demo.com',
      updates: {
        isClassAdvisor: true,
        advisorFor: { department: 'CSE', year: '1st Year' },
        accessLevel: 'class_advisor'
      }
    }
  ]
  
  let createdCount = 0
  let updatedCount = 0
  
  for (const staffData of departmentStaff) {
    try {
      if (staffData.updates) {
        // Update existing staff
        const existing = await getStaffByEmail(staffData.email)
        if (existing) {
          await updateStaff(existing.id, staffData.updates)
          console.log(`Updated existing staff: ${staffData.email}`)
          updatedCount++
        }
      } else {
        // Create new staff
        const existing = await getStaffByEmail(staffData.email)
        if (!existing) {
          await createStaff({
            id: staffData.email,
            ...staffData,
            contact: '1234567890',
            status: 'Active',
            joiningDate: Date.now(),
            assignedDepartments: [staffData.department],
            assignedYears: [`${staffData.department}:${staffData.advisorFor?.year || 'All'}`]
          })
          console.log(`Created staff: ${staffData.name} (${staffData.email}) - ${staffData.department} ${staffData.advisorFor?.year || 'All Years'}`)
          createdCount++
        } else {
          console.log(`Staff already exists: ${staffData.email}`)
        }
      }
    } catch (error) {
      console.error(`Error processing staff ${staffData.email}:`, error)
    }
  }
  
  console.log(`\n=== STAFF CREATION COMPLETE ===`)
  console.log(`Created ${createdCount} new staff members`)
  console.log(`Updated ${updatedCount} existing staff members`)
  
  // Show final staff distribution
  console.log('\n=== STAFF DISTRIBUTION BY DEPARTMENT ===')
  const departments = ['CSE', 'ECE', 'MECH', 'CIVIL', 'M.Tech']
  
  for (const dept of departments) {
    console.log(`\n${dept} Department:`)
    for (const staff of departmentStaff) {
      if (staff.department === dept && !staff.updates) {
        console.log(`  - ${staff.name} (${staff.designation}) - Class Advisor: ${staff.advisorFor?.year || 'None'}`)
      }
    }
    
    // Show existing staff for M.Tech
    if (dept === 'M.Tech') {
      console.log(`  - Kiruthika (Assistant Professor) - Class Advisor: 4th Year`)
      console.log(`  - Mohan (Assistant Professor) - Regular Staff`)
    }
    
    // Show updated staff for CSE
    if (dept === 'CSE') {
      console.log(`  - THILLAIARASAN (Assistant Professor) - Class Advisor: 1st Year`)
    }
  }
}

// Run the staff creation
createDepartmentStaff().catch(console.error)
