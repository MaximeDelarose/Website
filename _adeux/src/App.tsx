import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect } from 'react'
import { useStore } from './lib/store'
import { useUI, type Overlay, type Tab } from './lib/ui'
import { Toasts, Button } from './ui/kit'
import { Intro } from './screens/Intro'
import { Onboarding } from './screens/Onboarding'
import { Home, Proposal } from './screens/Home'
import { EncounterTab } from './screens/Encounter'
import { ActivitiesTab, MessagesTab, ProfileTab, MomentScreen } from './screens/Tabs'
import { GameScreen } from './screens/Games'
import { CallScreen, ConsentScreen, RevealScreen } from './screens/Journey'
import { WorldScreen } from './screens/World'
import { applyUpdate, usePWA } from './lib/pwa'
import { setSoundEnabled, unlockAudio } from './lib/audio'
import { cn } from './lib/util'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Accueil', icon: <path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" /> },
  { id: 'encounter', label: 'Rencontre', icon: <><circle cx="9" cy="9" r="4" /><circle cx="16" cy="12" r="4" /></> },
  { id: 'activities', label: 'Activités', icon: <path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.7 6.7 19.6l1.1-6L3.4 9.4l6-.8z" /> },
  { id: 'messages', label: 'Messages', icon: <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1h-8l-5 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z" /> },
  { id: 'profile', label: 'Profil', icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></> },
]

function TabBar() {
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const enc = useStore((s) => s.encounter)
  const dot = (t: Tab) => (t === 'encounter' && enc && (enc.status === 'proposed' || (enc.stage >= 3 && enc.consent.me === null && enc.status === 'active')))
  return (
    <nav className="pb-safe px-safe relative z-30 shrink-0 border-t border-plum/10 bg-cream/95 backdrop-blur" aria-label="Navigation principale">
      <ul className="mx-auto flex max-w-[560px] items-stretch justify-between pt-1.5">
        {TABS.map((t) => {
          const on = tab === t.id
          return (
            <li key={t.id} className="flex-1">
              <button type="button" data-testid={`tab-${t.id}`} aria-current={on ? 'page' : undefined} onClick={() => { if (!on) { setTab(t.id); unlockAudio() } }}
                className="relative flex min-h-[54px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl">
                <motion.span animate={{ scale: on ? 1.12 : 1, y: on ? -1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }} className={cn('relative grid h-8 w-12 place-items-center rounded-full transition-colors', on && 'bg-peach')}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={on ? 'text-plum' : 'text-plum/55'}>{t.icon}</svg>
                  {dot(t.id) && <span className="absolute right-2 top-0.5 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-cream" aria-label="À faire" />}
                </motion.span>
                <span className={cn('text-[11px] font-semibold', on ? 'text-plum' : 'text-plum/55')}>{t.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function OverlayView({ o }: { o: Overlay }) {
  switch (o.name) {
    case 'onboarding': return <Onboarding />
    case 'proposal': return <Proposal />
    case 'game': return <GameScreen kind={o.kind} />
    case 'moment': return <MomentScreen />
    case 'call': return <CallScreen />
    case 'consent': return <ConsentScreen />
    case 'reveal': return <RevealScreen />
    case 'world': return <WorldScreen />
    default: return null
  }
}

function UpdateBanner() {
  const { updateReady, applying } = usePWA()
  const busy = useUI((s) => s.busy)
  // Jamais pendant un jeu, un appel, un enregistrement ou la révélation.
  const show = updateReady && busy === 0
  return (
    <AnimatePresence>
      {show && (
        <motion.div role="status" data-testid="update-banner" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
          className="absolute inset-x-0 top-0 z-[80] px-3" style={{ paddingTop: 'max(var(--sat), 10px)' }}>
          <div className="mx-auto flex max-w-[520px] items-center gap-3 rounded-3xl bg-plum px-4 py-3 text-cream shadow-soft">
            <span aria-hidden className="text-xl">✨</span>
            <p className="min-w-0 flex-1 text-[14px] font-semibold leading-tight">Une nouvelle version est disponible</p>
            <Button variant="peach" className="!min-h-[44px] !px-4 !text-[14px]" testId="update-apply" disabled={applying} onClick={() => void applyUpdate(useUI.getState().busy)}>{applying ? 'Mise à jour…' : 'Mettre à jour'}</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const introSeen = useStore((s) => s.introSeen)
  const sound = useStore((s) => s.privacy.sound)
  const tab = useUI((s) => s.tab)
  const overlays = useUI((s) => s.overlays)

  useEffect(() => { setSoundEnabled(sound) }, [sound])
  useEffect(() => { document.getElementById('boot')?.remove() }, [])

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-root bg-cream" data-testid="app">
        {!introSeen ? <Intro /> : (
          <div className="absolute inset-0 flex flex-col">
            <main className="relative min-h-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={tab} className="absolute inset-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  {tab === 'home' && <Home />}
                  {tab === 'encounter' && <EncounterTab />}
                  {tab === 'activities' && <ActivitiesTab />}
                  {tab === 'messages' && <MessagesTab />}
                  {tab === 'profile' && <ProfileTab />}
                </motion.div>
              </AnimatePresence>
            </main>
            <TabBar />
          </div>
        )}
        <AnimatePresence>
          {overlays.map((o, i) => (
            <motion.div key={`${i}-${o.name}`} className="absolute inset-0 z-50" initial={{ y: '8%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '6%', opacity: 0 }} transition={{ duration: 0.26, ease: 'easeOut' }}>
              <OverlayView o={o} />
            </motion.div>
          ))}
        </AnimatePresence>
        <UpdateBanner />
        <Toasts />
      </div>
    </MotionConfig>
  )
}
