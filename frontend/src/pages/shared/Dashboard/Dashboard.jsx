// src/pages/shared/Dashboard/Dashboard.jsx
import { useAuth } from "../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { logout } from "../../../services/authService";

export default function Dashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();       // backend
      logoutUser();         // frontend
      navigate("/login");
    } catch (err) {
      console.error("Erro ao fazer logout");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard</h1>

      {/* 👤 Info do utilizador */}
      <p><strong>ID:</strong> {user?.id}</p>
      <p><strong>Role:</strong> {user?.role}</p>

      {/* 🎯 Conteúdo por Role */}
      {user?.role === "ADMIN" && (
        <div>
          <h2>Admin Panel</h2>
          <button onClick={() => navigate("/admin/users")}>
            Gerir Utilizadores
          </button>
        </div>
      )}

      {user?.role === "PROFESSOR" && (
        <div>
          <h2>Professor Area</h2>
          <button onClick={() => navigate("/professor/tasks")}>
            Gerir Tarefas
          </button>
        </div>
      )}

      {user?.role === "STUDENT" && (
        <div>
          <h2>Aluno Area</h2>
          <button onClick={() => navigate("/student/tasks")}>
            Ver Tarefas
          </button>
        </div>
      )}

      {/* 🚪 Logout */}
      <hr />
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}