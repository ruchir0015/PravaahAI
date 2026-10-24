import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '../',
  envPrefix: ['VITE_', 'map_', 'MAP_'],
  server: {
    port: 5174,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:5050',
      '/uploads': 'http://localhost:5050',
    },
  },
})
