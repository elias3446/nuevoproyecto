import React from 'react';
import { AvatarUpload } from "@/components/user/AvatarUpload";
import { User } from '@/integrations/backend/types';

interface ProfileModuleProps {
  user: User | null;
  refetch: () => void;
}

const ProfileModule: React.FC<ProfileModuleProps> = ({ user, refetch }) => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Perfil de Usuario</h1>
      <div className="bg-gray-800 border border-gray-700/50 p-6 rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Avatar Section */}
          <div className="flex-shrink-0">
            <AvatarUpload 
              currentAvatarUrl={user?.raw_user_meta_data?.avatar_url}
              userName={user?.email || "U"}
              user={user}
              onAvatarChange={(url) => {
                refetch();
              }}
            />
          </div>
          
          {/* User Info Section */}
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-xl text-white">{user?.email}</h2>
              <p className="text-gray-400">
                Usuario desde {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '...'}
              </p>
            </div>
            
            <div className="pt-4 border-t border-gray-700/50">
              <p className="text-gray-300">
                Administra tu información personal y cuenta aquí.
              </p>
            </div>
            
            {/* Roles info */}
            {user?.roles && user.roles.length > 0 && (
                <div className="pt-2">
                    <p className="text-sm text-gray-400 mb-1">Roles asignados:</p>
                    <div className="flex flex-wrap gap-2">
                        {user.roles.map(role => (
                            <span key={role} className="px-2 py-1 bg-blue-900/30 text-blue-400 text-xs rounded-full border border-blue-800/50">
                                {role}
                            </span>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModule;
