import { Menu, LogOut, Globe, UserCircle } from "lucide-react";
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/integrations/backend/types";

export type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  link?: string;
};

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  activePage: string;
  setActivePage: (id: string) => void;
  navigation: NavItem[];
  handleLogout: () => void;
  useFullHeight?: boolean;
  user?: User;
}

export const Sidebar = ({
  isSidebarOpen,
  toggleSidebar,
  activePage,
  setActivePage,
  navigation,
  handleLogout,
  useFullHeight = false,
  user,
}: SidebarProps) => {
  return (
    <aside 
      className={`${
        isSidebarOpen ? "w-64" : "w-20"
      } ${useFullHeight ? 'h-screen' : 'h-full'} bg-gray-800/80 backdrop-blur-md border-r border-gray-700/50 flex flex-col relative z-20`}
    >
      {/* Header del Sidebar */}
      <div className={`h-16 flex items-center border-b border-gray-700/50 px-4 ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
        {isSidebarOpen && <span className="font-bold text-xl text-blue-400 truncate whitespace-nowrap tracking-wide">Plataforma</span>}
        <button 
          onClick={toggleSidebar} 
          className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-300 hover:text-white transition-all focus:outline-none"
          title="Colapsar / Expandir menú"
        >
          <Menu size={22} className="stroke-[2.5]" />
        </button>
      </div>

      {/* User Info */}
      {isSidebarOpen && user && (
        <div className="px-4 py-3 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.raw_user_meta_data?.avatar_url} />
              <AvatarFallback className="text-xs bg-gray-700">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Links de Navegación */}
      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-2 px-3">
          {navigation.map((item) => (
            <li key={item.id}>
              {item.link ? (
                <Link
                  to={item.link}
                  className={`w-full flex items-center p-3 rounded-xl outline-none transition-all duration-200 border ${
                    activePage === item.id 
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.15)]" 
                      : "border-transparent text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                  }`}
                  title={!isSidebarOpen ? item.label : ""}
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-6">
                    {item.icon}
                  </span>
                  {isSidebarOpen && (
                    <span className="ml-3 font-medium whitespace-nowrap transition-opacity duration-200">
                      {item.label}
                    </span>
                  )}
                </Link>
              ) : (
                <button
                  onClick={() => setActivePage(item.id)}
                  onMouseDown={(e) => e.preventDefault()}
                  className={`w-full flex items-center p-3 rounded-xl outline-none transition-all duration-200 border ${
                    activePage === item.id 
                      ? "bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.15)]" 
                      : "border-transparent text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                  }`}
                  title={!isSidebarOpen ? item.label : ""}
                >
                  <span className="flex-shrink-0 flex items-center justify-center w-6">
                    {item.icon}
                  </span>
                  {isSidebarOpen && (
                    <span className="ml-3 font-medium whitespace-nowrap transition-opacity duration-200">
                      {item.label}
                    </span>
                  )}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer / Portal Público */}
      <div className="p-4 border-t border-gray-700/50">
        <button 
          onClick={() => {
            const portalUrl = (import.meta.env.DEV 
              ? import.meta.env.VITE_PUBLIC_PORTAL_URL_DEV 
              : import.meta.env.VITE_PUBLIC_PORTAL_URL_PROD) || `https://${window.location.hostname}:444`;
            console.log("Opening portal at:", portalUrl);
            window.open(portalUrl, '_blank');
          }}
          className="w-full flex items-center p-3 rounded-xl text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
          title="Ver portal de candidatos"
        >
          <span className="flex-shrink-0 flex items-center justify-center w-6">
            <Globe size={20} />
          </span>
          {isSidebarOpen && (
            <span className="ml-3 font-medium whitespace-nowrap">Portal Público</span>
          )}
        </button>
      </div>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-gray-700/50">
        <button 
          onClick={handleLogout}
          className={`w-full flex items-center p-3 rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 ${!isSidebarOpen && 'justify-center focus:hidden'}`}
          title={!isSidebarOpen ? "Cerrar Sesión" : ""}
        >
          <span className="flex-shrink-0 flex items-center justify-center w-6">
            <LogOut size={20} />
          </span>
          {isSidebarOpen && (
            <span className="ml-3 font-medium whitespace-nowrap">Cerrar Sesión</span>
          )}
        </button>
      </div>
    </aside>
  );
};
