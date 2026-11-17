import { Game } from "./game";

const game = new Game(document.getElementById("scene") as HTMLCanvasElement);
// Accès pour les tests automatisés et le réglage (ex. ?fast=6 accélère le temps du jeu).
const fast = Number(new URLSearchParams(location.search).get("fast"));
if (fast > 0) game.clock.speed = fast;
(window as unknown as { __hd: Game }).__hd = game;
