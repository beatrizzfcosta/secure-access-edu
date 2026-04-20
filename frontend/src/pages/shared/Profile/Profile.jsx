import DashboardLayout from "../../../components/Layout/DashboardLayout";
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="max-w-lg bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">Perfil</h2>
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
          className="mt-6 w-full bg-blue-600 text-white py-2 rounded"
        >
          Configurar 2FA
        </button>
      </div>
    </DashboardLayout>
  );
}
