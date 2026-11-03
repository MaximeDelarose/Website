// Après `vite build` : met à jour le jeton ?v= de ../bagbound.html avec
// l'empreinte du bundle, pour que les navigateurs rechargent la nouvelle version.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fnv1a } from "../src/engine/hash";

const root = resolve(import.meta.dirname, "..");
const page = resolve(root, "../bagbound.html");
const js = readFileSync(resolve(root, "app/bagbound.js"), "utf8");
const css = readFileSync(resolve(root, "app/bagbound.css"), "utf8");
const v = fnv1a(js + css);
const html = readFileSync(page, "utf8");
const next = html.replace(/(bagbound\/app\/bagbound\.(?:js|css))\?v=[^"']*/g, `$1?v=${v}`);
writeFileSync(page, next);
console.log(`bagbound.html -> ?v=${v}`);
