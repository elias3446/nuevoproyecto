import React, { useState } from 'react';
import { useRoles, Permission } from '@/hooks/useRoles';
import { MasterDetailManager, MasterDetailConfig } from '@/components/ui/MasterDetailManager';
import { PermissionForm } from '@/components/forms/PermissionForm';
import { Badge } from '@/components/ui/badge';

const PermissionManagementModule: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { permissions, permissionsCount, modules, loading, savePermission, isSaving } = useRoles({ 
    permsPage: page,
    permsSearch: searchTerm,
    modulesPage: 'all' // Necesario para el dropdown del formulario
  });
  const [editingPermission, setEditingPermission] = useState<Partial<Permission> | null>(null);

  const permConfig: MasterDetailConfig<Permission> = {
    entityName: 'Permiso',
    searchPlaceholder: 'Buscar por acción, descripción o categoría...',
    filterFn: (p, term) => true,
    list: {
      getKey: (p) => p.id,
      renderItem: (p, isActive) => (
        <div className="list-item-content">
          <div className="list-item-header">
            <span className={`list-item-title ${isActive ? 'active' : ''}`}>
              {p.description || p.action}
            </span>
            {p.is_system && (
              <Badge variant="outline" className="badge-system">SISTEMA</Badge>
            )}
          </div>
          <p className="list-item-desc">{p.action}</p>
        </div>
      ),
    },
    editor: {
      title: (p) => p?.id ? 'Editar Permiso' : 'Nuevo Permiso',
      description: (p) => p?.is_system 
        ? 'Este permiso es fundamental. Solo puedes editar su descripción lógica.' 
        : 'Define acciones atómicas para el control de acceso granular.',
      onSave: async () => { await savePermission(editingPermission!); setEditingPermission(null); },
      onCancel: () => setEditingPermission(null),
      renderFields: (p) => (
        <PermissionForm 
          permission={p} 
          modules={modules} 
          onChange={(updated) => setEditingPermission(prev => ({ ...prev, ...updated }))} 
        />
      )
    }
  };

  return (
    <div className="h-full">
      <MasterDetailManager<Permission>
        data={permissions}
        totalCount={permissionsCount}
        page={page}
        setPage={setPage}
        isLoading={loading}
        isSaving={isSaving}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedItem={editingPermission}
        onSelectItem={setEditingPermission}
        onItemChange={(updated) => setEditingPermission(prev => ({ ...prev, ...updated }))}
        onAddNew={() => setEditingPermission({ action: '', description: '', category: 'users', module: null })}
        config={permConfig}
      />
    </div>
  );
};

export default PermissionManagementModule;
