import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get2faSetup, verify2faEnrollment } from "../../../services/authService";
import { pathForRole } from "../../../utils/roles";
import { useAuth } from "../../../hooks/useAuth";

export default function MFASetup() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [error, setError] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");

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

  const handleSubmit = async () => {
    setLoading(true);
    setError(false);

    const digits = code.replace(/\D/g, "");
    if (digits.length !== 6) {
      setError(true);
      setLoading(false);
      return;
    }

    try {
      await verify2faEnrollment(digits);
      navigate(user?.role ? pathForRole(user.role) : "/dashboard");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            🔐
          </div>

          <h1 className="text-xl font-bold mb-2">
            Ativar Autenticação em Dois Fatores
          </h1>

          <p className="text-sm text-gray-500 mb-6">
            Proteja a sua conta com uma camada extra de segurança.
          </p>

          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            {setupLoading ? (
              <p className="text-sm text-gray-500">A carregar QR…</p>
            ) : qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="QR Code MFA" className="mx-auto" />
                <p className="text-xs mt-2 text-gray-500">
                  Digitalize com Google Authenticator
                </p>
              </>
            ) : (
              <p className="text-sm text-red-600">
                Não foi possível obter o código QR. Confirme que está autenticado.
              </p>
            )}
          </div>

          <div className="mb-6">
            <p className="text-xs text-gray-500 mb-1">
              Não consegue digitalizar?
            </p>
            <div className="bg-gray-200 p-2 rounded font-mono text-sm text-gray-600">
              A chave está no QR (formato otpauth). Use a app para ler o QR.
            </div>
          </div>

          <input
            type="text"
            placeholder="Código de 6 dígitos"
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full text-center text-xl tracking-widest border p-3 rounded mb-4"
          />

          <p className="text-xs text-gray-500 mb-4">
            O código muda a cada 30 segundos
          </p>

          {error && (
            <div className="text-red-600 text-sm mb-4">
              Código inválido ou expirado
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || setupLoading}
            className="w-full bg-blue-600 text-white py-3 rounded"
          >
            {loading ? "A validar..." : "Ativar MFA"}
          </button>

          <button
            onClick={() =>
              navigate(user?.role ? pathForRole(user.role) : "/dashboard")
            }
            className="mt-4 text-sm text-blue-600"
          >
            Cancelar
          </button>
        </div>
      </main>
    </div>
  );
}
