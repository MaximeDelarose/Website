import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build statique relatif : l'app se publie telle quelle dans /etoi (GitHub Pages, Cloudflare Pages…)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: '../etoi', emptyOutDir: true, sourcemap: false },
});
