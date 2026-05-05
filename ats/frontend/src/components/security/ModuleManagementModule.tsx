import React, { useState } from 'react';
import { useRoles, Module } from '@/hooks/useRoles';
import { MasterDetailManager, MasterDetailConfig } from '@/components/ui/MasterDetailManager';
import { ModuleForm } from '@/components/forms/ModuleForm';
import { Badge } from '@/components/ui/badge';
import { DynamicSchemaEditor } from '@/components/dynamic/DynamicSchemaEditor';

const ModuleManagementModule: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { modules, modulesCount, loading, saveModule, isSaving } = useRoles({ 
    modulesPage: page,
    modulesSearch: searchTerm 
  });
  const [editingModule, setEditingModule] = useState<Partial<Module> | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'schema'>('general');

  const moduleConfig: MasterDetailConfig<Module> = {
    entityName: 'Módulo',
    searchPlaceholder: 'Buscar módulo por nombre o ruta...',
    filterFn: (m, term) => true, 
    list: {
      getKey: (m) => m.id,
      renderItem: (m, isActive) => (
        <div className="list-item-content">
          <div className="list-item-header">
            <span className={`list-item-title ${isActive ? 'active' : ''}`}>{m.label}</span>
            {m.is_system && (
              <Badge variant="outline" className="badge-system">SISTEMA</Badge>
            )}
          </div>
          <p className="list-item-desc">{m.route || 'Sin ruta'}</p>
        </div>
      ),
    },
    editor: {
      title: (m) => m?.id ? 'Editar Módulo' : 'Nuevo Módulo',
      description: (m) => m?.is_system 
        ? 'Este módulo es vital para el sistema. Solo puedes cambiar su visibilidad o icono.' 
        : 'Configura la apariencia y ruta de navegación del módulo.',
      onSave: async () => { await saveModule(editingModule!); setEditingModule(null); },
      onCancel: () => setEditingModule(null),
      renderFields: (m) => (
        <div className="space-y-6">
          {!m.is_system && m.id && (
            <div className="flex gap-2 border-b border-gray-800 mb-4">
              <button 
                onClick={() => setActiveTab('general')}
                className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'general' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Configuración General
              </button>
              <button 
                onClick={() => setActiveTab('schema')}
                className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === 'schema' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Estructura de Datos
              </button>
            </div>
          )}

          {activeTab === 'general' || m.is_system || !m.id ? (
            <ModuleForm 
              module={m} 
              onChange={(updated) => setEditingModule(prev => ({ ...prev, ...updated }))} 
            />
          ) : (
            <div className="bg-[#0f1219] rounded-lg border border-gray-800">
                <DynamicSchemaEditor entityId={m.id!} />
            </div>
          )}
        </div>
      )
    }
  };

  return (
    <div className="h-full">
      <MasterDetailManager<Module>
        data={modules}
        totalCount={modulesCount}
        page={page}
        setPage={setPage}
        isLoading={loading}
        isSaving={isSaving}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedItem={editingModule}
        onSelectItem={setEditingModule}
        onItemChange={(updated) => setEditingModule(prev => ({ ...prev, ...updated }))}
        onAddNew={() => setEditingModule({ name: '', label: '', icon: '', route: '', order: 0, is_active: true })}
        config={moduleConfig}
      />
    </div>
  );
};

export default ModuleManagementModule;
