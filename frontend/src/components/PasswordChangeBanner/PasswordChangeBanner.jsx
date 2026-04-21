import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/**
 * Alerta quando a conta exige mudança de palavra-passe (JWT / respostas 403 da API).
 */
export default function PasswordChangeBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [fromInterceptor, setFromInterceptor] = useState(false);

  useEffect(() => {
    const handler = () => setFromInterceptor(true);
    window.addEventListener("secureacad:password-change-required", handler);
    return () =>
      window.removeEventListener("secureacad:password-change-required", handler);
  }, []);

  useEffect(() => {
    if (!user?.password_change_required) {
      setFromInterceptor(false);
    }
  }, [user?.password_change_required]);

  const mustChange = Boolean(user?.password_change_required) || fromInterceptor;
  const publicPath =
    location.pathname === "/login" ||
    location.pathname === "/" ||
    location.pathname === "/register";
  if (publicPath || !mustChange || !user) return null;

  const onGoToProfile = () => {
    navigate("/profile#palavra-passe", { state: { focusPassword: true } });
  };

  const isProfile = location.pathname === "/profile";

  return (
    <div
      className="ml-64 w-[calc(100vw-16rem)] max-w-full box-border bg-amber-500 text-amber-950 px-4 py-3 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 z-30 relative"
      role="alert"
    >
      <p className="text-sm font-medium">
        A sua conta precisa de uma <strong>nova palavra-passe</strong> antes de
        usar todas as funções. Altere-a em Perfil.
      </p>
      {!isProfile && (
        <button
          type="button"
          onClick={onGoToProfile}
          className="shrink-0 bg-amber-950 text-amber-50 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
        >
          Ir alterar palavra-passe
        </button>
      )}
    </div>
  );
}
