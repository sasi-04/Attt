@echo off
echo Stopping all services on port 5001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5001') do taskkill /F /PID %%a 2>nul

echo.
echo Starting Simple Face Recognition Service...
start "Face Service" cmd /k "cd /d D:\Attt && python3 simple_face_service.py"

timeout /t 3

echo.
echo Face service started!
echo Now restart your main server with: npm run dev
echo.
pause
