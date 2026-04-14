// src/services/authService.js
import api from "./api";

export const login = (credentials) => {
  return api.post("/auth/login", credentials);
};

export const logout = () => {
  return api.post("/auth/logout");
};

export const getMe = () => {
  return api.get("/auth/me");
};