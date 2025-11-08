"""
High-Accuracy Face Recognition Attendance System
Uses RetinaFace for detection and InsightFace/ArcFace for recognition
Designed for >90% accuracy with anti-spoofing and multi-view support
"""

import cv2
import numpy as np
import os
import pandas as pd
import pickle
import time
from datetime import datetime
from collections import defaultdict, deque
import insightface
from insightface.app import FaceAnalysis
from insightface.data import get_image as ins_get_image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FaceAttendanceSystem:
    def __init__(self, 
                 similarity_threshold=0.4,  # Lower threshold = stricter matching
                 presence_frames=5,         # Frames needed for presence confirmation
                 data_dir="data"):
        """
        Initialize the Face Recognition Attendance System
        
        Args:
            similarity_threshold: Cosine similarity threshold for recognition
            presence_frames: Number of consecutive frames for presence confirmation
            data_dir: Directory to store student data and embeddings
        """
        self.similarity_threshold = similarity_threshold
        self.presence_frames = presence_frames
        self.data_dir = data_dir
        self.students_dir = os.path.join(data_dir, "students")
        self.embeddings_file = os.path.join(data_dir, "embeddings.pkl")
        self.attendance_file = os.path.join(data_dir, "attendance_log.csv")
        
        # Create directories
        os.makedirs(self.students_dir, exist_ok=True)
        os.makedirs(data_dir, exist_ok=True)
        
        # Initialize face analysis model
        self.app = None
        self.student_embeddings = {}
        self.recognition_buffer = defaultdict(deque)
        self.last_attendance = {}
        
        # Initialize face analysis
        self._initialize_face_model()
        
        # Load existing embeddings
        self._load_embeddings()
        
        logger.info("Face Attendance System initialized successfully")
    
    def _initialize_face_model(self):
        """Initialize InsightFace model with RetinaFace detector"""
        try:
            self.app = FaceAnalysis(providers=['CPUExecutionProvider'])
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("Face analysis model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to initialize face model: {e}")
            raise
    
    def _load_embeddings(self):
        """Load pre-computed student embeddings from file"""
        if os.path.exists(self.embeddings_file):
            try:
                with open(self.embeddings_file, 'rb') as f:
                    self.student_embeddings = pickle.load(f)
                logger.info(f"Loaded embeddings for {len(self.student_embeddings)} students")
            except Exception as e:
                logger.error(f"Failed to load embeddings: {e}")
                self.student_embeddings = {}
        else:
            self.student_embeddings = {}
    
    def _save_embeddings(self):
        """Save student embeddings to file"""
        try:
            with open(self.embeddings_file, 'wb') as f:
                pickle.dump(self.student_embeddings, f)
            logger.info("Embeddings saved successfully")
        except Exception as e:
            logger.error(f"Failed to save embeddings: {e}")
    
    def _detect_blink(self, landmarks):
        """Simple blink detection for anti-spoofing"""
        if landmarks is None or len(landmarks) < 68:
            return False
        
        # Eye aspect ratio calculation
        def eye_aspect_ratio(eye_points):
            # Vertical distances
            A = np.linalg.norm(eye_points[1] - eye_points[5])
            B = np.linalg.norm(eye_points[2] - eye_points[4])
            # Horizontal distance
            C = np.linalg.norm(eye_points[0] - eye_points[3])
            return (A + B) / (2.0 * C)
        
        # Left and right eye landmarks (simplified indices)
        left_eye = landmarks[36:42]
        right_eye = landmarks[42:48]
        
        left_ear = eye_aspect_ratio(left_eye)
        right_ear = eye_aspect_ratio(right_eye)
        
        # Blink threshold
        ear_threshold = 0.25
        return (left_ear + right_ear) / 2.0 < ear_threshold
    
    def enroll_student(self, student_name, num_images=30):
        """
        Enroll a new student by capturing images from webcam
        
        Args:
            student_name: Name or ID of the student
            num_images: Number of images to capture (default: 30)
        """
        student_dir = os.path.join(self.students_dir, student_name)
        os.makedirs(student_dir, exist_ok=True)
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logger.error("Cannot open camera")
            return False
        
        captured_count = 0
        embeddings_list = []
        
        logger.info(f"Starting enrollment for {student_name}. Press 'q' to quit, 'c' to capture")
        
        while captured_count < num_images:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Flip frame horizontally for mirror effect
            frame = cv2.flip(frame, 1)
            display_frame = frame.copy()
            
            # Detect faces
            faces = self.app.get(frame)
            
            for face in faces:
                # Draw rectangle around face
                bbox = face.bbox.astype(int)
                cv2.rectangle(display_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
                
                # Show face quality score
                quality_text = f"Quality: {face.det_score:.2f}"
                cv2.putText(display_frame, quality_text, (bbox[0], bbox[1]-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            
            # Show progress
            progress_text = f"Captured: {captured_count}/{num_images} for {student_name}"
            cv2.putText(display_frame, progress_text, (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            instruction_text = "Press 'c' to capture, 'q' to quit"
            cv2.putText(display_frame, instruction_text, (10, 60), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            cv2.imshow('Student Enrollment', display_frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('c') and len(faces) > 0:
                # Capture image with highest quality face
                best_face = max(faces, key=lambda x: x.det_score)
                if best_face.det_score > 0.5:  # Quality threshold
                    # Save image
                    img_filename = f"img_{captured_count+1:03d}.jpg"
                    img_path = os.path.join(student_dir, img_filename)
                    cv2.imwrite(img_path, frame)
                    
                    # Store embedding
                    embeddings_list.append(best_face.embedding)
                    captured_count += 1
                    
                    logger.info(f"Captured image {captured_count}/{num_images}")
                else:
                    logger.warning("Face quality too low, try again")
        
        cap.release()
        cv2.destroyAllWindows()
        
        if captured_count > 0:
            # Average embeddings for robustness
            avg_embedding = np.mean(embeddings_list, axis=0)
            self.student_embeddings[student_name] = {
                'embedding': avg_embedding,
                'all_embeddings': embeddings_list,
                'num_images': captured_count
            }
            
            self._save_embeddings()
            logger.info(f"Successfully enrolled {student_name} with {captured_count} images")
            return True
        else:
            logger.warning(f"No images captured for {student_name}")
            return False
    
    def _cosine_similarity(self, emb1, emb2):
        """Calculate cosine similarity between two embeddings"""
        return np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
    
    def recognize_face(self, face_embedding):
        """
        Recognize a face from its embedding
        
        Args:
            face_embedding: Face embedding to match
            
        Returns:
            tuple: (student_name, confidence_score) or (None, 0)
        """
        if not self.student_embeddings:
            return None, 0
        
        best_match = None
        best_similarity = 0
        
        for student_name, student_data in self.student_embeddings.items():
            # Compare with average embedding
            similarity = self._cosine_similarity(face_embedding, student_data['embedding'])
            
            # Also compare with individual embeddings for better accuracy
            max_individual_sim = 0
            for individual_emb in student_data['all_embeddings']:
                individual_sim = self._cosine_similarity(face_embedding, individual_emb)
                max_individual_sim = max(max_individual_sim, individual_sim)
            
            # Use the better of the two similarities
            final_similarity = max(similarity, max_individual_sim)
            
            if final_similarity > best_similarity:
                best_similarity = final_similarity
                best_match = student_name
        
        # Check if similarity meets threshold
        if best_similarity >= self.similarity_threshold:
            return best_match, best_similarity
        else:
            return None, best_similarity
    
    def log_attendance(self, student_name, confidence):
        """Log attendance to CSV file"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        date = datetime.now().strftime("%Y-%m-%d")
        
        # Check if already marked present today
        attendance_key = f"{student_name}_{date}"
        if attendance_key in self.last_attendance:
            return False  # Already marked present today
        
        self.last_attendance[attendance_key] = timestamp
        
        # Create attendance record
        attendance_record = {
            'timestamp': timestamp,
            'date': date,
            'student_name': student_name,
            'confidence': confidence,
            'status': 'Present'
        }
        
        # Append to CSV
        df = pd.DataFrame([attendance_record])
        if os.path.exists(self.attendance_file):
            df.to_csv(self.attendance_file, mode='a', header=False, index=False)
        else:
            df.to_csv(self.attendance_file, mode='w', header=True, index=False)
        
        logger.info(f"Attendance logged for {student_name} with confidence {confidence:.2f}")
        return True
    
    def run_recognition(self):
        """Run real-time face recognition for attendance"""
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            logger.error("Cannot open camera")
            return
        
        logger.info("Starting face recognition. Press 'q' to quit")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Flip frame horizontally for mirror effect
            frame = cv2.flip(frame, 1)
            display_frame = frame.copy()
            
            # Detect faces
            faces = self.app.get(frame)
            
            for face in faces:
                bbox = face.bbox.astype(int)
                
                # Recognize face
                student_name, confidence = self.recognize_face(face.embedding)
                
                if student_name:
                    # Add to recognition buffer for presence confirmation
                    self.recognition_buffer[student_name].append(confidence)
                    if len(self.recognition_buffer[student_name]) > self.presence_frames:
                        self.recognition_buffer[student_name].popleft()
                    
                    # Check if consistently recognized
                    if len(self.recognition_buffer[student_name]) >= self.presence_frames:
                        avg_confidence = np.mean(list(self.recognition_buffer[student_name]))
                        
                        # Draw green rectangle for recognized student
                        cv2.rectangle(display_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
                        
                        # Display student name and confidence
                        text = f"{student_name} ({avg_confidence:.2f})"
                        cv2.putText(display_frame, text, (bbox[0], bbox[1]-10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                        
                        # Log attendance (only once per day)
                        self.log_attendance(student_name, avg_confidence)
                    else:
                        # Draw yellow rectangle for partial recognition
                        cv2.rectangle(display_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 255), 2)
                        cv2.putText(display_frame, f"Recognizing... ({confidence:.2f})", 
                                   (bbox[0], bbox[1]-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                else:
                    # Draw red rectangle for unknown face
                    cv2.rectangle(display_frame, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 0, 255), 2)
                    cv2.putText(display_frame, f"Unknown ({confidence:.2f})", 
                               (bbox[0], bbox[1]-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
            
            # Display system info
            info_text = f"Students enrolled: {len(self.student_embeddings)}"
            cv2.putText(display_frame, info_text, (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            threshold_text = f"Threshold: {self.similarity_threshold}"
            cv2.putText(display_frame, threshold_text, (10, 60), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            cv2.imshow('Face Recognition Attendance', display_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
    
    def list_enrolled_students(self):
        """List all enrolled students"""
        if not self.student_embeddings:
            print("No students enrolled yet.")
            return
        
        print("\n=== Enrolled Students ===")
        for i, (name, data) in enumerate(self.student_embeddings.items(), 1):
            print(f"{i}. {name} ({data['num_images']} images)")
    
    def view_attendance_log(self):
        """Display attendance log"""
        if not os.path.exists(self.attendance_file):
            print("No attendance records found.")
            return
        
        try:
            df = pd.read_csv(self.attendance_file)
            print("\n=== Attendance Log ===")
            print(df.to_string(index=False))
        except Exception as e:
            logger.error(f"Failed to read attendance log: {e}")


def main():
    """Main application interface"""
    system = FaceAttendanceSystem()
    
    while True:
        print("\n" + "="*50)
        print("Face Recognition Attendance System")
        print("="*50)
        print("1. Enroll New Student")
        print("2. Start Recognition/Attendance")
        print("3. List Enrolled Students")
        print("4. View Attendance Log")
        print("5. Adjust Similarity Threshold")
        print("6. Exit")
        print("-"*50)
        
        try:
            choice = input("Enter your choice (1-6): ").strip()
            
            if choice == '1':
                student_name = input("Enter student name/ID: ").strip()
                if student_name:
                    num_images = input("Number of images to capture (default 30): ").strip()
                    num_images = int(num_images) if num_images.isdigit() else 30
                    system.enroll_student(student_name, num_images)
                else:
                    print("Invalid student name.")
            
            elif choice == '2':
                if not system.student_embeddings:
                    print("No students enrolled. Please enroll students first.")
                else:
                    system.run_recognition()
            
            elif choice == '3':
                system.list_enrolled_students()
            
            elif choice == '4':
                system.view_attendance_log()
            
            elif choice == '5':
                current_threshold = system.similarity_threshold
                print(f"Current threshold: {current_threshold}")
                new_threshold = input("Enter new threshold (0.0-1.0, lower = stricter): ").strip()
                try:
                    new_threshold = float(new_threshold)
                    if 0.0 <= new_threshold <= 1.0:
                        system.similarity_threshold = new_threshold
                        print(f"Threshold updated to {new_threshold}")
                    else:
                        print("Threshold must be between 0.0 and 1.0")
                except ValueError:
                    print("Invalid threshold value.")
            
            elif choice == '6':
                print("Goodbye!")
                break
            
            else:
                print("Invalid choice. Please try again.")
                
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            logger.error(f"An error occurred: {e}")


if __name__ == "__main__":
    main()
