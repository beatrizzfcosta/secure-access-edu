import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import { fetchAdminUsers, fetchAdminRoles, fetchAdminLogs } from "../../services/adminService";


export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [roleCount, setRoleCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [uRes, rRes, rLogs] = await Promise.all([
          fetchAdminUsers(),
          fetchAdminRoles(),
          fetchAdminLogs(),
        ]);
        if (!cancelled) {
          setUsers(uRes.data?.users ?? []);
          setRoleCount((rRes.data?.roles ?? []).length);
          setLogs(rLogs.data?.logs ?? []);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setRoleCount(0);
          setLogs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeUsers = users.filter((u) => !u.is_blocked).length;
  const preview = users.slice(0, 2);
  const preview_logs = logs.slice(0, 10);

  return (
    <DashboardLayout>
      <div>
        <h2 className="text-3xl font-bold mb-2">
          System <span className="text-blue-600">Overview</span>
        </h2>
        <p className="text-gray-500 mb-4">
        Na dashboard de administração, pode monitorizar a integridade do sistema, gerir utilizadores e auditar a atividade do sistema. 
      </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500">Utilizadores Ativos</p>
          <p className="text-2xl font-bold" id="activeUsers">
            {loading ? "…" : activeUsers}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500">Cargos</p>
          <p className="text-2xl font-bold">{loading ? "…" : roleCount}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <p className="text-xs text-gray-500">Número total de Utilizadores</p>
          <p className="text-2xl font-bold">{loading ? "…" : users.length}</p>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 space-y-6 md:space-y-0 mt-6">
        <div className="md:col-span-8 bg-white rounded-xl p-6 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Gestão de Utilizadores</h3>
            <Link
              to="/admin/users"
              className="text-sm text-blue-600 font-bold"
            >
              Ver todos
            </Link>
          </div>

          <div id="userList" className="space-y-4 flex-1">
            {loading ? (
              <p className="text-gray-500 text-sm">A carregar…</p>
            ) : preview.length === 0 ? (
              <p className="text-gray-500 text-sm">Sem utilizadores na API.</p>
            ) : (
              preview.map((u) => (
                <div
                  key={u.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-bold">{u.username}</p>
                    <p className="text-xs text-gray-500">
                      {(u.roles ?? []).join(", ") || "—"} •{" "}
                      {u.is_blocked ? "Blocked" : "Active"}
                    </p>
                  </div>
                  <Link
                    to="/admin/users"
                    className="text-blue-600 text-sm font-bold"
                  >
                    Editar
                  </Link>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-4 border-t flex justify-between items-center">
            <span className="text-xs text-gray-400">
              Dados da API /admin/users
            </span>
            <button
              type="button"
              onClick={() =>
                navigate("/admin/users", {
                  state: { scrollToCreate: true },
                })
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold"
            >
              Criar Utilizador
            </button>
          </div>
        </div>

        <div className="md:col-span-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-xl p-6 flex flex-col">
          <h3 className="text-xl font-bold mb-4">Controlo de Acessos</h3>
          <p className="text-sm opacity-80 mb-6">
            Gerencie roles e permissões do sistema.
          </p>
          <ul className="space-y-2 text-sm mb-6">
            <li>✔ Papéis: student, teacher, admin</li>
            <li>✔ MFA por utilizador</li>
          </ul>
          <button
            type="button"
            onClick={() => navigate("/admin/roles")}
            className="mt-auto bg-white/20 py-2 rounded-lg"
          >
            Gerir Permissões
          </button>
        </div>

        <div className="md:col-span-12 bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Auditoria</h3>

            <button
              type="button"
              className="flex items-center gap-2 text-blue-600 font-semibold hover:opacity-80"
        >
              <span className="text-lg">⬇</span>
              <span>Download</span>
          </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="py-2 text-left">Timestamp</th>
                  <th className="py-2 text-left">User</th>
                  <th className="py-2 text-left">Action</th>
                  <th className="py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody id="auditLogs">
                {/* <tr>
                  <td className="py-2 text-gray-400" colSpan={4}>
                    Os eventos de auditoria persistidos na BD ainda não estão
                    expostos nesta vista.
                  </td>
                </tr> */}
                {loading ? (
                  <tr>
                    <td className="py-2 text-gray-400" colSpan={4}>
                      A Carregar ...
                    </td>
                  </tr>
                ) : preview_logs.length === 0 ? (
                  <tr>
                    <td className="py-2 text-gray-400" colSpan={4}>
                      Os eventos de auditoria persistidos na BD ainda não estão
                      expostos nesta vista.
                    </td>
                  </tr>
                ) : (
                  preview_logs.map((l) => (
                    <tr
                      key={l.id}
                    >
                      <td className="py-2 text-gray-400">{l.occurred_at}</td>
                      <td className="py-2 text-gray-400">{l.user_id}</td>
                      <td className="py-2 text-gray-400">{l.resource_type}</td>
                      <td className="py-2 text-gray-400">{l.event_type}</td>
                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
