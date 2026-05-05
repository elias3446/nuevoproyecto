import React, { useState, useMemo } from 'react';
import { useRoles, Role, Permission, Module } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MasterDetailManager, MasterDetailConfig } from '@/components/ui/MasterDetailManager';
import { ChevronRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { RoleForm } from '@/components/forms/RoleForm';
import { Input } from '@/components/ui/input';
const RoleManagementModule: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { roles, totalCount, permissions, modules, loading, saveRole, isSaving, saveModule, savePermission } = useRoles(page);
  const [activeTab, setActiveTab] = useState<'roles' | 'modules' | 'permissions'>('roles');
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [editingModule, setEditingModule] = useState<Partial<Module> | null>(null);
  const [editingPermission, setEditingPermission] = useState<Partial<Permission> | null>(null);
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

  const moduleConfig: MasterDetailConfig<Module> = {
    entityName: 'Módulo',
    searchPlaceholder: 'Buscar módulo...',
    filterFn: (m, term) => m.label.toLowerCase().includes(term.toLowerCase()),
    list: {
      getKey: (m) => m.id,
      renderItem: (m) => (
        <div className="list-item-content">
          <span className="list-item-title">{m.label}</span>
          <p className="list-item-desc">{m.route || 'Sin ruta'}</p>
        </div>
      ),
    },
    editor: {
      title: (m) => m?.id ? 'Editar Módulo' : 'Nuevo Módulo',
      onSave: async () => { await saveModule(editingModule!); setEditingModule(null); },
      onCancel: () => setEditingModule(null),
      renderFields: (m) => (
        <div className="space-y-4">
          <div className="form-field">
            <label className="form-label-sm">Etiqueta</label>
            <Input value={m.label || ''} onChange={e => setEditingModule({...m, label: e.target.value})} className="form-input-dark" />
          </div>
          <div className="form-field">
            <label className="form-label-sm">Nombre ID</label>
            <Input value={m.name || ''} onChange={e => setEditingModule({...m, name: e.target.value})} className="form-input-dark" />
          </div>
          <div className="form-field">
            <label className="form-label-sm">Icono (Lucide)</label>
            <Input value={m.icon || ''} onChange={e => setEditingModule({...m, icon: e.target.value})} className="form-input-dark" />
          </div>
          <div className="form-field">
            <label className="form-label-sm">Ruta</label>
            <Input value={m.route || ''} onChange={e => setEditingModule({...m, route: e.target.value})} className="form-input-dark" />
          </div>
        </div>
      )
    }
  };

  const permConfig: MasterDetailConfig<Permission> = {
    entityName: 'Permiso',
    searchPlaceholder: 'Buscar permiso...',
    filterFn: (p, term) => p.action.toLowerCase().includes(term.toLowerCase()),
    list: {
      getKey: (p) => p.id,
      renderItem: (p) => (
        <div className="list-item-content">
          <span className="list-item-title">{p.description || p.action}</span>
          <p className="list-item-desc">{p.action}</p>
        </div>
      ),
    },
    editor: {
      title: (p) => p?.id ? 'Editar Permiso' : 'Nuevo Permiso',
      onSave: async () => { await savePermission(editingPermission!); setEditingPermission(null); },
      onCancel: () => setEditingPermission(null),
      renderFields: (p) => (
        <div className="space-y-4">
          <div className="form-field">
            <label className="form-label-sm">Acción (slug:accion)</label>
            <Input value={p.action || ''} onChange={e => setEditingPermission({...p, action: e.target.value})} className="form-input-dark" />
          </div>
          <div className="form-field">
            <label className="form-label-sm">Descripción</label>
            <Input value={p.description || ''} onChange={e => setEditingPermission({...p, description: e.target.value})} className="form-input-dark" />
          </div>
          <div className="form-field">
            <label className="form-label-sm">Módulo</label>
            <select 
                className="form-input-dark w-full p-2 rounded bg-[#1a1f2c] border-gray-800 text-sm" 
                value={p.module || ''} 
                onChange={e => setEditingPermission({...p, module: e.target.value})}
            >
                <option value="">Seleccione un módulo</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Tabs Selector */}
      <div className="flex space-x-2 bg-gray-900/50 p-1 rounded-lg self-start">
        <Button 
            variant={activeTab === 'roles' ? 'secondary' : 'ghost'} 
            onClick={() => setActiveTab('roles')}
            className="text-xs h-8"
        >
            Roles
        </Button>
        <Button 
            variant={activeTab === 'modules' ? 'secondary' : 'ghost'} 
            onClick={() => setActiveTab('modules')}
            className="text-xs h-8"
        >
            Módulos
        </Button>
        <Button 
            variant={activeTab === 'permissions' ? 'secondary' : 'ghost'} 
            onClick={() => setActiveTab('permissions')}
            className="text-xs h-8"
        >
            Permisos
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'roles' && (
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
        )}

        {activeTab === 'modules' && (
          <MasterDetailManager<Module>
            data={modules}
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
        )}

        {activeTab === 'permissions' && (
          <MasterDetailManager<Permission>
            data={permissions}
            isLoading={loading}
            isSaving={isSaving}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedItem={editingPermission}
            onSelectItem={setEditingPermission}
            onItemChange={(updated) => setEditingPermission(prev => ({ ...prev, ...updated }))}
            onAddNew={() => setEditingPermission({ action: '', description: '', category: 'General', module: '' })}
            config={permConfig}
          />
        )}
      </div>
    </div>
  );
};

export default RoleManagementModule;
