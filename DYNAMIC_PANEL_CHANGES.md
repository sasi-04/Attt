# Dynamic Panel Changes - Attendance System

## Overview
The staff and student panels have been converted from static hardcoded data to dynamic database-driven interfaces. All data is now stored in the database and synced between panels.

## Changes Made

### 1. Database Schema Updates (`server/db.js`)
Added new database helper functions:
- `listAllStudents()` - Get all student records
- `updateStudent(regNo, updates)` - Update student profile data
- `getStudentAttendance(studentId)` - Get attendance records for a student
- `getAllAttendanceRecords()` - Get all attendance records
- `getSessionById(sessionId)` - Get session details
- `getAllSessions()` - Get all session records
- Updated `markPresent()` to include timestamps

### 2. Backend API Endpoints (`server/index.js`)
Added comprehensive REST API endpoints:

#### **GET `/api/dashboard/stats`**
Returns staff dashboard statistics:
- Total students count
- Present today count
- Absent today count
- Overall attendance rate
- Low attendance students (below 75%)
- Recent activity feed

#### **GET `/api/students/list`**
Returns complete student list with attendance data:
- Student name, regNo, email, department
- Attendance percentage
- Attended/total sessions
- Last seen timestamp

#### **GET `/api/student/:studentId/stats`**
Returns individual student dashboard data:
- Total classes, attended, missed
- Attendance percentage
- Recent attendance records
- Monthly attendance breakdown

#### **PUT `/api/students/:regNo`**
Update student profile information (name, email, department, etc.)

### 3. Frontend Updates

#### **Staff Dashboard** (`src/pages/staff/Dashboard.jsx`)
- Now fetches real-time data from `/api/dashboard/stats`
- Displays actual student counts and attendance rates
- Shows real low attendance alerts from database
- Displays actual recent activity from attendance records
- Added loading states

#### **Student Table** (`src/components/StudentTable.jsx`)
- Fetches real student data from `/api/students/list`
- Shows actual enrollment data with attendance percentages
- Displays real "last seen" timestamps
- All 33 enrolled students visible with their data
- Added loading states

#### **Student Dashboard** (`src/pages/StudentDashboard.jsx`)
- Fetches individual student stats from `/api/student/:studentId/stats`
- Shows real attendance records from database
- Displays actual monthly attendance data
- Shows real recent class attendance
- Dynamic calculation based on actual sessions

### 4. Data Flow
```
Student scans QR → 
  Attendance marked in database → 
    Staff dashboard updates in real-time → 
      Student dashboard shows attendance → 
        All data persisted in NeDB
```

## How It Works

### Data Storage
- **Student accounts**: Stored in `students.db` with regNo, name, password
- **Attendance records**: Stored in `presents.db` with sessionId, studentId, timestamp
- **Sessions**: Stored in `sessions.db` with courseId, startTime, status
- **Enrollments**: Stored in `enrollments.db` linking students to courses

### Real-time Sync
- When a student scans QR code, attendance is marked in `presents.db`
- Staff dashboard queries this data to show live statistics
- Student dashboard queries their personal attendance history
- WebSocket updates notify all connected clients

### Statistics Calculation
- **Attendance percentage**: `(attended sessions / total sessions) * 100`
- **Low attendance alerts**: Students with < 75% attendance
- **Monthly breakdown**: Groups sessions by month and calculates monthly rates
- **Today's attendance**: Filters by today's date from session timestamps

## Testing

### Test the Staff Dashboard
1. Login as staff: `staff@demo.com` / `staff123`
2. View Dashboard - shows real student counts (currently 33 students)
3. Check Students page - shows all 33 enrolled students with attendance data

### Test the Student Dashboard
1. Login as student: Use any regNo like `ES22CJ27` / `student123`
2. View Dashboard - shows personal attendance statistics
3. Scan QR code to mark attendance
4. Refresh dashboard to see updated statistics

### Test Data Sync
1. Staff generates QR code
2. Student scans QR code
3. Staff dashboard updates with new attendance count
4. Student dashboard shows new attendance record
5. All data persisted in database

## Benefits

✅ **No More Hardcoded Data**: All information comes from the database
✅ **Real-time Updates**: Staff and students see live attendance data
✅ **Data Persistence**: Everything is saved and survives server restarts
✅ **Accurate Statistics**: Calculations based on actual attendance records
✅ **Scalable**: Can handle any number of students and sessions
✅ **Historical Data**: Track attendance over time with monthly breakdowns
✅ **Synchronized**: Staff and student panels always show consistent data

## API Response Examples

### Dashboard Stats Response
```json
{
  "totalStudents": 33,
  "presentToday": 0,
  "absentToday": 33,
  "attendanceRate": 0,
  "lowAttendanceStudents": [],
  "recentActivity": []
}
```

### Student List Response
```json
{
  "students": [
    {
      "name": "ES22CJ27",
      "regNo": "ES22CJ27",
      "email": "ES22CJ27@example.com",
      "department": "CS",
      "attendance": 0,
      "attendedSessions": 0,
      "totalSessions": 0,
      "lastSeen": "Never"
    }
  ]
}
```

### Student Stats Response
```json
{
  "totalClasses": 0,
  "attendedClasses": 0,
  "missedClasses": 0,
  "attendancePercentage": 0,
  "recentAttendance": [],
  "monthlyAttendance": []
}
```

## Next Steps

To see data populate:
1. Staff logs in and generates QR codes
2. Students scan QR codes to mark attendance
3. Data accumulates over multiple sessions
4. Statistics become more meaningful with more data

## Notes
- Initial state shows 0% attendance as no sessions have been created yet
- Once staff creates sessions and students scan QR codes, data will populate
- All data persists in the database files in `server/data/`
- No data loss on server restart
