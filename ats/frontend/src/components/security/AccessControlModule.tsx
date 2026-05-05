import React, { useState } from 'react';
import RoleManagementModule from './RoleManagementModule';
import ModuleManagementModule from './ModuleManagementModule';
import PermissionManagementModule from './PermissionManagementModule';
import { Shield, LayoutGrid, Lock } from 'lucide-react';

const AccessControlModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'roles' | 'modules' | 'permissions'>('roles');

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Sub-tabs Selector Reutilizando Estilos de layout.css */}
      <div className="security-tabs self-start">
        <button 
            onClick={() => setActiveSubTab('roles')}
            className={`security-tab ${activeSubTab === 'roles' ? 'active' : ''}`}
        >
            <Shield className="h-4 w-4" />
            Roles
        </button>
        <button 
            onClick={() => setActiveSubTab('modules')}
            className={`security-tab ${activeSubTab === 'modules' ? 'active' : ''}`}
        >
            <LayoutGrid className="h-4 w-4" />
            Módulos UI
        </button>
        <button 
            onClick={() => setActiveSubTab('permissions')}
            className={`security-tab ${activeSubTab === 'permissions' ? 'active' : ''}`}
        >
            <Lock className="h-4 w-4" />
            Permisos
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {activeSubTab === 'roles' && <RoleManagementModule />}
        {activeSubTab === 'modules' && <ModuleManagementModule />}
        {activeSubTab === 'permissions' && <PermissionManagementModule />}
      </div>
    </div>
  );
};

export default AccessControlModule;
