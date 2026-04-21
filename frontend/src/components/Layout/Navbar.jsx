import { useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;

    if (path === "/" || path === "/dashboard" || path === "/admin") {
      return "Dashboard";
    }

    if (path === "/admin/users") {
      return "Utilizadores";
    }

    if (
      path === "/professor/tasks" ||
      path === "/student/tasks"
    ) {
      return "Tarefas";
    }

    if (path === "/profile") {
      return "Perfil";
    }

    return "Dashboard";
  };
  

  return (
    <header className="h-16 bg-white shadow-sm flex items-center gap-4">

      {}
      <div className="w-full flex justify-center items-center gap-4">
        <h1 className="font-bold text-lg">
          {getPageTitle()}
        </h1>

        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
          {user?.role}
        </span>
      </div>

      {/* RIGHT */}
      <div className="absolute right-8 flex items-center">
        <div className="text-right">
          <p className="text-sm font-bold">{user?.email}</p>
        </div>
      </div>

    </header>
  );
}