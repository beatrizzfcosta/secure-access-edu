// src/app/routes.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/public/Login/Login";
import MFA from "../pages/public/Login/Mfa";
import MFASetup from "../pages/public/Login/MFASetup";
import Register from "../pages/public/Register/Register";

import Dashboard from "../pages/shared/Dashboard/Dashboard";
import Profile from "../pages/shared/Profile/Profile";

import DashboardStundent from "../pages/student/Dashboard";
import StudentTasks from "../pages/student/Tasks/StudentTasks";

import DashboardProfessor from "../pages/professor/Dashboard";
import ManageTasks from "../pages/professor/Tasks/ManageTasks";

import DashboardAdmin from "../pages/admin/Dashboard";
import UserManagement from "../pages/admin/Users/UserManagement";
import RoleManagement from "../pages/admin/Roles/RoleManagement";

import Unauthorized from "../pages/Unauthorized/Unauthorized";
import NotFound from "../pages/NotFound/NotFound";

import AuthGuard from "../guards/AuthGuard";
import RoleGuard from "../guards/RoleGuard";

import { ROLES } from "../utils/roles";

const TEACHER_OR_ADMIN = [ROLES.PROFESSOR, ROLES.ADMIN];

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>


        <Route path="/" element={<Login />} />

        {/* 🔓 PUBLIC */}
        <Route path="/login" element={<Login />} />

        <Route path="/mfa" element={
          <AuthGuard>
            <MFA />
          </AuthGuard>
        } />

        <Route path="/mfa/setup" element={
          <AuthGuard>
            <MFASetup />
          </AuthGuard>
        } />

        <Route path="/register" element={<Register />} />

        {/* 🔓 TESTE */}
        <Route path="/dashboard1" element={
          <AuthGuard>
            <Dashboard />
          </AuthGuard>
        } />

        {/* 🔐 AUTHENTICATED — uma única rota /dashboard (com AuthGuard) */}
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
        <Route path="/student/" element={
          <AuthGuard>
            <RoleGuard allowedRoles={[ROLES.STUDENT]}>
              <DashboardStundent />
            </RoleGuard>
          </AuthGuard>
        } />

        <Route path="/student/tasks" element={
          <AuthGuard>
            <RoleGuard allowedRoles={[ROLES.STUDENT]}>
              <StudentTasks />
            </RoleGuard>
          </AuthGuard>
        } />


        {/* 👨‍🏫 PROFESSOR (+ admin pode criar/girar tarefas) */}
        <Route path="/professor/" element={
          <AuthGuard>
            <RoleGuard allowedRoles={TEACHER_OR_ADMIN}>
              <DashboardProfessor />
            </RoleGuard>
          </AuthGuard>
        } />
        <Route path="/professor/tasks" element={
          <AuthGuard>
            <RoleGuard allowedRoles={TEACHER_OR_ADMIN}>
              <ManageTasks />
            </RoleGuard>
          </AuthGuard>
        } />

        {/* 👨‍💼 ADMIN */}
        <Route path="/admin" element={<Navigate to="/admin/" replace />} />
        <Route path="/admin/" element={
          <AuthGuard>
            <RoleGuard allowedRoles={[ROLES.ADMIN]}>
              <DashboardAdmin />
            </RoleGuard>
          </AuthGuard>
        } />
        <Route path="/admin/users" element={
          <AuthGuard>
            <RoleGuard allowedRoles={[ROLES.ADMIN]}>
              <UserManagement />
            </RoleGuard>
          </AuthGuard>
        } />
        <Route path="/admin/roles" element={
          <AuthGuard>
            <RoleGuard allowedRoles={[ROLES.ADMIN]}>
              <RoleManagement />
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