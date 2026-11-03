// Contenu pour le navigateur : les JSON sont inclus dans le bundle par Vite,
// puis validés au démarrage comme dans Node.

import rules from "../../data/rules.json";
import tags from "../../data/tags.json";
import items from "../../data/items.json";
import enemies from "../../data/enemies.json";
import classes from "../../data/classes.json";
import sandbox from "../../data/sandbox.json";
import runRules from "../../data/run.json";
import zones from "../../data/zones.json";
import loot from "../../data/loot.json";
import events from "../../data/events.json";
import { loadRunData } from "./runData";
import { loadContent } from "./loader";
import { loadSandbox } from "./sandbox";

export function loadBundledContent() {
  const content = loadContent({ rules, tags, items, enemies, classes });
  return {
    content,
    sandbox: loadSandbox(sandbox, content),
    runData: loadRunData({ rules: runRules, zones, loot, events }, content),
  };
}
