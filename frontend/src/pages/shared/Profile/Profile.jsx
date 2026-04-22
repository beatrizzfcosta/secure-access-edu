import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/Layout/DashboardLayout";
import SecurityPoliciesModal from "../../../components/SecurityPoliciesModal/SecurityPoliciesModal";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  changePassword,
  setAccessToken,
} from "../../../services/authService";

function policiesStorageKey(userId) {
  return `secureacad_accepted_security_policies:${userId}`;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [policiesAccepted, setPoliciesAccepted] = useState(true);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const doRefresh = async () => {
    if (typeof refreshUser === "function") {
      await refreshUser();
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    if (!user.password_change_required) {
      sessionStorage.removeItem(policiesStorageKey(user.id));
      setPoliciesAccepted(true);
      return;
    }
    const accepted =
      sessionStorage.getItem(policiesStorageKey(user.id)) === "1";
    setPoliciesAccepted(accepted);
  }, [user?.id, user?.password_change_required]);

  const handleAcceptSecurityPolicies = () => {
    if (user?.id) {
      sessionStorage.setItem(policiesStorageKey(user.id), "1");
    }
    setPoliciesAccepted(true);
  };

  const showPoliciesGate =
    Boolean(user?.password_change_required) && !policiesAccepted;

  useEffect(() => {
    if (showPoliciesGate) return;
    const focus =
      location.state?.focusPassword || location.hash === "#palavra-passe";
    if (focus) {
      const el = document.getElementById("secao-palavra-passe");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        document.getElementById("profile-old-password")?.focus();
      }, 300);
    }
  }, [location.state, location.hash, showPoliciesGate]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (newPassword !== confirmPassword) {
      setPwdError("A nova palavra-passe e a confirmação não coincidem.");
      return;
    }
    if (newPassword.length < 8) {
      setPwdError("A nova palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPwdError("Inclua pelo menos uma letra maiúscula.");
      return;
    }
    if (!/\d/.test(newPassword)) {
      setPwdError("Inclua pelo menos um dígito.");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setPwdError("Inclua pelo menos um carácter especial (ex.: ! @ #).");
      return;
    }

    setPwdSaving(true);
    try {
      const res = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      if (res.data?.token) {
        setAccessToken(res.data.token);
      }
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdSuccess("Palavra-passe alterada com sucesso.");
      try {
        await doRefresh();
      } catch {
        setPwdSuccess(
          "Palavra-passe alterada. Recarregue a página se o aviso amarelo continuar visível."
        );
      }
    } catch (err) {
      const msg = err.response?.data?.error;
      const policyMap = {
        password_too_short: "A nova palavra-passe é demasiado curta (mín. 8).",
        password_too_long: "A nova palavra-passe é demasiado longa.",
        password_requires_uppercase: "É necessária pelo menos uma letra maiúscula.",
        password_requires_number: "É necessário pelo menos um dígito.",
        password_requires_special_char:
          "É necessário pelo menos um carácter especial.",
        password_compromised: "Esta palavra-passe é demasiado fraca ou comum.",
        password_reuse_not_allowed: "Não pode reutilizar uma palavra-passe antiga.",
      };
      if (msg === "Current password is invalid") {
        setPwdError("A palavra-passe atual está incorreta.");
      } else if (msg && policyMap[msg]) {
        setPwdError(policyMap[msg]);
      } else if (typeof msg === "string") {
        setPwdError(msg);
      } else {
        setPwdError("Não foi possível alterar a palavra-passe.");
      }
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <SecurityPoliciesModal
        open={showPoliciesGate}
        onAccept={handleAcceptSecurityPolicies}
      />
      <div className="max-w-xl space-y-8 w-full">
        <div
          id="secao-palavra-passe"
          className={`bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 ${
            showPoliciesGate ? "pointer-events-none opacity-40 select-none" : ""
          }`}
          aria-hidden={showPoliciesGate}
        >
          <h2 className="text-xl font-bold mb-1">Alterar palavra-passe</h2>
          <p className="text-sm text-gray-600 mb-4">
            Utilize a palavra-passe atual e escolha uma nova que cumpra as
            regras abaixo.
          </p>
          {user?.password_change_required && (
            <p className="text-sm text-amber-900 bg-amber-100 border border-amber-300 rounded-lg p-3 mb-4">
              É <strong>obrigatório</strong> definir uma nova palavra-passe
              nesta conta. Aceite as políticas de segurança no diálogo para
              continuar.
            </p>
          )}
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="profile-old-password"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Palavra-passe atual
              </label>
              <input
                id="profile-old-password"
                type="password"
                autoComplete="current-password"
                className="w-full border border-gray-300 p-2 rounded"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                disabled={showPoliciesGate}
              />
            </div>
            <p className="text-xs text-gray-500">
              Nova palavra-passe: mínimo 8 caracteres, uma maiúscula, um dígito
              e um símbolo (ex.: ! @ #).
            </p>
            <div>
              <label
                htmlFor="profile-new-password"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Nova palavra-passe
              </label>
              <input
                id="profile-new-password"
                type="password"
                autoComplete="new-password"
                className="w-full border border-gray-300 p-2 rounded"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={showPoliciesGate}
              />
            </div>
            <div>
              <label
                htmlFor="profile-confirm-password"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Confirmar nova palavra-passe
              </label>
              <input
                id="profile-confirm-password"
                type="password"
                autoComplete="new-password"
                className="w-full border border-gray-300 p-2 rounded"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={showPoliciesGate}
              />
            </div>
            {pwdError && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-100">
                {pwdError}
              </div>
            )}
            {pwdSuccess && (
              <div className="text-green-800 text-sm bg-green-50 p-3 rounded border border-green-100">
                {pwdSuccess}
              </div>
            )}
            <button
              type="submit"
              disabled={pwdSaving || showPoliciesGate}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-60"
            >
              {pwdSaving ? "A guardar…" : "Guardar nova palavra-passe"}
            </button>
          </form>
        </div>

        <div
          className={`bg-white p-6 rounded-xl shadow-sm ${
            showPoliciesGate ? "pointer-events-none opacity-40 select-none" : ""
          }`}
          aria-hidden={showPoliciesGate}
        >
          <h2 className="text-lg font-bold mb-4">Dados da conta</h2>
          <div className="space-y-3 text-sm">
            <p>
              <span className="text-gray-500">Utilizador:</span>{" "}
              <span className="font-medium">{user?.username ?? "—"}</span>
            </p>
            <p>
              <span className="text-gray-500">Papel:</span>{" "}
              <span className="font-medium">{user?.role ?? "—"}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/mfa/setup")}
            disabled={showPoliciesGate}
            className="mt-6 w-full bg-gray-100 text-gray-900 py-2 rounded border border-gray-200 disabled:opacity-60"
          >
            Configurar 2FA
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
