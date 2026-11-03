import { defineConfig } from "vite";

// Le site est statique : `npm run build` produit app/bagbound.js et
// app/bagbound.css, chargés par ../bagbound.html. `npm run dev` sert index.html.
export default defineConfig({
  base: "./",
  build: {
    outDir: "app",
    emptyOutDir: true,
    target: "es2020",
    modulePreload: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: "src/ui/main.ts",
      output: {
        entryFileNames: "bagbound.js",
        assetFileNames: "bagbound.[ext]",
        inlineDynamicImports: true,
      },
    },
  },
});
