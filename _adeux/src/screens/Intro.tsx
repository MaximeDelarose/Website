import { motion } from 'motion/react'
import { Button } from '../ui/kit'
import { Logo, PathsArt, Wordmark } from '../ui/Art'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { unlockAudio } from '../lib/audio'
import { DEMO_ANSWERS, DEMO_PROFILE } from '../lib/demoSeed'

/** Premier écran : doit pouvoir servir d'affiche. Une seule action principale. */
export function Intro() {
  const finish = useStore((s) => s.finishIntro)
  const set = useStore((s) => s.set)
  const open = useUI((s) => s.open)
  const start = () => { unlockAudio(); finish(); open({ name: 'onboarding' }) }
  const demo = () => { unlockAudio(); set({ introSeen: true, profile: DEMO_PROFILE, answers: DEMO_ANSWERS, basicsDone: true, onboarded: true, qIndex: 99 }) }
  const rise = (d: number) => ({ initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.7, ease: [0.22, 0.8, 0.24, 1] as [number, number, number, number] } })

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-cream" data-testid="intro">
      <motion.header {...rise(0.05)} className="pt-safe px-safe relative z-10 flex items-center justify-center gap-3 pb-2 pt-6">
        <Logo size={30} /><Wordmark size={14} />
      </motion.header>

      <div className="px-safe relative z-10 mt-[5vh]">
        <motion.p {...rise(0.15)} className="kicker">Rencontrer avec intention</motion.p>
        <motion.h1 {...rise(0.25)} className="font-display mt-4 text-[clamp(42px,12.5vw,58px)] leading-[0.98] text-balance" data-testid="intro-title">
          Et si on prenait <em className="italic">vraiment</em> le temps&nbsp;?
        </motion.h1>
        <motion.p {...rise(0.4)} className="mt-5 max-w-[300px] text-[17px] leading-[1.5] text-plum/70">Une rencontre à la fois.<br />Une histoire à construire.</motion.p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden py-3" aria-hidden>
        <PathsArt className="mx-auto h-full w-auto max-w-full" />
      </div>

      <div className="px-safe pb-safe relative z-10 flex flex-col items-stretch gap-1 pt-2">
        <motion.div {...rise(0.7)}><Button variant="primary" onClick={start} testId="intro-start" full>Commencer une rencontre</Button></motion.div>
        <motion.div {...rise(0.8)} className="flex justify-center"><Button variant="ghost" onClick={demo} testId="intro-demo">Parcourir la démonstration</Button></motion.div>
        <motion.p {...rise(0.9)} className="pt-1 text-center text-[11.5px] leading-snug tracking-wide text-plum/50">Moins de swipe. Plus de sens. · Version de démonstration, personnages fictifs · 18 ans et plus</motion.p>
      </div>
    </div>
  )
}
