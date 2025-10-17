import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Mode-aware config so we can tweak dev/prod cleanly.
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [react()],
    // Keep base consistent with your launch.json and toPublicUrl():
    // Dev and prod both serve under /horizon/
    base: '/horizon/',

    server: {
      port: 5173,
      open: '/horizon/', // opens directly to the correct base path
      // host: true, // uncomment if you want LAN access
    },

    preview: {
      port: 5173,
      open: '/horizon/', // preview respects base too; this is convenient
    },

    build: {
      sourcemap: isDev, // useful during local dev builds if you run `vite build`
      outDir: 'dist',
      assetsDir: 'assets',
      // emptyOutDir: true, // default true; keep if you later split outDir
    },

    // Optional: tighten resolve aliases later if you introduce @/* paths
    // resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  };
});