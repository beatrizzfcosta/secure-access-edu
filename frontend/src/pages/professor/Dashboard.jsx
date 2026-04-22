import { useEffect, useState } from "react";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import { fetchTasks, createTask } from "../../services/taskService";

export default function ProfessorDashboard() {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const res = await fetchTasks();
      setTasks(res.data?.tasks ?? []);
    } catch {
      setError("Não foi possível carregar as tarefas.");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError("");
    try {
      await createTask({ title: title.trim() });
      setTitle("");
      await load();
    } catch (err) {
      const code = err?.response?.data?.error;
      const msg = err?.response?.data?.message;
      if (code === "task_create_rate_limited" && typeof msg === "string") {
        setError(msg);
      } else {
        setError("Falha ao criar tarefa.");
      }
    } finally {
      setCreating(false);
    }
  };

  const assignPreview = tasks.slice(0, 2);
  const cards = tasks.slice(0, 3);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h3 className="text-3xl font-bold mb-2">Painel do utilizador</h3>
          <p className="text-gray-500">
           Gerir tarefas e o fluxo académico a partir do seu painel de controlo.
          </p>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <form
              onSubmit={handleCreate}
              className="bg-white rounded-xl p-6 shadow"
            >
              <h4 className="text-lg font-bold mb-4">Criar Tarefa</h4>
              <input
                placeholder="Título da tarefa"
                className="w-full border p-2 rounded mb-4"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <button
                type="submit"
                disabled={creating || loading}
                className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
              >
                {creating ? "A criar…" : "Criar"}
              </button>
            </form>
          </div>

          <div className="md:col-span-8">
            <div className="bg-white rounded-xl p-6 shadow">
              <h4 className="text-lg font-bold mb-4">Atribuir Tarefas</h4>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-gray-500 text-sm">A carregar…</p>
                ) : assignPreview.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Ainda não há tarefas. Crie uma à esquerda.
                  </p>
                ) : (
                  assignPreview.map((t) => (
                    <TaskRow
                      key={t.id}
                      title={t.title ?? `Tarefa #${t.id}`}
                      desc={t.description || "—"}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-12">
            <div className="bg-white rounded-xl p-6 shadow">
              <h4 className="text-lg font-bold mb-4">Minhas Tarefas</h4>
              <div className="grid md:grid-cols-3 gap-4">
                {loading ? (
                  <p className="text-gray-500 col-span-3 text-sm">A carregar…</p>
                ) : cards.length === 0 ? (
                  <p className="text-gray-500 col-span-3 text-sm">
                    Sem tarefas.
                  </p>
                ) : (
                  cards.map((t) => (
                    <TaskCard
                      key={t.id}
                      title={t.title ?? `Tarefa #${t.id}`}
                      status="Ativo"
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function TaskRow({ title, desc }) {
  return (
    <div className="flex justify-between p-3 bg-gray-100 rounded">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <button type="button" className="text-blue-600 text-sm">
        Gerir
      </button>
    </div>
  );
}

function TaskCard({ title, status }) {
  return (
    <div className="p-4 bg-gray-100 rounded">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-gray-500">{status}</p>
    </div>
  );
}
