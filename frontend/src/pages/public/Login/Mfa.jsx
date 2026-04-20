import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { get2faSetup, verify2faEnrollment } from "../../../services/authService";
import { pathForRole } from "../../../utils/roles";
import { useAuth } from "../../../hooks/useAuth";

export default function MFA() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [cooldown, setCooldown] = useState(30);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [setupLoading, setSetupLoading] = useState(true);

  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await get2faSetup();
        const b64 = res.data?.qr;
        if (!cancelled && b64) {
          setQrDataUrl(`data:image/png;base64,${b64}`);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setSetupLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").slice(0, 6);

    if (!/^\d+$/.test(paste)) return;

    const newOtp = paste.split("");
    setOtp([...newOtp, "", "", "", "", ""].slice(0, 6));

    newOtp.forEach((_, i) => {
      if (inputsRef.current[i]) {
        inputsRef.current[i].value = newOtp[i];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const code = otp.join("");

    try {
      if (code.length !== 6) {
        throw new Error("invalid");
      }
      await verify2faEnrollment(code);
      navigate(user?.role ? pathForRole(user.role) : "/dashboard");
    } catch {
      setError(true);
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setCooldown(30);
    setTimeLeft(30);
    setError(false);
  };

  const maskedEmail =
    user?.username != null
      ? `${String(user.username).slice(0, 2)}***`
      : "m******@email.com";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">Verificação de Segurança</h1>
          <p className="text-sm text-gray-500">
            Confirme o código da sua app de autenticação
          </p>
          {qrDataUrl && !setupLoading && (
            <div className="mt-4 flex justify-center">
              <img src={qrDataUrl} alt="" className="w-24 h-24" />
            </div>
          )}
          <p className="text-sm text-blue-600 font-semibold">{maskedEmail}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-10 h-12 text-center border text-lg"
              />
            ))}
          </div>

          <p className="text-sm text-center text-gray-500">
            Código expira em{" "}
            <span className={timeLeft === 0 ? "text-red-500" : "text-blue-600"}>
              {timeLeft > 0 ? `${timeLeft}s` : "Expirado"}
            </span>
          </p>

          {error && (
            <div className="text-red-600 text-sm text-center">
              Código inválido ou expirado
            </div>
          )}

          <button
            type="submit"
            disabled={loading || setupLoading}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            {loading ? "Verificando..." : "Verificar e Entrar"}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className="w-full bg-gray-200 py-2 rounded"
          >
            Reenviar código {cooldown > 0 && `(${cooldown}s)`}
          </button>
        </form>
      </div>
    </div>
  );
}
