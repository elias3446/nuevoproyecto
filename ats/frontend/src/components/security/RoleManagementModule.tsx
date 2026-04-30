import React, { useState, useMemo } from 'react';
import { useRoles, Role, Permission } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MasterDetailManager, MasterDetailConfig } from '@/components/ui/MasterDetailManager';
import {
  Shield, Plus, Check, X, Key, Monitor, FileBarChart, 
  ChevronLeft, ChevronRight, ChevronDown, Info, Lock, InfoIcon,
  Search, Users, Settings2, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { SessionsList } from "./SessionsList";
import { PasswordChangeForm } from "./PasswordChangeForm";
import { ExportManager } from "./ExportManager";
import { useSessions } from "@/hooks/auth/useSessions";

const RoleManagementModule: React.FC = () => {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const { roles, totalCount, permissions, loading, saveRole, isSaving } = useRoles(page);
  const { sessions, loading: sessionsLoading, revokeSession, revokeAllSessions, fetchSessions } = useSessions();
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'roles' | 'sessions' | 'password' | 'exports'>('roles');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleStartEdit = (role: Role) => {
    setEditingRole(role);
    setInitialPermissions(role.is_system ? [...role.permissions] : []);
    // Scroll to top of editor if on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [roles, searchTerm]);

  const permissionsByCategory = useMemo(() => {
    if (!Array.isArray(permissions)) return {};
    return permissions.reduce((acc, perm) => {
      const cat = perm.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  // Helper de paginación idéntico a DataTable.tsx
  const pageRange = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

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
    list: {
      getKey: (role) => role.id,
      renderItem: (role, isActive) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isActive ? 'text-blue-400' : 'text-gray-200'}`}>
              {role.name}
            </span>
            {role.is_system && (
              <Badge variant="outline" className="text-[9px] h-4 border-gray-700 bg-gray-800/50 text-gray-400">
                SISTEMA
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 line-clamp-1">{role.description || 'Sin descripción'}</p>
        </div>
      ),
    },
    editor: {
      title: (role) => role?.id ? 'Detalles del Rol' : 'Nuevo Perfil de Acceso',
      description: () => 'Configura las propiedades básicas y los permisos atómicos.',
      onSave: handleSave,
      onCancel: () => setEditingRole(null),
      renderFields: (role) => (
        <div className="space-y-8">
            {/* Info Básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Nombre Identificador</label>
                    <Input 
                        value={role.name} 
                        onChange={e => setEditingRole({...role as Role, name: e.target.value})}
                        disabled={role.is_system}
                        placeholder="Ej: Reclutador Senior"
                        className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600 focus:ring-blue-500/20"
                    />
                    {role.is_system && (
                        <p className="text-[10px] text-orange-400/80 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> El nombre de los roles de sistema es inmutable.
                        </p>
                    )}
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase">Descripción Funcional</label>
                    <Input 
                        value={role.description} 
                        onChange={e => setEditingRole({...role as Role, description: e.target.value})}
                        placeholder="Explica qué funciones cumple este rol..."
                        className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-600 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            {/* Matriz de Permisos */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        Matriz de Permisos Granulares
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger><InfoIcon className="h-4 w-4 text-gray-500" /></TooltipTrigger>
                                <TooltipContent className="bg-gray-800 border-gray-700 text-gray-200">
                                    Los permisos marcados otorgan acceso a funcionalidades específicas.
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </h3>
                </div>

                <div className="pr-4 -mr-4">
                    <div className="space-y-6">
                        {Object.entries(permissionsByCategory).map(([category, perms]) => {
                            const allEnabled = perms.every(p => role.permissions?.includes(p.action));
                            const isCollapsed = collapsedCategories[category];

                            return (
                                <div key={category} className="space-y-0 p-4 rounded-xl bg-gray-800/20 border border-gray-800/50 transition-all duration-300">
                                    <div 
                                        className="flex items-center justify-between cursor-pointer group"
                                        onClick={() => toggleCategoryCollapse(category)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <h4 className="text-sm font-black text-gray-300 uppercase tracking-tighter group-hover:text-blue-400 transition-colors">{category}</h4>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-[10px] h-6 text-gray-500 hover:text-blue-400"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleCategory(category, !allEnabled);
                                                }}
                                            >
                                                {allEnabled ? 'Desactivar Grupo' : 'Activar Grupo'}
                                            </Button>
                                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    
                                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden transition-all duration-300 ${
                                        isCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[2000px] opacity-100 mt-4 border-t border-gray-800 pt-4'
                                    }`}>
                                        {perms.map(perm => {
                                            const isProtected = role.is_system && initialPermissions.includes(perm.action);
                                            const isEnabled = role.permissions?.includes(perm.action);
                                            
                                            return (
                                                <div 
                                                    key={perm.id} 
                                                    className={`flex items-center justify-between p-3 rounded-lg transition-all border ${
                                                        isEnabled 
                                                        ? 'bg-blue-600/5 border-blue-500/20' 
                                                        : 'bg-transparent border-gray-800/50 opacity-60'
                                                    }`}
                                                >
                                                    <div className="flex-1 space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-gray-200">{perm.description || perm.action}</span>
                                                            {isProtected && <Lock className="h-3 w-3 text-orange-400/50" />}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 font-mono tracking-tight">{perm.action}</p>
                                                    </div>
                                                    <Switch 
                                                        checked={isEnabled}
                                                        onCheckedChange={() => handleTogglePermission(perm.action)}
                                                        disabled={isProtected}
                                                        className="data-[state=checked]:bg-blue-600"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      )
    }
  };

  if (loading && page === 1) {
    return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
                <Shield className="text-blue-500 h-8 w-8" />
            </div>
            Configuración de Seguridad
          </h1>
          <p className="text-gray-400 text-lg">Administración avanzada de identidades, roles y trazabilidad.</p>
        </div>
      </div>

      {/* Navegación Modular Estilizada */}
      <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-800 gap-1 w-fit">
        {[
          { id: 'roles', label: 'Roles', icon: Shield },
          { id: 'sessions', label: 'Sesiones', icon: Monitor },
          { id: 'password', label: 'Seguridad', icon: Key },
          { id: 'exports', label: 'Auditoría', icon: FileBarChart },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido Dinámico */}
      {activeTab === 'roles' ? (
        <MasterDetailManager<Role>
          data={filteredRoles}
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
          emptyState={
            <div className="h-full min-h-[640px] flex items-center justify-center border-2 border-dashed border-gray-800 rounded-3xl p-12 text-center group hover:border-gray-700 transition-colors">
              <div className="space-y-4 max-w-sm">
                <div className="p-6 bg-gray-900 rounded-full w-fit mx-auto ring-4 ring-gray-800/50 group-hover:ring-blue-500/10 transition-all">
                    <Users className="h-12 w-12 text-gray-700 group-hover:text-blue-500/50 transition-colors" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-400">Gestión de Perfiles</h3>
                    <p className="text-sm text-gray-600">Selecciona un rol de la lista izquierda para auditar sus privilegios o configurar un nuevo esquema de acceso para tu organización.</p>
                </div>
              </div>
            </div>
          }
        />
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {activeTab === 'sessions' && (
              <SessionsList
                  sessions={sessions}
                  loading={sessionsLoading}
                  onRevokeSession={revokeSession}
                  onRevokeAllSessions={revokeAllSessions}
                  onRefresh={fetchSessions}
              />
            )}

            {activeTab === 'password' && (
              <div className="max-w-2xl mx-auto">
                  <PasswordChangeForm />
              </div>
            )}

            {activeTab === 'exports' && (
              <ExportManager />
            )}
        </div>
      )}
    </div>
  );
};

export default RoleManagementModule;
