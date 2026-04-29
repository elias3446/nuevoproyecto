import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, Users, FileText, ClipboardList, BarChart3, Shield, UserCircle } from "lucide-react";
import { TopNav } from "@/components/ui/TopNav";
import { Sidebar, NavItem } from "@/components/ui/sidebar";
import { ContentPanel } from "@/components/ui/ContentPanel";
import { useLogout } from "@/hooks/auth/useLogout";
import { useProfile } from "@/hooks/auth/useProfile";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useProfile();

  // Determinar activePage basándose en la URL (/dashboard/id o solo /dashboard)
  const activePage = location.pathname.split("/")[2] || "dashboard";

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const { handleLogout } = useLogout();

  const sidebarNavigation: NavItem[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "vacantes", label: "Vacantes", icon: <Briefcase size={20} /> },
    { id: "candidatos", label: "Candidatos", icon: <Users size={20} /> },
    { id: "cv-espontaneos", label: "CV Espontáneos", icon: <FileText size={20} /> },
    { id: "formularios", label: "Formularios", icon: <ClipboardList size={20} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={20} /> },
    { id: "profile", label: "Perfil", icon: <UserCircle size={20} /> },
    { id: "security", label: "Seguridad", icon: <Shield size={20} /> },
  ];

  const topNavNavigation: NavItem[] = [];

  const handleNavigationClick = (id: string) => {
    navigate(`/dashboard/${id}`);
    setIsMobileMenuOpen(false);
  };

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