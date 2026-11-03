import { describe, it, expect } from "vitest";
import { deriveKeys, seal, open, b64, unb64 } from "../src/loader/crypto";

describe("coffre chiffré", () => {
  const salt = new Uint8Array(16).fill(7);
  it("aller-retour, déterminisme et mauvais mot de passe", async () => {
    const k = await deriveKeys("mot de passe ♡", salt, 1000, true);
    const data = new TextEncoder().encode("Merci d'être entrée dans mon monde.");
    const a = await seal(k, data), b = await seal(k, data);
    expect(b64(a)).toBe(b64(b)); // même contenu → même fichier
    const other = await seal(k, new TextEncoder().encode("autre"));
    expect(b64(other.slice(0, 12))).not.toBe(b64(a.slice(0, 12))); // IV différents
    expect(new TextDecoder().decode(await open(k, a))).toContain("mon monde");
    const wrong = await deriveKeys("mauvais", salt, 1000);
    await expect(open(wrong, a)).rejects.toBeTruthy();
    // le texte clair n'apparaît pas dans le chiffré
    expect(new TextDecoder("latin1").decode(a)).not.toContain("monde");
    expect(unb64(b64(a))).toEqual(a);
  });
});
