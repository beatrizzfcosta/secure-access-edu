import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MFASetup() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const navigate = useNavigate();

  // 🔐 normalmente vem do backend
  const qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=EXEMPLO";
  const secretKey = "ABCD EFGH IJKL MNOP";

  const handleSubmit = async () => {
    setLoading(true);
    setError(false);

    try {
      // 👉 chamada real ao backend
      // await verifyMFASetup(code);

      await new Promise((r) => setTimeout(r, 1200));

      if (code !== "123456") { //await verifyMFASetup(code);
        throw new Error();
      }

      // sucesso
      navigate("/dashboard");

    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-4 py-12">

        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">

          {/* ICON */}
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            🔐
          </div>

          {/* TITLE */}
          <h1 className="text-xl font-bold mb-2">
            Ativar Autenticação em Dois Fatores
          </h1>

          <p className="text-sm text-gray-500 mb-6">
            Proteja a sua conta com uma camada extra de segurança.
          </p>

          {/* QR CODE */}
          <div className="bg-gray-100 p-4 rounded-lg mb-6">
            <img
              src={qrCodeUrl}
              alt="QR Code MFA"
              className="mx-auto"
            />
            <p className="text-xs mt-2 text-gray-500">
              Digitalize com Google Authenticator
            </p>
          </div>

          {/* SECRET KEY */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 mb-1">
              Não consegue digitalizar?
            </p>
            <div className="bg-gray-200 p-2 rounded font-mono text-sm tracking-widest">
              {secretKey}
            </div>
          </div>

          {/* INPUT */}
          <input
            type="text"
            placeholder="Código de 6 dígitos"
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value)}
            className="w-full text-center text-xl tracking-widest border p-3 rounded mb-4"
          />

          <p className="text-xs text-gray-500 mb-4">
            O código muda a cada 30 segundos
          </p>

          {/* ERRO */}
          {error && (
            <div className="text-red-600 text-sm mb-4">
              Código inválido ou expirado
            </div>
          )}

          {/* BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded"
          >
            {loading ? "A validar..." : "Ativar MFA"}
          </button>

          {/* CANCEL */}
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 text-sm text-blue-600"
          >
            Cancelar
          </button>

        </div>
      </main>

    </div>
  );
}