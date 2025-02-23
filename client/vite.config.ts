import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  envDir: './',
  server: {
    allowedHosts: ["suggests-subdivision-having-imaging.trycloudflare.com"],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    hmr: {
      clientPort: 443,
    }
  },
  plugins: [
    react(),
    tailwindcss()
  ],
})
