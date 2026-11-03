// Point d'entrée navigateur : charge et valide le contenu, monte l'application
// dans l'élément [data-bagbound] de la page.

import "./style.css";
import { loadBundledContent } from "../content/browser";
import { App } from "./app";

function boot(): void {
  const stage = document.querySelector<HTMLElement>("[data-bagbound]");
  if (!stage) return;
  const overlay = stage.querySelector<HTMLElement>("[data-overlay]");
  try {
    const { content, sandbox, runData, recipes, story, quests } = loadBundledContent();
    if (overlay) overlay.hidden = true;
    const app = new App(stage, content, sandbox, runData, recipes, story, quests);
    (window as unknown as { BB_DEBUG: unknown }).BB_DEBUG = { app, content };
  } catch (err) {
    console.error(err);
    if (overlay) {
      overlay.hidden = false;
      const card = overlay.querySelector("[data-card]") ?? overlay;
      card.textContent = `Le jeu n'a pas pu démarrer : ${(err as Error).message}`;
    }
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
