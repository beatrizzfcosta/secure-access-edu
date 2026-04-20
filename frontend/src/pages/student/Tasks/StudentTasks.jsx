import { useEffect, useState } from "react";
import DashboardLayout from "../../../components/Layout/DashboardLayout";
import { fetchTasks } from "../../../services/taskService";

export default function StudentTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTasks();
        if (!cancelled) setTasks(res.data?.tasks ?? []);
      } catch {
        if (!cancelled) {
          setError("Não foi possível obter as tarefas.");
          setTasks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">As minhas tarefas</h2>
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
        )}
        <div className="bg-white rounded-xl shadow-sm divide-y">
          {loading ? (
            <p className="p-4 text-gray-500 text-sm">A carregar…</p>
          ) : tasks.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">Sem tarefas.</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="p-4">
                <p className="font-medium">{t.title ?? `Tarefa #${t.id}`}</p>
                {t.description && (
                  <p className="text-sm text-gray-600 mt-1">{t.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
