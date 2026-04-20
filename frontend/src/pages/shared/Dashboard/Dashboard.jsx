import { useAuth } from "../../../hooks/useAuth";
import { ROLES } from "../../../utils/roles";
import AdminDashboard from "../../admin/Dashboard";
import ProfessorDashboard from "../../professor/Dashboard";
import StudentDashboard from "../../student/Dashboard";

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === ROLES.ADMIN) return <AdminDashboard />;
  if (user?.role === ROLES.PROFESSOR) return <ProfessorDashboard />;
  if (user?.role === ROLES.STUDENT) return <StudentDashboard />;

  return <div>Sem dashboard disponível</div>;
}