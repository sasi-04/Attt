# Face Enrollment Setup Guide

## Issue: "Add Face" Button Not Showing for Year Advisors

If the "Add Face" button is not appearing for staff who should be year advisors, follow these steps:

## Step 1: Verify Advisor Status

### Option A: Use the Diagnostic Tool
1. Open the diagnostic page: `http://localhost:3000/check-advisor-status.html`
2. Enter the staff member's email address
3. Check if they are marked as a class advisor

### Option B: Check Console Logs
When you load the student view page, check the browser console for:
```
=== STAFF INFO LOADED ===
Is Class Advisor: true/false
Advisor For: {department: "...", year: "..."}
Can Add Students: true/false
```

## Step 2: Assign Staff as Class Advisor

If the staff member is **NOT** a class advisor, an admin needs to assign them:

### Via Admin Panel:
1. Login as admin
2. Go to **Staff Management**
3. Find the staff member
4. Click **Edit**
5. Check the **"Is Class Advisor"** checkbox
6. Select their **Department** and **Year**
7. Save changes

### Via API (if needed):
```bash
curl -X PUT http://localhost:3000/api/admin/staff/{staffId} \
  -H "Content-Type: application/json" \
  -d '{
    "isClassAdvisor": true,
    "advisorYear": "1st Year",
    "department": "CS"
  }'
```

## Step 3: Verify Changes

1. **Logout** and **login again** as the staff member
2. Navigate to the students page
3. The staff info should now show:
   - ✅ Is Class Advisor: **true**
   - 📚 Advisor For: **{department: "CS", year: "1st Year"}**
4. The **"👤 Add Face"** button should now appear for non-enrolled students

## Role-Based Access Control

### Advisors CAN:
- ✅ View student profiles
- ✅ Add student faces (face enrollment)
- ✅ Add new students to their department/year
- ✅ View all students in their assigned department/year

### Non-Advisor Staff CAN:
- ✅ View student profiles
- ✅ View face enrollment status
- ❌ **CANNOT** add student faces
- ❌ **CANNOT** add new students

## Troubleshooting

### Problem: "request_failed" error during face enrollment

**Quick Diagnostic Steps:**

1. **Open the test tool**: Navigate to `http://localhost:3000/test-face-enrollment.html`
2. **Follow each step** in the diagnostic tool
3. **Check the console log** at the bottom for detailed error messages

**Or manually check:**

Open browser console (F12) and look for:
```
=== FACE ENROLLMENT INITIATED ===
Student data: {...}
Staff info: {...}
=== FACE ENROLLMENT REQUEST ===
Enrollment data: {...}
Error code: ...
Error status: ...
```

**Common Causes:**

1. **Not logged in properly**
   - Solution: Logout and login again
   - Check localStorage has `ams_user` with email

2. **Staff not assigned as advisor**
   - Solution: Admin must assign you as class advisor
   - Check: Use diagnostic tool or console logs

3. **Face recognition service not running**
   - Solution: Start the face recognition service on port 5001
   - Check: Look for "network_error" in console

4. **Authorization failed**
   - Solution: Verify you're the advisor for that specific year
   - Check: Console should show your advisorFor info

### Problem: Still not showing after assignment
**Solution:** Clear browser cache and localStorage:
```javascript
// Run in browser console
localStorage.clear()
location.reload()
```

### Problem: "Staff not found" error
**Solution:** Verify the staff member exists in the database and their email is correct

### Problem: API returns 403 Forbidden
**Solution:** 
1. Check that `isClassAdvisor` is set to `true` in the database
2. Verify `advisorFor` object contains both `department` and `year`
3. Restart the server to ensure database changes are loaded

### Problem: Button shows but enrollment fails
**Solution:** Check server logs for authorization errors. The server validates:
- Staff email is in request headers
- Staff exists in database
- Staff has `isClassAdvisor = true`

## Database Structure

Staff member in database should have:
```json
{
  "email": "advisor@example.com",
  "name": "Staff Name",
  "department": "CS",
  "isClassAdvisor": true,
  "advisorFor": {
    "department": "CS",
    "year": "1st Year"
  },
  "accessLevel": "class_advisor"
}
```

## Test the Setup

1. **Login as the advisor**
2. **Open browser console** (F12)
3. **Navigate to Students page**
4. Look for the debug output showing advisor status
5. **Check for "👤 Add Face" buttons** next to students who are not enrolled
6. **Click "Add Face"** on a student
7. The face enrollment modal should open
8. If it fails, check the server logs for authorization errors

## Security Notes

- ✅ **Frontend** checks hide buttons from non-advisors
- ✅ **Backend** validates advisor role before processing enrollment
- ✅ **Authentication** uses staff email in request headers
- ✅ Only advisors can enroll faces - enforced at both levels

## Support

If issues persist:
1. Check server logs: `node server/index.js`
2. Check browser console for errors
3. Verify database has correct staff data
4. Use the diagnostic tool: `/check-advisor-status.html`
