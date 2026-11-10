import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Button } from '../ui/kit'
import { IntroScene, Logo } from '../ui/Art'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { sfx, unlockAudio } from '../lib/audio'
import { DEMO_PROFILE, DEMO_ANSWERS } from '../lib/demoSeed'

const SLIDES = [
  { t: 'Et si on arrêtait de chercher la personne parfaite ?', s: 'Pas de catalogue. Pas de swipe. Juste une personne à la fois.' },
  { t: 'Et si on prenait le temps de découvrir quelqu’un ?', s: 'Des jeux, des questions, des voix. Et seulement ensuite, des visages.' },
  { t: 'Une histoire commence à deux.', s: 'On ne trouve pas l’amour. On le construit.' },
] as const

export function Intro() {
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const finish = useStore((s) => s.finishIntro)
  const set = useStore((s) => s.set)
  const open = useUI((s) => s.open)
  const last = i === SLIDES.length - 1
  const go = (n: number) => { setDir(n > i ? 1 : -1); setI(n); sfx.next() }

  const start = () => { unlockAudio(); finish(); open({ name: 'onboarding' }) }
  const demo = () => {
    unlockAudio()
    set({ introSeen: true, profile: DEMO_PROFILE, answers: DEMO_ANSWERS, basicsDone: true, onboarded: true, qIndex: 99 })
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-cream" data-testid="intro">
      <div className="pt-safe px-safe flex items-center justify-between">
        <div className="flex items-center gap-2"><Logo size={34} /><span className="font-display text-[20px] font-semibold tracking-wide">À DEUX</span></div>
        {!last && <button className="min-h-[44px] px-2 text-[15px] font-semibold text-plum/70" onClick={() => go(SLIDES.length - 1)} data-testid="intro-skip">Passer</button>}
      </div>

      <div className="px-safe flex min-h-0 flex-1 flex-col justify-center gap-5">
        <IntroScene step={i as 0 | 1 | 2} />
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={i} custom={dir} initial={{ opacity: 0, x: 40 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 * dir }} transition={{ duration: 0.32 }}
            className="text-center" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25}
            onDragEnd={(_, info) => { if (info.offset.x < -60 && i < SLIDES.length - 1) go(i + 1); if (info.offset.x > 60 && i > 0) go(i - 1) }}>
            <h1 className="font-display text-[31px] font-semibold leading-[1.1] text-balance" data-testid="intro-title">{SLIDES[i].t}</h1>
            <p className="mx-auto mt-3 max-w-[310px] text-[16px] leading-relaxed text-plum/75">{SLIDES[i].s}</p>
          </motion.div>
        </AnimatePresence>
        <div className="flex justify-center gap-2" aria-hidden>
          {SLIDES.map((_, k) => <motion.span key={k} className="h-2.5 rounded-full bg-plum" animate={{ width: k === i ? 28 : 10, opacity: k === i ? 1 : 0.2 }} />)}
        </div>
      </div>

      <div className="px-safe pb-safe flex flex-col items-stretch gap-2 pt-3">
        {last ? (
          <>
            <Button variant="primary" onClick={start} testId="intro-start" full>Commencer mon histoire</Button>
            <Button variant="soft" onClick={demo} testId="intro-demo" full>Essayer la démo</Button>
            <p className="px-2 pt-1 text-center text-[12.5px] leading-snug text-plum/60">Réservé aux adultes de 18 ans et plus. La démo est une simulation avec des personnages fictifs.</p>
          </>
        ) : (
          <Button variant="primary" onClick={() => go(i + 1)} testId="intro-next" full>Suivant</Button>
        )}
      </div>
    </div>
  )
}
