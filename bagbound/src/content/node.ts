// Chargement du contenu depuis le disque (Node : tests, scripts).
// Dans le navigateur, on importera les JSON via Vite et on appellera loadContent.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Content } from "../engine/types";
import { loadContent } from "./loader";
import { loadRecipes, type Recipe } from "./recipes";
import { loadRunData, type RunData } from "./runData";
import { loadStory } from "./story";

export const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../data");

const readJson = (dir: string, name: string): unknown => JSON.parse(readFileSync(join(dir, name), "utf8"));

export function loadContentFromDir(dir: string = DATA_DIR): Content {
  return loadContent({
    rules: readJson(dir, "rules.json"),
    tags: readJson(dir, "tags.json"),
    items: readJson(dir, "items.json"),
    enemies: readJson(dir, "enemies.json"),
    classes: readJson(dir, "classes.json"),
  });
}

export function loadRunDataFromDir(content: Content, dir: string = DATA_DIR): RunData {
  return loadRunData(
    {
      rules: readJson(dir, "run.json"),
      zones: readJson(dir, "zones.json"),
      loot: readJson(dir, "loot.json"),
      events: readJson(dir, "events.json"),
    },
    content,
  );
}

export function loadRecipesFromDir(content: Content, dir: string = DATA_DIR): Recipe[] {
  return loadRecipes(readJson(dir, "recipes.json"), content);
}

export function loadStoryFromDir(content: Content, rd: RunData, dir: string = DATA_DIR) {
  return loadStory(readJson(dir, "story.json"), readJson(dir, "quests.json"), content, rd);
}
