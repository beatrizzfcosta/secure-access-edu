import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/Layout/DashboardLayout";
import { fetchTasks, createTask } from "../../../services/taskService";

export default function ManageTasks() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const res = await fetchTasks();
      setTasks(res.data?.tasks ?? []);
    } catch {
      setError("Falha ao carregar tarefas.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      await load();
    } catch {
      setError("Não foi possível criar a tarefa.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        <h2 className="text-xl font-bold">Gerir tarefas</h2>
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
        )}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-xl shadow-sm space-y-4"
        >
          <input
            type="text"
            placeholder="Título"
            className="w-full border p-2 rounded"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            placeholder="Descrição (opcional)"
            className="w-full border p-2 rounded min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {saving ? "A guardar…" : "Adicionar tarefa"}
          </button>
        </form>
        <div className="bg-white rounded-xl shadow-sm divide-y">
          {loading ? (
            <p className="p-4 text-gray-500 text-sm">A carregar…</p>
          ) : tasks.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">Nenhuma tarefa.</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="p-4 text-sm">
                <p className="font-semibold">{t.title ?? `Tarefa #${t.id}`}</p>
                {t.description && (
                  <p className="text-gray-600 mt-1">{t.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
