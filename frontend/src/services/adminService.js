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

export const downloadLogsFile = async () => {
  const token = localStorage.getItem('secureacad_access_token');
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

  try {
    const response = await fetch(`${baseUrl}/admin/logs/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Erro ao descarregar logs. Verifica se és Admin.');

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'logs.txt');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert(error.message);
  }
};