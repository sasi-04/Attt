"""
Face Recognition Microservice for Attendance System
Provides REST API endpoints for face recognition functionality
Integrates with existing Node.js/Express attendance system
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import cv2
import base64
import numpy as np
import json
import pandas as pd
from datetime import datetime
import os
import threading
import time
import requests
from concurrent.futures import ThreadPoolExecutor
import logging

# Configure logging first
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import face recognition system, but make it optional
try:
    from face_attendance_system import FaceAttendanceSystem
    FACE_RECOGNITION_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Face recognition system not available: {e}")
    logger.warning("Service will start but face recognition features will be disabled.")
    logger.warning("Install required dependencies: pip install insightface")
    FACE_RECOGNITION_AVAILABLE = False
    FaceAttendanceSystem = None
except Exception as e:
    logger.error(f"Error importing face recognition system: {e}")
    FACE_RECOGNITION_AVAILABLE = False
    FaceAttendanceSystem = None

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:4000"])

# Initialize face recognition system (if available)
face_system = None
if FACE_RECOGNITION_AVAILABLE:
    try:
        face_system = FaceAttendanceSystem(
            similarity_threshold=0.4,
            presence_frames=3,  # Reduced for faster response
            data_dir="data"
        )
        logger.info("Face recognition system initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize face recognition system: {e}")
        FACE_RECOGNITION_AVAILABLE = False
        face_system = None
else:
    logger.warning("Face recognition system is not available - service running in limited mode")

# Thread pool for concurrent processing
executor = ThreadPoolExecutor(max_workers=4)

# Configuration
MAIN_SERVER_URL = os.getenv('MAIN_SERVER_URL', 'http://localhost:3000')
SERVICE_PORT = int(os.getenv('FACE_SERVICE_PORT', '5001'))

class RecognitionSession:
    """Manages active recognition sessions"""
    def __init__(self):
        self.sessions = {}
        self.lock = threading.Lock()
    
    def create_session(self, session_id, course_id, department, year):
        with self.lock:
            self.sessions[session_id] = {
                'course_id': course_id,
                'department': department,
                'year': year,
                'created_at': datetime.now(),
                'recognized_students': set(),
                'active': True
            }
            logger.info(f"Created recognition session {session_id} for {department} {year}")
    
    def get_session(self, session_id):
        with self.lock:
            return self.sessions.get(session_id)
    
    def add_recognized_student(self, session_id, student_id):
        with self.lock:
            if session_id in self.sessions:
                self.sessions[session_id]['recognized_students'].add(student_id)
                return True
        return False
    
    def is_student_recognized(self, session_id, student_id):
        with self.lock:
            session = self.sessions.get(session_id)
            return session and student_id in session['recognized_students']
    
    def close_session(self, session_id):
        with self.lock:
            if session_id in self.sessions:
                self.sessions[session_id]['active'] = False
                logger.info(f"Closed recognition session {session_id}")

# Global session manager
session_manager = RecognitionSession()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    response = {
        'status': 'healthy',
        'service': 'face_recognition',
        'timestamp': datetime.now().isoformat(),
        'face_recognition_available': FACE_RECOGNITION_AVAILABLE
    }
    
    if face_system:
        response['enrolled_students'] = len(face_system.student_embeddings)
    else:
        response['enrolled_students'] = 0
        response['warning'] = 'Face recognition system not initialized. Install insightface to enable face recognition features.'
    
    response['active_sessions'] = len([s for s in session_manager.sessions.values() if s['active']])
    
    return jsonify(response)

@app.route('/students', methods=['GET'])
def get_enrolled_students():
    """Get list of enrolled students for face recognition"""
    if not FACE_RECOGNITION_AVAILABLE or not face_system:
        return jsonify({
            'students': [],
            'total_count': 0,
            'warning': 'Face recognition system not available'
        })
    
    students = []
    for name, data in face_system.student_embeddings.items():
        students.append({
            'student_id': name,
            'name': name,
            'num_images': data['num_images'],
            'confidence_threshold': face_system.similarity_threshold
        })
    
    return jsonify({
        'students': students,
        'total_count': len(students),
        'threshold': face_system.similarity_threshold
    })

@app.route('/enroll', methods=['POST'])
def enroll_student():
    """
    Enroll a student for face recognition
    Expected payload:
    {
        "student_id": "CS2021001",
        "name": "John Doe", 
        "images": ["base64_image1", "base64_image2", ...]
    }
    """
    if not FACE_RECOGNITION_AVAILABLE or not face_system:
        return jsonify({
            'error': 'face_recognition_unavailable',
            'message': 'Face recognition system is not available. Please install required dependencies.',
            'details': 'Install insightface: pip install insightface (requires Microsoft Visual C++ Build Tools on Windows)'
        }), 503
    
    try:
        data = request.get_json()
        student_id = data.get('student_id')
        student_name = data.get('name', student_id)
        images_b64 = data.get('images', [])
        
        if not student_id or not images_b64:
            return jsonify({'error': 'Missing student_id or images'}), 400
        
        # Create student directory
        student_dir = os.path.join(face_system.students_dir, student_id)
        os.makedirs(student_dir, exist_ok=True)
        
        embeddings_list = []
        saved_count = 0
        
        for i, img_b64 in enumerate(images_b64):
            try:
                # Decode base64 image
                img_data = base64.b64decode(img_b64)
                nparr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if frame is None:
                    continue
                
                # Detect faces
                faces = face_system.app.get(frame)
                
                if len(faces) > 0:
                    # Use the best quality face
                    best_face = max(faces, key=lambda x: x.det_score)
                    if best_face.det_score > 0.5:
                        # Save image
                        img_filename = f"img_{saved_count+1:03d}.jpg"
                        img_path = os.path.join(student_dir, img_filename)
                        cv2.imwrite(img_path, frame)
                        
                        # Store embedding
                        embeddings_list.append(best_face.embedding)
                        saved_count += 1
                
            except Exception as e:
                logger.error(f"Error processing image {i} for {student_id}: {e}")
                continue
        
        if saved_count > 0:
            # Average embeddings for robustness
            avg_embedding = np.mean(embeddings_list, axis=0)
            face_system.student_embeddings[student_id] = {
                'embedding': avg_embedding,
                'all_embeddings': embeddings_list,
                'num_images': saved_count,
                'name': student_name,
                'enrolled_at': datetime.now().isoformat()
            }
            
            face_system._save_embeddings()
            
            logger.info(f"Successfully enrolled {student_id} ({student_name}) with {saved_count} images")
            
            return jsonify({
                'success': True,
                'message': f'Successfully enrolled {student_name}',
                'student_id': student_id,
                'images_processed': saved_count,
                'threshold': face_system.similarity_threshold
            })
        else:
            return jsonify({'error': 'No valid faces found in images'}), 400
            
    except Exception as e:
        logger.error(f"Enrollment error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/session/start', methods=['POST'])
def start_recognition_session():
    """
    Start a face recognition session for attendance
    Expected payload:
    {
        "session_id": "S_1699012345",
        "course_id": "21CS701",
        "department": "Computer Science",
        "year": "4th Year"
    }
    """
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        course_id = data.get('course_id')
        department = data.get('department')
        year = data.get('year')
        
        if not all([session_id, course_id, department, year]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        session_manager.create_session(session_id, course_id, department, year)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'Face recognition session started',
            'enrolled_students': len(face_system.student_embeddings)
        })
        
    except Exception as e:
        logger.error(f"Session start error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/session/<session_id>/close', methods=['POST'])
def close_recognition_session(session_id):
    """Close a face recognition session"""
    try:
        session_manager.close_session(session_id)
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'Face recognition session closed'
        })
    except Exception as e:
        logger.error(f"Session close error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/recognize', methods=['POST'])
def recognize_face():
    """
    Recognize face from base64 encoded image and mark attendance
    Expected payload:
    {
        "image": "base64_encoded_image",
        "session_id": "S_1699012345"
    }
    """
    try:
        data = request.get_json()
        img_b64 = data.get('image')
        session_id = data.get('session_id')
        
        if not img_b64:
            return jsonify({'error': 'Missing image data'}), 400
        
        if not session_id:
            return jsonify({'error': 'Missing session_id'}), 400
        
        # Check if session exists and is active
        session = session_manager.get_session(session_id)
        if not session or not session['active']:
            return jsonify({'error': 'Invalid or inactive session'}), 400
        
        # Decode base64 image
        try:
            img_data = base64.b64decode(img_b64)
            nparr = np.frombuffer(img_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            return jsonify({'error': 'Invalid image data'}), 400
        
        if frame is None:
            return jsonify({'error': 'Could not decode image'}), 400
        
        # Detect faces
        faces = face_system.app.get(frame)
        
        if len(faces) == 0:
            return jsonify({
                'success': False,
                'message': 'No face detected',
                'faces_detected': 0,
                'recognized': False
            })
        
        results = []
        best_recognition = None
        
        for face in faces:
            # Recognize face
            student_id, confidence = face_system.recognize_face(face.embedding)
            
            bbox = face.bbox.astype(int).tolist()
            
            result = {
                'bbox': bbox,
                'confidence': float(confidence),
                'student_id': student_id,
                'recognized': student_id is not None,
                'detection_score': float(face.det_score)
            }
            
            if student_id and (not best_recognition or confidence > best_recognition['confidence']):
                best_recognition = result
            
            results.append(result)
        
        # If we have a recognized student, mark attendance
        if best_recognition and best_recognition['recognized']:
            student_id = best_recognition['student_id']
            
            # Check if already recognized in this session
            if session_manager.is_student_recognized(session_id, student_id):
                return jsonify({
                    'success': True,
                    'message': f'Student {student_id} already marked present in this session',
                    'student_id': student_id,
                    'confidence': best_recognition['confidence'],
                    'already_marked': True,
                    'faces_detected': len(faces),
                    'results': results
                })
            
            # Mark attendance in main system
            attendance_result = mark_attendance_in_main_system(
                session_id, 
                student_id, 
                best_recognition['confidence'],
                session['department'],
                session['year']
            )
            
            if attendance_result['success']:
                # Add to session's recognized students
                session_manager.add_recognized_student(session_id, student_id)
                
                return jsonify({
                    'success': True,
                    'message': f'Attendance marked for {student_id}',
                    'student_id': student_id,
                    'confidence': best_recognition['confidence'],
                    'attendance_logged': True,
                    'marked_at': attendance_result.get('marked_at'),
                    'faces_detected': len(faces),
                    'results': results
                })
            else:
                return jsonify({
                    'success': False,
                    'message': f'Face recognized but attendance marking failed: {attendance_result.get("error")}',
                    'student_id': student_id,
                    'confidence': best_recognition['confidence'],
                    'attendance_logged': False,
                    'faces_detected': len(faces),
                    'results': results
                })
        else:
            return jsonify({
                'success': False,
                'message': 'Face not recognized',
                'faces_detected': len(faces),
                'recognized': False,
                'results': results
            })
        
    except Exception as e:
        logger.error(f"Recognition error: {e}")
        return jsonify({'error': str(e)}), 500

def mark_attendance_in_main_system(session_id, student_id, confidence, department, year):
    """Mark attendance in the main Node.js system"""
    try:
        # Prepare the attendance data
        attendance_data = {
            'sessionId': session_id,
            'studentId': student_id,
            'confidence': confidence,
            'source': 'face_recognition',
            'department': department,
            'year': year,
            'timestamp': datetime.now().isoformat()
        }
        
        # Call the main system's attendance endpoint
        response = requests.post(
            f"{MAIN_SERVER_URL}/attendance/face-recognition",
            json=attendance_data,
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Successfully marked attendance for {student_id} in session {session_id}")
            return {
                'success': True,
                'marked_at': result.get('markedAt'),
                'message': result.get('message')
            }
        else:
            logger.error(f"Failed to mark attendance: {response.status_code} - {response.text}")
            return {
                'success': False,
                'error': f"HTTP {response.status_code}: {response.text}"
            }
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error marking attendance: {e}")
        return {
            'success': False,
            'error': f"Network error: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Unexpected error marking attendance: {e}")
        return {
            'success': False,
            'error': f"Unexpected error: {str(e)}"
        }

@app.route('/settings', methods=['GET', 'POST'])
def handle_settings():
    """Get or update face recognition settings"""
    if request.method == 'GET':
        return jsonify({
            'similarity_threshold': face_system.similarity_threshold,
            'presence_frames': face_system.presence_frames,
            'enrolled_students_count': len(face_system.student_embeddings),
            'service_status': 'running'
        })
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            
            if 'similarity_threshold' in data:
                threshold = float(data['similarity_threshold'])
                if 0.0 <= threshold <= 1.0:
                    face_system.similarity_threshold = threshold
                    logger.info(f"Updated similarity threshold to {threshold}")
                else:
                    return jsonify({'error': 'Threshold must be between 0.0 and 1.0'}), 400
            
            if 'presence_frames' in data:
                frames = int(data['presence_frames'])
                if frames > 0:
                    face_system.presence_frames = frames
                    logger.info(f"Updated presence frames to {frames}")
                else:
                    return jsonify({'error': 'Presence frames must be positive'}), 400
            
            return jsonify({
                'success': True,
                'message': 'Settings updated successfully',
                'current_settings': {
                    'similarity_threshold': face_system.similarity_threshold,
                    'presence_frames': face_system.presence_frames
                }
            })
            
        except Exception as e:
            logger.error(f"Settings update error: {e}")
            return jsonify({'error': str(e)}), 500

@app.route('/test-connection', methods=['GET'])
def test_main_system_connection():
    """Test connection to main attendance system"""
    try:
        response = requests.get(f"{MAIN_SERVER_URL}/health", timeout=5)
        if response.status_code == 200:
            return jsonify({
                'success': True,
                'message': 'Connection to main system successful',
                'main_system_status': response.json()
            })
        else:
            return jsonify({
                'success': False,
                'message': f'Main system returned status {response.status_code}'
            })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Connection failed: {str(e)}'
        })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logger.info("Starting Face Recognition Microservice...")
    logger.info("Available endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  GET  /students - List enrolled students")
    logger.info("  POST /enroll - Enroll new student")
    logger.info("  POST /session/start - Start recognition session")
    logger.info("  POST /session/<id>/close - Close recognition session")
    logger.info("  POST /recognize - Recognize faces and mark attendance")
    logger.info("  GET/POST /settings - Get/update settings")
    logger.info("  GET  /test-connection - Test main system connection")
    logger.info(f"\nMicroservice running on http://localhost:{SERVICE_PORT}")
    logger.info(f"Main system URL: {MAIN_SERVER_URL}")
    
    app.run(debug=False, host='0.0.0.0', port=SERVICE_PORT, threaded=True)
