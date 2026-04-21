import { createContext, useState, useEffect } from "react";
import {
  getMe,
  getAccessToken,
  clearAccessToken,
  normalizeUser,
} from "../services/authService";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    getMe()
      .then((res) => {
        setUser(normalizeUser(res.data));
      })
      .catch(() => {
        clearAccessToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginUser = (userData) => setUser(normalizeUser(userData));

  const refreshUser = async () => {
    const res = await getMe();
    setUser(normalizeUser(res.data));
    return normalizeUser(res.data);
  };

  const logoutUser = () => {
    clearAccessToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loginUser, logoutUser, loading, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
