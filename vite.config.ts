import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Deployed behind tojoin.org/Lab101 via a Vercel rewrite that forwards the
// full path (including the /Lab101 prefix) to this project's own deployment,
// so every built asset URL must live under /Lab101/ for the online build.
// The base is overridable via VITE_BASE so the downloadable Docker image can
// build with VITE_BASE=/ and serve the app at the container root (localhost).
const BASE_PATH = process.env.VITE_BASE ?? '/Lab101/';

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/apps/**/*.{ts,tsx}'],
      exclude: ['src/_archive/**'],
    },
  },
})
