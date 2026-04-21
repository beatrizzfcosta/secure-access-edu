import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gray-50">

      {/* HEADER */}
      <header className="w-full max-w-7xl px-8 py-6 flex justify-start items-center">
        <div className="flex items-center gap-2">
          <span className="text-blue-700 text-2xl">🏛️</span>
          <span className="font-bold text-xl text-blue-700">
            Secure Access Edu
          </span>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 text-center max-w-2xl">

        {/* ICON */}
        <div className="mb-10">
          <div className="bg-gray-100 p-10 rounded-2xl shadow-sm relative">
            <span className="text-6xl opacity-40">🧭</span>

            <div className="absolute -bottom-4 -right-4 bg-white p-3 rounded-lg shadow">
              📚
            </div>
          </div>
        </div>

        {/* TEXTO */}
        <h1 className="text-5xl font-bold mb-2">
          404
        </h1>

        <h2 className="text-2xl font-semibold mb-4">
          Página não encontrada
        </h2>

        <p className="text-gray-600 mb-8 max-w-md">
          A página que procura não existe ou foi movida.
        </p>

        {/* BOTÃO */}
        <Link
          to="/"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Voltar ao início
        </Link>

        {/* LINKS EXTRA */}
        <div className="mt-8 flex gap-6 text-blue-600 text-sm">
          <span className="cursor-pointer hover:underline">
            Pesquisar
          </span>
          <span className="cursor-pointer hover:underline">
            Suporte
          </span>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="w-full py-6 bg-gray-100 text-center text-sm text-gray-500">
        © 2026 Secure Access Edu
      </footer>

    </div>
  );
}