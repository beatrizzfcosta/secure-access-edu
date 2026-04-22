import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/Layout/DashboardLayout";
import {
  fetchAdminUsers,
  fetchAdminRoles,
  patchUserRoles,
  createAdminUser,
  deleteAdminUser,
} from "../../../services/adminService";
import { useAuth } from "../../../hooks/useAuth";
import PasswordField from "../../../components/PasswordField/PasswordField";

function IconPencil({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconCheck({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconTrash({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
    </svg>
  );
}

function IconX({ className = "w-4 h-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function UserManagement() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
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
  const [deletingId, setDeletingId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);

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
    if (editingUserId !== userId) return;
    setDraftRoles((prev) => {
      const cur = new Set(prev[userId] ?? []);
      if (cur.has(role)) cur.delete(role);
      else cur.add(role);
      return { ...prev, [userId]: [...cur].sort() };
    });
  };

  const startEditRoles = (u) => {
    setError("");
    setDraftRoles((prev) => {
      let next = { ...prev, [u.id]: [...(u.roles ?? [])] };
      if (editingUserId && editingUserId !== u.id) {
        const prevRow = users.find((x) => x.id === editingUserId);
        if (prevRow) {
          next = {
            ...next,
            [editingUserId]: [...(prevRow.roles ?? [])],
          };
        }
      }
      return next;
    });
    setEditingUserId(u.id);
  };

  const cancelEditRoles = (u) => {
    setDraftRoles((prev) => ({
      ...prev,
      [u.id]: [...(u.roles ?? [])],
    }));
    setEditingUserId(null);
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

  const removeUser = async (u) => {
    if (
      !window.confirm(
        `Eliminar definitivamente o utilizador "${u.username}" (${u.email})?`
      )
    ) {
      return;
    }
    setDeletingId(u.id);
    setError("");
    try {
      await deleteAdminUser(u.id);
      await load();
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(
        typeof msg === "string" ? msg : "Não foi possível eliminar o utilizador."
      );
    } finally {
      setDeletingId(null);
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
      setEditingUserId(null);
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
            <PasswordField
              placeholder="Palavra-passe"
              inputClassName="border p-2 rounded w-full"
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
                  <th className="p-3 w-28 text-right">Ações</th>
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
                      <div
                        className={`flex flex-wrap gap-2 ${
                          editingUserId !== u.id ? "opacity-75" : ""
                        }`}
                      >
                        {roleNames.map((r) => (
                          <label
                            key={r}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                              editingUserId === u.id
                                ? "bg-gray-100 cursor-pointer"
                                : "bg-gray-50 cursor-default"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="cursor-inherit"
                              disabled={editingUserId !== u.id}
                              checked={(draftRoles[u.id] ?? []).includes(r)}
                              onChange={() => toggleRole(u.id, r)}
                            />
                            {r}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end items-center gap-1">
                        {editingUserId === u.id ? (
                          <>
                            <button
                              type="button"
                              disabled={savingId === u.id}
                              onClick={() => saveUser(u.id)}
                              className="p-2 rounded-lg text-green-700 hover:bg-green-50 disabled:opacity-50"
                              title="Guardar papéis"
                              aria-label="Guardar papéis"
                            >
                              {savingId === u.id ? (
                                <span className="text-xs">…</span>
                              ) : (
                                <IconCheck />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={savingId === u.id}
                              onClick={() => cancelEditRoles(u)}
                              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                              title="Cancelar edição"
                              aria-label="Cancelar edição"
                            >
                              <IconX />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditRoles(u)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Editar papéis"
                            aria-label="Editar papéis"
                          >
                            <IconPencil />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={
                            deletingId === u.id ||
                            String(currentUser?.id) === String(u.id) ||
                            editingUserId === u.id
                          }
                          onClick={() => removeUser(u)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                          title="Eliminar utilizador"
                          aria-label="Eliminar utilizador"
                        >
                          {deletingId === u.id ? (
                            <span className="text-xs w-4 inline-block text-center">
                              …
                            </span>
                          ) : (
                            <IconTrash />
                          )}
                        </button>
                      </div>
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
