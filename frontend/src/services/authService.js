// src/services/authService.js
import api from "./api";

export const login = (credentials) => {
  return api.post("/login", credentials);
};

export const logout = () => {
  return api.post("/logout");
};

export const getMe = () => {
  return api.get("/me");
};