
import DashboardLayout from "../../components/Layout/DashboardLayout";

export default function ProfessorDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-12">

        {/* HEADER */}
        <div className="relative overflow-hidden rounded-3xl bg-blue-600 p-12 text-white min-h-[240px] flex flex-col justify-end">
          <div className="relative z-10">
            <h3 className="text-4xl font-extrabold mb-2">
              Welcome back, Professor.
            </h3>
            <p className="text-lg opacity-80 max-w-xl">
              Manage tasks and academic workflow from your dashboard.
            </p>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

          {/* CRIAR TAREFA */}
          <div className="md:col-span-4">
            <div className="bg-white rounded-xl p-6 shadow">

              <h4 className="text-lg font-bold mb-4">
                Criar Tarefa
              </h4>

              <input
                placeholder="Título da tarefa"
                className="w-full border p-2 rounded mb-4"
              />

              <button className="w-full bg-blue-600 text-white py-2 rounded">
                Criar
              </button>

            </div>
          </div>

          {/* ATRIBUIR TAREFAS */}
          <div className="md:col-span-8">
            <div className="bg-white rounded-xl p-6 shadow">

              <h4 className="text-lg font-bold mb-4">
                Atribuir Tarefas
              </h4>

              <div className="space-y-3">

                <TaskRow
                  title="Algoritmos"
                  desc="4 alunos pendentes"
                />

                <TaskRow
                  title="Química II"
                  desc="Turma A"
                />

              </div>

            </div>
          </div>

          {/* MINHAS TAREFAS */}
          <div className="md:col-span-12">
            <div className="bg-white rounded-xl p-6 shadow">

              <h4 className="text-lg font-bold mb-4">
                Minhas Tarefas
              </h4>

              <div className="grid md:grid-cols-3 gap-4">

                <TaskCard title="Pesquisa" status="Ativo" />
                <TaskCard title="Seminário" status="Pendente" />
                <TaskCard title="Prova" status="Concluído" />

              </div>

            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}

/* COMPONENTES */

function TaskRow({ title, desc }) {
  return (
    <div className="flex justify-between p-3 bg-gray-100 rounded">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <button className="text-blue-600 text-sm">
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