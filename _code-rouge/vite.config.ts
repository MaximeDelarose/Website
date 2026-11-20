import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Même schéma que les autres jeux du dépôt : les sources vivent ici (_code-rouge/, ignoré par
// GitHub Pages car préfixé « _ »), le jeu construit est écrit dans ../code-rouge/ puis commité.
// base « ./ » : le jeu fonctionne sous n'importe quel chemin (GitHub Pages, Cloudflare Pages…).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { host: true, port: 5190 },
  build: { outDir: "../code-rouge", emptyOutDir: true, target: "es2020" },
});
