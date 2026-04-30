import React, { useState, useMemo } from 'react';
import { useRoles, Role, Permission } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MasterDetailManager, MasterDetailConfig } from '@/components/ui/MasterDetailManager';
import { ChevronRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { RoleForm } from '@/components/forms/RoleForm';
const RoleManagementModule: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { roles, totalCount, permissions, loading, saveRole, isSaving } = useRoles(page);
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const handleStartEdit = (role: Role) => {
    setEditingRole(role);
    setInitialPermissions(role.is_system ? [...role.permissions] : []);
    // Scroll to top of editor if on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const permissionsByCategory = useMemo(() => {
    if (!Array.isArray(permissions)) return {};
    return permissions.reduce((acc, perm) => {
      const cat = perm.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

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

  const handleToggleCategory = (category: string, enable: boolean) => {
    if (!editingRole) return;
    const catPerms = permissionsByCategory[category].map(p => p.action);
    const systemProtected = editingRole.is_system ? initialPermissions : [];
    
    let newPerms = [...(editingRole.permissions || [])];
    
    if (enable) {
        // Agregar todos los que no están
        catPerms.forEach(p => {
            if (!newPerms.includes(p)) newPerms.push(p);
        });
    } else {
        // Quitar todos los que no son protegidos
        newPerms = newPerms.filter(p => !catPerms.includes(p) || systemProtected.includes(p));
    }
    
    setEditingRole({ ...editingRole, permissions: newPerms });
  };

  const toggleCategoryCollapse = (category: string) => {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }));
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
    searchPlaceholder: 'Buscar rol...',
    filterFn: (role, term) => role.name.toLowerCase().includes(term.toLowerCase()),
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
          permissionsByCategory={permissionsByCategory}
          initialPermissions={initialPermissions}
          collapsedCategories={collapsedCategories}
          onRoleChange={(updated) => setEditingRole(prev => ({ ...prev, ...updated }))}
          onTogglePermission={handleTogglePermission}
          onToggleCategory={handleToggleCategory}
          onToggleCategoryCollapse={toggleCategoryCollapse}
        />
      )
    }
  };

  return (
    <div className="h-full">
      <MasterDetailManager<Role>
        data={roles}
        totalCount={totalCount}
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
