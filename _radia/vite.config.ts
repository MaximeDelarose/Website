import { defineConfig } from "vitest/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Le contenu personnel (textes, photos, musique) vit dans private/ (jamais commité en clair).
// Sans lui (clone neuf), on bascule sur un contenu d'exemple pour pouvoir développer et tester.
const PRIVATE = resolve(__dirname, "private/content.ts");
const content = existsSync(PRIVATE) ? PRIVATE : resolve(__dirname, "src/content/example.ts");

export default defineConfig({
  base: "./",
  resolve: { alias: { "@content": content } },
  server: { host: true, port: 5180 },
  build: {
    // L'application est construite comme UN module ES autonome, ensuite chiffré par scripts/seal.ts.
    outDir: "dist-app",
    emptyOutDir: true,
    target: "es2020",
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    lib: { entry: resolve(__dirname, "src/app.ts"), formats: ["es" as const], fileName: () => "app.js" },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
