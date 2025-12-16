import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages deployment (/repo-name/)
  // Set via VITE_BASE environment variable during build
  // Defaults to '/' for local development
  base: process.env.VITE_BASE ?? '/',
})
