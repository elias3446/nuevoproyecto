import Security from "@/pages/Security";

interface ContentPanelProps {
  activePage: string;
}

export const ContentPanel = ({ activePage }: ContentPanelProps) => {
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
              <p className="text-gray-300">Administra tu información personal y cuenta aquí.</p>
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
