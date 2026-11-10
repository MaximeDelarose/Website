import { motion } from 'motion/react'
import type { PortraitSpec } from '../lib/types'

export type Mood = 'happy' | 'shy' | 'wow' | 'calm' | 'think'

/** Petit personnage original d'À DEUX. */
export function Buddy({ color = '#A88BC7', accent = '#F6B7A0', mood = 'happy', size = 96, flip = false, bob = true, className = '', arms = 'down' }: {
  color?: string; accent?: string; mood?: Mood; size?: number; flip?: boolean; bob?: boolean; className?: string; arms?: 'down' | 'up' | 'wave'
}) {
  const mouth = {
    happy: 'M40 66 Q50 76 60 66',
    shy: 'M44 68 Q50 71 56 68',
    wow: 'M46 68 Q50 76 54 68 Q50 64 46 68Z',
    calm: 'M42 67 Q50 72 58 67',
    think: 'M44 69 L57 67',
  }[mood]
  return (
    <motion.svg
      viewBox="0 0 100 120" width={size} height={size * 1.2} className={className} aria-hidden
      style={{ transform: flip ? 'scaleX(-1)' : undefined, overflow: 'visible' }}
      animate={bob ? { y: [0, -3, 0] } : undefined}
      transition={bob ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      <ellipse cx="50" cy="112" rx="26" ry="5" fill="#231C39" opacity=".12" />
      {/* pieds */}
      <ellipse cx="38" cy="106" rx="9" ry="6" fill={accent} />
      <ellipse cx="62" cy="106" rx="9" ry="6" fill={accent} />
      {/* bras */}
      <motion.path
        d={arms === 'down' ? 'M24 70 Q14 80 20 90' : 'M24 66 Q10 56 14 44'} stroke={color} strokeWidth="9" strokeLinecap="round" fill="none"
        animate={arms === 'wave' ? { rotate: [0, -18, 0] } : undefined} style={{ transformOrigin: '24px 66px' }}
        transition={{ duration: 1.1, repeat: Infinity }}
      />
      <path d={arms === 'up' ? 'M76 66 Q90 56 86 44' : 'M76 70 Q86 80 80 90'} stroke={color} strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* corps */}
      <path d="M50 20 C78 20 84 48 82 72 C80 98 68 108 50 108 C32 108 20 98 18 72 C16 48 22 20 50 20Z" fill={color} />
      <path d="M26 74 C26 96 36 104 50 104 C64 104 74 96 74 74 C66 86 34 86 26 74Z" fill="#fff" opacity=".18" />
      {/* petite touffe */}
      <path d="M44 22 Q42 10 50 8 Q50 16 56 14 Q58 22 52 22Z" fill={accent} />
      {/* yeux */}
      <g className="origin-center" style={{ transformOrigin: '50px 56px', animation: 'blink 5s infinite' }}>
        <circle cx="39" cy="56" r="4.2" fill="#231C39" />
        <circle cx="61" cy="56" r="4.2" fill="#231C39" />
        <circle cx="40.4" cy="54.6" r="1.4" fill="#fff" />
        <circle cx="62.4" cy="54.6" r="1.4" fill="#fff" />
      </g>
      <ellipse cx="31" cy="64" rx="5.5" ry="3.4" fill="#F3C1CC" opacity={mood === 'shy' ? 1 : 0.65} />
      <ellipse cx="69" cy="64" rx="5.5" ry="3.4" fill="#F3C1CC" opacity={mood === 'shy' ? 1 : 0.65} />
      <path d={mouth} stroke="#231C39" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill={mood === 'wow' ? '#231C39' : 'none'} />
      <style>{`@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}`}</style>
    </motion.svg>
  )
}

/** Portrait illustré (fictif) — uniquement affiché quand la révélation est validée. */
export function Portrait({ spec, size = 160, radius = 40 }: { spec: PortraitSpec; size?: number; radius?: number }) {
  const { skin, hair, hairStyle, accent, glasses } = spec
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} style={{ borderRadius: radius, display: 'block' }} role="img" aria-label="Portrait illustré">
      <defs><linearGradient id={`pg-${accent.slice(1)}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={accent} /><stop offset="1" stopColor="#FFF7EF" /></linearGradient></defs>
      <rect width="120" height="120" fill={`url(#pg-${accent.slice(1)})`} />
      <circle cx="96" cy="24" r="10" fill="#fff" opacity=".35" />
      {/* hair back */}
      {hairStyle === 1 && <path d="M30 60 C26 24 94 24 90 60 L90 92 L30 92Z" fill={hair} />}
      {hairStyle === 2 && <path d="M28 70 C22 20 98 20 92 70 C92 90 86 96 80 96 L40 96 C34 96 28 90 28 70Z" fill={hair} />}
      {/* shoulders */}
      <path d="M12 124 C14 96 36 86 60 86 C84 86 106 96 108 124Z" fill={accent} opacity=".9" />
      <path d="M12 124 C14 96 36 86 60 86 C84 86 106 96 108 124Z" fill="#231C39" opacity=".18" />
      <rect x="52" y="76" width="16" height="16" rx="6" fill={skin} />
      <ellipse cx="60" cy="56" rx="22" ry="26" fill={skin} />
      {/* hair front */}
      {hairStyle === 0 && <path d="M38 52 C36 28 84 26 82 52 C74 42 56 40 38 52Z" fill={hair} />}
      {hairStyle === 1 && <path d="M36 54 C34 26 86 26 84 54 C78 40 50 38 36 54Z" fill={hair} />}
      {hairStyle === 2 && <path d="M36 50 C38 28 84 28 84 50 C72 38 52 38 36 50Z" fill={hair} />}
      {hairStyle === 3 && (<g fill={hair}><circle cx="40" cy="38" r="11" /><circle cx="60" cy="31" r="12" /><circle cx="80" cy="38" r="11" /><path d="M38 48 C46 38 74 38 82 48 C80 40 40 40 38 48Z" /></g>)}
      <circle cx="51" cy="58" r="2.6" fill="#231C39" /><circle cx="69" cy="58" r="2.6" fill="#231C39" />
      <path d="M52 70 Q60 77 68 70" stroke="#231C39" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <ellipse cx="45" cy="66" rx="4" ry="2.4" fill="#F3C1CC" opacity=".7" /><ellipse cx="75" cy="66" rx="4" ry="2.4" fill="#F3C1CC" opacity=".7" />
      {glasses && (<g stroke="#231C39" strokeWidth="2" fill="none"><circle cx="51" cy="58" r="7.5" /><circle cx="69" cy="58" r="7.5" /><path d="M58.5 58 H61.5" /></g>)}
    </svg>
  )
}

/** Silhouette mystérieuse : aucune donnée de photo, uniquement une forme. */
export function Silhouette({ size = 160, glow = '#A88BC7', pulse = true }: { size?: number; glow?: string; pulse?: boolean }) {
  return (
    <div style={{ width: size, height: size, position: 'relative' }} aria-label="Silhouette mystérieuse" role="img">
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: `radial-gradient(circle, ${glow}88 0%, transparent 65%)` }}
        animate={pulse ? { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] } : undefined}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <svg viewBox="0 0 120 120" width={size} height={size} className="relative">
        <ellipse cx="60" cy="48" rx="22" ry="26" fill="#352C52" />
        <path d="M14 124 C16 92 36 84 60 84 C84 84 104 92 106 124Z" fill="#352C52" />
        <ellipse cx="60" cy="48" rx="22" ry="26" fill="none" stroke={glow} strokeOpacity=".5" strokeWidth="1.5" />
      </svg>
    </div>
  )
}

/** Petit cœur-chemin utilisé comme logo. */
export function Logo({ size = 40, color = '#231C39' }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="22" cy="34" r="12" fill="#A88BC7" />
      <circle cx="42" cy="34" r="12" fill="#F6B7A0" />
      <path d="M22 34 a12 12 0 0 0 20 0 a12 12 0 0 0 -20 0Z" fill="#F3C1CC" />
      <path d="M8 52 Q32 44 56 52" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="1 7" />
    </svg>
  )
}

export function Sparkle({ size = 14, color = '#F6B7A0', className = '' }: { size?: number; color?: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill={color} />
    </svg>
  )
}

/** Scène de l'introduction : deux personnages qui se rapprochent et construisent un chemin. */
export function IntroScene({ step }: { step: 0 | 1 | 2 }) {
  const ax = [-70, -42, -14][step]
  const bx = [200, 120, 14][step]
  return (
    <div className="relative mx-auto w-full max-w-[360px]" style={{ aspectRatio: '360 / 300' }}>
      <svg viewBox="0 0 360 300" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F3C1CC" stopOpacity=".55" /><stop offset="1" stopColor="#FFF7EF" stopOpacity="0" /></linearGradient>
        </defs>
        <circle cx="180" cy="120" r="130" fill="url(#sky)" />
        <motion.path d="M10 250 Q180 218 350 250" stroke="#231C39" strokeOpacity=".5" strokeWidth="4" strokeLinecap="round" fill="none" strokeDasharray="2 12"
          initial={false} animate={{ pathLength: [0.2, 0.55, 1][step] }} transition={{ duration: 1, ease: 'easeInOut' }} />
        <motion.path d="M10 250 Q180 218 350 250" stroke="#A88BC7" strokeWidth="10" strokeLinecap="round" fill="none" opacity=".35"
          initial={false} animate={{ pathLength: [0, 0.4, 1][step] }} transition={{ duration: 1.1, ease: 'easeInOut' }} />
        {/* profils flottants : le catalogue qu'on laisse partir */}
        {step === 0 && [0, 1, 2, 3, 4, 5].map((i) => (
          <motion.rect key={i} x={30 + i * 52} y={30 + (i % 3) * 18} width="34" height="46" rx="8" fill="#231C39" opacity=".07"
            animate={{ y: [30 + (i % 3) * 18, 18 + (i % 3) * 18, 30 + (i % 3) * 18], opacity: [0.07, 0.14, 0.07] }}
            transition={{ duration: 3 + i * 0.4, repeat: Infinity }} />
        ))}
      </svg>
      <motion.div className="absolute bottom-[8%]" initial={false} animate={{ left: `calc(50% + ${ax}px - 48px)` }} transition={{ type: 'spring', stiffness: 60, damping: 14 }}>
        <Buddy color="#A88BC7" accent="#F6B7A0" mood={step === 0 ? 'think' : 'happy'} size={86} arms={step === 2 ? 'up' : 'down'} />
      </motion.div>
      <motion.div className="absolute bottom-[8%]" initial={false} animate={{ left: `calc(50% + ${bx}px - 48px)`, opacity: step === 0 ? 0.25 : 1 }} transition={{ type: 'spring', stiffness: 60, damping: 14 }}>
        <Buddy color="#F6B7A0" accent="#A88BC7" mood={step === 2 ? 'shy' : 'calm'} size={86} flip arms={step === 2 ? 'up' : 'down'} />
      </motion.div>
      {step === 2 && (
        <motion.div className="absolute left-1/2 top-[18%] -translate-x-1/2" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5, type: 'spring' }}>
          <Logo size={56} />
        </motion.div>
      )}
    </div>
  )
}
