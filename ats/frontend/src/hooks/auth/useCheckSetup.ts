import { useState, useEffect } from "react";
import { publicApi } from "@/integrations/backend/client";

export const useCheckSetup = () => {
  const [setupNeeded, setSetupNeeded] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  const checkSetup = async () => {
    try {
      setError(false);
      const response = await publicApi.get("/check-setup/");
      setSetupNeeded(response.data.setup_needed);
    } catch (error: any) {
      console.error("DEBUG - Full Error Data:", error.response?.data);
      console.error("Error checking setup status:", error.message);
      setError(true);
      setSetupNeeded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSetup();
  }, []);

  return { setupNeeded, loading, error, checkSetup };
};
