import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Mode-aware config so we can tweak dev/prod cleanly and keep tests sane.
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const base = process.env.BASE_PATH ?? '/horizon/';

  return {
    plugins: [react()],

    // Keep base consistent with how you serve the app (dev & prod).
    base,

    server: {
      port: 5173,
      open: '/horizon/', // opens directly to the correct base path
      // host: true, // uncomment if you want LAN access
    },

    preview: {
      port: 5173,
      open: '/horizon/', // preview respects base too
    },

    build: {
      sourcemap: isDev, // useful during local dev builds if you run `vite build`
      outDir: 'dist',
      assetsDir: 'assets',
      // emptyOutDir: true, // default true; keep if you later split outDir
    },

    worker: {
      format: 'es',
    },

    // Vitest config: run only unit/integration tests in src with a browser-like env.
    // This avoids trying to run Playwright e2e specs under Vitest.
    test: {
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['tests/**', 'node_modules/**', 'dist/**'],
      restoreMocks: true,
    },

    // Optional: tighten resolve aliases later if you introduce @/* paths
    // resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  };
});