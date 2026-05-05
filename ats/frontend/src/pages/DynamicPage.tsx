import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { DynamicEntityManager } from '@/components/dynamic/DynamicEntityManager';
import { useRoles } from '@/hooks/useRoles';

const DynamicPage: React.FC = () => {
  const { pathname } = useLocation();
  const { modules, loading } = useRoles({ modulesPage: 'all' });
  
  // Buscar el módulo que coincida con la ruta actual
  const currentModule = modules.find(m => m.route === pathname);

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando módulo dinámico...</div>;

  if (!currentModule) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <h2 className="text-xl font-bold mb-2">Módulo no encontrado</h2>
        <p>Asegúrate de que la ruta "{pathname}" esté configurada correctamente en el gestor de módulos.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-800 bg-[#0f1219]/50">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          {currentModule.label}
          <span className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-600/30">
            DINÁMICO
          </span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">Gestión de datos autogenerada para el módulo {currentModule.name}.</p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <DynamicEntityManager entityId={currentModule.id} />
      </div>
    </div>
  );
};

export default DynamicPage;
