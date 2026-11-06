import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// In development the API server runs on :3000; Vite forwards these paths to it.
// In production the API server serves this build at /admin.
const API = 'http://localhost:3000';

export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      '/api': API,
      '/uploads': API,
      '/socket.io': { target: API, ws: true }
    }
  }
});
