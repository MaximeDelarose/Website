import type { ReactNode } from 'react';
import type { Profile } from './types';

const P: Record<string, string> = {
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.2-12.2-1.7 4.7-4.7 1.7 1.7-4.7 4.7-1.7Z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1',
  chat: 'M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.1A8 8 0 1 1 20 12Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17.5 19 7.5',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  send: 'M5 12h14M13 6l6 6-6 6',
  image: 'M4 6h16v12H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
  pin: 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Zm0-8.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2',
  shield: 'M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6l7-3Zm-3 9 2.2 2.2L15.5 10',
  flag: 'M6 21V4m0 1h11l-2 4 2 4H6',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  trash: 'M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13',
  plus: 'M12 5v14M5 12h14',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Zm4 4h4',
  star: 'M12 4l2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.7-4.8 2.7 1-5.4-4-3.8 5.4-.7L12 4Z',
};
export const Icon = ({ n, size = 22 }: { n: keyof typeof P | string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={P[n]} />
  </svg>
);

/** Portrait illustratif (aucune vraie photo : profils fictifs). Dégradé chaud + silhouette douce. */
export function Portrait({ p, src, hue, className = '', style }: { p?: Profile; src?: string; hue?: number; className?: string; style?: React.CSSProperties }) {
  const photo = src || p?.photo;
  if (photo) return <div className={`portrait ${className}`} style={{ backgroundImage: `url(${photo})`, ...style }} />;
  const h = hue ?? p?.hue ?? 28;
  const id = `g${h}${p?.id || 'me'}`;
  const female = p?.gender === 'femme';
  return (
    <div className={`portrait ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id={`${id}a`} cx="50%" cy="38%" r="70%">
            <stop offset="0" stopColor={`hsl(${h} 55% 42%)`} stopOpacity=".9" />
            <stop offset=".55" stopColor={`hsl(${(h + 330) % 360} 28% 20%)`} />
            <stop offset="1" stopColor="#17151b" />
          </radialGradient>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={`hsl(${h} 40% 30%)`} /><stop offset="1" stopColor="#1b1a20" />
          </linearGradient>
          <filter id={`${id}f`}><feGaussianBlur stdDeviation="1.4" /></filter>
        </defs>
        <rect width="400" height="500" fill={`url(#${id}a)`} />
        <circle cx="300" cy="130" r="90" fill={`hsl(${h} 90% 62%)`} opacity=".10" />
        {female && <path d="M118 230c-8-84 40-118 82-118s90 34 82 118c-4 40 10 70 22 96H96c12-26 26-56 22-96Z" fill={`hsl(${h} 30% 14%)`} opacity=".85" />}
        <path d="M60 520c0-96 58-142 140-142s140 46 140 142Z" fill={`url(#${id}b)`} filter={`url(#${id}f)`} opacity=".95" />
        <ellipse cx="200" cy="232" rx="58" ry="70" fill={`hsl(${h} 38% 52%)`} opacity=".92" filter={`url(#${id}f)`} />
        {!female && <path d="M140 218c2-50 34-70 62-70s56 20 58 66c-14-26-40-38-62-38s-42 12-58 42Z" fill={`hsl(${h} 28% 16%)`} opacity=".9" />}
      </svg>
    </div>
  );
}

export const Chip = ({ children, on, onClick, ember }: { children: ReactNode; on?: boolean; onClick?: () => void; ember?: boolean }) =>
  onClick ? (
    <button type="button" className={`chip ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={!!on}>{children}</button>
  ) : (
    <span className={`chip static ${ember ? 'ember' : ''}`}>{children}</span>
  );

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <div className="scrim" onClick={onClose} />
      <div className="sheet">
        <div className="grip" />
        <div className="sheet-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon n="close" size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

export const Toasts = ({ items }: { items: { id: number; text: string }[] }) => (
  <div className="toasts" aria-live="polite">{items.map((t) => <div key={t.id} className="toast"><Icon n="check" size={16} />{t.text}</div>)}</div>
);

export const Empty = ({ title, em, text, children }: { title: string; em: string; text: string; children?: ReactNode }) => (
  <div className="empty">
    <div className="empty-halo" />
    <h2>{title} <em>{em}</em></h2>
    <p>{text}</p>
    {children}
  </div>
);

export const Toggle = ({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) => (
  <button type="button" className="row toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
    <span><b>{label}</b>{hint && <small>{hint}</small>}</span>
    <span className={`sw ${on ? 'on' : ''}`}><i /></span>
  </button>
);

export const DemoPill = () => <span className="demo-pill" title="Version de démonstration : toutes les données sont fictives">Démo</span>;
