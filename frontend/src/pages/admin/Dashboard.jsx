import DashboardLayout from "../../components/Layout/DashboardLayout";

export default function AdminDashboard() {
  return (
    <DashboardLayout>

    <div>
      <h2 class="text-3xl font-bold mb-2">
        System <span class="text-blue-600">Overview</span>
      </h2>
      <p class="text-gray-500">
        Monitor system integrity, manage users and audit activity.
      </p>
    </div>


    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">

      <div class="bg-white p-6 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500">Active Users</p>
        <p class="text-2xl font-bold" id="activeUsers">1284</p>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500">Roles</p>
        <p class="text-2xl font-bold">3</p>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500">Logs Today</p>
        <p class="text-2xl font-bold">245</p>
      </div>

      <div class="bg-white p-6 rounded-xl shadow-sm">
        <p class="text-xs text-gray-500">Alerts</p>
        <p class="text-2xl font-bold text-red-500">2</p>
      </div>

    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-6  space-y-6 md:space-y-0 mt-6">

      <div class="md:col-span-8 bg-white rounded-xl p-6 shadow-sm flex flex-col">

        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold">Gestão de Utilizadores</h3>
          <button class="text-sm text-blue-600 font-bold">
            Ver todos
          </button>
        </div>

        <div id="userList" class="space-y-4 flex-1">

          <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">

            <div>
              <p class="font-bold">Ricardo Silva</p>
              <p class="text-xs text-gray-500">Editor • Active</p>
            </div>

            <button class="text-blue-600 text-sm font-bold">
              Editar
            </button>

          </div>

          <div class="flex justify-between items-center p-4 bg-gray-50 rounded-lg">

            <div>
              <p class="font-bold">Ana Martins</p>
              <p class="text-xs text-gray-500">Viewer • Offline</p>
            </div>

            <button class="text-blue-600 text-sm font-bold">
              Editar
            </button>

          </div>

        </div>

        <div class="mt-6 pt-4 border-t flex justify-between items-center">

          <span class="text-xs text-gray-400">
            Última atualização: agora
          </span>

          <button class="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold">
            Criar Utilizador
          </button>

        </div>

      </div>


      <div class="md:col-span-4 bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-xl p-6 flex flex-col">

        <h3 class="text-xl font-bold mb-4">
          Controlo de Acessos
        </h3>

        <p class="text-sm opacity-80 mb-6">
          Gerencie roles e permissões do sistema.
        </p>

        <ul class="space-y-2 text-sm mb-6">
          <li>✔ Admin Full Access</li>
          <li>✔ MFA Enabled</li>
        </ul>

        <button class="mt-auto bg-white/20 py-2 rounded-lg">
          Gerir Permissões
        </button>

      </div>

      <div class="md:col-span-12 bg-white rounded-xl p-6 shadow-sm">

        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold">Auditoria</h3>

          <button class="text-sm text-gray-600">
            Filtrar
          </button>
        </div>

        <div class="overflow-x-auto">

          <table class="w-full text-sm">

            <thead>
              <tr class="text-gray-500 border-b">
                <th class="py-2 text-left">Timestamp</th>
                <th class="py-2 text-left">User</th>
                <th class="py-2 text-left">Action</th>
                <th class="py-2 text-left">Status</th>
              </tr>
            </thead>

            <tbody id="auditLogs">

              <tr class="border-b">
                <td class="py-2">2023-10-27</td>
                <td>admin</td>
                <td>USER_ROLE_CHANGE</td>
                <td class="text-green-600 font-bold">SUCCESS</td>
              </tr>

              <tr class="border-b">
                <td class="py-2">2023-10-27</td>
                <td>system</td>
                <td>SECURITY_SCAN</td>
                <td class="text-green-600 font-bold">SUCCESS</td>
              </tr>

              <tr>
                <td class="py-2">2023-10-27</td>
                <td>editor</td>
                <td>FAILED_LOGIN</td>
                <td class="text-red-600 font-bold">WARNING</td>
              </tr>

            </tbody>

          </table>

        </div>

      </div>

    </div>

    </DashboardLayout>
  );
}

function Card({ title, desc }) {
  return (
    <div className="bg-white p-6 rounded shadow">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}