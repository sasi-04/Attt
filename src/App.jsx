import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UnifiedLogin from './pages/UnifiedLogin';
import StudentLogin from './pages/StudentLogin';
import StaffLogin from './pages/StaffLogin';
import AdminLogin from './pages/AdminLogin';
import { AuthProvider } from './context/AuthContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import StudentLayout from './layouts/StudentLayout.jsx'
import StudentDashboard from './pages/StudentDashboard.jsx'
import StudentLeaveManagement from './pages/StudentLeaveManagement.jsx'
import StudentProfile from './pages/StudentProfile.jsx'
import StaffLayout from './layouts/StaffLayout.jsx'
import StaffDashboard from './pages/staff/Dashboard.jsx'
import StaffStudents from './pages/staff/Students.jsx'
import StaffAttendance from './pages/staff/Attendance.jsx'
import StaffLeave from './pages/staff/LeaveManagement.jsx'
import StaffProfile from './pages/staff/Profile.jsx'
import StaffAnalytics from './pages/staff/Analytics.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import AdminDashboard from './pages/admin/Dashboard.jsx'
import AdminManageStaff from './pages/admin/ManageStaff.jsx'
import AdminManageStudents from './pages/admin/ManageStudents.jsx'
import AdminAttendance from './pages/admin/Attendance.jsx'
import AdminLeaveRequests from './pages/admin/LeaveRequests.jsx'
import AdminSettings from './pages/admin/Settings.jsx'
import AdminHierarchyManagement from './pages/admin/HierarchyManagement.jsx'
import StudentScanAttendance from './pages/student/Attendance.jsx'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<UnifiedLogin />} />
        <Route path="/login/student" element={<StudentLogin />} />
        <Route path="/login/staff" element={<StaffLogin />} />
        <Route path="/login/admin" element={<AdminLogin />} />

        <Route element={<ProtectedRoute allow={["student"]} />}> 
          <Route path="/student" element={<StudentLayout />}>
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="attendance" element={<StudentScanAttendance />} />
            <Route path="leave" element={<StudentLeaveManagement />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={["staff"]} />}> 
          <Route path="/staff" element={<StaffLayout />}>
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="students" element={<StaffStudents />} />
            <Route path="attendance" element={<StaffAttendance />} />
            <Route path="leave" element={<StaffLeave />} />
            <Route path="profile" element={<StaffProfile />} />
            <Route path="analytics" element={<StaffAnalytics />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allow={["admin"]} />}> 
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="staff" element={<AdminManageStaff />} />
            <Route path="students" element={<AdminManageStudents />} />
            <Route path="hierarchy" element={<AdminHierarchyManagement />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="leave" element={<AdminLeaveRequests />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
