import { useEffect, useState } from "react";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import { fetchTasks } from "../../services/taskService";

export default function StudentDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTasks();
        if (!cancelled) setTasks(res.data?.tasks ?? []);
      } catch {
        if (!cancelled) setTasks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = tasks.slice(0, 3);
  const total = tasks.length;
  const pct = total ? Math.min(100, Math.round((total / Math.max(total, 1)) * 75)) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h3 className="text-3xl font-bold mb-2">Painel do utilizador</h3>
          <p className="text-gray-500">
            As suas tarefas académicas e visão geral do progresso.
          </p>
        </div>

        <div className="grid md:grid-cols-12 gap-6">
          <div className="md:col-span-7 bg-white p-6 rounded shadow">
            <div className="flex justify-between mb-4">
              <h4 className="font-bold">Minhas Tarefas</h4>
              <button type="button" className="text-blue-600 text-sm">
                Ver tudo
              </button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <p className="text-gray-500 text-sm">A carregar…</p>
              ) : preview.length === 0 ? (
                <p className="text-gray-500 text-sm">Sem tarefas na API.</p>
              ) : (
                preview.map((t) => (
                  <TaskItem
                    key={t.id}
                    title={t.title ?? `Tarefa #${t.id}`}
                    desc={t.description || "Sem descrição"}
                    priority="Normal"
                  />
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded shadow text-center">
              <h4 className="font-bold mb-4">Estado das Tarefas</h4>
              <div className="text-3xl font-bold text-blue-600">
                {loading ? "…" : `${pct}%`}
              </div>
              <p className="text-sm text-gray-500">Resumo</p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Stat label="Na lista" value={loading ? "…" : String(total)} />
                <Stat label="Mostradas" value={loading ? "…" : String(preview.length)} />
              </div>
            </div>

        
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <StatCard title="Tarefas (API)" value={loading ? "…" : String(total)} />
          <StatCard title="Itens visíveis" value={loading ? "…" : String(preview.length)} />
        </div>
      </div>
    </DashboardLayout>
  );
}

function TaskItem({ title, desc, priority }) {
  return (
    <div className="flex justify-between items-center bg-gray-100 p-3 rounded">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <span className="text-xs bg-gray-200 px-2 py-1 rounded">{priority}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="font-bold text-lg">{value}</p>
    </div>
  );
}
