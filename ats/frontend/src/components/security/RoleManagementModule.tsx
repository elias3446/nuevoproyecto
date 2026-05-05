import React, { useState, useMemo } from 'react';
import { useRoles, Role, Permission } from '@/hooks/useRoles';
import { Badge } from '@/components/ui/badge';
import { MasterDetailManager, MasterDetailConfig } from '@/components/ui/MasterDetailManager';
import { toast } from 'sonner';
import { RoleForm } from '@/components/forms/RoleForm';

const RoleManagementModule: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { roles, rolesCount, permissions, modules, loading, saveRole, isSaving } = useRoles({ 
    rolesPage: page,
    rolesSearch: searchTerm,
    modulesPage: 'all',
    permsPage: 'all'
  });
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  const handleStartEdit = (role: Role) => {
    setEditingRole(role);
    setInitialPermissions(role.is_system ? [...role.permissions] : []);
    // Scroll to top of editor if on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const permissionsByModule = useMemo(() => {
    if (!Array.isArray(permissions) || !Array.isArray(modules)) return {};
    
    // Crear un mapa de ID de módulo a Etiqueta de módulo
    const moduleMap = modules.reduce((acc, mod) => {
        acc[mod.id] = mod.label;
        return acc;
    }, {} as Record<string, string>);

    return permissions.reduce((acc, perm) => {
      const moduleName = perm.module ? (moduleMap[perm.module] || 'Otro') : (perm.category || 'General');
      if (!acc[moduleName]) acc[moduleName] = [];
      acc[moduleName].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions, modules]);

  const handleTogglePermission = (action: string) => {
    if (!editingRole) return;
    
    if (editingRole.is_system && initialPermissions.includes(action)) {
        toast.info("Este permiso es mandatorio para este rol de sistema.");
        return;
    }

    const currentPerms = editingRole.permissions || [];
    const newPerms = currentPerms.includes(action)
      ? currentPerms.filter(p => p !== action)
      : [...currentPerms, action];
    
    setEditingRole({ ...editingRole, permissions: newPerms });
  };

  const handleToggleModule = (moduleName: string, enable: boolean) => {
    if (!editingRole) return;
    const modulePerms = permissionsByModule[moduleName].map(p => p.action);
    const systemProtected = editingRole.is_system ? initialPermissions : [];
    
    let newPerms = [...(editingRole.permissions || [])];
    
    if (enable) {
        // Agregar todos los que no están
        modulePerms.forEach(p => {
            if (!newPerms.includes(p)) newPerms.push(p);
        });
    } else {
        // Quitar todos los que no son protegidos
        newPerms = newPerms.filter(p => !modulePerms.includes(p) || systemProtected.includes(p));
    }
    
    setEditingRole({ ...editingRole, permissions: newPerms });
  };

  const toggleModuleCollapse = (moduleName: string) => {
    setCollapsedModules(prev => ({ ...prev, [moduleName]: !prev[moduleName] }));
  };

  const handleSave = async () => {
    if (!editingRole?.name) {
        toast.error("El nombre del rol es obligatorio");
        return;
    }
    try {
        await saveRole(editingRole);
        setEditingRole(null);
    } catch (e) {
        // Error handled in hook
    }
  };

  // ─── Configuración del MasterDetailManager para Roles ────────────────────────
  const roleConfig: MasterDetailConfig<Role> = {
    entityName: 'Rol',
    searchPlaceholder: 'Buscar rol por nombre o descripción...',
    filterFn: (role, term) => true,
    list: {
      getKey: (role) => role.id,
      renderItem: (role, isActive) => (
        <div className="list-item-content">
          <div className="list-item-header">
            <span className={`list-item-title ${isActive ? 'active' : ''}`}>
              {role.name}
            </span>
            {role.is_system && (
              <Badge variant="outline" className="badge-system">
                SISTEMA
              </Badge>
            )}
          </div>
          <p className="list-item-desc">{role.description || 'Sin descripción'}</p>
        </div>
      ),
    },
    editor: {
      title: (role) => role?.id ? 'Detalles del Rol' : 'Nuevo Perfil de Acceso',
      description: () => 'Configura las propiedades básicas y los permisos atómicos.',
      onSave: handleSave,
      onCancel: () => setEditingRole(null),
      renderFields: (role) => (
        <RoleForm
          role={role}
          permissionsByModule={permissionsByModule}
          initialPermissions={initialPermissions}
          collapsedModules={collapsedModules}
          onRoleChange={(updated) => setEditingRole(prev => ({ ...prev, ...updated }))}
          onTogglePermission={handleTogglePermission}
          onToggleModule={handleToggleModule}
          onToggleModuleCollapse={toggleModuleCollapse}
        />
      )
    }
  };

  return (
    <div className="h-full">
      <MasterDetailManager<Role>
        data={roles}
        totalCount={rolesCount}
        page={page}
        setPage={setPage}
        isLoading={loading}
        isSaving={isSaving}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedItem={editingRole}
        onSelectItem={handleStartEdit}
        onItemChange={(updated) => setEditingRole(prev => ({ ...prev, ...updated }))}
        onAddNew={() => setEditingRole({ name: '', description: '', permissions: [] })}
        config={roleConfig}
      />
    </div>
  );
};

export default RoleManagementModule;
