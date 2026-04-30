import { useProfile } from "@/hooks/auth/useProfile";
import { DynamicModuleLoader } from "./DynamicModuleLoader";

interface ContentPanelProps {
  activePage: string;
}

export const ContentPanel = ({ activePage }: ContentPanelProps) => {
  const { user, loading, refetch } = useProfile();

  const renderContent = () => {
    return <DynamicModuleLoader moduleId={activePage} moduleProps={{ user, refetch }} />;
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-gradient-to-br from-gray-900 to-gray-950">
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {renderContent()}
      </div>
    </main>
  );
};
