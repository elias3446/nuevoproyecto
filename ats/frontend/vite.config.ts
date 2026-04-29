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
      host: env.APP_HOST || "0.0.0.0",
      port: parseInt(env.FRONTEND_PORT) || 8080,
      watch: {
        usePolling: false,
      },
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || `http://localhost:${env.APP_PORT || 8000}`,
          changeOrigin: true,
          xfwd: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const ip = req.socket.remoteAddress || "";
              proxyReq.setHeader('X-Forwarded-For', ip);
            });
          },
        },
        "/media": {
          target: env.VITE_API_PROXY_TARGET || `http://localhost:${env.APP_PORT || 8000}`,
          changeOrigin: true,
          xfwd: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const ip = req.socket.remoteAddress || "";
              proxyReq.setHeader('X-Forwarded-For', ip);
            });
          },
        },
        "/ws": {
          target: env.VITE_API_PROXY_TARGET || `http://localhost:${env.APP_PORT || 8000}`,
          ws: true,
          xfwd: true,
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              const ip = req.socket.remoteAddress || "";
              proxyReq.setHeader('X-Forwarded-For', ip);
            });
          },
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
