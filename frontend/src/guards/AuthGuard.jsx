// src/guards/AuthGuard.jsx
// src/guards/AuthGuard.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function AuthGuard({ children }) {
  const auth = useAuth();

  // 🔥 proteção contra undefined
  if (!auth) return <p>Auth error</p>;

  const { user, loading } = auth;

  // ⏳ evita crash antes de carregar
  if (loading) return <p>Loading...</p>;

  // 🔐 sem utilizador → login
  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}