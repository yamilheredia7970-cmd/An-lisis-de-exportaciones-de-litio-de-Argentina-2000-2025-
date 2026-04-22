import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
