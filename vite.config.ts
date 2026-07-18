import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Deployed behind tojoin.org/Lab101 via a Vercel rewrite that forwards the
// full path (including the /Lab101 prefix) to this project's own deployment.
// Every built asset URL must therefore also live under /Lab101/.
const BASE_PATH = '/Lab101/';

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
