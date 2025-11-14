import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Unified '/api' prefix for dev when backend runs on 3001
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Admin routes
      '/admin': { target: 'http://localhost:3001', changeOrigin: true },
      // Specific admin sub-routes
      '/admin/years': { target: 'http://localhost:3001', changeOrigin: true },
      '/admin/departments': { target: 'http://localhost:3001', changeOrigin: true },
      // Staff routes
      '/staff': { target: 'http://localhost:3001', changeOrigin: true },
      // Student routes
      '/student': { target: 'http://localhost:3001', changeOrigin: true },
      '/qr': { target: 'http://localhost:3001', changeOrigin: true },
      '/sessions': { target: 'http://localhost:3001', changeOrigin: true },
      '/attendance': { target: 'http://localhost:3001', changeOrigin: true },
      '/face-recognition': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true }
    }
  }
});



