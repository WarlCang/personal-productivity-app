import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative paths so the build also works from file:// inside Electron.
  base: './',
  plugins: [react(), tailwindcss()],
})
