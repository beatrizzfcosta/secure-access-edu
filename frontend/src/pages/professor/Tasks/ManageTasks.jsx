import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/Layout/DashboardLayout";
import { useAuth } from "../../../hooks/useAuth";
import { ROLES } from "../../../utils/roles";
import {
  fetchTasks,
  fetchAssignableUsers,
  createTask,
  updateTask,
  deleteTask,
} from "../../../services/taskService";

const emptyForm = { title: "", description: "", assignee_user_ids: [] };

export default function ManageTasks() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;
  const myUserId = String(user?.id ?? user?.user_id ?? "");

  /** Docente só gere tarefas que criou; admin gere todas. */
  const canManageTask = (task) => {
    if (isAdmin) return true;
    return String(task?.created_by ?? "") === myUserId;
  };

  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const [tRes, uRes] = await Promise.all([fetchTasks(), fetchAssignableUsers()]);
      setTasks(tRes.data?.tasks ?? []);
      setAssignableUsers(uRes.data?.users ?? []);
    } catch {
      setError("Falha ao carregar tarefas ou utilizadores.");
      setTasks([]);
      setAssignableUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderAssigneePicker = (selectedIds, onIdsChange) => (
    <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1 bg-gray-50">
      {assignableUsers.length === 0 ? (
        <p className="text-sm text-gray-500">Sem utilizadores disponíveis.</p>
      ) : (
        assignableUsers.map((u) => (
          <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.includes(u.id)}
              onChange={() => {
                const set = new Set(selectedIds);
                if (set.has(u.id)) set.delete(u.id);
                else set.add(u.id);
                onIdsChange(Array.from(set));
              }}
            />
            <span>
              {u.username}
              <span className="text-gray-500 text-xs ml-1">
                ({(u.roles ?? []).join(", ")})
              </span>
            </span>
          </label>
        ))
      )}
    </div>
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createTask({
        title: createForm.title.trim(),
        description: createForm.description.trim() || undefined,
        assignee_user_ids: createForm.assignee_user_ids,
      });
      setCreateForm(emptyForm);
      await load();
    } catch (err) {
      const code = err?.response?.data?.error;
      const msg = err?.response?.data?.message;
      if (code === "task_create_rate_limited" && typeof msg === "string") {
        setError(msg);
      } else {
        setError(
          code === "assignee_must_be_student"
            ? "Só pode atribuir tarefas a estudantes."
            : "Não foi possível criar a tarefa."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (task) => {
    if (!canManageTask(task)) return;
    const ids = (task.assignees ?? []).map((a) => a.id);
    setEditForm({
      id: task.id,
      title: task.title ?? "",
      description: task.description ?? "",
      assignee_user_ids: ids,
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm?.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await updateTask(editForm.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        assignee_user_ids: editForm.assignee_user_ids,
      });
      setEditForm(null);
      await load();
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === "task_modify_requires_creator_or_admin") {
        setError(
          "Só o criador da tarefa ou um administrador pode alterá-la ou as atribuições."
        );
      } else {
        setError(
          code === "assignee_must_be_student"
            ? "Só pode atribuir tarefas a estudantes."
            : "Não foi possível guardar alterações."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (taskId, task) => {
    if (task && !canManageTask(task)) return;
    if (!window.confirm("Eliminar esta tarefa?")) return;
    setError("");
    try {
      await deleteTask(taskId);
      if (editForm?.id === taskId) setEditForm(null);
      await load();
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === "task_modify_requires_creator_or_admin") {
        setError(
          "Só o criador da tarefa ou um administrador pode eliminá-la."
        );
      } else {
        setError("Não foi possível eliminar a tarefa.");
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-bold">Gestão de tarefas</h2>
          <p className="text-sm text-gray-600 mt-1">
            {isAdmin
              ? "Pode atribuir tarefas a qualquer utilizador."
              : "Como docente, só pode atribuir tarefas a estudantes. Só pode editar ou eliminar tarefas que tenha criado (não as criadas por um administrador)."}
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
        )}

        <form
          onSubmit={handleCreate}
          className="bg-white p-6 rounded-xl shadow-sm space-y-4"
        >
          <h3 className="font-semibold">Nova tarefa</h3>
          <input
            type="text"
            placeholder="Nome / título"
            className="w-full border p-2 rounded"
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Descrição (opcional)"
            className="w-full border p-2 rounded min-h-[80px]"
            value={createForm.description}
            onChange={(e) =>
              setCreateForm({ ...createForm, description: e.target.value })
            }
          />
          <div>
            <p className="text-sm font-medium mb-2">Atribuir a</p>
            {renderAssigneePicker(createForm.assignee_user_ids, (ids) =>
              setCreateForm((prev) => ({ ...prev, assignee_user_ids: ids }))
            )}
          </div>
          <button
            type="submit"
            disabled={saving || loading}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {saving ? "A guardar…" : "Adicionar tarefa"}
          </button>
        </form>

        <div className="bg-white rounded-xl shadow-sm divide-y">
          <div className="p-4 font-semibold">Tarefas existentes</div>
          {loading ? (
            <p className="p-4 text-gray-500 text-sm">A carregar…</p>
          ) : tasks.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">Ainda não há tarefas.</p>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3"
              >
                <div className="text-sm min-w-0">
                  <p className="font-semibold">{t.title ?? `Tarefa #${t.id}`}</p>
                  {t.description && (
                    <p className="text-gray-600 mt-1 whitespace-pre-wrap">{t.description}</p>
                  )}
                  {Array.isArray(t.assignees) && t.assignees.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      Atribuída a: {t.assignees.map((a) => a.username).join(", ")}
                    </p>
                  )}
                  {!isAdmin && !canManageTask(t) && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2 inline-block">
                      Criada por um administrador — apenas consulta; não pode
                      editar nem eliminar.
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {canManageTask(t) ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="text-sm px-3 py-1 border border-blue-600 text-blue-600 rounded"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t)}
                        className="text-sm px-3 py-1 border border-red-600 text-red-600 rounded"
                      >
                        Eliminar
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 self-center">
                      Sem permissão para editar
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {editForm && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <h3 className="font-semibold">Editar tarefa</h3>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <input
                  type="text"
                  className="w-full border p-2 rounded"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
                <textarea
                  className="w-full border p-2 rounded min-h-[100px]"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  placeholder="Descrição"
                />
                <div>
                  <p className="text-sm font-medium mb-2">Utilizadores atribuídos</p>
                  {renderAssigneePicker(editForm.assignee_user_ids, (ids) =>
                    setEditForm((prev) => (prev ? { ...prev, assignee_user_ids: ids } : prev))
                  )}
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 border rounded"
                    onClick={() => setEditForm(null)}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
