import React from 'react';

const DashboardModule: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Panel de Control</h1>
      <div className="bg-gray-800 border border-gray-700/50 p-6 rounded-xl shadow-lg">
        <p className="text-gray-300">Bienvenido de nuevo. Selecciona una opción del menú lateral para gestionar el sistema.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                <p className="text-blue-400 text-sm font-medium">Estado del Sistema</p>
                <p className="text-2xl font-bold text-white">Operativo</p>
            </div>
            <div className="p-4 bg-green-900/20 border border-green-800/30 rounded-lg">
                <p className="text-green-400 text-sm font-medium">Conexión Multi-tenant</p>
                <p className="text-2xl font-bold text-white">Activa</p>
            </div>
            <div className="p-4 bg-purple-900/20 border border-purple-800/30 rounded-lg">
                <p className="text-purple-400 text-sm font-medium">Tareas Asíncronas</p>
                <p className="text-2xl font-bold text-white">Sincronizadas</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardModule;
