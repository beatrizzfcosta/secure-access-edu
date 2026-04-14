// src/pages/public/MFA/MFA.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function MFA() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [cooldown, setCooldown] = useState(30);

  const inputsRef = useRef([]);
  const navigate = useNavigate();

  // ⏱️ TIMER EXPIRAÇÃO
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 🔁 COOLDOWN REENVIO
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  // ✏️ INPUT CHANGE
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  // ⬅️ BACKSPACE
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  // 📋 PASTE
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

  // ✅ SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const code = otp.join("");

    try {
      // 👉 aqui vais chamar backend
      console.log("OTP:", code);

      // simulação
      await new Promise((r) => setTimeout(r, 1200));

      const success = code === "123456"; // mock

      if (!success) {
        throw new Error();
      }

      navigate("/dashboard");

    } catch {
      setError(true);
      setOtp(["", "", "", "", "", ""]);
      inputsRef.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  // 🔁 REENVIAR
  const handleResend = () => {
    setCooldown(30);
    setTimeLeft(30);
    setError(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">

      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">

        <div className="text-center mb-6">
          <h1 className="text-xl font-bold">Verificação de Segurança</h1>
          <p className="text-sm text-gray-500">
            Código enviado para o seu dispositivo
          </p>
          <p className="text-sm text-blue-600 font-semibold">
            m******@email.com
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* OTP INPUTS */}
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

          {/* TIMER */}
          <p className="text-sm text-center text-gray-500">
            Código expira em{" "}
            <span className={timeLeft === 0 ? "text-red-500" : "text-blue-600"}>
              {timeLeft > 0 ? `${timeLeft}s` : "Expirado"}
            </span>
          </p>

          {/* ERRO */}
          {error && (
            <div className="text-red-600 text-sm text-center">
              Código inválido ou expirado
            </div>
          )}

          {/* BOTÃO */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            {loading ? "Verificando..." : "Verificar e Entrar"}
          </button>

          {/* REENVIAR */}
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