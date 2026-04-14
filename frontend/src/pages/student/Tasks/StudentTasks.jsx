// src/pages/public/Login/Login.jsx
import { useState } from "react";
import { login } from "../../../services/authService";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await login(form);

      // backend deve devolver dados do utilizador
      loginUser(res.data.user);

      navigate("/dashboard");
    } catch (err) {
      setError("Credenciais inválidas");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <button type="submit">Login</button>

      {error && <p>{error}</p>}
    </form>
  );
}