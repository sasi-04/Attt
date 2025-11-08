# Quick Start: Face Recognition Service

## 🚀 Starting the Face Recognition Service

The face recognition feature requires a separate Python service to be running. Follow these steps:

### 1. **Start the Face Recognition Service**
```bash
# Navigate to the project directory
cd d:\AttendanceSystemT1

# Run the face recognition startup script
python start_face_recognition.py
```

### 2. **Alternative Manual Start**
If the startup script doesn't work, start services manually:

```bash
# Terminal 1: Start Face Recognition Service (Python)
cd face_recognition_service
python app.py

# Terminal 2: Start Main Server (Node.js)
cd ..
npm run dev
```

### 3. **Verify Services are Running**
- **Face Recognition Service**: http://localhost:5001
- **Main Application**: http://localhost:5173
- **Backend Server**: http://localhost:3001

### 4. **Test Face Recognition**
1. Login as staff at http://localhost:5173
2. Go to "Students" page
3. Click "👤 Add Face" button for any student
4. Camera should open and capture images successfully

## 🔧 Troubleshooting

### **Error: "Face recognition service is not running"**
- Make sure Python service is running on port 5001
- Check if `face_recognition_service/app.py` exists
- Install required Python packages: `pip install -r requirements.txt`

### **Error: "Cannot connect to face recognition service"**
- Verify the service is accessible at http://localhost:5001
- Check firewall settings
- Ensure no other service is using port 5001

### **Error: "Camera access denied"**
- Allow camera permissions in your browser
- Ensure camera is not being used by other applications
- Try refreshing the page and allowing permissions again

### **Student Creation Issues**
- Make sure the main server is running on port 3001
- Check browser console for detailed error messages
- Verify database files are writable in the `server/data/` directory

## 📋 Service Status Check

You can check if services are running:

```bash
# Check if face recognition service is running
curl http://localhost:5001/health

# Check if main server is running  
curl http://localhost:3001/api/health
```

## 🎯 Quick Test

1. **Create a student**: Use "➕ Add Student" button
2. **Enroll face**: Click "👤 Add Face" for the student
3. **Test recognition**: Use face recognition on student attendance page

The system should now work properly with both student creation and face recognition enrollment!
