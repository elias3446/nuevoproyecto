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
        <h1 className="not-found-title">404</h1>
        <p className="not-found-subtitle">Página no encontrada</p>
        <a 
          href="/" 
          className="form-button-link"
        >
          Volver al Inicio
        </a>
      </div>
    </div>
  );
};

export default NotFound;
