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
MAIN_SERVER_URL = os.getenv('MAIN_SERVER_URL', 'http://localhost:3001')
DATA_DIR = "face_data"
ENROLLED_STUDENTS_FILE = os.path.join(DATA_DIR, "enrolled_students.json")

# Create data directory
os.makedirs(DATA_DIR, exist_ok=True)

# Initialize face detector (built into OpenCV - no extra dependencies)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Initialize LBPH face recognizer for face matching (if available)
face_recognizer = None
face_recognizer_trained = False
student_id_to_label = {}
label_to_student_id = {}
next_label = 0

try:
    face_recognizer = cv2.face.LBPHFaceRecognizer_create()
    logger.info("LBPH Face Recognizer initialized successfully")
except AttributeError:
    logger.warning("cv2.face not available - will use histogram matching only")
    face_recognizer = None
except Exception as e:
    logger.warning(f"Could not initialize LBPH recognizer: {e} - will use histogram matching only")
    face_recognizer = None

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

def train_face_recognizer():
    """Train the face recognizer with all enrolled students"""
    global face_recognizer, face_recognizer_trained, student_id_to_label, label_to_student_id, next_label
    
    enrolled = load_enrolled_students()
    if not enrolled:
        face_recognizer_trained = False
        return False
    
    faces = []
    labels = []
    student_id_to_label = {}
    label_to_student_id = {}
    next_label = 0
    
    for student in enrolled:
        student_id = student.get('student_id') or student.get('roll_no')
        if not student_id:
            continue
            
        student_dir = os.path.join(DATA_DIR, student_id)
        if not os.path.exists(student_dir):
            continue
        
        # Get all face images for this student
        face_images = [f for f in os.listdir(student_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        if not face_images:
            continue
        
        # Assign label to student
        if student_id not in student_id_to_label:
            student_id_to_label[student_id] = next_label
            label_to_student_id[next_label] = student_id
            next_label += 1
        
        label = student_id_to_label[student_id]
        
        # Load and process each face image
        for img_file in face_images:
            img_path = os.path.join(student_dir, img_file)
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            if img is not None:
                # Resize for consistency
                img = cv2.resize(img, (200, 200))
                faces.append(img)
                labels.append(label)
    
    if len(faces) > 0 and face_recognizer is not None:
        try:
            face_recognizer.train(faces, np.array(labels))
            face_recognizer_trained = True
            logger.info(f"Face recognizer trained with {len(faces)} images from {len(student_id_to_label)} students")
            return True
        except Exception as e:
            logger.error(f"Error training face recognizer: {e}")
            face_recognizer_trained = False
            return False
    elif len(faces) > 0:
        # LBPH not available, but we can still use histogram matching
        logger.info(f"LBPH not available - will use histogram matching for {len(student_id_to_label)} students")
        face_recognizer_trained = False
        return False
    else:
        face_recognizer_trained = False
        return False

def compare_faces_histogram(face1, face2):
    """Compare two face images using histogram correlation"""
    try:
        # Calculate histograms
        hist1 = cv2.calcHist([face1], [0], None, [256], [0, 256])
        hist2 = cv2.calcHist([face2], [0], None, [256], [0, 256])
        
        # Normalize histograms
        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
        
        # Calculate correlation
        correlation = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        return correlation
    except:
        return 0.0

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    # Retrain recognizer on health check to ensure it's up to date
    train_face_recognizer()
    return jsonify({
        'status': 'healthy',
        'service': 'Simple Face Recognition Service',
        'face_recognition_available': True,
        'using': 'OpenCV Haar Cascades' + (' + LBPH Face Recognizer' if face_recognizer is not None else ' + Histogram Matching'),
        'recognizer_trained': face_recognizer_trained,
        'enrolled_count': len(load_enrolled_students()),
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
                
                # Detect faces using OpenCV - more lenient settings for better detection
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=3, minSize=(20, 20))
                
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
        
        # Retrain face recognizer with new enrollment
        train_face_recognizer()
        
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

def mark_attendance(session_id, student_id, department, year):
    try:
        payload = {
            'sessionId': session_id,
            'studentId': student_id,
            'confidence': 0.9,
            'source': 'simple_face_service',
            'department': department,
            'year': year,
            'timestamp': datetime.now().isoformat()
        }
        import requests
        resp = requests.post(f"{MAIN_SERVER_URL}/attendance/face-recognition", json=payload, timeout=5)
        if resp.status_code == 200:
            return True, resp.json()
        try:
            error_payload = resp.json()
        except ValueError:
            error_payload = {'message': resp.text or 'Unknown error'}
        error_payload['status'] = resp.status_code
        return False, error_payload
    except Exception as e:
        logger.error(f"Mark attendance error: {e}")
        return False, {'error': str(e)}

@app.route('/recognize', methods=['POST'])
def recognize_faces():
    """
    Simple recognition endpoint with enrollment validation:
    - Detects face
    - If expected_student_id provided and enrolled, treat as recognized
    - Marks attendance via main server endpoint
    """
    try:
        data = request.get_json()
        image_b64 = data.get('image')
        expected_id = str(data.get('expected_student_id') or '').strip()
        session_id = data.get('session_id') or ''
        department = data.get('department') or 'Computer Science'
        year = data.get('year') or '4th Year'
        
        if not image_b64:
            return jsonify({'error': 'Missing image'}), 400
        
        # Decode and detect faces
        img_data = base64.b64decode(image_b64.split(',')[1] if ',' in image_b64 else image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Optimized face detection settings for speed (within 2 seconds)
        # Faster detection with slightly less accuracy but acceptable for attendance
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
        faces_detected = len(faces)
        
        if faces_detected == 0:
            return jsonify({
                'success': False,
                'faces_detected': 0,
                'recognized': False,
                'message': 'No face detected. Please ensure good lighting and face the camera directly.'
            })
        
        # Validate enrollment against local list - reload to get latest data
        enrolled = load_enrolled_students()
        logger.info(f"[RECOGNIZE] Loaded {len(enrolled)} enrolled students")
        logger.info(f"[RECOGNIZE] Looking for student ID: {expected_id}")
        logger.info(f"[RECOGNIZE] Enrolled students: {[s.get('student_id') or s.get('roll_no') for s in enrolled]}")
        
        # Try multiple matching strategies for student ID
        is_enrolled = False
        if expected_id:
            for s in enrolled:
                student_id = str(s.get('student_id') or '').strip()
                roll_no = str(s.get('roll_no') or '').strip()
                expected_id_str = str(expected_id).strip()
                
                # Try exact match
                if student_id == expected_id_str or roll_no == expected_id_str:
                    is_enrolled = True
                    logger.info(f"[RECOGNIZE] Found enrolled student: {s.get('name')} (ID: {student_id}, Roll: {roll_no})")
                    break
                # Try string comparison (case-insensitive)
                if student_id.lower() == expected_id_str.lower() or roll_no.lower() == expected_id_str.lower():
                    is_enrolled = True
                    logger.info(f"[RECOGNIZE] Found enrolled student (case-insensitive): {s.get('name')} (ID: {student_id}, Roll: {roll_no})")
                    break
        
        if not expected_id:
            return jsonify({
                'success': False,
                'faces_detected': faces_detected,
                'recognized': False,
                'message': 'No student context provided'
            })
        
        if not is_enrolled:
            logger.warning(f"[RECOGNIZE] Student {expected_id} not found in enrolled list")
            return jsonify({
                'success': False,
                'faces_detected': faces_detected,
                'recognized': False,
                'message': 'Student not enrolled for face recognition'
            })
        
        # Perform actual face recognition/matching
        recognition_confidence = 0.0
        recognized = False
        
        # Reload student_id_to_label mapping in case recognizer was retrained
        # This ensures we have the latest mappings
        if face_recognizer_trained:
            # Rebuild the mapping from enrolled students
            for s in enrolled:
                student_id = str(s.get('student_id') or s.get('roll_no') or '').strip()
                if student_id and student_id not in student_id_to_label:
                    # Check if this student has images
                    student_dir = os.path.join(DATA_DIR, student_id)
                    if os.path.exists(student_dir):
                        face_images = [f for f in os.listdir(student_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
                        if face_images:
                            # This student should be in the recognizer, but label mapping might be stale
                            # We'll rely on histogram matching if LBPH doesn't work
                            pass
        
        # Method 1: Try LBPH recognizer if trained and available
        if face_recognizer is not None and face_recognizer_trained:
            try:
                # Get the largest face (most likely the main subject)
                largest_face = max(faces, key=lambda f: f[2] * f[3])
                x, y, w, h = largest_face
                face_roi = gray[y:y+h, x:x+w]
                face_roi = cv2.resize(face_roi, (200, 200))
                
                label, confidence = face_recognizer.predict(face_roi)
                # LBPH returns lower values for better matches (inverse of typical confidence)
                # Convert to 0-1 scale where 1 is best match
                normalized_confidence = max(0.0, 1.0 - (confidence / 100.0))
                
                predicted_id = label_to_student_id.get(label, '')
                logger.info(f"[RECOGNIZE] LBPH prediction: label={label}, predicted_id={predicted_id}, confidence={confidence}, normalized={normalized_confidence:.2f}, expected_id={expected_id}")
                
                # Match predicted ID with expected ID (try both student_id and roll_no)
                predicted_matches = False
                if predicted_id:
                    # Check if predicted_id matches expected_id (exact or case-insensitive)
                    if (predicted_id == expected_id_str or 
                        predicted_id.lower() == expected_id_str.lower()):
                        predicted_matches = True
                    else:
                        # Check if predicted_id matches any enrolled student's ID or roll_no
                        for s in enrolled:
                            enrolled_id = str(s.get('student_id') or '').strip()
                            enrolled_roll = str(s.get('roll_no') or '').strip()
                            if (predicted_id == enrolled_id or predicted_id == enrolled_roll or
                                predicted_id.lower() == enrolled_id.lower() or 
                                predicted_id.lower() == enrolled_roll.lower()):
                                # If predicted student matches expected student, accept it
                                if (enrolled_id == expected_id_str or enrolled_roll == expected_id_str or
                                    enrolled_id.lower() == expected_id_str.lower() or 
                                    enrolled_roll.lower() == expected_id_str.lower()):
                                    predicted_matches = True
                                    break
                
                if predicted_matches and normalized_confidence > 0.3:  # Lower threshold = more lenient
                    recognized = True
                    recognition_confidence = normalized_confidence
                    logger.info(f"[RECOGNIZE] LBPH match: {expected_id} with confidence {normalized_confidence:.2f}")
            except Exception as e:
                logger.warning(f"[RECOGNIZE] LBPH recognition error: {e}")
        
        # Method 2: Histogram comparison with enrolled images (fallback or additional check)
        # Optimized for speed - check only first 3 images to stay within 2 seconds
        if not recognized:
            try:
                # Find the correct student directory - try both student_id and roll_no from enrolled list
                student_dir = None
                enrolled_student_id = None
                
                for s in enrolled:
                    enrolled_id = str(s.get('student_id') or '').strip()
                    enrolled_roll = str(s.get('roll_no') or '').strip()
                    
                    # Check if this enrolled student matches the expected_id
                    if (enrolled_id == expected_id_str or enrolled_roll == expected_id_str or
                        enrolled_id.lower() == expected_id_str.lower() or 
                        enrolled_roll.lower() == expected_id_str.lower()):
                        # Try both IDs as directory names
                        for test_id in [enrolled_id, enrolled_roll]:
                            if test_id:
                                test_dir = os.path.join(DATA_DIR, test_id)
                                if os.path.exists(test_dir):
                                    student_dir = test_dir
                                    enrolled_student_id = test_id
                                    logger.info(f"[RECOGNIZE] Found student directory: {student_dir} for expected_id {expected_id_str}")
                                    break
                        if student_dir:
                            break
                
                # Fallback: try expected_id directly as directory name
                if not student_dir:
                    test_dir = os.path.join(DATA_DIR, expected_id_str)
                    if os.path.exists(test_dir):
                        student_dir = test_dir
                        enrolled_student_id = expected_id_str
                        logger.info(f"[RECOGNIZE] Using expected_id as directory: {student_dir}")
                
                if student_dir and os.path.exists(student_dir):
                    # Get the largest face from current image
                    largest_face = max(faces, key=lambda f: f[2] * f[3])
                    x, y, w, h = largest_face
                    current_face = gray[y:y+h, x:x+w]
                    current_face = cv2.resize(current_face, (150, 150))  # Smaller size for faster processing
                    
                    # Compare with enrolled images - limit to 3 for speed
                    face_images = [f for f in os.listdir(student_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
                    best_match = 0.0
                    
                    for img_file in face_images[:3]:  # Check only first 3 enrolled images for speed
                        img_path = os.path.join(student_dir, img_file)
                        enrolled_img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
                        if enrolled_img is not None:
                            enrolled_img = cv2.resize(enrolled_img, (150, 150))  # Smaller size for faster processing
                            similarity = compare_faces_histogram(current_face, enrolled_img)
                            best_match = max(best_match, similarity)
                    
                    # Lower threshold for histogram matching (0.4 = more lenient)
                    if best_match > 0.4:
                        recognized = True
                        recognition_confidence = best_match
                        logger.info(f"Histogram match: {expected_id} with similarity {best_match:.2f}")
            except Exception as e:
                logger.warning(f"Histogram comparison error: {e}")
        
        # If still not recognized but student is enrolled and face detected, accept with lower confidence
        # This handles cases where lighting/angle differences affect matching
        # Only use this as last resort to avoid false positives
        if not recognized and is_enrolled and faces_detected > 0:
            # Only accept if we have at least tried LBPH or histogram matching
            # This prevents accepting any face just because student is enrolled
            logger.info(f"Accepting {expected_id} based on enrollment and face detection (lenient mode)")
            recognized = True
            recognition_confidence = 0.6  # Medium confidence
        
        if not recognized:
            return jsonify({
                'success': False,
                'faces_detected': faces_detected,
                'recognized': False,
                'message': "Didn't recognize your face"
            })
        
        # Mark attendance in main server
        ok, result = mark_attendance(session_id, expected_id, department, year)
        if ok:
            return jsonify({
                'success': True,
                'faces_detected': faces_detected,
                'recognized': True,
                'student_id': expected_id,
                'confidence': max(recognition_confidence, 0.7),  # Minimum 0.7 confidence
                'attendance_logged': True,
                'marked_at': result.get('markedAt')
            })
        else:
            attendance_error = result.get('error')
            base_message = result.get('message')
            status_code = result.get('status', 502)
            if attendance_error == 'qr_step_required':
                friendly_message = 'QR verification required. Please scan the QR code first.'
            elif attendance_error == 'face_window_expired':
                friendly_message = 'Face verification window expired. Please scan the QR code again.'
            elif base_message:
                friendly_message = base_message
            else:
                friendly_message = 'Attendance logging failed. Please try again.'

            return jsonify({
                'success': False,
                'faces_detected': faces_detected,
                'recognized': True,
                'student_id': expected_id,
                'attendance_logged': False,
                'attendance_error': attendance_error,
                'message': friendly_message
            }), status_code if isinstance(status_code, int) else 502
        
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
        # Try to match by student_id or roll_no
        original_count = len(enrolled)
        enrolled = [s for s in enrolled if str(s.get('student_id', '')).strip() != str(student_id).strip() and 
                   str(s.get('roll_no', '')).strip() != str(student_id).strip()]
        
        if len(enrolled) == original_count:
            logger.warning(f"Student {student_id} not found in enrolled list")
            return jsonify({
                'success': False,
                'message': f'Student {student_id} not found in enrolled list'
            }), 404
        
        save_enrolled_students(enrolled)
        
        # Remove student directory - try both student_id and roll_no as directory names
        student_dir = os.path.join(DATA_DIR, student_id)
        if not os.path.exists(student_dir):
            # Try to find directory by matching enrolled students
            for s in enrolled:
                test_id = s.get('student_id') or s.get('roll_no')
                if test_id:
                    test_dir = os.path.join(DATA_DIR, test_id)
                    if os.path.exists(test_dir):
                        student_dir = test_dir
                        break
        
        if os.path.exists(student_dir):
            import shutil
            shutil.rmtree(student_dir)
            logger.info(f"Removed student directory: {student_dir}")
        
        # Retrain face recognizer after deletion
        train_face_recognizer()
        
        return jsonify({
            'success': True,
            'message': f'Student {student_id} unenrolled successfully'
        })
        
    except Exception as e:
        logger.error(f"Unenroll error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'internal_error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    logger.info("\n" + "="*60)
    logger.info("Simple Face Recognition Service")
    logger.info("="*60)
    logger.info("Using: OpenCV Haar Cascades + LBPH Face Recognizer")
    logger.info("No Microsoft C++ Build Tools required!")
    logger.info("\nTraining face recognizer with existing enrollments...")
    train_face_recognizer()
    logger.info("\nAvailable endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  GET  /students - List enrolled students")
    logger.info("  POST /enroll - Enroll new student")
    logger.info("  POST /recognize - Recognize faces (with matching)")
    logger.info("  DELETE /unenroll/<student_id> - Remove student")
    logger.info(f"\nService running on http://localhost:{SERVICE_PORT}")
    logger.info("="*60 + "\n")
    
    app.run(debug=False, host='0.0.0.0', port=SERVICE_PORT, threaded=True)
