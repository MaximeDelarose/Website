/** Les 16 symboles de la matrice (dessinés dans components/Glyph.tsx). */
export const SYMBOLS = [
  { id: "cercle", label: "Cercle" },
  { id: "triangle", label: "Triangle" },
  { id: "carre", label: "Carré" },
  { id: "losange", label: "Losange" },
  { id: "hexagone", label: "Hexagone" },
  { id: "etoile", label: "Étoile" },
  { id: "croix", label: "Croix" },
  { id: "lune", label: "Lune" },
  { id: "eclair", label: "Éclair" },
  { id: "oeil", label: "Œil" },
  { id: "cle", label: "Clé" },
  { id: "onde", label: "Onde" },
  { id: "fleche", label: "Flèche" },
  { id: "sablier", label: "Sablier" },
  { id: "cible", label: "Cible" },
  { id: "goutte", label: "Goutte" },
] as const;

export type SymbolId = (typeof SYMBOLS)[number]["id"];

export function symbolLabel(id: string): string {
  return SYMBOLS.find((s) => s.id === id)?.label ?? id;
}
