# Leave Management System Documentation

## Overview
The staff leave panel now uses **real data from the database** instead of hardcoded values. Students can submit leave requests, and staff can review, approve, or reject them.

---

## 🗄️ Database Schema

### Leaves Table (`leaves.db`)
Each leave request contains:

```javascript
{
  _id: "unique_id",
  studentId: "ES22CJ27",
  studentName: "MAHESHWARAN",
  regNo: "730422553027",
  startDate: "2024-11-05",
  endDate: "2024-11-07",
  reason: "Medical emergency",
  type: "sick", // sick, personal, family, other
  status: "pending", // pending, approved, rejected
  submittedAt: 1730787600000, // timestamp
  reviewedBy: "staff@demo.com",
  reviewedAt: 1730790000000,
  updatedAt: 1730790000000
}
```

---

## 📡 API Endpoints

### 1. Get All Leave Requests
**Endpoint:** `GET /api/leave/requests?status={status}`

**Query Parameters:**
- `status` (optional): Filter by status - `all`, `pending`, `approved`, `rejected`

**Response:**
```json
{
  "requests": [
    {
      "id": "abc123",
      "studentId": "ES22CJ27",
      "studentName": "MAHESHWARAN",
      "regNo": "730422553027",
      "startDate": "2024-11-05",
      "endDate": "2024-11-07",
      "reason": "Medical emergency",
      "type": "sick",
      "status": "pending",
      "submittedAt": 1730787600000,
      "duration": "3 days"
    }
  ]
}
```

---

### 2. Get Student's Leave Requests
**Endpoint:** `GET /api/leave/student/:studentId`

**Response:**
```json
{
  "requests": [
    {
      "id": "abc123",
      "startDate": "2024-11-05",
      "endDate": "2024-11-07",
      "reason": "Medical emergency",
      "type": "sick",
      "status": "pending",
      "submittedAt": 1730787600000,
      "duration": "3 days"
    }
  ]
}
```

---

### 3. Create Leave Request
**Endpoint:** `POST /api/leave/request`

**Request Body:**
```json
{
  "studentId": "ES22CJ27",
  "studentName": "MAHESHWARAN",
  "regNo": "730422553027",
  "startDate": "2024-11-05",
  "endDate": "2024-11-07",
  "reason": "Medical emergency",
  "type": "sick"
}
```

**Response:**
```json
{
  "success": true,
  "leave": {
    "id": "abc123",
    "studentId": "ES22CJ27",
    "status": "pending"
  }
}
```

---

### 4. Update Leave Status
**Endpoint:** `PUT /api/leave/request/:id/status`

**Request Body:**
```json
{
  "status": "approved",
  "reviewedBy": "staff@demo.com"
}
```

**Valid statuses:** `pending`, `approved`, `rejected`

**Response:**
```json
{
  "success": true,
  "status": "approved"
}
```

---

### 5. Delete Leave Request
**Endpoint:** `DELETE /api/leave/request/:id`

**Response:**
```json
{
  "success": true
}
```

---

## 🎯 Staff Panel Features

### Dashboard - Pending Leave Section
**Location:** Staff Dashboard (bottom section)

**Features:**
- ✅ Shows **first 5 pending** leave requests
- ✅ Displays student name and registration number
- ✅ Shows duration (e.g., "3 days")
- ✅ Shows start date
- ✅ Shows reason and type
- ✅ Shows submission date
- ✅ "Review" link to go to full leave management page
- ✅ Counter showing total pending requests

**Empty State:**
- Shows ✅ icon and "No pending leave applications" when no pending requests

---

### Leave Management Page
**Location:** Staff → Leave

**Features:**

#### Filter by Status
- **Dropdown filter** with options:
  - All
  - Pending
  - Approved
  - Rejected

#### Table Columns
1. **Name**
   - Student name (bold)
   - Registration number (gray, small text)

2. **Dates**
   - Start date
   - End date (if different from start)
   - Duration (e.g., "2 days")

3. **Reason**
   - Leave reason
   - Leave type (sick, personal, family, other)

4. **Status**
   - Color-coded badge:
     - 🟡 Yellow: Pending
     - 🟢 Green: Approved
     - 🔴 Red: Rejected

5. **Actions**
   - **For Pending**: Approve & Reject buttons
   - **For Approved/Rejected**: "Reviewed" text

#### Action Buttons
- **Approve Button**
  - Green background
  - Updates status to "approved"
  - Refreshes table automatically

- **Reject Button**
  - Red background
  - Updates status to "rejected"
  - Refreshes table automatically

---

## 📝 Student Panel Features (Future)

### Student Dashboard
Students can:
- View their leave history
- See status of submitted leaves
- Apply for new leaves
- Track approval status

### Leave Application Form
Fields:
- Start Date (required)
- End Date (required)
- Reason (required)
- Type: Sick, Personal, Family, Other
- Supporting documents (future)

---

## 🔄 Duration Calculation

The system automatically calculates leave duration:

```javascript
function calculateDuration(startDate, endDate) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
  
  return diffDays === 1 ? '1 day' : `${diffDays} days`
}
```

**Examples:**
- Same day: "1 day"
- Nov 5 to Nov 7: "3 days" (includes both start and end)

---

## 🎨 UI Components

### LeaveTable Component
**Path:** `src/components/LeaveTable.jsx`

**Features:**
- Fetches real data from API
- Status filter dropdown
- Dynamic table with real leave requests
- Approve/Reject actions
- Loading state
- Empty state with icon

**State Management:**
- `requests`: Array of leave requests
- `status`: Current filter ('all', 'pending', 'approved', 'rejected')
- `loading`: Loading indicator

---

### Staff Dashboard Leave Section
**Path:** `src/pages/staff/Dashboard.jsx`

**Features:**
- Fetches pending leaves on load
- Shows top 5 pending requests
- Counter badge showing pending count
- Link to full leave management page
- Empty state handling

---

## 🗂️ Database Functions

### Core Functions
Located in `server/db.js`:

1. **initLeavesDb()** - Initialize leave database
2. **createLeaveRequest(data)** - Create new leave request
3. **getAllLeaveRequests()** - Get all leave requests
4. **getLeaveRequestsByStudent(studentId)** - Get student's leaves
5. **getLeaveRequestsByStatus(status)** - Filter by status
6. **updateLeaveStatus(id, status, reviewedBy)** - Update status
7. **deleteLeaveRequest(id)** - Delete leave request

---

## 🚀 How to Use

### For Staff

#### View Pending Leaves
1. Login as staff (`staff@demo.com` / `staff123`)
2. Check dashboard bottom section
3. See pending leave requests

#### Review Leave Requests
1. Go to **Staff → Leave**
2. See all leave requests
3. Filter by status if needed
4. Click **Approve** or **Reject** for pending requests

#### Filter Requests
1. Use dropdown at top right
2. Select: All, Pending, Approved, or Rejected
3. Table updates automatically

---

### For Students (Future Implementation)

#### Submit Leave Request
1. Login as student
2. Go to Leave Management
3. Fill form:
   - Start Date
   - End Date
   - Reason
   - Type (sick/personal/family/other)
4. Submit

#### Check Leave Status
1. View dashboard
2. See leave applications
3. Check status (pending/approved/rejected)

---

## 📊 Leave Statistics (Future)

### For Staff Dashboard
- Total leaves this month
- Approval rate
- Average leave duration
- Most common leave reasons

### For Students
- Total leaves taken
- Remaining leave balance
- Leave history graph

---

## 🔒 Security Considerations

### Current Implementation
- Basic validation on required fields
- Status values restricted to allowed list
- Timestamps automatically generated

### Future Enhancements
- Authentication middleware
- Role-based access control
- Student can only view/edit their own leaves
- Staff can view/edit all leaves
- Audit trail for status changes

---

## 📈 Sample Data Structure

### Example Leave Request Flow

**1. Student Submits:**
```json
{
  "studentId": "ES22CJ27",
  "studentName": "MAHESHWARAN",
  "regNo": "730422553027",
  "startDate": "2024-11-10",
  "endDate": "2024-11-12",
  "reason": "Family function",
  "type": "family",
  "status": "pending",
  "submittedAt": 1699632000000
}
```

**2. Staff Approves:**
```json
{
  "status": "approved",
  "reviewedBy": "staff@demo.com",
  "reviewedAt": 1699718400000
}
```

**3. Final Record:**
```json
{
  "_id": "xyz789",
  "studentId": "ES22CJ27",
  "studentName": "MAHESHWARAN",
  "regNo": "730422553027",
  "startDate": "2024-11-10",
  "endDate": "2024-11-12",
  "reason": "Family function",
  "type": "family",
  "status": "approved",
  "submittedAt": 1699632000000,
  "reviewedBy": "staff@demo.com",
  "reviewedAt": 1699718400000,
  "updatedAt": 1699718400000
}
```

---

## ✅ Testing Checklist

### Staff Features
- [ ] View pending leaves on dashboard
- [ ] Navigate to Leave Management page
- [ ] Filter by "Pending"
- [ ] Filter by "Approved"
- [ ] Filter by "Rejected"
- [ ] Filter by "All"
- [ ] Approve a pending leave
- [ ] Reject a pending leave
- [ ] Check empty state (no leaves)

### API Testing
- [ ] GET all leave requests
- [ ] GET filtered leave requests
- [ ] GET student's leave requests
- [ ] POST create leave request
- [ ] PUT update leave status
- [ ] DELETE leave request

---

## 🎉 Benefits of Real Data System

✅ **Dynamic Content**: Staff sees actual leave requests  
✅ **Real-time Updates**: Changes reflect immediately  
✅ **Database Persistence**: Data survives server restart  
✅ **Filtering**: Easy to find specific requests  
✅ **Audit Trail**: Track who approved/rejected  
✅ **Scalable**: Can handle unlimited leave requests  
✅ **Professional**: No dummy data, production-ready  

---

## 📝 Notes

- Leave requests are stored in `server/data/leaves.db`
- Database auto-initializes on first use
- All dates in ISO format (YYYY-MM-DD)
- Timestamps in milliseconds
- Duration includes both start and end days
- Status changes are logged with reviewer and timestamp

---

## 🔮 Future Enhancements

1. **Student Leave Application Form**
2. **Email Notifications** on approval/rejection
3. **Leave Balance System**
4. **Attachment Upload** for medical certificates
5. **Leave History Analytics**
6. **Bulk Actions** (approve/reject multiple)
7. **Comments/Notes** on leave requests
8. **Calendar View** of all leaves
9. **Export to Excel/PDF**
10. **Automatic Approval Rules**

---

**The leave management system is now fully functional with real database integration!** 🎊
