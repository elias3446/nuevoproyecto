import React from 'react';
import { Input } from '@/components/ui/input';
import { Permission, Module } from '@/hooks/useRoles';

interface PermissionFormProps {
  permission: Partial<Permission>;
  modules: Module[];
  onChange: (updated: Partial<Permission>) => void;
}

export const PermissionForm: React.FC<PermissionFormProps> = ({ permission, modules, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="form-field">
        <label className="form-label-sm">Acción (slug:accion)</label>
        <Input 
          value={permission.action || ''} 
          onChange={e => onChange({ ...permission, action: e.target.value })} 
          className="form-input-dark" 
          disabled={permission.is_system}
        />
        {permission.is_system && <p className="text-[10px] text-blue-500 mt-1">La acción del sistema es inmutable.</p>}
      </div>
      <div className="form-field">
        <label className="form-label-sm">Descripción</label>
        <Input 
          value={permission.description || ''} 
          onChange={e => onChange({ ...permission, description: e.target.value })} 
          className="form-input-dark" 
        />
      </div>
      <div className="form-field">
        <label className="form-label-sm">Módulo</label>
        <select 
          className="form-input-dark w-full p-2 rounded bg-[#1a1f2c] border-gray-800 text-sm disabled:opacity-50" 
          value={permission.module || ''} 
          onChange={e => onChange({ ...permission, module: e.target.value || null })}
          disabled={permission.is_system}
        >
          <option value="">Seleccione un módulo</option>
          {modules.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        {permission.is_system && <p className="text-[10px] text-blue-500 mt-1">El módulo asociado es parte del núcleo.</p>}
      </div>
    </div>
  );
};
