import { motion } from 'motion/react'
import type { PortraitSpec } from '../lib/types'

const L = 'M11 58V34C11 21 19 12.5 27 12.5'
const R = 'M53 58V34C53 21 45 12.5 37 12.5'

/** Logo À DEUX : deux silhouettes abstraites qui se rejoignent pour former une arche. */
export function Logo({ size = 40, mono = false, color = '#3B1F4D', accent = '#FFC4AB' }: { size?: number; mono?: boolean; color?: string; accent?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} fill="none" role="img" aria-label="À DEUX">
      <path d={L} stroke={color} strokeWidth="10" strokeLinecap="round" />
      <path d={R} stroke={mono ? color : accent} strokeWidth="10" strokeLinecap="round" />
      <circle cx="32" cy="40" r="3.4" fill={color} />
    </svg>
  )
}
export function Wordmark({ size = 15, color = '#3B1F4D' }: { size?: number; color?: string }) {
  return <span className="font-display" style={{ fontSize: size * 1.5, letterSpacing: '.28em', color, lineHeight: 1 }}>À DEUX</span>
}

/** Illustration d'accueil : deux chemins qui se rejoignent sous une arche (tracé animé). */
export function PathsArt({ progress = 1, className = '' }: { progress?: number; className?: string }) {
  return (
    <svg viewBox="0 0 360 380" className={className} fill="none" aria-hidden>
      <defs>
        <radialGradient id="glow" cx="50%" cy="46%" r="52%"><stop offset="0" stopColor="#FFC4AB" stopOpacity=".55" /><stop offset="1" stopColor="#FFC4AB" stopOpacity="0" /></radialGradient>
        <linearGradient id="gA" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#3B1F4D" stopOpacity="0" /><stop offset=".35" stopColor="#3B1F4D" /></linearGradient>
        <linearGradient id="gB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#FFC4AB" stopOpacity="0" /><stop offset=".35" stopColor="#FFC4AB" /></linearGradient>
      </defs>
      <circle cx="180" cy="170" r="165" fill="url(#glow)" />
      {/* l'arche, négatif */}
      <motion.path d="M92 372 V196 C92 112 140 62 178 62" stroke="url(#gA)" strokeWidth="26" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress }} transition={{ duration: 1.9, ease: [0.22, 0.8, 0.24, 1] }} />
      <motion.path d="M268 372 V196 C268 112 220 62 182 62" stroke="url(#gB)" strokeWidth="26" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: progress }} transition={{ duration: 1.9, delay: 0.25, ease: [0.22, 0.8, 0.24, 1] }} />
      <motion.circle cx="180" cy="236" r="9" fill="#3B1F4D" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.8, type: 'spring', stiffness: 120, damping: 14 }} style={{ transformOrigin: '180px 236px' }} />
    </svg>
  )
}

/** Silhouette mystérieuse : une forme abstraite (aucune donnée de photo). */
export function Silhouette({ size = 160, glow = '#FFC4AB', dark = true, pulse = true }: { size?: number; glow?: string; dark?: boolean; pulse?: boolean }) {
  const fill = dark ? '#52336A' : '#3B1F4D'
  return (
    <div style={{ width: size, height: size * 1.1, position: 'relative' }} role="img" aria-label="Silhouette mystérieuse">
      <motion.div className="absolute inset-[-18%] rounded-full" style={{ background: `radial-gradient(circle, ${glow}55 0%, transparent 62%)` }}
        animate={pulse ? { scale: [1, 1.07, 1], opacity: [0.65, 1, 0.65] } : undefined} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} />
      <svg viewBox="0 0 120 132" width={size} height={size * 1.1} className="relative" fill="none">
        <defs><linearGradient id={`sil-${dark ? 'd' : 'l'}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={fill} /><stop offset="1" stopColor={fill} stopOpacity=".15" /></linearGradient></defs>
        <circle cx="60" cy="40" r="22" fill={`url(#sil-${dark ? 'd' : 'l'})`} />
        <path d="M16 132 C16 92 36 74 60 74 C84 74 104 92 104 132Z" fill={`url(#sil-${dark ? 'd' : 'l'})`} />
      </svg>
    </div>
  )
}

/** Portrait illustré (fictif) — affiché uniquement quand la révélation est validée. */
export function Portrait({ spec, size = 160, radius = 28 }: { spec: PortraitSpec; size?: number; radius?: number }) {
  const { skin, hair, hairStyle, accent, glasses } = spec
  return (
    <svg viewBox="0 0 120 150" width={size} height={size * 1.25} style={{ borderRadius: radius, display: 'block' }} role="img" aria-label="Portrait illustré">
      <rect width="120" height="150" fill={accent} opacity=".55" />
      <rect width="120" height="150" fill="#FDF7EF" opacity=".35" />
      {hairStyle === 1 && <path d="M30 70 C26 28 94 28 90 70 L90 110 L30 110Z" fill={hair} />}
      {hairStyle === 2 && <path d="M28 82 C22 26 98 26 92 82 C92 104 86 110 80 110 L40 110 C34 110 28 104 28 82Z" fill={hair} />}
      <path d="M8 156 C10 118 34 104 60 104 C86 104 110 118 112 156Z" fill="#3B1F4D" />
      <rect x="52" y="90" width="16" height="18" rx="6" fill={skin} />
      <ellipse cx="60" cy="66" rx="22" ry="27" fill={skin} />
      {hairStyle === 0 && <path d="M38 62 C36 36 84 34 82 62 C74 50 56 48 38 62Z" fill={hair} />}
      {hairStyle === 1 && <path d="M36 64 C34 36 86 36 84 64 C78 50 50 48 36 64Z" fill={hair} />}
      {hairStyle === 2 && <path d="M36 60 C38 38 84 38 84 60 C72 48 52 48 36 60Z" fill={hair} />}
      {hairStyle === 3 && (<g fill={hair}><circle cx="40" cy="46" r="11" /><circle cx="60" cy="39" r="12" /><circle cx="80" cy="46" r="11" /><path d="M38 58 C46 48 74 48 82 58 C80 50 40 50 38 58Z" /></g>)}
      <circle cx="51" cy="68" r="2.2" fill="#3B1F4D" /><circle cx="69" cy="68" r="2.2" fill="#3B1F4D" />
      <path d="M53 80 Q60 85 67 80" stroke="#3B1F4D" strokeWidth="2" strokeLinecap="round" fill="none" />
      {glasses && (<g stroke="#3B1F4D" strokeWidth="1.8" fill="none"><circle cx="51" cy="68" r="7.5" /><circle cx="69" cy="68" r="7.5" /><path d="M58.5 68 H61.5" /></g>)}
    </svg>
  )
}

/** Petit repère graphique (point plein) utilisé comme puce. */
export const Dot = ({ on = true }: { on?: boolean }) => <span className={`inline-block h-[7px] w-[7px] rounded-full ${on ? 'bg-plum' : 'bg-plum/20'}`} />

/** Icônes en trait fin (aucun emoji). */
export const Icon = {
  mic: <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4" />,
  micOff: <path d="M4 4l16 16M9 6a3 3 0 0 1 6 0v6M6 11a6 6 0 0 0 9 5M12 17v4" />,
  phone: <path d="M5 4l3-1 2 5-2 1a11 11 0 0 0 6 6l1-2 5 2-1 3c-1 1-3 1-5 0A17 17 0 0 1 5 9c-1-2-1-4 0-5z" />,
  send: <path d="M12 19V5M6 11l6-6 6 6" />,
  play: <path d="M8 5l11 7-11 7z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  home: <path d="M4 11l8-7 8 7M6 10v10h4v-6h4v6h4V10" />,
  two: <><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></>,
  spark: <path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 21c0-4 3-6 7-6s7 2 7 6" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
}
export const Ico = ({ d, size = 22, w = 1.6 }: { d: React.ReactNode; size?: number; w?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
)
