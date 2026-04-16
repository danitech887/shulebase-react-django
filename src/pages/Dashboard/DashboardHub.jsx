// src/pages/Dashboard/DashboardHub.jsx
import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard'; // The code you just shared
import TeacherPortalDashboard from './Portals/Teacher/Dashboard/Dashboard'; // The JSX we built earlier


export default function DashboardHub() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="text-center mt-5">Initializing Perspective...</div>;

  const role = user?.role?.toLowerCase();

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'teacher':
      return <TeacherPortalDashboard />;
    case 'student':
      return <div><h3>Student Portal Under Construction</h3></div>;
    case 'parent':
      return <div><h3>Parent Portal Under Construction</h3></div>;
    default:
      return <div className="alert alert-warning m-5">Role not recognized. Contact Admin.</div>;
  }
}