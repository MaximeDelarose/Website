import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { cn } from '../lib/util'
import { sfx } from '../lib/audio'
import { buzz } from '../lib/haptics'
import { useUI } from '../lib/ui'

/** Marque l'application comme « occupée » tant que le composant est monté (empêche les mises à jour brutales). */
export function useBusy(active = true) {
  useEffect(() => {
    if (!active) return
    useUI.getState().addBusy()
    return () => useUI.getState().subBusy()
  }, [active])
}

type BtnProps = {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'peach' | 'soft' | 'ghost'; className?: string
  disabled?: boolean; type?: 'button' | 'submit'; sound?: boolean; testId?: string; ariaLabel?: string; full?: boolean
}
export function Button({ children, onClick, variant = 'primary', className, disabled, type = 'button', sound = true, testId, ariaLabel, full }: BtnProps) {
  return (
    <motion.button
      type={type} disabled={disabled} aria-label={ariaLabel} data-testid={testId}
      whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn('btn', `btn-${variant}`, full && 'w-full', className)}
      onClick={() => { if (sound) sfx.tap(); buzz(6); onClick?.() }}
    >{children}</motion.button>
  )
}

export function IconButton({ children, onClick, label, className, testId }: { children: ReactNode; onClick: () => void; label: string; className?: string; testId?: string }) {
  return (
    <motion.button type="button" aria-label={label} data-testid={testId} whileTap={{ scale: 0.9 }}
      className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full text-plum', className)}
      onClick={() => { sfx.tap(); onClick() }}>{children}</motion.button>
  )
}

export const ChevronLeft = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
export const CloseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>

/** Écran plein cadre avec en-tête (retour/fermer) et zone défilante. */
export function Screen({ title, onBack, children, dark, right, footer, closeIcon, scroll = true, testId }: {
  title?: string; onBack?: () => void; children: ReactNode; dark?: boolean; right?: ReactNode; footer?: ReactNode; closeIcon?: boolean; scroll?: boolean; testId?: string
}) {
  return (
    <div data-testid={testId} className={cn('absolute inset-0 flex flex-col', dark ? 'bg-plum-900 text-cream' : 'bg-cream text-plum')}>
      {(title || onBack || right) && (
        <header className="pt-safe px-safe flex shrink-0 items-center justify-between gap-3 pb-2">
          <div className="w-11">{onBack && <IconButton label={closeIcon ? 'Fermer' : 'Retour'} onClick={onBack} testId="back" className={dark ? '!text-cream' : ''}>{closeIcon ? <CloseIcon /> : <ChevronLeft />}</IconButton>}</div>
          <h1 className="kicker min-w-0 flex-1 truncate text-center !tracking-[.28em]" style={dark ? { color: 'rgba(253,247,239,.6)' } : undefined}>{title}</h1>
          <div className="flex w-11 justify-end">{right}</div>
        </header>
      )}
      <div className={cn('px-safe min-h-0 flex-1', scroll ? 'scroll-y' : 'overflow-hidden', !(title || onBack || right) && 'pt-safe')}>{children}</div>
      {footer && <div className="px-safe pb-safe shrink-0 pt-2">{footer}</div>}
    </div>
  )
}

/** Fenêtre en bas d'écran, toujours fermable (bouton, fond, Échap). */
export function Sheet({ open, onClose, title, children, testId }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; testId?: string }) {
  const id = useId()
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-[60] flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-plum/55" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined} data-testid={testId}
            className="pb-safe relative max-h-[88%] w-full overflow-y-auto rounded-t-[28px] bg-cream px-7 pt-3"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-plum/15" />
            <div className="mb-3 flex items-start justify-between gap-3">
              {title ? <h2 id={id} className="font-display text-[30px] leading-[1.05]">{title}</h2> : <span />}
              <IconButton label="Fermer" onClick={onClose} testId="sheet-close"><CloseIcon /></IconButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Un seul anneau discret qui s'étend (pas de confettis). Désactivé si les animations sont réduites. */
export function Burst({ trigger, color = '#FFC4AB' }: { trigger: number; color?: string; count?: number; colors?: string[]; origin?: 'center' | 'bottom' }) {
  const reduce = useReducedMotion()
  const [rings, setRings] = useState<number[]>([])
  useEffect(() => {
    if (!trigger || reduce) return
    setRings((b) => [...b, trigger])
    const t = setTimeout(() => setRings((b) => b.filter((x) => x !== trigger)), 1400)
    return () => clearTimeout(t)
  }, [trigger, reduce])
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center overflow-hidden" aria-hidden>
      {rings.map((r) => <motion.span key={r} className="absolute h-24 w-24 rounded-full border" style={{ borderColor: color }} initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 5, opacity: 0 }} transition={{ duration: 1.3, ease: [0.22, 0.8, 0.24, 1] }} />)}
    </div>
  )
}

export function Progress({ value, color = '#F6B7A0', className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn('h-[2px] w-full overflow-hidden rounded-full bg-plum/12', className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <motion.div className="h-full rounded-full" style={{ background: '#3B1F4D' }} initial={false} animate={{ width: `${Math.round(value * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
    </div>
  )
}

export function Spinner({ label = 'Chargement' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="flex items-center justify-center gap-1.5 py-6">
      {[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-plum/60" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />)}
    </div>
  )
}

export function EmptyState({ art, title, text, action }: { art: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" data-testid="empty-state">
      {art}
      <h2 className="font-display text-[34px] leading-[1.05]">{title}</h2>
      <p className="max-w-[290px] text-[15px] leading-relaxed text-plum/65">{text}</p>
      {action}
    </div>
  )
}

export function ErrorState({ title = 'Oups, quelque chose s’est mal passé', text, onRetry }: { title?: string; text?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <h2 className="font-display text-[30px] leading-tight">{title}</h2>
      {text && <p className="max-w-[300px] text-[15px] text-plum/75">{text}</p>}
      {onRetry && <Button variant="soft" onClick={onRetry}>Réessayer</Button>}
    </div>
  )
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts)
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 px-4" style={{ paddingTop: 'max(var(--sat), 12px)' }} aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
            className="pointer-events-auto max-w-[420px] rounded-full bg-plum px-5 py-3 text-center text-[14px] font-medium text-cream" data-testid="toast">
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/** Sélecteur de focus automatique pour les champs d'un écran qui apparaît. */
export function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => { const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 350); return () => clearTimeout(t) }, [])
  return ref
}
