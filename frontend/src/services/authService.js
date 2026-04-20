import api from "./api";

const TOKEN_KEY = "secureacad_access_token";

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Normaliza payload de /me (user_id → id para a UI) */
export function normalizeUser(data) {
  if (!data) return null;
  return {
    ...data,
    id: data.user_id ?? data.id,
  };
}

export const login = (credentials) => {
  return api.post("/login", credentials);
};

export const logout = () => {
  return api.post("/logout");
};

export const getMe = () => {
  return api.get("/me");
};
