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

      {/* Dropdown menú móvil - aparece hacia abajo en móvil (< md = 768px) */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-gray-800/95 backdrop-blur-md border-b border-gray-700/50 p-4 md:hidden z-30 shadow-lg max-h-[calc(100vh-64px)] overflow-y-auto">
          {/* Sección: Navegación */}
          <div className="border-b border-gray-700/50 mb-2">
            <button
              onClick={() => toggleSection('navigation')}
              className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors duration-200"
            >
              <div className="flex items-center">
                <span className="font-semibold">Navegación</span>
              </div>
              {openSections.navigation ? (
                <ChevronDown size={20} className="text-gray-400" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </button>
            {openSections.navigation && (
              <div className="pb-2 pl-2">
                <nav className="flex flex-col space-y-1">
                  {navigation.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`flex items-center px-4 py-3 rounded-xl text-left outline-none ${
                        activePage === item.id 
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" 
                          : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-200"
                      }`}
                    >
                      <span className="mr-3 flex-shrink-0">{navIcons[item.id] || item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Sección: Mi Cuenta */}
          <div>
            <button
              onClick={() => toggleSection('account')}
              className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:bg-gray-700/50 rounded-xl transition-colors duration-200"
            >
              <div className="flex items-center">
                <span className="font-semibold">Mi Cuenta</span>
              </div>
              {openSections.account ? (
                <ChevronDown size={20} className="text-gray-400" />
              ) : (
                <ChevronRight size={20} className="text-gray-400" />
              )}
            </button>
            {openSections.account && (
              <div className="pb-2 pl-2">
                <button
                  onClick={() => {
                    handleLogout();
                    toggleMobileMenu();
                  }}
                  className="flex items-center px-4 py-3 rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-left w-full"
                >
                  <span className="mr-3 flex-shrink-0">
                    <LogOut size={20} />
                  </span>
                  <span className="font-medium">Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer para tablet (aparece desde la izquierda) - visible en tablet (md a lg) */}
      {isMobileMenuOpen && sidebar && (
        <div className="hidden md:block lg:hidden fixed inset-0 z-40">
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