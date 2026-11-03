import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ENGINE = resolve(__dirname, "../src/engine");
const FORBIDDEN = [/Math\.random/, /Date\.now/, /new Date\b/, /performance\.now/, /\bwindow\./, /\bdocument\./, /requestAnimationFrame/, /from "node:/];

describe("pureté du moteur (/src/engine)", () => {
  const files = readdirSync(ENGINE).filter((f) => f.endsWith(".ts"));

  it("contient des fichiers", () => expect(files.length).toBeGreaterThan(3));

  for (const f of files) {
    it(`${f} : pas d'aléatoire non seedé, d'horloge ni de dépendance au rendu`, () => {
      const src = readFileSync(join(ENGINE, f), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      for (const re of FORBIDDEN) expect(src, `${f} utilise ${re}`).not.toMatch(re);
    });
  }
});
