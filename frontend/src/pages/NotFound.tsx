import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="page-container">
      <div className="text-center">
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-blue-500 to-indigo-400 mb-4">404</h1>
        <p className="text-2xl font-medium text-slate-300 mb-8">Página no encontrada</p>
        <a 
          href="/" 
          className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
        >
          Volver al Inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
