import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCheckSetup } from "./hooks/auth/useCheckSetup.ts";
import { sessionNotifier } from "./integrations/backend/socket";
import Login from "./pages/Login.tsx";
import SuperuserSetup from "./pages/SuperuserSetup.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Register from "./pages/Register.tsx";
import Security from "./pages/Security.tsx";
import PasswordResetRequest from "./pages/PasswordResetRequest.tsx";
import PasswordResetConfirm from "./pages/PasswordResetConfirm.tsx";

const queryClient = new QueryClient();

const RootContainer = () => {
  const { setupNeeded, loading, error, checkSetup } = useCheckSetup();
  const isAuthenticated = !!localStorage.getItem("access_token");

  useEffect(() => {
    if (isAuthenticated) {
      sessionNotifier.connect();
    } else {
      sessionNotifier.disconnect();
    }
    
    return () => {
      sessionNotifier.disconnect();
    };
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 text-center">
        <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-red-900/50">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error de Conexión</h2>
          <p className="text-gray-400 mb-6">No se pudo establecer conexión con el servidor. Por favor, verifica que la base de datos esté activa.</p>
          <button 
            onClick={() => checkSetup()}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/security" element={<Security />} />
        <Route 
          path="/" 
          element={
            setupNeeded 
              ? <SuperuserSetup /> 
              : (isAuthenticated ? <Index /> : <Login />)
          } 
        />
        <Route path="/dashboard" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/password-reset" element={<PasswordResetRequest />} />
        <Route path="/password-reset/confirm/:token" element={<PasswordResetConfirm />} />
        <Route path="/setup-admin" element={<SuperuserSetup />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RootContainer />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
