import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../',
  envPrefix: ['VITE_', 'map_', 'MAP_'],
  server: {
    port: 5174,
    host: true,
  },
})
