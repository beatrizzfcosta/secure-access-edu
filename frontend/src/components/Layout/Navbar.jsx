import { useAuth } from "../../hooks/useAuth";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white shadow-sm flex justify-between items-center px-8 ml-64">

      {/* LEFT */}
      <div className="flex items-center gap-4">
        <h1 className="font-bold text-lg">Dashboard</h1>

        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
          {user?.role}
        </span>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6">


        <div className="text-right">
          <p className="text-sm font-bold">{user?.email}</p>
        </div>


      </div>
    </header>
  );
}