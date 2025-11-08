#!/usr/bin/env python3
"""
Quick Start Script for Face Recognition Integration
Handles setup, testing, and deployment of the face recognition system
"""

import subprocess
import sys
import os
import time
import requests
import json
from pathlib import Path

def print_header(text):
    print("\n" + "="*60)
    print(f" {text}")
    print("="*60)

def print_step(step, text):
    print(f"\n[Step {step}] {text}")

def run_command(cmd, cwd=None, check=True):
    """Run a command and return the result"""
    try:
        result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True, check=check)
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.CalledProcessError as e:
        return False, e.stdout, e.stderr

def check_dependencies():
    """Check if required dependencies are installed"""
    print_step(1, "Checking Dependencies")
    
    # Check Python packages
    python_packages = [
        'opencv-python', 'insightface', 'flask', 'numpy', 'pandas'
    ]
    
    missing_packages = []
    for package in python_packages:
        success, _, _ = run_command(f"python -c \"import {package.replace('-', '_').split('==')[0]}\"", check=False)
        if not success:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing Python packages: {', '.join(missing_packages)}")
        print("Installing missing packages...")
        success, _, error = run_command("pip install -r face_recognition_requirements.txt")
        if not success:
            print(f"❌ Failed to install packages: {error}")
            return False
        print("✅ Python packages installed successfully")
    else:
        print("✅ All Python dependencies are installed")
    
    # Check Node.js dependencies
    if not os.path.exists("node_modules"):
        print("Installing Node.js dependencies...")
        success, _, error = run_command("npm install")
        if not success:
            print(f"❌ Failed to install Node.js packages: {error}")
            return False
        print("✅ Node.js packages installed successfully")
    else:
        print("✅ Node.js dependencies are installed")
    
    return True

def test_services():
    """Test if services are running and accessible"""
    print_step(2, "Testing Services")
    
    # Test main server
    try:
        response = requests.get("http://localhost:3001/health", timeout=5)
        if response.status_code == 200:
            print("✅ Main server is running (http://localhost:3001)")
        else:
            print(f"❌ Main server returned status {response.status_code}")
            return False
    except requests.exceptions.RequestException:
        print("❌ Main server is not accessible (http://localhost:3001)")
        return False
    
    # Test face recognition service
    try:
        response = requests.get("http://localhost:5001/health", timeout=5)
        if response.status_code == 200:
            print("✅ Face recognition service is running (http://localhost:5001)")
            service_info = response.json()
            print(f"   - Enrolled students: {service_info.get('enrolled_students', 0)}")
        else:
            print(f"❌ Face recognition service returned status {response.status_code}")
            return False
    except requests.exceptions.RequestException:
        print("❌ Face recognition service is not accessible (http://localhost:5001)")
        return False
    
    # Test integration
    try:
        response = requests.get("http://localhost:3001/face-recognition/status", timeout=5)
        if response.status_code == 200:
            print("✅ Face recognition integration is working")
            integration_info = response.json()
            print(f"   - Service available: {integration_info.get('service_available', False)}")
        else:
            print(f"❌ Face recognition integration returned status {response.status_code}")
            return False
    except requests.exceptions.RequestException:
        print("❌ Face recognition integration is not working")
        return False
    
    return True

def start_services():
    """Start the face recognition and main services"""
    print_step(3, "Starting Services")
    
    # Check if services are already running
    face_service_running = False
    main_service_running = False
    
    try:
        requests.get("http://localhost:5001/health", timeout=2)
        face_service_running = True
        print("✅ Face recognition service is already running")
    except:
        pass
    
    try:
        requests.get("http://localhost:3001/health", timeout=2)
        main_service_running = True
        print("✅ Main server is already running")
    except:
        pass
    
    if face_service_running and main_service_running:
        return True
    
    print("\nStarting services...")
    print("Note: This will open new terminal windows/processes")
    
    # Start face recognition service
    if not face_service_running:
        if sys.platform.startswith('win'):
            subprocess.Popen(['cmd', '/c', 'start', 'cmd', '/k', 'python face_recognition_service.py'])
        elif sys.platform.startswith('darwin'):  # macOS
            subprocess.Popen(['open', '-a', 'Terminal', 'python face_recognition_service.py'])
        else:  # Linux
            subprocess.Popen(['gnome-terminal', '--', 'python', 'face_recognition_service.py'])
        
        print("🚀 Starting face recognition service...")
        time.sleep(3)
    
    # Start main server
    if not main_service_running:
        if sys.platform.startswith('win'):
            subprocess.Popen(['cmd', '/c', 'start', 'cmd', '/k', 'npm run dev'])
        elif sys.platform.startswith('darwin'):  # macOS
            subprocess.Popen(['open', '-a', 'Terminal', 'npm run dev'])
        else:  # Linux
            subprocess.Popen(['gnome-terminal', '--', 'npm', 'run', 'dev'])
        
        print("🚀 Starting main server...")
        time.sleep(5)
    
    # Wait for services to start
    print("⏳ Waiting for services to initialize...")
    for i in range(30):  # Wait up to 30 seconds
        try:
            face_ok = requests.get("http://localhost:5001/health", timeout=2).status_code == 200
            main_ok = requests.get("http://localhost:3001/health", timeout=2).status_code == 200
            
            if face_ok and main_ok:
                print("✅ All services are running successfully!")
                return True
        except:
            pass
        
        time.sleep(1)
        if i % 5 == 0:
            print(f"   Still waiting... ({i+1}/30 seconds)")
    
    print("❌ Services did not start within 30 seconds")
    return False

def enroll_demo_student():
    """Enroll a demo student for testing"""
    print_step(4, "Demo Student Enrollment")
    
    # Check if any students are already enrolled
    try:
        response = requests.get("http://localhost:5001/students", timeout=5)
        if response.status_code == 200:
            students = response.json().get('students', [])
            if students:
                print(f"✅ Found {len(students)} enrolled students:")
                for student in students[:3]:  # Show first 3
                    print(f"   - {student.get('student_id', 'Unknown')} ({student.get('num_images', 0)} images)")
                if len(students) > 3:
                    print(f"   ... and {len(students) - 3} more")
                return True
    except:
        pass
    
    print("No students enrolled yet.")
    print("\nTo enroll students for face recognition:")
    print("1. Use the web interface at http://localhost:5173")
    print("2. Login as admin/staff")
    print("3. Navigate to face recognition enrollment")
    print("4. Or use the standalone enrollment tool:")
    print("   python face_attendance_system.py")
    
    return True

def show_access_info():
    """Show how to access the system"""
    print_step(5, "Access Information")
    
    print("🌐 Web Interface:")
    print("   Frontend: http://localhost:5173")
    print("   Backend API: http://localhost:3001")
    print("   Face Recognition API: http://localhost:5001")
    
    print("\n👤 Demo Accounts:")
    print("   Student: Use any enrolled student ID")
    print("   Staff: staff@demo.com / staff123")
    print("   Admin: admin@attendance.edu / admin@2024")
    
    print("\n📱 Testing Face Recognition:")
    print("   1. Login as student")
    print("   2. Go to Attendance page")
    print("   3. Click 'Face Recognition' option")
    print("   4. Allow camera access")
    print("   5. Position face in camera frame")
    
    print("\n🔧 Management Tools:")
    print("   Standalone enrollment: python face_attendance_system.py")
    print("   Service health check: python test_face_system.py")
    print("   API testing: curl http://localhost:5001/health")

def main():
    """Main function"""
    print_header("Face Recognition Integration - Quick Start")
    
    # Check if we're in the right directory
    if not os.path.exists("face_recognition_service.py"):
        print("❌ Error: face_recognition_service.py not found")
        print("Please run this script from the AttendanceSystemT1 directory")
        return
    
    try:
        # Step 1: Check dependencies
        if not check_dependencies():
            print("\n❌ Dependency check failed. Please resolve the issues above.")
            return
        
        # Step 2: Start services
        if not start_services():
            print("\n❌ Failed to start services. Please check the error messages above.")
            return
        
        # Step 3: Test services
        if not test_services():
            print("\n❌ Service testing failed. Please check if services are running properly.")
            return
        
        # Step 4: Demo enrollment info
        enroll_demo_student()
        
        # Step 5: Show access information
        show_access_info()
        
        print_header("Setup Complete! 🎉")
        print("Your face recognition attendance system is ready to use!")
        print("\nPress Ctrl+C to stop this script (services will continue running)")
        
        # Keep script running to show status
        try:
            while True:
                time.sleep(10)
                # Periodic health check
                try:
                    face_ok = requests.get("http://localhost:5001/health", timeout=2).status_code == 200
                    main_ok = requests.get("http://localhost:3001/health", timeout=2).status_code == 200
                    
                    status = "🟢 All services running" if face_ok and main_ok else "🔴 Some services down"
                    print(f"\r{status} - {time.strftime('%H:%M:%S')}", end="", flush=True)
                except:
                    print(f"\r🔴 Services unavailable - {time.strftime('%H:%M:%S')}", end="", flush=True)
        
        except KeyboardInterrupt:
            print("\n\n👋 Quick start script stopped. Services are still running.")
            print("To stop services, close their terminal windows or use Ctrl+C in each terminal.")
    
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        print("Please check the logs and try again.")

if __name__ == "__main__":
    main()
