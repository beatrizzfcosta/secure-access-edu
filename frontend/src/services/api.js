import axios from "axios";
import { getAccessToken } from "./authService";

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
    const status = error.response?.status;
    const code = error.response?.data?.error;
    if (status === 403 && code === "PASSWORD_CHANGE_REQUIRED") {
      window.dispatchEvent(new CustomEvent("secureacad:password-change-required"));
    }
    return Promise.reject(error);
  }
);

export default api;
