import React, { Suspense } from 'react';
import { getModule } from '@/lib/module-registry';

interface DynamicModuleLoaderProps {
  moduleId: string;
  moduleProps?: Record<string, any>;
}

export const DynamicModuleLoader: React.FC<DynamicModuleLoaderProps> = ({ moduleId, moduleProps = {} }) => {
  const ModuleComponent = getModule(moduleId);

  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 animate-pulse">Cargando módulo...</p>
        </div>
      </div>
    }>
      <ModuleComponent {...moduleProps} />
    </Suspense>
  );
};
