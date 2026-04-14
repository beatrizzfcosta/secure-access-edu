// src/components/Layout/Navbar.jsx
import { logout } from "../../services/authService";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();        // chama backend
      logoutUser();          // limpa estado
      navigate("/login");    // redireciona
    } catch (err) {
      console.error("Erro ao fazer logout");
    }
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}