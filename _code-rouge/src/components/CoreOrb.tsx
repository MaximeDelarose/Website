/**
 * Le NOYAU : signature visuelle du jeu. Quatre arcs = quatre verrous ; il passe du rouge
 * d'alerte au cyan à mesure que l'équipe progresse.
 */
function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const p = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  };
  return `M${p(from)}A${r} ${r} 0 0 1 ${p(to)}`;
}

export interface CoreOrbProps {
  /** Nombre de verrous ouverts (0 à 4). */
  unlocked: number;
  /** Index du verrou en cours, ou -1. */
  active?: number;
  mood?: "alert" | "critical" | "stable";
  className?: string;
}

export function CoreOrb({ unlocked, active = -1, mood = "alert", className = "" }: CoreOrbProps) {
  return (
    <svg className={`core core--${mood} ${className}`} viewBox="0 0 240 240" aria-hidden="true">
      <defs>
        <radialGradient id="core-heart" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="32%" stopColor="var(--core-c)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--core-c)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="core-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--core-c)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--core-c)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="url(#core-halo)" className="core__halo" />
      <g className="core__spin core__spin--slow">
        <circle cx="120" cy="120" r="108" className="core__dash" strokeDasharray="2 9" />
      </g>
      {[0, 1, 2, 3].map((i) => (
        <path
          key={i}
          d={arc(120, 120, 94, i * 90 + 7, i * 90 + 83)}
          className={`core__lock ${i < unlocked ? "is-open" : ""} ${i === active ? "is-active" : ""}`}
        />
      ))}
      <g className="core__spin core__spin--rev">
        <circle cx="120" cy="120" r="76" className="core__dash" strokeDasharray="26 8 4 8" />
        <path d={arc(120, 120, 76, 10, 70)} className="core__sweep" />
      </g>
      <g className="core__spin">
        <path d="M120 62 170.2 149H69.800Z" className="core__tri" />
        <path d="M120 178 69.8 91h100.400Z" className="core__tri" />
      </g>
      <circle cx="120" cy="120" r="46" className="core__ring" />
      <circle cx="120" cy="120" r="40" fill="url(#core-heart)" className="core__heart" />
    </svg>
  );
}
