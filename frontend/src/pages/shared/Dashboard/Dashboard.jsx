import { useAuth } from "../../../hooks/useAuth";
import AdminDashboard from "../../admin/Dashboard";
import ProfessorDashboard from "../../professor/Dashboard";
import StudentDashboard from "../../student/Dashboard";


export default function Dashboard() {
  const { user } = useAuth();

  //if (user?.role === "ADMIN") 
    return <AdminDashboard />;
  if (user?.role === "PROFESSOR") return <ProfessorDashboard />;
  if (user?.role === "STUDENT") return <StudentDashboard />;

  return <div>Sem dashboard disponível</div>;
}