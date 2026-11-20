/** Palette et police du site (css/style.css) : forêt, crème, brun, orange, feuille. */
export const PAL = {
  bg: 0x1f3a2b, // --forest : fond du cadre de jeu
  field: 0x284d37, // zone de jeu, un ton au-dessus du fond
  cream: 0xfdf3de, // --panel : texte, billes
  dim: 0xc99a6a, // --depth : texte secondaire
  line: 0x4a2e1c, // --line : contours
  cap: 0x8a5a3b, // --cap : murs, briques indestructibles
  orange: 0xe8873a, // --orange
  orangeLight: 0xf2b05e, // --orange-2
  leaf: 0x9cc56b, // --leaf
  moss2: 0x7ab05a, // --moss-2 éclairci pour rester lisible sur le fond
  berry: 0xc8553d, // --berry
  tan: 0xc99a6a,
  ink0: 0x2b1709, // brun très foncé : ombres et contours épais
  panel2: 0xf8e6c2, // --panel-2
  red: 0xe0604a,
};

/** Police du site (chargée par style.css). */
export const FONT = '"Londrina", "Nunito", system-ui, sans-serif';

/** Police de texte courant. */
export const FONT_BODY = '"Nunito", system-ui, sans-serif';

/** Couleur Phaser (0xRRGGBB) vers chaîne CSS. */
export const hex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

/** Mélange deux couleurs 0xRRGGBB (t = 0 → a, t = 1 → b). */
export function mix(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
