import React from 'react';
import { Role, Permission } from '@/hooks/useRoles';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, Lock, InfoIcon } from 'lucide-react';

interface RoleFormProps {
  role: Partial<Role>;
  permissionsByCategory: Record<string, Permission[]>;
  initialPermissions: string[];
  collapsedCategories: Record<string, boolean>;
  onRoleChange: (updated: Partial<Role>) => void;
  onTogglePermission: (action: string) => void;
  onToggleCategory: (category: string, enable: boolean) => void;
  onToggleCategoryCollapse: (category: string) => void;
}

export const RoleForm: React.FC<RoleFormProps> = ({
  role,
  permissionsByCategory,
  initialPermissions,
  collapsedCategories,
  onRoleChange,
  onTogglePermission,
  onToggleCategory,
  onToggleCategoryCollapse,
}) => {
  return (
    <div className="space-y-8">
      {/* Info Básica */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-field">
          <label className="form-label-sm">Nombre Identificador</label>
          <Input
            value={role.name ?? ''}
            onChange={e => onRoleChange({ ...role, name: e.target.value })}
            disabled={role.is_system}
            placeholder="Ej: Reclutador Senior"
            className="form-input-dark"
          />
          {role.is_system && (
            <p className="field-hint-warning">
              <Lock className="h-3 w-3" /> El nombre de los roles de sistema es inmutable.
            </p>
          )}
        </div>
        <div className="form-field">
          <label className="form-label-sm">Descripción Funcional</label>
          <Input
            value={role.description ?? ''}
            onChange={e => onRoleChange({ ...role, description: e.target.value })}
            placeholder="Explica qué funciones cumple este rol..."
            className="form-input-dark"
          />
        </div>
      </div>

      {/* Matriz de Permisos */}
      <div className="space-y-4">
        <div className="section-header">
          <h3 className="section-title">
            Matriz de Permisos Granulares
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="tooltip-icon" />
                </TooltipTrigger>
                <TooltipContent className="tooltip-content-dark">
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
                <div key={category} className="permission-category-card">
                  <div
                    className="permission-category-header"
                    onClick={() => onToggleCategoryCollapse(category)}
                  >
                    <div className="permission-category-title-wrapper">
                      <div className="permission-category-dot" />
                      <h4 className="permission-category-title">{category}</h4>
                    </div>
                    <div className="permission-category-actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="permission-btn-ghost"
                        onClick={e => {
                          e.stopPropagation();
                          onToggleCategory(category, !allEnabled);
                        }}
                      >
                        {allEnabled ? 'Desactivar Grupo' : 'Activar Grupo'}
                      </Button>
                      <ChevronDown className={`permission-chevron ${isCollapsed ? 'rotate-180' : ''}`} />
                    </div>
                  </div>

                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden transition-all duration-300 ${
                      isCollapsed
                        ? 'max-h-0 opacity-0 mt-0'
                        : 'max-h-[2000px] opacity-100 mt-4 border-t border-gray-800 pt-4'
                    }`}
                  >
                    {perms.map(perm => {
                      const isProtected = role.is_system && initialPermissions.includes(perm.action);
                      const isEnabled = role.permissions?.includes(perm.action);

                      return (
                        <div
                          key={perm.id}
                          className={`permission-item-card ${isEnabled ? 'permission-item-enabled' : 'permission-item-disabled'}`}
                        >
                          <div className="permission-item-content">
                            <div className="permission-item-header">
                              <span className="permission-item-title">{perm.description || perm.action}</span>
                              {isProtected && <Lock className="permission-lock-icon" />}
                            </div>
                            <p className="permission-item-desc">{perm.action}</p>
                          </div>
                          <Switch
                            checked={!!isEnabled}
                            onCheckedChange={() => onTogglePermission(perm.action)}
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
  );
};
