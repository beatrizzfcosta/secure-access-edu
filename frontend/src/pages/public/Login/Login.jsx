import { useState, useRef, useEffect } from "react";
import {
  login,
  setAccessToken,
  getMe,
  normalizeUser,
} from "../../../services/authService";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { pathForRole } from "../../../utils/roles";

function isOtpRequiredError(err) {
  if (!err?.response || err.response.status !== 401) return false;
  const d = err.response.data;
  if (!d || typeof d !== "object") return false;
  if (d.mfa_required === true) return true;
  const e = d.error;
  if (typeof e !== "string") return false;
  return e.trim().toLowerCase() === "otp required";
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("credentials");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const otpInputRef = useRef(null);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (step === "otp") {
      otpInputRef.current?.focus();
    }
  }, [step]);

  const finishLogin = async (token, profileFromLogin) => {
    if (!token) {
      throw new Error("MISSING_TOKEN");
    }
    setAccessToken(token);
    let profile = profileFromLogin;
    if (!profile?.role) {
      try {
        const me = await getMe();
        profile = me.data;
      } catch {
        throw new Error("PROFILE_LOAD_FAILED");
      }
    }
    const user = normalizeUser(profile);
    loginUser(user);
    navigate(pathForRole(user.role));
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login({ username, password });
      await finishLogin(res.data.token, res.data.user);
    } catch (err) {
      if (err.message === "MISSING_TOKEN") {
        setError("Resposta do servidor sem token. Tenta outra vez.");
      } else if (err.message === "PROFILE_LOAD_FAILED") {
        setError(
          "Login aceite, mas falhou carregar o perfil (/me). Verifica CORS e o token."
        );
      } else {
        const msg = err.response?.data?.error;
        if (isOtpRequiredError(err)) {
          setStep("otp");
          setOtp("");
          setError("");
        } else if (msg) {
          setError(
            msg === "Invalid credentials" ? "Credenciais inválidas" : msg
          );
        } else {
          setError("Credenciais inválidas ou erro de rede.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const code = otp.replace(/\s/g, "");
    if (!/^\d{6}$/.test(code)) {
      setError("Introduza um código de 6 dígitos");
      setLoading(false);
      return;
    }

    try {
      const res = await login({ username, password, otp: code });
      await finishLogin(res.data.token, res.data.user);
    } catch (err) {
      if (err.message === "MISSING_TOKEN") {
        setError("Resposta do servidor sem token.");
      } else if (err.message === "PROFILE_LOAD_FAILED") {
        setError("Falha ao carregar o perfil após o código 2FA.");
      } else {
        const msg = err.response?.data?.error;
        if (msg === "Invalid OTP") {
          setError("Código inválido");
        } else if (msg) {
          setError(msg);
        } else {
          setError("Falha na verificação");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const goBackToCredentials = () => {
    setStep("credentials");
    setOtp("");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Secure access edu</h1>
          <p className="text-sm text-gray-500">
            Plataforma segura de gestão académica
          </p>
          <div className="mt-3 text-green-700 text-xs bg-green-100 px-3 py-1 rounded-full inline-block">
            Conta protegida com verificação em dois fatores
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          {step === "credentials" ? (
            <>
              <h2 className="text-xl font-semibold mb-2">Entrar na conta</h2>
              <p className="text-sm text-gray-500 mb-4">
                Utilizador e palavra-passe. Se a conta tiver 2FA ativo, a seguir
                pedimos o código da aplicação de autenticação.
              </p>

              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Utilizador"
                  className="w-full border p-2 rounded"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />

                <input
                  type="password"
                  placeholder="Palavra-passe"
                  className="w-full border p-2 rounded"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
                >
                  {loading ? "A autenticar…" : "Continuar"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-2">
                Verificação em dois passos
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Introduza o código de 6 dígitos da aplicação de autenticação
                (TOTP) associada à sua conta.
              </p>

              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  className="w-full border p-2 rounded text-center text-2xl tracking-[0.4em] font-mono"
                  autoComplete="one-time-code"
                  aria-label="Código de verificação de 6 dígitos"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />

                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
                >
                  {loading ? "A verificar…" : "Entrar"}
                </button>

                <button
                  type="button"
                  onClick={goBackToCredentials}
                  className="w-full bg-gray-100 text-gray-800 py-2 rounded"
                >
                  Voltar
                </button>
              </form>
            </>
          )}

          <p className="text-sm text-center mt-4">
            Não tem uma conta?{" "}
            <a href="/register" className="text-blue-600">
              Solicitar acesso
            </a>
          </p>
        </div>

        <div className="text-center text-xs text-gray-400 mt-6">
          Autenticação segura (JWT)
        </div>
      </div>
    </div>
  );
}
