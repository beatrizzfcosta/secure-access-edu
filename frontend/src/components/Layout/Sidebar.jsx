import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ROLES } from "../../utils/roles";

export default function Sidebar() {
  const navigate = useNavigate();
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
          <button onClick={() => navigate("/dashboard")} className="block w-full text-left p-2 rounded bg-white text-blue-600">
            Dashboard
          </button>

          {user?.role === ROLES.ADMIN && (
            <>
              <button
                onClick={() => navigate("/admin/")}
                className="block w-full text-left p-2 hover:bg-white rounded"
              >
                Admin
              </button>
              <button
                onClick={() => navigate("/admin/users")}
                className="block w-full text-left p-2 hover:bg-white rounded"
              >
                Utilizadores
              </button>
            </>
          )}

          <button onClick={() => handleNewRequest()} className="block w-full text-left p-2 hover:bg-white rounded">
            Tasks
          </button>

          <button onClick={() => navigate("/profile")} className="block w-full text-left p-2 hover:bg-white rounded">
            Profile
          </button>
        </nav>
      </div>

      {/* FOOTER */}
      <div className="space-y-2">
        <button
          onClick={handleNewRequest}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          New Request
        </button>

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