// vite.config.js
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Unified '/api' prefix for dev when backend runs on 5174
      "/api": {
        target: "http://localhost:5174",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      },
      "/qr": { target: "http://localhost:5174", changeOrigin: true },
      "/sessions": { target: "http://localhost:5174", changeOrigin: true },
      "/attendance": { target: "http://localhost:5174", changeOrigin: true },
      "/socket.io": { target: "http://localhost:5174", ws: true, changeOrigin: true }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE3MyxcbiAgICBob3N0OiB0cnVlLFxuICAgIHByb3h5OiB7XG4gICAgICAvLyBVbmlmaWVkICcvYXBpJyBwcmVmaXggZm9yIGRldiB3aGVuIGJhY2tlbmQgcnVucyBvbiA1MTc0XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo1MTc0JyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvYXBpLywgJycpXG4gICAgICB9LFxuICAgICAgJy9xcic6IHsgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo1MTc0JywgY2hhbmdlT3JpZ2luOiB0cnVlIH0sXG4gICAgICAnL3Nlc3Npb25zJzogeyB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjUxNzQnLCBjaGFuZ2VPcmlnaW46IHRydWUgfSxcbiAgICAgICcvYXR0ZW5kYW5jZSc6IHsgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo1MTc0JywgY2hhbmdlT3JpZ2luOiB0cnVlIH0sXG4gICAgICAnL3NvY2tldC5pbyc6IHsgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDo1MTc0Jywgd3M6IHRydWUsIGNoYW5nZU9yaWdpbjogdHJ1ZSB9XG4gICAgfVxuICB9XG59KTtcblxuXG5cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBRWxCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUE7QUFBQSxNQUVMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxVQUFVLEVBQUU7QUFBQSxNQUM5QztBQUFBLE1BQ0EsT0FBTyxFQUFFLFFBQVEseUJBQXlCLGNBQWMsS0FBSztBQUFBLE1BQzdELGFBQWEsRUFBRSxRQUFRLHlCQUF5QixjQUFjLEtBQUs7QUFBQSxNQUNuRSxlQUFlLEVBQUUsUUFBUSx5QkFBeUIsY0FBYyxLQUFLO0FBQUEsTUFDckUsY0FBYyxFQUFFLFFBQVEseUJBQXlCLElBQUksTUFBTSxjQUFjLEtBQUs7QUFBQSxJQUNoRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
