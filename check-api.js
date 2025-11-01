import http from 'http';

console.log('🔍 Checking API response...\n');

http.get('http://localhost:5174/students/list', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(`API returned ${json.students.length} students\n`);
    
    // Group by studentId to find duplicates
    const studentMap = new Map();
    json.students.forEach(s => {
      if (studentMap.has(s.studentId)) {
        studentMap.get(s.studentId).push(s);
      } else {
        studentMap.set(s.studentId, [s]);
      }
    });
    
    // Show duplicates
    let duplicateCount = 0;
    studentMap.forEach((students, id) => {
      if (students.length > 1) {
        console.log(`❌ DUPLICATE: ${id} appears ${students.length} times`);
        duplicateCount += students.length - 1;
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total records: ${json.students.length}`);
    console.log(`   Unique students: ${studentMap.size}`);
    console.log(`   Duplicate entries: ${duplicateCount}`);
    
    // Show first 10 students
    console.log(`\n📋 First 10 students:`);
    json.students.slice(0, 10).forEach((s, i) => {
      console.log(`${i + 1}. ${s.studentId} - ${s.name} (${s.regNo})`);
    });
  });
}).on('error', err => {
  console.error('Error:', err.message);
});
