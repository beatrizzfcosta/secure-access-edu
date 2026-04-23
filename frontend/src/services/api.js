import axios from "axios";
import { getAccessToken,clearAccessToken } from "./authService";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5001",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const res = error.response;
    const status = res?.status;
    const data = res?.data;

    // 403 → password change obrigatório
    if (status === 403 && data?.error === "PASSWORD_CHANGE_REQUIRED") {
      window.dispatchEvent(
        new CustomEvent("secureacad:password-change-required")
      );
      return Promise.reject(error);
    }

    // 401 → autenticação
    if (status === 401) {
      const isMfa =
        data?.mfa_required === true ||
        data?.error?.toLowerCase?.() === "otp required";

      // ✔ MFA → não interferir
      if (isMfa) {
        return Promise.reject(error);
      }

      // ✔ login endpoint → não interferir
      if (error.config?.url?.includes("/login")) {
        return Promise.reject(error);
      }

      // token inválido → logout
      clearAccessToken();

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
