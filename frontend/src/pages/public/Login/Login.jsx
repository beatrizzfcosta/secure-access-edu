// src/pages/public/Login/Login.jsx
import { useState } from "react";
import { login } from "../../../services/authService";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  try {
    const res = await login(form);

    // 👉 MFA
    if (res.data.mfaRequired) {
      navigate("/mfa");
      return;
    }

    // 👉 Guardas apenas o user (não token)
    loginUser(res.data.user);

    // 👉 Redirecionamento por role
    const role = res.data.user.role;

    if (role === "ADMIN") navigate("/admin");
    else if (role === "PROFESSOR") navigate("/professor");
    else navigate("/student");

  } catch (err) {
    setError("Credenciais inválidas");
  } finally {
    setLoading(false);
  }
};


  

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Academic Curator</h1>
          <p className="text-sm text-gray-500">
            Plataforma Segura de Gestão Académica
          </p>

          <div className="mt-3 text-green-700 text-xs bg-green-100 px-3 py-1 rounded-full inline-block">
            Conta protegida com verificação em dois fatores
          </div>
        </div>

        {/* CARD */}
        <div className="bg-white p-6 rounded-lg shadow-md">

          <h2 className="text-xl font-semibold mb-2">
            Entrar na conta
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Acesse sua biblioteca e recursos exclusivos.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* EMAIL */}
            <input
              type="email"
              placeholder="nome@universidade.edu"
              className="w-full border p-2 rounded"
              autoComplete="email"
              required
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            {/* PASSWORD */}
            <input
              type="password"
              placeholder="••••••••"
              className="w-full border p-2 rounded"
              autoComplete="current-password"
              required
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            {/* ERRO */}
            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* BOTÃO */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded"
            >
              {loading ? "Autenticando..." : "Continuar"}
            </button>

          </form>

          <p className="text-sm text-center mt-4">
            Não tem uma conta?{" "}
            <span className="text-blue-600 cursor-pointer">
              <a href="/register">Solicitar acesso</a>
            </span>
          </p>

        </div>

        {/* FOOTER */}
        <div className="text-center text-xs text-gray-400 mt-6">
          Autenticação Segura (JWT)
        </div>

      </div>
    </div>
  );
}