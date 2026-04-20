// Valores alinhados com o backend (JWT / RBAC): admin, teacher, student
export const ROLES = {
  ADMIN: "admin",
  PROFESSOR: "teacher",
  STUDENT: "student",
};

/** Rota inicial após login consoante o papel */
export function pathForRole(role) {
  if (role === ROLES.ADMIN) return "/admin/";
  if (role === ROLES.PROFESSOR) return "/professor/";
  return "/student/";
}