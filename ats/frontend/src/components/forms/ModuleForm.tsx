import React from 'react';
import { Input } from '@/components/ui/input';
import { Module } from '@/hooks/useRoles';

interface ModuleFormProps {
  module: Partial<Module>;
  onChange: (updated: Partial<Module>) => void;
}

export const ModuleForm: React.FC<ModuleFormProps> = ({ module, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="form-field">
        <label className="form-label-sm">Etiqueta</label>
        <Input 
          value={module.label || ''} 
          onChange={e => onChange({ ...module, label: e.target.value })} 
          className="form-input-dark" 
        />
      </div>
      <div className="form-field">
        <label className="form-label-sm">Nombre ID</label>
        <Input 
          value={module.name || ''} 
          onChange={e => onChange({ ...module, name: e.target.value })} 
          className="form-input-dark" 
          disabled={module.is_system}
        />
        {module.is_system && <p className="text-[10px] text-blue-500 mt-1">El identificador del sistema no puede cambiarse.</p>}
      </div>
      <div className="form-field">
        <label className="form-label-sm">Icono (Lucide)</label>
        <Input 
          value={module.icon || ''} 
          onChange={e => onChange({ ...module, icon: e.target.value })} 
          className="form-input-dark" 
        />
      </div>
      <div className="form-field">
        <label className="form-label-sm">Ruta</label>
        <Input 
          value={module.route || ''} 
          onChange={e => onChange({ ...module, route: e.target.value })} 
          className="form-input-dark" 
          disabled={module.is_system}
        />
        {module.is_system && <p className="text-[10px] text-blue-500 mt-1">La ruta del sistema es fija.</p>}
      </div>
    </div>
  );
};
