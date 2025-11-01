# Attendance Calculation Formulas - Complete Documentation

## Overview
This document details all the attendance calculation formulas implemented in the system for both staff and student panels.

---

## 📊 Core Calculation Functions

### 1. **Basic Attendance Percentage**
```
Attendance % = (Attended Sessions / Total Sessions) × 100
```

**Implementation:**
```javascript
const percentage = Math.round((attendedCount / totalSessions) * 100)
```

**Status Classification:**
- **Excellent**: ≥ 95%
- **Good**: 85% - 94%
- **Average**: 75% - 84%
- **Poor**: < 75%

---

### 2. **Overall Statistics Calculation**
```javascript
function calculateAttendanceStats(attendedCount, totalSessions) {
  if (totalSessions === 0) {
    return { percentage: 0, attended: 0, missed: 0, total: 0, status: 'no_data' }
  }
  
  const percentage = Math.round((attendedCount / totalSessions) * 100)
  let status = 'excellent'
  if (percentage < 75) status = 'poor'
  else if (percentage < 85) status = 'average'
  else if (percentage < 95) status = 'good'
  
  return {
    percentage,
    attended: attendedCount,
    missed: totalSessions - attendedCount,
    total: totalSessions,
    status
  }
}
```

---

### 3. **Date Range Statistics**
Calculates attendance for a specific time period (daily, weekly, monthly).

```javascript
function getDateRangeStats(attendance, sessions, startDate, endDate) {
  // Filter sessions within date range
  const relevantSessions = sessions.filter(s => {
    const sessionTime = new Date(s.startTime).getTime()
    return sessionTime >= startDate.getTime() && sessionTime <= endDate.getTime()
  })
  
  // Filter attendance records for these sessions
  const sessionIds = new Set(relevantSessions.map(s => s.id))
  const attendedInRange = attendance.filter(a => sessionIds.has(a.sessionId))
  
  return calculateAttendanceStats(attendedInRange.length, relevantSessions.length)
}
```

---

## 📈 Staff Dashboard Calculations

### 1. **Today's Attendance Rate**
```
Today's Rate = (Students Present Today / Total Students) × 100
```

**Steps:**
1. Filter sessions that occurred today
2. Count unique students who attended these sessions
3. Calculate percentage

```javascript
const todayAttendanceRate = 
  (presentToday / totalStudents) * 100
```

---

### 2. **Overall Attendance Rate**
```
Overall Rate = (Total Attendances / Total Possible Attendances) × 100
where:
  Total Possible Attendances = Total Students × Total Sessions
```

**Steps:**
1. Calculate total possible attendance: `students × sessions`
2. Sum all actual attendance records
3. Calculate percentage

```javascript
const overallTotalPossible = totalStudents * totalSessionCount
const overallPresentCount = sum of all student attendances
const overallAttendanceRate = 
  (overallPresentCount / overallTotalPossible) * 100
```

---

### 3. **Low Attendance Students**
**Criteria:** Students with attendance < 75%

**Calculation:**
```javascript
for each student:
  attendance% = (student.attendances / totalSessions) * 100
  if (attendance% < 75 && totalSessions > 0):
    add to lowAttendanceList
```

**Sorting:** Lowest percentage first

---

### 4. **Weekly Statistics**
```
Week Stats = Date Range Stats (Last 7 days)
```

```javascript
const weekAgo = new Date()
weekAgo.setDate(weekAgo.getDate() - 7)
const weekStats = getDateRangeStats(attendance, sessions, weekAgo, new Date())
```

---

### 5. **Monthly Statistics**
```
Month Stats = Date Range Stats (Last 30 days)
```

```javascript
const monthAgo = new Date()
monthAgo.setDate(monthAgo.getDate() - 30)
const monthStats = getDateRangeStats(attendance, sessions, monthAgo, new Date())
```

---

## 🎓 Student Dashboard Calculations

### 1. **Personal Attendance Percentage**
```
My Attendance % = (My Attended Classes / Total Classes) × 100
```

---

### 2. **Missed Classes Count**
```
Missed Classes = Total Sessions - Attended Sessions
```

**Identification:**
```javascript
const attendedSessionIds = new Set(attendance.map(a => a.sessionId))
const missedSessions = allSessions.filter(s => !attendedSessionIds.has(s.id))
```

---

### 3. **Monthly Breakdown (Last 6 Months)**

**Formula:**
```
For each month:
  Month Attendance % = (Attended in Month / Total Sessions in Month) × 100
```

**Steps:**
1. Group sessions by month (YYYY-MM format)
2. Count attended sessions per month
3. Count total sessions per month
4. Calculate percentage for each month

```javascript
// Initialize last 6 months
for (let i = 0; i < 6; i++) {
  const date = new Date()
  date.setMonth(date.getMonth() - i)
  monthsData[monthKey] = { attended: 0, total: 0 }
}

// Count attendances and totals
// Calculate percentage = (attended / total) * 100
```

---

### 4. **Attendance Trend**
**Determines if attendance is improving, declining, or stable**

```
Trend = Weekly % - Monthly %

if (diff > 5): "improving"
if (diff < -5): "declining"
else: "stable"
```

```javascript
function getTrend(weeklyPercentage, monthlyPercentage) {
  const diff = weeklyPercentage - monthlyPercentage
  if (diff > 5) return 'improving'
  if (diff < -5) return 'declining'
  return 'stable'
}
```

---

### 5. **Days Until Critical**
**Calculates how many classes must be missed before attendance becomes critical (<75%)**

```javascript
function calculateDaysUntilCritical(currentPercentage, totalSessions) {
  if (currentPercentage >= 75) return null // Not at risk
  
  const requiredAttendance = Math.ceil(totalSessions * 0.75)
  const currentAttendance = Math.floor(totalSessions * (currentPercentage / 100))
  const sessionsNeeded = requiredAttendance - currentAttendance
  
  return sessionsNeeded > 0 ? sessionsNeeded : null
}
```

**Example:**
- Total Sessions: 20
- Attended: 14 (70%)
- Required for 75%: 15
- Sessions Needed: 1

---

### 6. **Weekly Attendance**
```
Last 7 Days % = (Attended in Last 7 Days / Sessions in Last 7 Days) × 100
```

---

### 7. **Today's Attendance**
```
Today % = (Attended Today / Sessions Today) × 100
```

---

## 📋 Student List Calculations

For each student in the list, the following are calculated:

### 1. **Overall Attendance**
```
Attendance % = (Student Attendances / Total Sessions) × 100
```

### 2. **Monthly Attendance**
```
Current Month % = Attendance % for current month only
```

### 3. **Weekly Attendance**
```
Last 7 Days % = Attendance % for last 7 days
```

### 4. **Attendance Trend**
```
Trend = Compare Weekly % vs Monthly %
```

### 5. **Status Classification**
- **excellent**: ≥ 95%
- **good**: 85-94%
- **average**: 75-84%
- **poor**: < 75%

---

## 🕐 Time-Related Calculations

### 1. **Relative Time (Time Ago)**
```javascript
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  
  if (seconds < 60) return `${seconds} seconds ago`
  if (seconds < 3600) return `${Math.floor(seconds/60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds/3600)} hours ago`
  return `${Math.floor(seconds/86400)} days ago`
}
```

---

## 📊 API Response Examples

### Staff Dashboard Stats
```json
{
  "totalStudents": 29,
  "presentToday": 0,
  "absentToday": 29,
  "todayAttendanceRate": 0,
  "overallAttendanceRate": 0,
  "totalSessions": 0,
  "lowAttendanceStudents": [],
  "recentActivity": [],
  "weeklyStats": {
    "percentage": 0,
    "attended": 0,
    "missed": 0,
    "total": 0,
    "status": "no_data"
  },
  "monthlyStats": {
    "percentage": 0,
    "attended": 0,
    "missed": 0,
    "total": 0,
    "status": "no_data"
  },
  "studentStats": []
}
```

### Student Individual Stats
```json
{
  "totalClasses": 0,
  "attendedClasses": 0,
  "missedClasses": 0,
  "attendancePercentage": 0,
  "status": "no_data",
  "weeklyStats": {
    "attended": 0,
    "total": 0,
    "percentage": 0
  },
  "monthlyStats": {
    "attended": 0,
    "total": 0,
    "percentage": 0
  },
  "todayStats": {
    "attended": 0,
    "total": 0,
    "percentage": 0
  },
  "recentAttendance": [],
  "missedSessions": [],
  "monthlyAttendance": [],
  "trend": "stable",
  "daysUntilCritical": null
}
```

### Students List
```json
{
  "students": [
    {
      "name": "MAHESHWARAN",
      "regNo": "730422553027",
      "studentId": "ES22CJ27",
      "email": "730422553027@student.edu",
      "department": "Computer Science",
      "attendance": 0,
      "attendedSessions": 0,
      "missedSessions": 0,
      "totalSessions": 0,
      "status": "no_data",
      "lastSeen": "Never",
      "monthlyAttendance": 0,
      "weeklyAttendance": 0,
      "trend": "stable"
    }
  ]
}
```

---

## 🎯 Key Features

### ✅ Real-time Calculations
- All percentages calculated dynamically from database
- No hardcoded values
- Updates immediately when attendance is marked

### ✅ Time-based Analysis
- Daily attendance tracking
- Weekly trends (last 7 days)
- Monthly breakdown (last 6 months)
- Current month statistics

### ✅ Predictive Analytics
- Attendance trend detection (improving/declining/stable)
- Days until critical threshold
- Low attendance alerts

### ✅ Comprehensive Metrics
- Overall attendance percentage
- Time-period specific percentages
- Missed vs attended sessions
- Status classification

---

## 🚀 How to See Calculations in Action

### Step 1: Create Sessions
1. Login as staff (`staff@demo.com` / `staff123`)
2. Go to Attendance tab
3. Generate QR code (this creates a session)

### Step 2: Mark Attendance
1. Login as student (e.g., `ES22CJ27` / `student123`)
2. Scan the QR code
3. Attendance is marked with timestamp

### Step 3: View Calculations
**Staff Dashboard:**
- Total students: 29
- Present today: increases
- Overall attendance %: calculated
- Low attendance alerts: if any <75%

**Student Dashboard:**
- Total classes: counts sessions
- Attendance %: calculated
- Monthly breakdown: shows data
- Recent attendance: lists records

### Step 4: Create Multiple Sessions
Repeat Steps 1-2 multiple times to see:
- Percentages change dynamically
- Monthly breakdowns populate
- Trends emerge
- Statistics become meaningful

---

## 📝 Notes

- **Initial State**: All percentages are 0% until sessions are created
- **Minimum Data**: Need at least 1 session for calculations
- **Real-time**: All calculations happen on-demand
- **Persistent**: Data survives server restarts
- **Accurate**: Uses timestamps for precise date-range calculations

---

## 🔧 Technical Implementation

All formulas are implemented in:
- **Backend**: `server/index.js` (API endpoints)
- **Frontend**: React components fetch calculated data
- **Database**: NeDB stores raw attendance records
- **Calculation**: Server-side for accuracy and consistency
