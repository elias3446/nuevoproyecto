import Security from "@/pages/Security";
import { AvatarUpload } from "@/components/user/AvatarUpload";
import { useProfile } from "@/hooks/auth/useProfile";
import { UserCircle } from "lucide-react";

interface ContentPanelProps {
  activePage: string;
}

export const ContentPanel = ({ activePage }: ContentPanelProps) => {
  const { user, loading, refetch } = useProfile();

  const renderContent = () => {
    switch (activePage) {
      case "home":
        return (
          <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-6">Bienvenido al Panel</h1>
            <div className="bg-gray-800 border border-gray-700/50 p-6 rounded-xl shadow-lg">
              <p className="text-gray-300">Selecciona una opción del menú lateral para navegar sin recargar la página.</p>
            </div>
          </div>
        );
      case "profile":
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
                  <p className="text-sm text-gray-400 mt-3 text-center">
                    JPG, PNG o GIF<br/>Máximo 5MB
                  </p>
                </div>
                
                {/* User Info Section */}
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-xl text-white">{user?.email}</h2>
                    <p className="text-gray-400">
                      Usuario desde {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '...'}
                    </p>
                  </div>
                  
                  {/* Aquí iría más información del perfil */}
                  <div className="pt-4 border-t border-gray-700/50">
                    <p className="text-gray-300">
                      Administra tu información personal y cuenta aquí.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "settings":
        return <Security />;
      default:
        return null;
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-gradient-to-br from-gray-900 to-gray-950">
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {renderContent()}
      </div>
    </main>
  );
};
