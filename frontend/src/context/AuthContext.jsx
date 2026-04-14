// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import { getMe } from "../services/authService";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔄 Verifica sessão ao carregar app
  useEffect(() => {
    getMe()
      .then(res => {
        console.log("USER:", res.data);
        setUser(res.data);
      })
      .catch(err => {
        console.log("ERRO getMe:", err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const loginUser = (userData) => setUser(userData);
  const logoutUser = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}