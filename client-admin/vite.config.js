import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Khi phát triển, chuyển các đường dẫn này sang API ở cổng 3000
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
