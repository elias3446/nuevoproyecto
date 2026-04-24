import { LogOut, Menu, X, ChevronDown, ChevronRight, Home, User, Settings } from "lucide-react";
import { useState } from "react";
import { ReactNode } from "react";

export type NavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

interface TopNavProps {
  activePage: string;
  setActivePage: (id: string) => void;
  navigation: NavItem[];
  handleLogout: () => void;
  isMobileMenuOpen?: boolean;
  toggleMobileMenu?: () => void;
  sidebar?: ReactNode;
  toggleSidebar?: () => void;
}

export const TopNav = ({
  activePage,
  setActivePage,
  navigation,
  handleLogout,
  isMobileMenuOpen = false,
  toggleMobileMenu = () => {},
  sidebar,
  toggleSidebar,
}: TopNavProps) => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    navigation: true,
    account: false,
  });

  const handleNavClick = (id: string) => {
    setActivePage(id);
    if (toggleMobileMenu) {
      toggleMobileMenu();
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const navIcons: { [key: string]: ReactNode } = {
    home: <Home size={20} />,
    profile: <User size={20} />,
    settings: <Settings size={20} />,
  };

  return (
    <header className="w-full h-16 bg-gray-800/80 backdrop-blur-md border-b border-gray-700/50 flex items-center justify-between px-4 md:px-6 z-20 shrink-0">
      {/* Logo y navegación */}
      <div className="flex items-center">
        {/* Botón menú hamburguesa del Sidebar - visible en tablet y móvil */}
        {toggleSidebar && (
          <button
            className="md:block lg:hidden p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg mr-2"
            onClick={toggleSidebar}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
        <span className="font-bold text-lg md:text-xl text-blue-400 tracking-wide mr-4 md:mr-8">
          Plataforma
        </span>

        {/* Navegación - visible en tablet y desktop */}
        <nav className="hidden md:flex space-x-2">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              onMouseDown={(e) => e.preventDefault()}
              className={`flex items-center px-3 lg:px-4 py-2 rounded-xl outline-none ${
                activePage === item.id 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.15)]" 
                  : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
              }`}
            >
              <span className="mr-2 flex-shrink-0">{item.icon}</span>
              <span className="font-medium text-sm lg:text-base">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Botón logout - siempre visible en desktop */}
      <div className="hidden md:flex items-center">
        <button 
          onClick={handleLogout}
          className="flex items-center px-3 py-2 rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          title="Cerrar Sesión"
        >
          <LogOut size={20} className="md:mr-2" />
          <span className="font-medium text-sm hidden md:inline">Cerrar Sesión</span>
        </button>
      </div>

      {/* El menú desplegable absoluto ha sido eliminado en favor del Drawer del Sidebar para mayor consistencia */}

      {/* Drawer para móvil y tablet (aparece desde la izquierda) - visible en pantallas < lg */}
      {isMobileMenuOpen && sidebar && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={toggleMobileMenu}
          />
          {/* Drawer desde la izquierda con el componente Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 z-50 animate-slide-in">
            {sidebar}
          </div>
        </div>
      )}
    </header>
  );
};