// Serveur Vite sans rechargement automatique (pour les tests des mini-jeux pendant que d'autres fichiers changent).
import { createServer } from 'vite';
const s = await createServer({ configFile: false, root: process.cwd(), server: { port: 5174, strictPort: true, hmr: false, watch: null } });
await s.listen();
console.log('ok 5174');
