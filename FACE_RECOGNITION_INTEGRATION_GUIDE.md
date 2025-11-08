# Face Recognition Integration Guide

## Overview
This guide explains how to integrate the face recognition system with your existing attendance website using a microservice architecture. The system provides real-time face recognition for automatic attendance marking alongside your existing QR code system.

## Architecture

```
┌─────────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│   React Frontend    │    │   Express.js API     │    │  Face Recognition   │
│   (Port 5173)       │◄──►│   (Port 3001)        │◄──►│   Microservice      │
│                     │    │                      │    │   (Port 5001)       │
│ - Student UI        │    │ - Proxy Endpoints    │    │ - InsightFace       │
│ - Camera Component  │    │ - Session Management │    │ - RetinaFace        │
│ - QR Scanner        │    │ - Database           │    │ - REST API          │
└─────────────────────┘    └──────────────────────┘    └─────────────────────┘
```

## Files Created/Modified

### New Files:
- `face_recognition_service.py` - Standalone microservice
- `face_attendance_system.py` - Core face recognition module
- `src/components/FaceRecognitionCamera.jsx` - React camera component
- `face_recognition_requirements.txt` - Python dependencies

### Modified Files:
- `server/index.js` - Added face recognition endpoints
- `src/pages/student/Attendance.jsx` - Added face recognition option

## Installation & Setup

### 1. Install Python Dependencies

```bash
# Install face recognition dependencies
pip install -r face_recognition_requirements.txt
```

### 2. Install Node.js Dependencies (if not already installed)

```bash
# Install existing project dependencies
npm install
```

### 3. Environment Variables

Create or update your `.env` file:

```env
# Existing variables
PORT=3001
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-jwt-secret

# Face Recognition Service
FACE_SERVICE_URL=http://localhost:5001
FACE_SERVICE_PORT=5001
MAIN_SERVER_URL=http://localhost:3001
```

## Deployment Instructions

### Method 1: Development Mode (Recommended for Testing)

#### Terminal 1: Start Face Recognition Microservice
```bash
python face_recognition_service.py
```
**Output:** Face Recognition Microservice running on http://localhost:5001

#### Terminal 2: Start Main Application
```bash
npm run dev
```
**Output:** 
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

### Method 2: Production Mode

#### Step 1: Build Frontend
```bash
npm run build
```

#### Step 2: Start Services
```bash
# Terminal 1: Face Recognition Service
python face_recognition_service.py

# Terminal 2: Main Application (serves both API and built frontend)
npm start
```

### Method 3: Using Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'attendance-api',
      script: 'server/index.js',
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'face-recognition-service',
      script: 'face_recognition_service.py',
      interpreter: 'python',
      env: {
        FACE_SERVICE_PORT: 5001,
        MAIN_SERVER_URL: 'http://localhost:3001'
      }
    }
  ]
}
EOF

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Testing the Integration

### 1. Service Health Check

```bash
# Test main API
curl http://localhost:3001/health

# Test face recognition service
curl http://localhost:5001/health

# Test integration
curl http://localhost:3001/face-recognition/status
```

### 2. Student Enrollment for Face Recognition

#### Option A: Via API (for bulk enrollment)
```bash
curl -X POST http://localhost:5001/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "CS2021001",
    "name": "John Doe",
    "images": ["base64_encoded_image1", "base64_encoded_image2"]
  }'
```

#### Option B: Via Web Interface
1. Navigate to http://localhost:5173
2. Login as admin/staff
3. Go to Face Recognition Management (if implemented)
4. Enroll students with camera

### 3. Test Face Recognition Attendance

1. **Access Student Portal:**
   - Navigate to http://localhost:5173
   - Login as student
   - Go to Attendance page

2. **Test Face Recognition:**
   - Click "Face Recognition" option
   - Click "Start Face Recognition"
   - Position face in camera frame
   - Verify attendance is marked

3. **Verify in Database:**
   - Check attendance records in admin dashboard
   - Verify source is marked as "face_recognition"

## API Endpoints

### Main Server (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/face-recognition/status` | Check service availability |
| POST | `/face-recognition/session/start` | Start recognition session |
| POST | `/attendance/face-recognition` | Mark attendance via face recognition |
| POST | `/face-recognition/enroll` | Proxy to enrollment service |
| GET | `/face-recognition/students` | Get enrolled students |

### Face Recognition Service (Port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |
| POST | `/enroll` | Enroll student for face recognition |
| POST | `/session/start` | Start recognition session |
| POST | `/recognize` | Recognize face in image |
| GET | `/students` | List enrolled students |
| GET/POST | `/settings` | Get/update recognition settings |

## Configuration

### Face Recognition Settings

```python
# In face_recognition_service.py
face_system = FaceAttendanceSystem(
    similarity_threshold=0.4,    # Lower = stricter matching
    presence_frames=3,           # Frames needed for confirmation
    data_dir="data"             # Data storage directory
)
```

### Camera Settings

```javascript
// In FaceRecognitionCamera.jsx
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user'
  }
})
```

## Troubleshooting

### Common Issues

#### 1. Face Recognition Service Not Starting
```bash
# Check Python dependencies
pip list | grep -E "(opencv|insightface|flask)"

# Check port availability
netstat -an | grep 5001

# Check logs
python face_recognition_service.py
```

#### 2. Camera Access Denied
- **Chrome:** Go to Settings → Privacy → Camera → Allow for localhost
- **Firefox:** Click camera icon in address bar → Allow
- **HTTPS Required:** For production, use HTTPS for camera access

#### 3. Face Recognition Not Working
```bash
# Check service connection
curl http://localhost:5001/health

# Check enrolled students
curl http://localhost:5001/students

# Test recognition manually
curl -X POST http://localhost:5001/recognize \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_image", "session_id": "test_session"}'
```

#### 4. Poor Recognition Accuracy
- **Lighting:** Ensure good, even lighting on face
- **Distance:** Position face 2-3 feet from camera
- **Angle:** Look directly at camera
- **Enrollment:** Capture 30+ images during enrollment
- **Threshold:** Adjust similarity_threshold (lower = stricter)

### Performance Optimization

#### 1. GPU Acceleration (Optional)
```python
# In face_recognition_service.py
self.app = FaceAnalysis(providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])
```

#### 2. Reduce Processing Load
```python
# Smaller detection size for faster processing
self.app.prepare(ctx_id=0, det_size=(320, 320))

# Increase recognition interval
recognitionIntervalRef.current = setInterval(captureAndRecognize, 3000) // 3 seconds
```

#### 3. Concurrent Processing
```python
# Increase thread pool size
executor = ThreadPoolExecutor(max_workers=8)
```

## Security Considerations

### 1. Data Protection
- Face embeddings contain biometric data
- Store embeddings securely
- Implement proper access controls
- Consider data retention policies

### 2. Network Security
```javascript
// Use HTTPS in production
const FACE_SERVICE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain.com:5001' 
  : 'http://localhost:5001'
```

### 3. Authentication
- Implement proper session management
- Validate user permissions before enrollment
- Log all face recognition activities

## Production Deployment

### 1. Docker Deployment

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  attendance-api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - FACE_SERVICE_URL=http://face-service:5001
    depends_on:
      - face-service

  face-service:
    build:
      context: .
      dockerfile: Dockerfile.face
    ports:
      - "5001:5001"
    volumes:
      - ./data:/app/data
    environment:
      - MAIN_SERVER_URL=http://attendance-api:3001
```

### 2. Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /face-api/ {
        proxy_pass http://localhost:5001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. SSL/HTTPS Setup
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring & Logging

### 1. Application Logs
```bash
# Main application logs
tail -f server.log

# Face recognition service logs
python face_recognition_service.py 2>&1 | tee face_service.log
```

### 2. Health Monitoring
```bash
#!/bin/bash
# health_check.sh
curl -f http://localhost:3001/health && \
curl -f http://localhost:5001/health || \
echo "Service down at $(date)" >> health.log
```

### 3. Performance Metrics
- Monitor CPU/memory usage during face recognition
- Track recognition accuracy and response times
- Log attendance marking success rates

## Integration with Existing Features

### 1. QR Code Compatibility
- Face recognition works alongside existing QR system
- Students can choose their preferred method
- Same attendance database and session management

### 2. Admin Dashboard Integration
- Real-time face recognition events via WebSocket
- Face recognition statistics in dashboard
- Enrollment management interface

### 3. Mobile Compatibility
- Camera component works on mobile browsers
- Responsive design for different screen sizes
- Touch-friendly interface

## Support & Maintenance

### 1. Regular Updates
```bash
# Update face recognition models
pip install --upgrade insightface

# Update Node.js dependencies
npm update

# Backup face recognition data
cp -r data/ backup/data_$(date +%Y%m%d)/
```

### 2. Database Maintenance
```sql
-- Clean old attendance records (optional)
DELETE FROM attendance WHERE timestamp < DATE('now', '-1 year');

-- Optimize database
VACUUM;
```

### 3. Model Retraining
- Periodically retrain with new student images
- Adjust similarity thresholds based on accuracy metrics
- Update enrollment data for graduated students

This integration provides a seamless face recognition system that works alongside your existing QR-based attendance system, offering students multiple convenient ways to mark their attendance.
