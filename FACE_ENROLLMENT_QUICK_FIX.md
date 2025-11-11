# Face Enrollment Quick Fix Guide

## ❌ Error: "Enrollment failed: request_failed"

This means the enrollment request is failing. Follow these steps:

## 🔧 Step 1: Check Face Recognition Service

The **#1 most common issue** is that the Face Recognition Python service is not running.

### Test if service is running:

**Option A: Run the check script**
```bash
cd d:\Attt
node check-face-service.js
```

**Option B: Test manually in browser**
Open: `http://localhost:5001/health`
- ✅ If you see JSON response → Service is running
- ❌ If you see error or timeout → Service is NOT running

### Start the Face Recognition Service:

```bash
# Navigate to your face recognition service folder
cd face_recognition_service  # or wherever your Python service is

# Start the service
python app.py
# or
python face_recognition_server.py
# or
python main.py
```

**The service MUST run on port 5001!**

---

## 🔧 Step 2: Check Server Logs

Look at your server terminal (where you run `node server/index.js`).

You should see these messages when clicking "Add Face":
```
Sending enrollment request to face service: {...}
Face service response status: 200
```

**If you see errors like:**
- `ECONNREFUSED` → Face service is not running
- `403 Access denied` → You're not assigned as advisor
- `401 Authentication` → You're not logged in properly

---

## 🔧 Step 3: Check Browser Console

Press **F12** to open browser console.

Look for these logs:
```
=== FACE ENROLLMENT INITIATED ===
Student data: {...}
Staff info: {isClassAdvisor: true, ...}

=== FACE ENROLLMENT REQUEST ===
Enrollment data: {...}
Number of images: 5
```

**If you see errors:**
- Copy the error message
- Check the error code
- Share it for specific help

---

## 🔧 Step 4: Verify You're Assigned as Advisor

Run this in browser console (F12):
```javascript
const user = JSON.parse(localStorage.getItem('ams_user'))
console.log('Is Advisor:', user.isClassAdvisor)
console.log('Advisor For:', user.advisorFor)
```

**Expected output:**
```
Is Advisor: true
Advisor For: {department: "CSE", year: "2nd Year"}
```

**If `isClassAdvisor` is false:**
- Admin must assign you as class advisor
- Logout and login again after assignment

---

## 🎯 Most Common Solutions

### Issue: Service Not Running
```bash
# Solution: Start the face recognition service
cd face_recognition_service
python app.py
```

### Issue: Not Logged In Properly
```javascript
// Solution: Clear cache and re-login
localStorage.clear()
location.reload()
// Then login again
```

### Issue: Not Assigned as Advisor
```
Solution: Ask admin to:
1. Go to Staff Management
2. Edit your profile
3. Check "Is Class Advisor"
4. Assign your Department and Year
5. Save changes
Then logout and login again
```

---

## ✅ Final Test

After fixing the issue:

1. **Refresh the page** (Ctrl+R)
2. **Navigate to Students page**
3. **Click "Add Face" on a student**
4. **The modal should open and capture images**
5. **After 5 images, it should process**
6. **You should see "✅ Enrollment successful!"**

---

## 🆘 Still Not Working?

1. **Check server logs** for detailed errors
2. **Check browser console (F12)** for error messages
3. **Run diagnostic tool**: `http://localhost:3000/test-face-enrollment.html`
4. **Share the error logs** from console and server

---

## 📝 Quick Checklist

- [ ] Face recognition service running on port 5001?
- [ ] Server running without errors?
- [ ] Logged in as staff member?
- [ ] Assigned as class advisor in database?
- [ ] Browser console shows no errors?
- [ ] Server logs show enrollment request?

If all checkmarks are ✅, enrollment should work!
