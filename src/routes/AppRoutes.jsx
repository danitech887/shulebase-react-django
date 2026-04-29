import React, { useContext } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Layouts & Protection
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';

import Home from '../pages/Home/Home'

import SchoolAccount   from '../pages/School/SchoolAccount';


// Auth
import Login from '../pages/Login/Login';
import PasswordReset from '../pages/Login/PasswordReset';
import ChangeUsernamePassword from '../pages/Account/ChangeUsernamePassword';

// Admin Perspectives
import AdminDashboard from '../pages/Dashboard/Dashboard'; 
import PersonalDetails from '../pages/Students/Details/PersonalDetails';
import FeeDashboard from '../pages/Students/Fee/FeeDashboard';
import LeaveDashboard from '../pages/Students/Leave/LeaveDashboard';
import AttendanceDashboard from '../pages/Students/Attendance/AttendanceDashboard';
import AcademicDashboard from '../pages/Students/Academics/AcademicDashboard';
import ImportStudents from '../pages/Students/Import/ImportStudents';

// Staff/Teacher Management (Admin View)
import TeacherDashboard from '../pages/Teachers/Dashboard/TeacherDashboard';
import TeacherRoles from '../pages/Teachers/Roles/Roles';
import TeacherAttendance from '../pages/Teachers/Attendance/Attendance';
import TeachingProgress from '../pages/Teachers/Teaching Progess/TeachingProgress';
import TeacherPersonalDetails from '../pages/Teachers/Details/PersonalDetails';
import AdminTeacherLeave from '../pages/Teachers/Leave/Leave';

// Professional Teacher Portal (Teacher Perspective)
// Make sure these components exist in your TeacherPortal folder
import TeacherPortalDashboard from '../pages/Portals/Teacher/Dashboard/Dashboard'; 
import TeacherStrandPortal from '../pages/Portals/Teacher/Strands/Strands';
import AttendancePortal from '../pages/Portals/Teacher/Attendance/Attendance';
import TeacherResourceManager from '../pages/Portals/Teacher/Resources/Resources';
import TeachingProgressManager from '../pages/Portals/Teacher/TeachingProgress/TeachingProgress';
import TeacherProfile from '../pages/Portals/Teacher/Account/Account';
import Competencies from '../pages/Portals/Teacher/Strands/Competencies';
import TeacherLeavePortal from '../pages/Portals/Teacher/Leave/Leave';

// Professional Student Portal
import StudentPortalDashboard from '../pages/Portals/Student/Dashboard/Dashboard';
import StudentPortalAttendance from '../pages/Portals/Student/Attendance/Attendance';
import StudentPortalFees from '../pages/Portals/Student/Fees/Fees';
import StudentPortalLeave from '../pages/Portals/Student/Leave/Leave';
import StudentPortalAcademics from '../pages/Portals/Student/Academics/Academics';

// Profession Parent Portal
import ParentPortalDashboard  from '../pages/Portals/Parent/Dashboard/Dashboard';
import ParentPortalFees       from '../pages/Portals/Parent/Fees/Fees';
import ParentPortalLeave      from '../pages/Portals/Parent/Leave/Leave';
import ParentPortalAttendance from '../pages/Portals/Parent/Attendance/Attendance';
import ParentPortalAcademics  from '../pages/Portals/Parent/Academics/Academics';

import Announcement from '../pages/Announcements/Announcement';
import Reviews from '../pages/Reviews/Reviews';

/**
 * DashboardHub: 
 * Central traffic controller for the /dashboard route.
 * Sends the user to the correct UI based on their role.
 */
const DashboardHub = () => {
  const { user } = useContext(AuthContext);
  const role = user?.role?.toLowerCase();

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherPortalDashboard />;
    case 'student':
      return <StudentPortalDashboard />;
    case 'parent':
      return <ParentPortalDashboard />;
    default:
      return <div className="p-4 text-center">Loading your perspective...</div>;
  }
};

/**
 * RoleGuard: 
 * Ensures only authorized roles can enter a specific group of routes.
 */
const RoleGuard = ({ allowedRoles }) => {
  const { user } = useContext(AuthContext);
  const userRole = user?.role?.toLowerCase();
  
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

export default function AppRoutes() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <Routes>
      {/* ── Public Routes ── */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<PasswordReset />} />
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Home />} />

      {/* ── Protected Application Shell ── */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dynamic Dashboard Landing */}
        <Route path="dashboard" element={<DashboardHub />} />
        <Route path="account/change-password" element={<ChangeUsernamePassword />} />
        <Route path="announcements" element={<Announcement />} />
        <Route path="reviews" element={<Reviews />} />


        {/* ── Admin Management Routes ── */}
        <Route element={<RoleGuard allowedRoles={['admin']} />}>
          {/* Student Management */}
          <Route path="students/register" element={<PersonalDetails />} />
          <Route path="students/fees" element={<FeeDashboard />} />
          <Route path="students/leave" element={<LeaveDashboard />} />
          <Route path="students/attendance" element={<AttendanceDashboard />} />
          <Route path="students/academics" element={<AcademicDashboard />} />
          <Route path="students/import" element={<ImportStudents />} />
          
          {/* Staff Management (Admin's perspective of teachers) */}
          <Route path="teachers/dashboard" element={<TeacherDashboard />} />
          <Route path="teachers/roles" element={<TeacherRoles />} />
          <Route path="teachers/attendance" element={<TeacherAttendance />} />
          <Route path="teachers/progress" element={<TeachingProgress />} />
          <Route path="teachers/details" element={<TeacherPersonalDetails />} />
          <Route path="teachers/leave" element={<AdminTeacherLeave />} />
          <Route path="school/account"   element={<SchoolAccount />} />


        </Route>

        {/* ── Teacher Professional Portal ── */}
        <Route element={<RoleGuard allowedRoles={['teacher', 'admin']} />}>
          <Route path="teachers-portal/dashboard" element={<TeacherPortalDashboard />} />
          <Route path="teachers-portal/strands" element = {< TeacherStrandPortal />} />
          <Route path="teachers-portal/resources" element = {< TeacherResourceManager />}  />
          <Route path="teachers-portal/attendance"  element={<AttendancePortal />} />
          <Route path="teachers-portal/teachingprogress"  element={<TeachingProgressManager />} />
          <Route path="teachers-portal/competencies" element={<Competencies />} />
          <Route path="teachers-portal/leave" element ={<TeacherLeavePortal />}  />
          <Route path="teachers-portal/account" element={<TeacherProfile />} />

          {/* Aliases to prevent 404s if dashboard quick-links point to these variations */}
          <Route path="teachers-portal/leave-management" element={<Navigate to="/teachers-portal/leave" replace />} />
          <Route path="teacher-portal/leave" element={<Navigate to="/teachers-portal/leave" replace />} />
        </Route>

        {/* ── Student Portal Routes ── */}
        <Route element={<RoleGuard allowedRoles={['student', 'admin']} />}>
          <Route path="students-portal/dashboard" element={<StudentPortalDashboard />} />
          <Route path="students-portal/fees" element={<StudentPortalFees />} />
          <Route path="students-portal/leave" element={<StudentPortalLeave />} />
          <Route path="students-portal/attendance" element={<StudentPortalAttendance />} />
          <Route path="students-portal/academics" element={<StudentPortalAcademics />} />
        </Route>

        {/* ── Parent Portal Routes ── */}
        <Route element={<RoleGuard allowedRoles={['parent']} />}>
          <Route path="parent-portal/dashboard" element={<ParentPortalDashboard />} />
          <Route path="parent-portal/fees" element={<ParentPortalFees />} />
          <Route path="parent-portal/leave" element={<ParentPortalLeave />} />
          <Route path="parent-portal/attendance" element={<ParentPortalAttendance />} />
          <Route path="parent-portal/academics" element={<ParentPortalAcademics />} />
        </Route>

        {/* ── Catch-All inside shell — remove or keep as fallback? ── */}
        {/* I will move the main 404 to the global level below */}
      </Route>

      {/* ── Global Catch-All & Aliases ── */}
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={
        <div className="p-5 text-center" style={{ color: '#fff', background: '#0d1117', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '5rem', fontWeight: 900 }}>404</h1>
          <h3>Page Not Found</h3>
          <p className="text-muted">The page you are looking for doesn't exist or has been moved.</p>
          <button 
            onClick={() => window.history.back()} 
            style={{ background: 'var(--amber)', border: 'none', padding: '10px 20px', borderRadius: '8px', color: '#000', fontWeight: 'bold', width: 'fit-content', margin: '20px auto' }}
          >
            Go Back
          </button>
        </div>
      } />
    </Routes>
  );
}