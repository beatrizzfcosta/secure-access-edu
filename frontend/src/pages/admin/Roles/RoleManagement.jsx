import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/Layout/DashboardLayout";
import { fetchAdminRoles } from "../../../services/adminService";
import { useNavigate } from "react-router-dom";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAdminRoles();
        if (!cancelled) setRoles(res.data?.roles ?? []);
      } catch (err) {
        const msg = err.response?.data?.error;
        if (!cancelled) {
          setError(typeof msg === "string" ? msg : "Falha ao carregar papéis.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Papéis do sistema</h2>
        <p className="text-gray-500 text-sm">
          As permissões por papel estão definidas na base de dados. Para alterar
          que papel um utilizador tem, use{" "}
          <button
            type="button"
            className="text-blue-600 font-semibold"
            onClick={() => navigate("/admin/users")}
          >
            Gestão de utilizadores
          </button>
          .
        </p>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <ul className="bg-white rounded-xl shadow-sm divide-y">
          {roles.map((r) => (
            <li key={r.id} className="p-4 text-sm font-medium">
              {r.name}
            </li>
          ))}
        </ul>
      </div>
    </DashboardLayout>
  );
}
