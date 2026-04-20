import api from "./api";

export function fetchAdminUsers() {
  return api.get("/admin/users");
}

export function fetchAdminRoles() {
  return api.get("/admin/roles");
}

export function patchUserRoles(userId, roles) {
  return api.patch(`/admin/users/${userId}/roles`, { roles });
}

export function createAdminUser({ username, email, password, roles }) {
  return api.post("/admin/users", { username, email, password, roles });
}

export function deleteAdminUser(userId) {
  return api.delete(`/admin/users/${userId}`);
}

export function fetchAdminLogs() {
  return api.get("/admin/logs");
}