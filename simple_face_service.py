"""
Simple Face Recognition Service - No Heavy Dependencies Required
Uses basic OpenCV face detection instead of insightface
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import base64
import numpy as np
import json
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4000"])

# Configuration
SERVICE_PORT = int(os.getenv('FACE_SERVICE_PORT', '5001'))
DATA_DIR = "face_data"
ENROLLED_STUDENTS_FILE = os.path.join(DATA_DIR, "enrolled_students.json")

# Create data directory
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize face detector (built into OpenCV - no extra dependencies)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def load_enrolled_students():
    """Load enrolled students from JSON file"""
    if os.path.exists(ENROLLED_STUDENTS_FILE):
        try:
            with open(ENROLLED_STUDENTS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_enrolled_students(students):
    """Save enrolled students to JSON file"""
    with open(ENROLLED_STUDENTS_FILE, 'w') as f:
        json.dump(students, f, indent=2)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Simple Face Recognition Service',
        'face_recognition_available': True,
        'using': 'OpenCV Haar Cascades',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/students', methods=['GET'])
def get_enrolled_students():
    """Get list of enrolled students"""
    try:
        enrolled = load_enrolled_students()
        return jsonify({
            'success': True,
            'students': enrolled,
            'count': len(enrolled)
        })
    except Exception as e:
        logger.error(f"Error getting enrolled students: {e}")
        return jsonify({
            'error': 'internal_error',
            'message': str(e)
        }), 500

@app.route('/enroll', methods=['POST'])
def enroll_student():
    """
    Enroll a student for face recognition
    Expected payload:
    {
        "student_id": "CS2021001",
        "name": "John Doe",
        "department": "CSE",
        "email": "student@example.com",
        "images": ["base64_image1", "base64_image2", ...]
    }
    """
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        student_name = data.get('name', student_id)
        department = data.get('department', 'Unknown')
        email = data.get('email', '')
        images_b64 = data.get('images', [])
        
        logger.info(f"Enrolling student: {student_name} ({student_id})")
        logger.info(f"Received {len(images_b64)} images")
        
        if not student_id or not images_b64:
            return jsonify({
                'error': 'invalid_request',
                'message': 'Missing student_id or images'
            }), 400
        
        # Create student directory
        student_dir = os.path.join(DATA_DIR, student_id)
        os.makedirs(student_dir, exist_ok=True)
        
        faces_detected = 0
        images_saved = 0
        
        # Process each image
        for i, img_b64 in enumerate(images_b64):
            try:
                # Decode base64 image
                img_data = base64.b64decode(img_b64.split(',')[1] if ',' in img_b64 else img_b64)
                nparr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    logger.warning(f"Could not decode image {i+1}")
                    continue
                
                # Detect faces using OpenCV
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
                
                if len(faces) > 0:
                    faces_detected += 1
                    # Save the image
                    img_path = os.path.join(student_dir, f"face_{i+1}.jpg")
                    cv2.imwrite(img_path, frame)
                    images_saved += 1
                    logger.info(f"Saved image {i+1} with {len(faces)} face(s) detected")
                else:
                    logger.warning(f"No face detected in image {i+1}")
                    
            except Exception as e:
                logger.error(f"Error processing image {i+1}: {e}")
                continue
        
        if faces_detected == 0:
            return jsonify({
                'error': 'no_faces_detected',
                'message': 'No faces were detected in the provided images. Please ensure good lighting and face visibility.',
                'images_processed': len(images_b64),
                'faces_found': 0
            }), 400
        
        # Add student to enrolled list
        enrolled = load_enrolled_students()
        
        # Check if already enrolled
        existing_idx = next((i for i, s in enumerate(enrolled) if s['student_id'] == student_id), None)
        
        student_record = {
            'student_id': student_id,
            'roll_no': student_id,
            'name': student_name,
            'department': department,
            'email': email,
            'enrolled_at': datetime.now().isoformat(),
            'images_count': images_saved,
            'faces_detected': faces_detected
        }
        
        if existing_idx is not None:
            enrolled[existing_idx] = student_record
            logger.info(f"Updated existing enrollment for {student_name}")
        else:
            enrolled.append(student_record)
            logger.info(f"New enrollment for {student_name}")
        
        save_enrolled_students(enrolled)
        
        return jsonify({
            'success': True,
            'message': f'Successfully enrolled {student_name}',
            'student_id': student_id,
            'name': student_name,
            'images_processed': len(images_b64),
            'faces_detected': faces_detected,
            'images_saved': images_saved
        }), 200
        
    except Exception as e:
        logger.error(f"Enrollment error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'internal_error',
            'message': f'Enrollment failed: {str(e)}'
        }), 500

@app.route('/recognize', methods=['POST'])
def recognize_faces():
    """
    Simple recognition endpoint (mock for now)
    In production, you'd implement actual face matching here
    """
    try:
        data = request.get_json()
        image_b64 = data.get('image')
        
        if not image_b64:
            return jsonify({'error': 'Missing image'}), 400
        
        # Decode and detect faces
        img_data = base64.b64decode(image_b64.split(',')[1] if ',' in image_b64 else image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        return jsonify({
            'success': True,
            'faces_detected': len(faces),
            'recognized': [],  # Would contain matched students in production
            'message': f'Detected {len(faces)} face(s)'
        })
        
    except Exception as e:
        logger.error(f"Recognition error: {e}")
        return jsonify({
            'error': 'internal_error',
            'message': str(e)
        }), 500

@app.route('/unenroll/<student_id>', methods=['DELETE'])
def unenroll_student(student_id):
    """Remove a student from enrollment"""
    try:
        enrolled = load_enrolled_students()
        enrolled = [s for s in enrolled if s['student_id'] != student_id]
        save_enrolled_students(enrolled)
        
        # Remove student directory
        student_dir = os.path.join(DATA_DIR, student_id)
        if os.path.exists(student_dir):
            import shutil
            shutil.rmtree(student_dir)
        
        return jsonify({
            'success': True,
            'message': f'Student {student_id} unenrolled successfully'
        })
        
    except Exception as e:
        logger.error(f"Unenroll error: {e}")
        return jsonify({
            'error': 'internal_error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("\n" + "="*60)
    logger.info("Simple Face Recognition Service")
    logger.info("="*60)
    logger.info("Using: OpenCV Haar Cascades (No heavy dependencies)")
    logger.info("No Microsoft C++ Build Tools required!")
    logger.info("\nAvailable endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  GET  /students - List enrolled students")
    logger.info("  POST /enroll - Enroll new student")
    logger.info("  POST /recognize - Recognize faces (basic)")
    logger.info("  DELETE /unenroll/<student_id> - Remove student")
    logger.info(f"\nService running on http://localhost:{SERVICE_PORT}")
    logger.info("="*60 + "\n")
    
    app.run(debug=False, host='0.0.0.0', port=SERVICE_PORT, threaded=True)
