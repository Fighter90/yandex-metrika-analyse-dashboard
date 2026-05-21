import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const FRONTEND_PORT = Number(process.env.PORT) || 5173;
const API_PORT = Number(process.env.API_PORT) || 4000;

// The backend mounts everything under /api; proxy keeps the path so /api/health resolves.
export default defineConfig({
  plugins: [react()],
  server: {
    port: FRONTEND_PORT,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
