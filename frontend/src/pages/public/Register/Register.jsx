import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerAccount } from "../../../services/authService";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("As palavras-passe não coincidem");
      return;
    }

    if (form.password.length < 6) {
      setError("A palavra-passe deve ter pelo menos 6 caracteres");
      return;
    }

    const username = form.name.trim();
    if (!username) {
      setError("Indique o nome de utilizador");
      return;
    }

    setLoading(true);

    try {
      await registerAccount({
        username,
        password: form.password,
        email: form.email.trim(),
      });
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(
        typeof msg === "string" ? msg : "Erro ao criar conta. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-2xl font-bold text-blue-700">
              Secure access edu
            </div>

            <h2 className="text-xl font-semibold mt-4">Criar Conta</h2>

            <p className="text-sm text-gray-500 mt-2">
              Junte-se à nossa plataforma académica
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nome completo"
              className="w-full border p-3 rounded"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Email institucional"
              className="w-full border p-3 rounded"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Palavra-passe"
              className="w-full border p-3 rounded"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Confirmar palavra-passe"
              className="w-full border p-3 rounded"
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              required
            />

            {error && <div className="text-red-600 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded"
            >
              {loading ? "A criar conta..." : "Criar Conta"}
            </button>
          </form>

          <p className="text-sm text-center mt-6">
            Já tem conta?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-blue-600 cursor-pointer"
            >
              Iniciar sessão
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}
