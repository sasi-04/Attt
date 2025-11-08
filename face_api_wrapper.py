"""
Flask API wrapper for Face Recognition Attendance System
Provides REST endpoints for web integration
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
from face_attendance_system import FaceAttendanceSystem

app = Flask(__name__)
CORS(app)  # Enable CORS for web integration

# Initialize face recognition system
face_system = FaceAttendanceSystem()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'enrolled_students': len(face_system.student_embeddings)
    })

@app.route('/api/students', methods=['GET'])
def get_students():
    """Get list of enrolled students"""
    students = []
    for name, data in face_system.student_embeddings.items():
        students.append({
            'name': name,
            'num_images': data['num_images'],
            'enrolled_date': 'N/A'  # Could be added to the system
        })
    
    return jsonify({
        'students': students,
        'total_count': len(students)
    })

@app.route('/api/enroll', methods=['POST'])
def enroll_student():
    """
    Enroll a student with base64 encoded images
    Expected payload:
    {
        "student_name": "John Doe",
        "images": ["base64_image1", "base64_image2", ...]
    }
    """
    try:
        data = request.get_json()
        student_name = data.get('student_name')
        images_b64 = data.get('images', [])
        
        if not student_name or not images_b64:
            return jsonify({'error': 'Missing student_name or images'}), 400
        
        # Create student directory
        student_dir = os.path.join(face_system.students_dir, student_name)
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
                print(f"Error processing image {i}: {e}")
                continue
        
        if saved_count > 0:
            # Average embeddings for robustness
            avg_embedding = np.mean(embeddings_list, axis=0)
            face_system.student_embeddings[student_name] = {
                'embedding': avg_embedding,
                'all_embeddings': embeddings_list,
                'num_images': saved_count
            }
            
            face_system._save_embeddings()
            
            return jsonify({
                'success': True,
                'message': f'Successfully enrolled {student_name}',
                'images_processed': saved_count
            })
        else:
            return jsonify({'error': 'No valid faces found in images'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    """
    Recognize face from base64 encoded image
    Expected payload:
    {
        "image": "base64_encoded_image"
    }
    """
    try:
        data = request.get_json()
        img_b64 = data.get('image')
        
        if not img_b64:
            return jsonify({'error': 'Missing image data'}), 400
        
        # Decode base64 image
        img_data = base64.b64decode(img_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Invalid image data'}), 400
        
        # Detect faces
        faces = face_system.app.get(frame)
        
        results = []
        for face in faces:
            # Recognize face
            student_name, confidence = face_system.recognize_face(face.embedding)
            
            bbox = face.bbox.astype(int).tolist()
            
            result = {
                'bbox': bbox,
                'confidence': float(confidence),
                'student_name': student_name,
                'recognized': student_name is not None
            }
            
            # Log attendance if recognized
            if student_name:
                attendance_logged = face_system.log_attendance(student_name, confidence)
                result['attendance_logged'] = attendance_logged
            
            results.append(result)
        
        return jsonify({
            'faces_detected': len(faces),
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    """Get attendance records with optional date filtering"""
    try:
        # Get query parameters
        date_filter = request.args.get('date')  # Format: YYYY-MM-DD
        student_filter = request.args.get('student')
        
        if not os.path.exists(face_system.attendance_file):
            return jsonify({'attendance': [], 'total_count': 0})
        
        df = pd.read_csv(face_system.attendance_file)
        
        # Apply filters
        if date_filter:
            df = df[df['date'] == date_filter]
        
        if student_filter:
            df = df[df['student_name'].str.contains(student_filter, case=False, na=False)]
        
        # Convert to list of dictionaries
        attendance_records = df.to_dict('records')
        
        return jsonify({
            'attendance': attendance_records,
            'total_count': len(attendance_records)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance/summary', methods=['GET'])
def get_attendance_summary():
    """Get attendance summary statistics"""
    try:
        if not os.path.exists(face_system.attendance_file):
            return jsonify({'summary': {}, 'daily_stats': []})
        
        df = pd.read_csv(face_system.attendance_file)
        
        # Overall summary
        total_records = len(df)
        unique_students = df['student_name'].nunique()
        date_range = {
            'start_date': df['date'].min() if not df.empty else None,
            'end_date': df['date'].max() if not df.empty else None
        }
        
        # Daily statistics
        daily_stats = df.groupby('date').agg({
            'student_name': 'count',
            'confidence': 'mean'
        }).reset_index()
        daily_stats.columns = ['date', 'attendance_count', 'avg_confidence']
        daily_stats = daily_stats.to_dict('records')
        
        # Student statistics
        student_stats = df.groupby('student_name').agg({
            'date': 'count',
            'confidence': 'mean'
        }).reset_index()
        student_stats.columns = ['student_name', 'attendance_days', 'avg_confidence']
        student_stats = student_stats.to_dict('records')
        
        return jsonify({
            'summary': {
                'total_records': total_records,
                'unique_students': unique_students,
                'date_range': date_range
            },
            'daily_stats': daily_stats,
            'student_stats': student_stats
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    """Get or update system settings"""
    if request.method == 'GET':
        return jsonify({
            'similarity_threshold': face_system.similarity_threshold,
            'presence_frames': face_system.presence_frames,
            'enrolled_students_count': len(face_system.student_embeddings)
        })
    
    elif request.method == 'POST':
        try:
            data = request.get_json()
            
            if 'similarity_threshold' in data:
                threshold = float(data['similarity_threshold'])
                if 0.0 <= threshold <= 1.0:
                    face_system.similarity_threshold = threshold
                else:
                    return jsonify({'error': 'Threshold must be between 0.0 and 1.0'}), 400
            
            if 'presence_frames' in data:
                frames = int(data['presence_frames'])
                if frames > 0:
                    face_system.presence_frames = frames
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
            return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Starting Face Recognition API Server...")
    print("Available endpoints:")
    print("  GET  /api/health - Health check")
    print("  GET  /api/students - List enrolled students")
    print("  POST /api/enroll - Enroll new student")
    print("  POST /api/recognize - Recognize faces in image")
    print("  GET  /api/attendance - Get attendance records")
    print("  GET  /api/attendance/summary - Get attendance statistics")
    print("  GET/POST /api/settings - Get/update system settings")
    print("\nServer running on http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
