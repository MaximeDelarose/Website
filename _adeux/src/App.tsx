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
import { Ico, Icon } from './ui/Art'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Accueil', icon: Icon.home },
  { id: 'encounter', label: 'Rencontre', icon: Icon.two },
  { id: 'activities', label: 'Activités', icon: Icon.spark },
  { id: 'messages', label: 'Messages', icon: Icon.chat },
  { id: 'profile', label: 'Profil', icon: Icon.user },
]

function TabBar() {
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const enc = useStore((s) => s.encounter)
  const dot = (t: Tab) => (t === 'encounter' && enc && (enc.status === 'proposed' || (enc.stage >= 3 && enc.consent.me === null && enc.status === 'active')))
  return (
    <nav className="pb-safe relative z-30 shrink-0 bg-cream/90 backdrop-blur-md" aria-label="Navigation principale">
      <div className="mx-6 border-t border-plum/10" />
      <ul className="mx-auto flex max-w-[520px] items-stretch justify-between px-3 pt-1.5">
        {TABS.map((t) => {
          const on = tab === t.id
          return (
            <li key={t.id} className="flex-1">
              <button type="button" data-testid={`tab-${t.id}`} aria-current={on ? 'page' : undefined} onClick={() => { if (!on) { setTab(t.id); unlockAudio() } }}
                className="relative flex min-h-[54px] w-full flex-col items-center justify-center gap-1">
                <span className={cn('relative transition-colors duration-300', on ? 'text-plum' : 'text-plum/40')}>
                  <Ico d={t.icon} size={22} w={on ? 1.8 : 1.5} />
                  {dot(t.id) && <span className="absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full bg-peach-600" aria-label="À faire" />}
                </span>
                <span className={cn('text-[10.5px] tracking-wide transition-colors duration-300', on ? 'font-medium text-plum' : 'text-plum/45')}>{t.label}</span>
                <motion.span className="absolute -top-[1px] h-[2px] rounded-full bg-plum" initial={false} animate={{ width: on ? 22 : 0, opacity: on ? 1 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
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
          <div className="mx-auto flex max-w-[520px] items-center gap-3 rounded-full bg-plum py-2 pl-6 pr-2 text-cream shadow-soft">
            <p className="min-w-0 flex-1 text-[13.5px] leading-tight">Une nouvelle version est disponible</p>
            <Button variant="peach" className="!min-h-[44px] !px-5 !text-[14px]" testId="update-apply" disabled={applying} onClick={() => void applyUpdate(useUI.getState().busy)}>{applying ? 'Mise à jour…' : 'Mettre à jour'}</Button>
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
            <motion.div key={`${i}-${o.name}`} className="absolute inset-0 z-50" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.32, ease: [0.22, 0.8, 0.24, 1] }}>
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
