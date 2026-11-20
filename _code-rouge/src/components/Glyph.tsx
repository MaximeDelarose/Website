import type { ReactNode } from "react";
import { symbolLabel, type SymbolId } from "../engine/symbols";

function star(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

const SHAPES: Record<SymbolId, ReactNode> = {
  cercle: <circle cx="24" cy="24" r="15" />,
  triangle: <path d="M24 7 41 38H7Z" />,
  carre: <rect x="9" y="9" width="30" height="30" rx="3" />,
  losange: <path d="M24 4 42 24 24 44 6 24Z" />,
  hexagone: <path d="M24 5 40.5 14.5V33.5L24 43 7.5 33.5V14.5Z" />,
  etoile: <path d={star(24, 25, 20, 8.5)} />,
  croix: <path d="M19 6h10v13h13v10H29v13H19V29H6V19h13Z" />,
  lune: <path d="M30 6A19 19 0 1 0 42 30 15 15 0 0 1 30 6Z" />,
  eclair: <path d="M28 4 10 27h11l-3 17 20-24H27Z" />,
  oeil: (
    <>
      <path d="M4 24Q24 5 44 24 24 43 4 24Z" />
      <circle cx="24" cy="24" r="6" className="glyph__solid" />
    </>
  ),
  cle: (
    <>
      <circle cx="14" cy="24" r="8" />
      <path d="M22 24h21M36 24v8M43 24v6" className="glyph__open" />
    </>
  ),
  onde: <path d="M4 18q6.7-11 13.3 0t13.3 0 13.4 0M4 32q6.7-11 13.3 0t13.3 0 13.4 0" className="glyph__open" />,
  fleche: <path d="M24 5 41 24H31v19H17V24H7Z" />,
  sablier: <path d="M10 6h28L27 24l11 18H10l11-18Z" />,
  cible: (
    <>
      <circle cx="24" cy="24" r="17" />
      <circle cx="24" cy="24" r="8.5" className="glyph__open" />
      <circle cx="24" cy="24" r="2.5" className="glyph__solid" />
    </>
  ),
  goutte: <path d="M24 4S9 21 9 30a15 15 0 0 0 30 0C39 21 24 4 24 4Z" />,
};

export function Glyph({ id, className = "" }: { id: SymbolId; className?: string }) {
  return (
    <svg className={`glyph ${className}`} viewBox="0 0 48 48" role="img" aria-label={symbolLabel(id)}>
      {SHAPES[id]}
    </svg>
  );
}
