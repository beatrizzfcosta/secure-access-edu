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

/** Normaliza payload de /me ou login (user_id → id para a UI) */
export function normalizeUser(data) {
  if (!data) return null;
  return {
    ...data,
    id: data.user_id ?? data.id,
    password_change_required: Boolean(data.password_change_required),
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

export function registerAccount({ username, password, email }) {
  return api.post("/register", { username, password, email });
}

export function get2faSetup() {
  return api.get("/2fa/setup");
}

export function verify2faEnrollment(otp) {
  return api.post("/2fa/verify", { otp });
}

export function changePassword({ old_password, new_password }) {
  return api.post("/password/change", { old_password, new_password });
}
