import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ROLES } from "../../utils/roles";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutUser } = useAuth();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  const handleNewRequest = () => {
    if (user?.role === ROLES.ADMIN || user?.role === ROLES.PROFESSOR) {
      navigate("/professor/tasks");
    } else {
      navigate("/student/tasks");
    }
  };

const isActive = (path) => {
  
  if (path === "/dashboard") {
    const dashboardRoutes = [
      "/",
      "/dashboard",
      "/admin",
      "/admin/dashboard",
      "/student",
      "/student/dashboard",
      "/professor",
      "/professor/dashboard",
    ];

  
    return (
      dashboardRoutes.includes(location.pathname) ||
      !location.pathname.includes("/tasks") &&
      !location.pathname.includes("/profile") &&
      !location.pathname.includes("/users")
    );
  }

  return location.pathname === path;
};

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-100 p-6 flex flex-col justify-between">

      {/* LOGO */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-xl">
            🎓
          </div>
          <div>
            <h2 className="font-bold text-blue-700">Secure access edu</h2>
            <p className="text-xs text-gray-500">Academic Management</p>
          </div>
        </div>

        {/* NAV */}
        <nav className="space-y-2">
          <button
            onClick={() => navigate("/dashboard")}
            className={`block w-full text-left p-2 rounded ${
              isActive("/dashboard")
                ? "bg-white text-blue-600"
                : "hover:bg-white"
            }`}
          >
            Dashboard
          </button>

          {user?.role === ROLES.ADMIN && (
            <button
              onClick={() => navigate("/admin/users")}
              className={`block w-full text-left p-2 rounded ${
                isActive("/admin/users")
                  ? "bg-white text-blue-600"
                  : "hover:bg-white"
              }`}
            >
              Utilizadores
            </button>
          )}

          <button
            onClick={handleNewRequest}
            className={`block w-full text-left p-2 rounded ${
              isActive("/professor/tasks") || isActive("/student/tasks")
                ? "bg-white text-blue-600"
                : "hover:bg-white"
            }`}
          >
            Tarefas
          </button>

          <button
            onClick={() => navigate("/profile")}
            className={`block w-full text-left p-2 rounded ${
              isActive("/profile")
                ? "bg-white text-blue-600"
                : "hover:bg-white"
            }`}
          >
            Perfil
          </button>
        </nav>
      </div>

      {/* FOOTER */}
      <div className="space-y-2">
        {user?.role !== ROLES.STUDENT && (
    <button
      onClick={handleNewRequest}
      className="w-full bg-blue-600 text-white py-2 rounded"
    >
      Criar Tarefa
    </button>
  )}

        <button
          onClick={handleLogout}
          className="w-full text-red-600 py-2"
        >
          Logout
        </button>
      </div>

    </aside>
  );
}