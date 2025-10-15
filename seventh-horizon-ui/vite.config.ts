import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For GitHub Pages under https://seventh-horizon.github.io/horizon/
export default defineConfig({
  base: '/horizon/',
  plugins: [react()],
})