// Chargement du contenu depuis le disque (Node : tests, scripts).
// Dans le navigateur, on importera les JSON via Vite et on appellera loadContent.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Content } from "../engine/types";
import { loadContent } from "./loader";

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
