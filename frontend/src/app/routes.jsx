// src/app/routes.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/public/Login/Login";
import MFA from "../pages/public/Login/Mfa";
import MFASetup from "../pages/public/Login/MFASetup";
import Register from "../pages/public/Login/Register";

import Dashboard from "../pages/shared/Dashboard/Dashboard";
import Profile from "../pages/shared/Profile/Profile";

import StudentTasks from "../pages/student/Tasks/StudentTasks";
import ManageTasks from "../pages/professor/Tasks/ManageTasks";
import UserManagement from "../pages/admin/Users/UserManagement";

import Unauthorized from "../pages/Unauthorized/Unauthorized";
import NotFound from "../pages/NotFound/NotFound";

import AuthGuard from "../guards/AuthGuard";
import RoleGuard from "../guards/RoleGuard";

import { ROLES } from "../utils/roles";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔓 PUBLIC */}
        <Route path="/login" element={<Login />} />

        <Route path="/mfa" element={<MFA />} />

        <Route path="/mfa/setup" element={<MFASetup />} />

        <Route path="/register" element={<Register />} />

        {/* 🔓 TESTE */}
        <Route path="/dashboard" element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        } />

        {/* 🔐 AUTHENTICATED */}
        <Route path="/dashboard" element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        } />

        <Route path="/profile" element={
          <AuthGuard>
            <Profile />
          </AuthGuard>
        } />

        {/* 🎓 STUDENT */}
        <Route path="/student/tasks" element={
          <AuthGuard>
            <RoleGuard allowedRoles={[ROLES.STUDENT]}>
              <StudentTasks />
            </RoleGuard>
          </AuthGuard>
        } />

        {/* 👨‍🏫 PROFESSOR */}
        <Route path="/professor/tasks" element={
          <AuthGuard>
            <RoleGuard allowedRoles={[ROLES.PROFESSOR]}>
              <ManageTasks />
            </RoleGuard>
          </AuthGuard>
        } />

        {/* 👨‍💼 ADMIN */}
        <Route path="/admin/users" element={
          <AuthGuard>
            <RoleGuard allowedRoles={[ROLES.ADMIN]}>
              <UserManagement />
            </RoleGuard>
          </AuthGuard>
        } />

        {/* ⚠️ OUTRAS */}
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}