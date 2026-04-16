import React from "react";
import { useCreateSuperuser } from "@/hooks/auth/useCreateSuperuser";

const SuperuserSetupForm = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleSubmit
  } = useCreateSuperuser();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Correo Electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white outline-none transition-all"
          placeholder="admin@tuempresa.com"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white outline-none transition-all"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creando..." : "Crear Superusuario y Entrar"}
      </button>
    </form>
  );
};

export default SuperuserSetupForm;
