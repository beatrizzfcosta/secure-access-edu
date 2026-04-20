import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/Layout/DashboardLayout";
import {
  fetchAdminUsers,
  fetchAdminRoles,
  patchUserRoles,
  createAdminUser,
} from "../../../services/adminService";

export default function UserManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roleNames, setRoleNames] = useState([]);
  const [draftRoles, setDraftRoles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [createRoles, setCreateRoles] = useState(["student"]);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminRoles(),
      ]);
      const list = usersRes.data?.users ?? [];
      setUsers(list);
      const names = (rolesRes.data?.roles ?? []).map((r) => r.name).sort();
      setRoleNames(names);
      const next = {};
      for (const u of list) {
        next[u.id] = [...(u.roles ?? [])];
      }
      setDraftRoles(next);
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(typeof msg === "string" ? msg : "Falha ao carregar utilizadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const shouldScroll =
      location.hash === "#criar-utilizador" ||
      location.state?.scrollToCreate === true;
    if (!shouldScroll) return;
    const t = window.setTimeout(() => {
      document
        .getElementById("criar-utilizador")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (location.state?.scrollToCreate) {
        navigate(location.pathname + location.hash, {
          replace: true,
          state: {},
        });
      }
    }, 150);
    return () => window.clearTimeout(t);
  }, [
    location.hash,
    location.pathname,
    location.state,
    loading,
    navigate,
  ]);

  const toggleRole = (userId, role) => {
    setDraftRoles((prev) => {
      const cur = new Set(prev[userId] ?? []);
      if (cur.has(role)) cur.delete(role);
      else cur.add(role);
      return { ...prev, [userId]: [...cur].sort() };
    });
  };

  const toggleCreateRole = (role) => {
    setCreateRoles((prev) => {
      const cur = new Set(prev);
      if (cur.has(role)) cur.delete(role);
      else cur.add(role);
      const next = [...cur].sort();
      return next.length ? next : ["student"];
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const u = createForm.username.trim();
    if (!u || !createForm.password) {
      setError("Preencha utilizador e palavra-passe.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await createAdminUser({
        username: u,
        email: createForm.email.trim() || undefined,
        password: createForm.password,
        roles: createRoles,
      });
      setCreateForm({ username: "", email: "", password: "" });
      setCreateRoles(["student"]);
      await load();
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(typeof msg === "string" ? msg : "Não foi possível criar o utilizador.");
    } finally {
      setCreating(false);
    }
  };

  const saveUser = async (userId) => {
    const roles = draftRoles[userId] ?? [];
    if (!roles.length) {
      setError("Cada utilizador deve ter pelo menos um papel.");
      return;
    }
    setSavingId(userId);
    setError("");
    try {
      await patchUserRoles(userId, roles);
      await load();
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(typeof msg === "string" ? msg : "Não foi possível guardar.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Utilizadores e papéis</h2>
          <p className="text-gray-500 text-sm">
            Atribua papéis (student, teacher, admin). As permissões derivam dos
            papéis na base de dados.
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
        )}

        <form
          id="criar-utilizador"
          onSubmit={handleCreateUser}
          className="bg-white rounded-xl shadow-sm p-6 space-y-4 scroll-mt-24"
        >
          <h3 className="font-bold text-lg">Novo utilizador</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Utilizador"
              className="border p-2 rounded w-full"
              value={createForm.username}
              onChange={(e) =>
                setCreateForm({ ...createForm, username: e.target.value })
              }
              required
            />
            <input
              type="email"
              placeholder="Email (opcional)"
              className="border p-2 rounded w-full"
              value={createForm.email}
              onChange={(e) =>
                setCreateForm({ ...createForm, email: e.target.value })
              }
            />
            <input
              type="password"
              placeholder="Palavra-passe"
              className="border p-2 rounded w-full"
              value={createForm.password}
              onChange={(e) =>
                setCreateForm({ ...createForm, password: e.target.value })
              }
              required
              minLength={6}
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-sm text-gray-600">Papéis iniciais:</span>
            {roleNames.map((r) => (
              <label
                key={r}
                className="inline-flex items-center gap-1 text-sm bg-gray-100 px-2 py-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={createRoles.includes(r)}
                  onChange={() => toggleCreateRole(r)}
                />
                {r}
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={creating || loading || roleNames.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold disabled:opacity-60"
          >
            {creating ? "A criar…" : "Criar utilizador"}
          </button>
        </form>

        {loading ? (
          <p className="text-gray-500">A carregar…</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="p-3">Utilizador</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">2FA</th>
                  <th className="p-3">Papéis</th>
                  <th className="p-3 w-32" />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="p-3 font-medium">{u.username}</td>
                    <td className="p-3 text-gray-600">{u.email}</td>
                    <td className="p-3">
                      {u.is_blocked ? (
                        <span className="text-red-600">Bloqueado</span>
                      ) : (
                        <span className="text-green-600">Ativo</span>
                      )}
                    </td>
                    <td className="p-3">{u.otp_enabled ? "Sim" : "Não"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {roleNames.map((r) => (
                          <label
                            key={r}
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={(draftRoles[u.id] ?? []).includes(r)}
                              onChange={() => toggleRole(u.id, r)}
                            />
                            {r}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        disabled={savingId === u.id}
                        onClick={() => saveUser(u.id)}
                        className="text-blue-600 font-semibold text-xs disabled:opacity-50"
                      >
                        {savingId === u.id ? "…" : "Guardar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
