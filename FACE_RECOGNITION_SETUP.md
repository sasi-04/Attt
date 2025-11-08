# Face Recognition Attendance System Setup Guide

## Overview
This is a high-accuracy face recognition attendance system using RetinaFace for detection and InsightFace/ArcFace for recognition, designed to achieve >90% accuracy.

## Features
- **High Accuracy**: Uses state-of-the-art RetinaFace + InsightFace models
- **Multi-view Robustness**: Captures multiple angles per student for better recognition
- **Anti-spoofing**: Basic blink detection and quality checks
- **Real-time Processing**: Live webcam feed with instant recognition
- **Attendance Logging**: CSV-based attendance records with timestamps
- **Modular Design**: Easy integration with existing web applications

## Installation

### 1. Install Python Dependencies
```bash
pip install -r face_recognition_requirements.txt
```

### 2. Download InsightFace Models
The system will automatically download required models on first run. Ensure you have internet connection.

### 3. Hardware Requirements
- **Camera**: USB webcam or laptop camera
- **CPU**: Intel i5 or equivalent (GPU optional but recommended)
- **RAM**: Minimum 4GB, recommended 8GB
- **Storage**: 1GB for models + storage for student images

## Usage

### Running the System
```bash
python face_attendance_system.py
```

### Main Menu Options

#### 1. Enroll New Student
- Enter student name/ID when prompted
- Position face in camera view
- Press 'c' to capture images (30 recommended)
- System automatically detects faces and saves only quality images
- Creates folder structure: `data/students/<student_name>/`

#### 2. Start Recognition/Attendance
- Opens live camera feed
- Recognizes enrolled students in real-time
- Shows confidence scores and student names
- Automatically logs attendance (once per day per student)
- Color coding:
  - **Green**: Recognized student
  - **Yellow**: Recognizing (partial confirmation)
  - **Red**: Unknown face

#### 3. List Enrolled Students
- Shows all enrolled students and number of images captured

#### 4. View Attendance Log
- Displays CSV attendance records with timestamps

#### 5. Adjust Similarity Threshold
- Default: 0.4 (lower = stricter matching)
- Range: 0.0 to 1.0
- Recommended: 0.3-0.5 for high accuracy

## File Structure
```
AttendanceSystemT1/
├── face_attendance_system.py          # Main application
├── face_recognition_requirements.txt  # Dependencies
├── data/                             # Generated data folder
│   ├── students/                     # Student images
│   │   └── <student_name>/          # Individual student folders
│   │       ├── img_001.jpg          # Captured images
│   │       └── ...
│   ├── embeddings.pkl               # Face embeddings database
│   └── attendance_log.csv           # Attendance records
└── FACE_RECOGNITION_SETUP.md        # This guide
```

## Accuracy Optimization

### For >90% Accuracy:
1. **Quality Enrollment**:
   - Capture 30-50 images per student
   - Vary lighting conditions
   - Include different angles and expressions
   - Ensure clear, unobstructed face views

2. **Threshold Tuning**:
   - Start with default 0.4
   - Lower to 0.3 for stricter matching
   - Higher to 0.5 for more lenient matching

3. **Environmental Factors**:
   - Consistent lighting during recognition
   - Clear camera lens
   - Stable camera position

### Multi-view Enhancement:
The system automatically:
- Averages multiple embeddings per student
- Compares against both average and individual embeddings
- Uses sliding window for presence confirmation

## Integration with Web Applications

### Method 1: Direct Function Calls
```python
from face_attendance_system import FaceAttendanceSystem

# Initialize system
system = FaceAttendanceSystem()

# Enroll student programmatically
system.enroll_student("student_123", num_images=30)

# Get attendance data
import pandas as pd
attendance_df = pd.read_csv("data/attendance_log.csv")
```

### Method 2: REST API Wrapper
Create a Flask/FastAPI wrapper around the core functions for web integration.

## Troubleshooting

### Common Issues:

1. **Camera not detected**:
   - Check camera permissions
   - Try different camera index: `cv2.VideoCapture(1)` instead of `cv2.VideoCapture(0)`

2. **Low recognition accuracy**:
   - Re-enroll with more diverse images
   - Adjust similarity threshold
   - Ensure good lighting conditions

3. **Model download fails**:
   - Check internet connection
   - Manually download models to `~/.insightface/models/`

4. **Performance issues**:
   - Reduce camera resolution
   - Use GPU if available: Change providers to `['CUDAExecutionProvider']`

### Performance Optimization:
```python
# For GPU acceleration (if available)
self.app = FaceAnalysis(providers=['CUDAExecutionProvider', 'CPUExecutionProvider'])

# For faster processing (lower accuracy)
self.app.prepare(ctx_id=0, det_size=(320, 320))  # Smaller detection size
```

## Security Considerations

1. **Data Protection**: Student images and embeddings contain biometric data
2. **Access Control**: Implement proper authentication for enrollment
3. **Privacy**: Consider data retention policies
4. **Anti-spoofing**: Current implementation has basic checks; consider advanced methods for high-security applications

## Technical Details

### Models Used:
- **Detection**: RetinaFace (via InsightFace)
- **Recognition**: ArcFace embeddings (512-dimensional)
- **Quality**: Detection confidence scoring

### Accuracy Features:
- Cosine similarity matching
- Multi-embedding comparison
- Sliding window presence confirmation
- Quality-based image filtering
- Confidence score thresholding

## Support and Customization

### Customization Options:
- Adjust capture count per student
- Modify similarity thresholds
- Change presence confirmation frames
- Add custom anti-spoofing methods
- Integrate with different databases

### For Production Use:
- Add database integration (MySQL/PostgreSQL)
- Implement user authentication
- Add web interface
- Set up proper logging and monitoring
- Consider edge cases and error handling

## License and Credits
- InsightFace: https://github.com/deepinsight/insightface
- OpenCV: https://opencv.org/
- Built for educational and commercial use
