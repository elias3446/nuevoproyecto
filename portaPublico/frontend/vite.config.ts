import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar el .env desde portaPublico/ (directorio padre de frontend/)
  // prefix '' = cargar TODAS las variables, no solo las VITE_*
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const frontendPort = parseInt(env.PORTAL_DEV_PORT || "8088", 10);

  return {
    server: {
      host: "::",
      port: frontendPort,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
