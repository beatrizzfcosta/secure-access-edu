import { useNavigate } from "react-router-dom";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-6 py-12 relative overflow-hidden">

        {/* BACKGROUND */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-200 blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gray-300 blur-3xl"></div>
        </div>

        {/* CONTAINER */}
        <div className="w-full max-w-xl z-10">

          {/* LOGO */}
          <div className="text-center mb-8">
            <span className="font-bold text-3xl text-blue-700 block">
              Secure Access Edu
            </span>
            <div className="w-12 h-1 bg-blue-600 mx-auto rounded-full mt-2"></div>
          </div>

          {/* CARD */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">

            {/* HEADER */}
            <div className="bg-gray-100 p-8 flex flex-col items-center">

              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6">
                <span className="text-3xl">🔒</span>
              </div>

              <span className="text-sm uppercase text-gray-500 tracking-widest mb-2">
                Erro de Acesso
              </span>

              <h1 className="text-3xl font-bold mb-1">
                Acesso Não Autorizado
              </h1>

              <p className="text-blue-600 font-semibold">
                401 / 403
              </p>
            </div>

            {/* CONTENT */}
            <div className="p-8 text-center">

              <p className="text-gray-600 mb-8">
                Não tem permissões para aceder a esta página. 
                Tente iniciar sessão com outra conta ou contacte o administrador.
              </p>

              {/* ACTIONS */}
              <div className="flex flex-col gap-4">

                <button
                  onClick={() => navigate("/login")}
                  className="bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Fazer Login
                </button>

                <button
                  onClick={() => navigate("/")}
                  className="bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Voltar ao Início
                </button>

              </div>
            </div>

            {/* BOTTOM BAR */}
            <div className="h-1 bg-gray-200"></div>

          </div>

          {/* SUPPORT */}
          <div className="mt-6 text-center text-xs text-gray-500">
            Precisa de assistência?{" "}
            <span className="text-blue-600 cursor-pointer hover:underline">
              Support Desk
            </span>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-100 py-8 text-center text-sm text-gray-500">
        © 2026 Secure Access Edu

      </footer>

    </div>
  );
}