import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h3 className="text-3xl font-bold mb-2">Painel do utilizador</h3>
          <p className="text-gray-500">
            As tarefas que lhe foram atribuídas (nome e descrição).
          </p>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold">Minhas tarefas</h4>
            <Link to="/student/tasks" className="text-blue-600 text-sm font-medium">
              Ver todas
            </Link>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-gray-500 text-sm">A carregar…</p>
            ) : tasks.length === 0 ? (
              <p className="text-gray-500 text-sm">Sem tarefas atribuídas.</p>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className="border border-gray-100 rounded-lg p-4">
                  <p className="font-medium">{t.title ?? `Tarefa #${t.id}`}</p>
                  {t.description ? (
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                      {t.description}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 mt-2">Sem descrição.</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
