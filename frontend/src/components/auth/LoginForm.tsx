import React from "react";
import { useLogin } from "@/hooks/auth/useLogin";

const LoginForm = () => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleLogin
  } = useLogin();

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Correo Electrónico</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white outline-none transition-all"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-white outline-none transition-all"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
};

export default LoginForm;
