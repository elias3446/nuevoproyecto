// vite.config.ts
import { defineConfig, loadEnv } from "file:///app/node_modules/vite/dist/node/index.js";
import react from "file:///app/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///app/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "/app";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__vite_injected_original_dirname, ".."), "");
  const frontendPort = parseInt(env.FRONTEND_PORT || "8080", 10);
  return {
    server: {
      host: "::",
      port: frontendPort,
      hmr: {
        overlay: false
      }
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvYXBwL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBjb21wb25lbnRUYWdnZXIgfSBmcm9tIFwibG92YWJsZS10YWdnZXJcIjtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgLy8gQ2FyZ2FyIGVsIC5lbnYgZGVzZGUgcG9ydGFQdWJsaWNvLyAoZGlyZWN0b3JpbyBwYWRyZSBkZSBmcm9udGVuZC8pXG4gIC8vIHByZWZpeCAnJyA9IGNhcmdhciBUT0RBUyBsYXMgdmFyaWFibGVzLCBubyBzb2xvIGxhcyBWSVRFXypcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4uXCIpLCBcIlwiKTtcbiAgY29uc3QgZnJvbnRlbmRQb3J0ID0gcGFyc2VJbnQoZW52LkZST05URU5EX1BPUlQgfHwgXCI4MDgwXCIsIDEwKTtcblxuICByZXR1cm4ge1xuICAgIHNlcnZlcjoge1xuICAgICAgaG9zdDogXCI6OlwiLFxuICAgICAgcG9ydDogZnJvbnRlbmRQb3J0LFxuICAgICAgaG1yOiB7XG4gICAgICAgIG92ZXJsYXk6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuICAgIHBsdWdpbnM6IFtyZWFjdCgpLCBtb2RlID09PSBcImRldmVsb3BtZW50XCIgJiYgY29tcG9uZW50VGFnZ2VyKCldLmZpbHRlcihCb29sZWFuKSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICAgIH0sXG4gICAgICBkZWR1cGU6IFtcInJlYWN0XCIsIFwicmVhY3QtZG9tXCIsIFwicmVhY3QvanN4LXJ1bnRpbWVcIiwgXCJyZWFjdC9qc3gtZGV2LXJ1bnRpbWVcIiwgXCJAdGFuc3RhY2svcmVhY3QtcXVlcnlcIiwgXCJAdGFuc3RhY2svcXVlcnktY29yZVwiXSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQThMLFNBQVMsY0FBYyxlQUFlO0FBQ3BPLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFHeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxLQUFLLFFBQVEsa0NBQVcsSUFBSSxHQUFHLEVBQUU7QUFDM0QsUUFBTSxlQUFlLFNBQVMsSUFBSSxpQkFBaUIsUUFBUSxFQUFFO0FBRTdELFNBQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLEtBQUs7QUFBQSxRQUNILFNBQVM7QUFBQSxNQUNYO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLGlCQUFpQixnQkFBZ0IsQ0FBQyxFQUFFLE9BQU8sT0FBTztBQUFBLElBQzlFLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxNQUN0QztBQUFBLE1BQ0EsUUFBUSxDQUFDLFNBQVMsYUFBYSxxQkFBcUIseUJBQXlCLHlCQUF5QixzQkFBc0I7QUFBQSxJQUM5SDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
