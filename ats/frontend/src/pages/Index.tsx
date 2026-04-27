import { useState } from "react";
import { LayoutDashboard, Briefcase, Users, FileText, ClipboardList, BarChart3, Shield } from "lucide-react";
import { TopNav } from "@/components/ui/TopNav";
import { Sidebar, NavItem } from "@/components/ui/sidebar";
import { ContentPanel } from "@/components/ui/ContentPanel";
import { useLogout } from "@/hooks/auth/useLogout";

const Index = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    { id: "settings", label: "Seguridad", icon: <Shield size={20} /> },
  ];

  const topNavNavigation: NavItem[] = [];

  const handleNavigationClick = (id: string) => {
    setActivePage(id);
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
          setActivePage={setActivePage}
          navigation={sidebarNavigation}
          handleLogout={handleLogout}
          useFullHeight={true}
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