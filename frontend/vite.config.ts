import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargamos el .env desde la raíz del proyecto (un nivel arriba)
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");

  return {
    server: {
      host: "0.0.0.0",
      port: parseInt(env.FRONTEND_PORT) || 8080,
      watch: {
        usePolling: true,
      },
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || `http://localhost:${env.APP_PORT || 8000}`,
          changeOrigin: true,
        },
      },
      hmr: {
        clientPort: parseInt(env.FRONTEND_PORT) || 3000,
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
