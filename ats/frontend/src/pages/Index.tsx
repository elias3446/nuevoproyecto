import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, FileText, ClipboardList, BarChart3, Shield, UserCircle } from "lucide-react";
import { TopNav } from "@/components/ui/TopNav";
import { Sidebar, NavItem } from "@/components/ui/sidebar";
import { ContentPanel } from "@/components/ui/ContentPanel";
import { useLogout } from "@/hooks/auth/useLogout";
import { useGlobalConfig } from "@/hooks/auth/useGlobalConfig";

const IconMapper = (iconName: string) => {
  const icons: Record<string, any> = {
    LayoutDashboard, Briefcase, Users, FileText, ClipboardList, BarChart3, Shield, UserCircle
  };
  const IconComp = icons[iconName] || LayoutDashboard;
  return <IconComp size={20} />;
};

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, uiConfig, loading: configLoading } = useGlobalConfig();

  // Determinar activePage basándose en la URL (/dashboard/id o solo /dashboard)
  const activePage = location.pathname.split("/")[2] || "dashboard";

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const { handleLogout } = useLogout();

  const sidebarNavigation: NavItem[] = (uiConfig?.menu || []).map(item => ({
    id: item.id,
    label: item.label,
    icon: IconMapper(item.icon)
  }));

  const topNavNavigation: NavItem[] = [];

  const handleNavigationClick = (id: string) => {
    const target = uiConfig?.menu.find(m => m.id === id);
    if (target) {
      navigate(target.route);
    } else {
      navigate(`/dashboard/${id}`);
    }
    setIsMobileMenuOpen(false);
  };

  if (configLoading) {
    return (
      <div className="page-container loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando interfaz ...</div>
      </div>
    );
  }

  return (
    <div className="index-page">
      {/* Sidebar - visible solo en desktop (lg) */}
      <div className="sidebar-desktop">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          activePage={activePage}
          setActivePage={(id) => handleNavigationClick(id)}
          navigation={sidebarNavigation}
          handleLogout={handleLogout}
          useFullHeight={true}
          user={user}
        />
      </div>

      {/* Contenedor Derecho: Menú Horizontal arriba y Contenido abajo */}
      <div className="index-content">
        {/* Menú Horizontal Superior */}
        <TopNav
          activePage={activePage}
          setActivePage={handleNavigationClick}
          navigation={topNavNavigation}
          handleLogout={handleLogout}
          isMobileMenuOpen={isMobileMenuOpen}
          toggleMobileMenu={toggleMobileMenu}
          toggleSidebar={toggleSidebar}
          sidebar={
            <Sidebar
              isSidebarOpen={true}
              toggleSidebar={toggleMobileMenu}
              activePage={activePage}
              setActivePage={handleNavigationClick}
              navigation={sidebarNavigation}
              handleLogout={() => {
                handleLogout();
                setIsMobileMenuOpen(false);
              }}
              useFullHeight={true}
              user={user}
            />
          }
        />

        {/* Contenido Principal */}
        <ContentPanel activePage={activePage} />
      </div>
    </div>
  );
};

export default Index;