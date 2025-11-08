"""
Quick Start Script for Face Recognition Attendance System
Provides easy setup and demo functionality
"""

import subprocess
import sys
import os

def install_dependencies():
    """Install required dependencies"""
    print("Installing dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "face_recognition_requirements.txt"])
        print("✅ Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def run_test():
    """Run system test"""
    print("\nRunning system test...")
    try:
        subprocess.run([sys.executable, "test_face_system.py"])
        return True
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def run_main_app():
    """Run the main application"""
    print("\nStarting Face Recognition Attendance System...")
    try:
        subprocess.run([sys.executable, "face_attendance_system.py"])
    except KeyboardInterrupt:
        print("\nApplication stopped by user.")
    except Exception as e:
        print(f"❌ Failed to start application: {e}")

def run_api_server():
    """Run the API server"""
    print("\nStarting Face Recognition API Server...")
    try:
        subprocess.run([sys.executable, "face_api_wrapper.py"])
    except KeyboardInterrupt:
        print("\nAPI server stopped by user.")
    except Exception as e:
        print(f"❌ Failed to start API server: {e}")

def main():
    """Main menu for quick start"""
    print("="*60)
    print("Face Recognition Attendance System - Quick Start")
    print("="*60)
    
    while True:
        print("\nSelect an option:")
        print("1. Install Dependencies")
        print("2. Run System Test")
        print("3. Start Main Application")
        print("4. Start API Server")
        print("5. View Setup Guide")
        print("6. Exit")
        print("-"*40)
        
        choice = input("Enter your choice (1-6): ").strip()
        
        if choice == '1':
            install_dependencies()
        
        elif choice == '2':
            run_test()
        
        elif choice == '3':
            if not os.path.exists("face_attendance_system.py"):
                print("❌ Main application file not found!")
                continue
            run_main_app()
        
        elif choice == '4':
            if not os.path.exists("face_api_wrapper.py"):
                print("❌ API wrapper file not found!")
                continue
            run_api_server()
        
        elif choice == '5':
            if os.path.exists("FACE_RECOGNITION_SETUP.md"):
                print("\nOpening setup guide...")
                if sys.platform.startswith('win'):
                    os.startfile("FACE_RECOGNITION_SETUP.md")
                elif sys.platform.startswith('darwin'):
                    subprocess.run(["open", "FACE_RECOGNITION_SETUP.md"])
                else:
                    subprocess.run(["xdg-open", "FACE_RECOGNITION_SETUP.md"])
            else:
                print("❌ Setup guide not found!")
        
        elif choice == '6':
            print("Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
