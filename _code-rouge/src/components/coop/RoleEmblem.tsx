/** Un emblème par rôle : formes simples, tracées au trait, qui « se dessinent » à la révélation. */
const EMBLEMS: Record<string, JSX.Element> = {
  // Archiviste : une bobine d'archives (anneaux concentriques et rayons).
  archives: (
    <>
      <circle cx="24" cy="24" r="17" />
      <circle cx="24" cy="24" r="6" />
      <path d="M24 7v11M24 30v11M7 24h11M30 24h11M12 12l8 8M28 28l8 8" className="emblem__thin" />
    </>
  ),
  // Intendant : une clé dont la tête est une grille de casiers.
  vestiaire: (
    <>
      <rect x="6" y="8" width="20" height="20" rx="3" />
      <path d="M16 8v20M6 18h20" className="emblem__thin" />
      <path d="M26 24l16 14M36 33l4-5M41 38l4-5" />
      <circle cx="34" cy="14" r="5" />
    </>
  ),
  // Douanier : un prisme traversé par une aiguille de boussole.
  frontiere: (
    <>
      <path d="M24 5 42 24 24 43 6 24Z" />
      <path d="M24 12l5 12-5 12-5-12Z" className="emblem__thin" />
      <circle cx="24" cy="24" r="2.4" className="emblem__solid" />
    </>
  ),
};

export function RoleEmblem({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg className={`emblem ${className}`} viewBox="0 0 48 48" aria-hidden="true">
      {EMBLEMS[id] ?? <circle cx="24" cy="24" r="14" />}
    </svg>
  );
}
