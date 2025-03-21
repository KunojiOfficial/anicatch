import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  return {
    envDir: './',
    define: {
      'process.env': env, // Ensures variables are available in runtime
    },
    server: {
      allowedHosts: ["play.anicatch.com"],
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
  }
});
