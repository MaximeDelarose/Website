import { describe, expect, it } from "vitest";
import { SPRITES, VARIANTS } from "../src/ui/sprites";
import { loadContentFromDir, loadRunDataFromDir, loadStoryFromDir } from "../src/content/node";

describe("sprites", () => {
  for (const [id, def] of Object.entries(SPRITES)) {
    it(`${id} : 16 x 16, couleurs toutes définies`, () => {
      expect(def.rows).toHaveLength(16);
      const letters = new Set(["k", "w", ...Object.keys(def.pal)]);
      for (const row of def.rows) {
        expect(row, `${id} « ${row} »`).toHaveLength(16);
        for (const ch of row) if (ch !== ".") expect(letters.has(ch), `${id} : lettre ${ch}`).toBe(true);
      }
    });
  }

  it("chaque objet, chaque ennemi et chaque PNJ a un sprite", () => {
    const c = loadContentFromDir();
    const { story } = loadStoryFromDir(c, loadRunDataFromDir(c));
    for (const id of [...Object.keys(c.items), ...Object.keys(c.enemies), ...story.npcs.map((n) => n.sprite), ...Object.keys(c.classes).map((id) => `class_${id}`)]) {
      expect(VARIANTS[id], id).toBeDefined();
      expect(SPRITES[VARIANTS[id].sprite], id).toBeDefined();
    }
  });
});
