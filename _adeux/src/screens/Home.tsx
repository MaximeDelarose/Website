import { motion } from 'motion/react'
import { useState } from 'react'
import { Burst, Button, EmptyState, Screen } from '../ui/kit'
import { Logo, PathsArt, Portrait, Silhouette, Wordmark } from '../ui/Art'
import { useStore, answeredCount, todaysMoment } from '../lib/store'
import { useUI } from '../lib/ui'
import { QUESTIONS } from '../lib/content'
import { STAGES, isLive } from '../lib/journey'
import { KIND_END, partnerAge, useEnc } from '../ui/shared'
import { sfx } from '../lib/audio'

const ease = [0.22, 0.8, 0.24, 1] as [number, number, number, number]
const rise = (d = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.6, ease } })

export function Home() {
  const { profile, basicsDone, onboarded, answers, mode } = useStore()
  const { enc, partner, photos, out } = useEnc()
  const open = useUI((s) => s.open)
  const setTab = useUI((s) => s.setTab)

  let hero: React.ReactNode
  if (!profile || !basicsDone) {
    hero = <Hero art={<PathsArt className="w-[78%] max-w-[300px]" />} kicker="Bienvenue" title="Ton histoire commence ici." text="Quelques questions pour faire connaissance, sans formulaire." cta="Commencer mon profil" onCta={() => open({ name: 'onboarding' })} testId="home-new" />
  } else if (!onboarded) {
    const n = answeredCount(answers)
    hero = <Hero art={<PathsArt className="w-[70%] max-w-[260px]" progress={0.5 + n / QUESTIONS.length / 2} />} kicker="Profil en cours" title={`Encore ${QUESTIONS.length - n} questions.`} text="Tout est enregistré. Reprends là où tu t’étais arrêté·e." cta="Continuer mon profil" onCta={() => open({ name: 'onboarding' })} testId="home-incomplete" />
  } else if (!enc || ['declined', 'closed', 'blocked'].includes(enc.status)) {
    hero = <Searching ended={enc?.status} kind={out === 'kind-end'} />
  } else if (enc.status === 'proposed' && partner) {
    hero = <Hero dark art={<Silhouette size={120} />} kicker="Une rencontre vous attend" title={`${partner.pseudo}.`} text="Une seule personne, à votre rythme. Découvre ce que vous avez en commun." cta="Découvrir" onCta={() => open({ name: 'proposal' })} testId="home-proposed" />
  } else if (enc.status === 'revealed' && partner) {
    hero = <Hero art={photos ? <Portrait spec={partner.portrait} size={104} radius={52} /> : <Silhouette size={110} dark={false} />} kicker="Connexion confirmée" title={`Toi & ${partner.pseudo}.`} text="Votre espace commun est ouvert." cta="Entrer dans Notre monde" onCta={() => open({ name: 'world' })} testId="home-confirmed" />
  } else if (enc.stage >= 3 && partner && enc.consent.me === null) {
    hero = <Hero dark art={<Silhouette size={120} />} kicker="La révélation" title="Tu as envie d’en découvrir un peu plus ?" text="Ta réponse reste privée. Rien ne s’affiche sans l’accord des deux." cta="Répondre" onCta={() => open({ name: 'consent' })} testId="home-reveal" />
  } else if (enc.stage >= 3 && partner) {
    hero = <Hero art={<Silhouette size={110} dark={false} />} kicker="Réponse enregistrée" title="Merci, c’est noté." text="Tu seras prévenu·e dès que l’autre aura répondu." cta="Voir ma rencontre" onCta={() => setTab('encounter')} testId="home-waiting" />
  } else if (partner) {
    const next = enc.stage === 0 ? 'Réponds à sa question pour commencer.' : enc.stage === 1 ? 'Choisissez une activité à deux.' : 'Faites connaissance par la voix.'
    hero = <Hero art={<Silhouette size={110} dark={false} />} kicker={`${STAGES[enc.stage].name}`} title={`Toi & ${partner.pseudo}.`} text={next} cta="Poursuivre" onCta={() => setTab('encounter')} testId="home-active" stage={enc.stage} />
  }

  const moment = isLive(enc) && enc.status !== 'paused' ? todaysMoment(useStore.getState().today()) : null
  const mDone = useStore((s) => s.moments[s.today()])

  return (
    <Screen scroll>
      <div className="mx-auto max-w-[520px] pb-8">
        <div className="flex items-center justify-between pt-3"><div className="flex items-center gap-2.5"><Logo size={26} /><Wordmark size={11} /></div>{mode === 'demo' && <span className="text-[11px] tracking-wide text-plum/45" data-testid="demo-banner">Démonstration · personnages fictifs</span>}</div>
        {profile && <motion.p {...rise(0.05)} className="mt-6 text-[14px] text-plum/55">Bonjour {profile.pseudo}</motion.p>}
        {hero}
        {moment && (
          <motion.button {...rise(0.4)} whileTap={{ x: 3 }} data-testid="home-moment" onClick={() => open({ name: 'moment' })} className="mt-10 flex min-h-[72px] w-full items-center justify-between border-t border-plum/12 py-4 text-left">
            <span><span className="kicker block">Notre moment · facultatif</span><span className="font-display mt-1 block text-[24px] leading-tight">{moment.title}</span><span className="text-[13px] text-plum/50">{mDone?.mine ? 'Partagé' : mDone?.skipped ? 'Passé, sans souci' : 'Une minute, quand tu veux'}</span></span>
            <span aria-hidden className="text-plum/35">→</span>
          </motion.button>
        )}
      </div>
    </Screen>
  )
}

export function DemoBanner() {
  return <p data-testid="demo-banner-inline" className="text-[11px] tracking-wide text-plum/45">Démonstration · personnages fictifs</p>
}

function Hero({ art, kicker, title, text, cta, onCta, testId, dark, stage }: { art: React.ReactNode; kicker: string; title: string; text: string; cta: string; onCta: () => void; testId: string; dark?: boolean; stage?: number }) {
  return (
    <motion.section data-testid={testId} {...rise(0.1)} className={dark ? '-mx-1 mt-4 rounded-[28px] bg-plum px-7 pb-8 pt-10 text-center text-cream' : 'mt-3 pt-2 text-center'}>
      <div className="flex min-h-[150px] items-end justify-center">{art}</div>
      <p className="kicker mt-8" style={dark ? { color: 'rgba(253,247,239,.55)' } : undefined}>{kicker}</p>
      <h2 className="font-display mx-auto mt-3 max-w-[330px] text-[clamp(38px,11vw,50px)] leading-[1.0] text-balance">{title}</h2>
      <p className="mx-auto mt-4 max-w-[290px] text-[15.5px] leading-relaxed" style={{ opacity: 0.68 }}>{text}</p>
      {stage !== undefined && <div className="mx-auto mt-6 flex max-w-[160px] items-center gap-1.5" aria-label={`Étape ${stage + 1} sur 4`}>{[0, 1, 2, 3].map((i) => <span key={i} className={`h-[2px] flex-1 rounded-full ${i <= stage ? 'bg-plum' : 'bg-plum/15'}`} />)}</div>}
      <div className="mt-8"><Button variant={dark ? 'peach' : 'primary'} onClick={onCta} testId={`${testId}-cta`} full>{cta}</Button></div>
    </motion.section>
  )
}

function Searching({ ended, kind }: { ended?: string; kind: boolean }) {
  const propose = useStore((s) => s.proposeEncounter)
  const canPropose = useStore((s) => s.canProposeToday)
  const mode = useStore((s) => s.mode)
  const ack = () => useStore.getState().set({ encounter: null })
  const advance = () => useStore.getState().set({ dayOffset: useStore.getState().dayOffset + 1 })
  const open = useUI((s) => s.open)
  const [res, setRes] = useState<'idle' | 'none' | 'limit'>('idle')
  const [looking, setLooking] = useState(false)
  const [ring, setRing] = useState(0)

  const find = () => {
    setLooking(true); sfx.tap()
    setTimeout(() => {
      const r = propose()
      setLooking(false)
      if (r === 'ok') { setRing(Date.now()); sfx.chime(); open({ name: 'proposal' }) } else setRes(r === 'limit' ? 'limit' : 'none')
    }, 1500)
  }

  if (ended) {
    return (
      <motion.section {...rise()} className="mt-6 text-center" data-testid="home-ended">
        <h2 className="font-display mx-auto max-w-[330px] text-[36px] leading-[1.05] text-balance">{kind ? KIND_END : ended === 'blocked' ? 'Cette rencontre est terminée.' : ended === 'declined' ? 'Ce n’était pas le bon moment.' : 'Tu as quitté cette rencontre.'}</h2>
        <p className="mx-auto mt-4 max-w-[280px] text-[15px] text-plum/60">{ended === 'blocked' ? 'Cette personne ne pourra plus te contacter. Prends soin de toi.' : 'Tu peux retourner à ton espace quand tu le souhaites.'}</p>
        <div className="mt-8"><Button onClick={ack} testId="ack-end" full>Retourner à mon espace</Button></div>
      </motion.section>
    )
  }
  return (
    <section data-testid="home-searching" className="relative mt-3 pt-2 text-center">
      <Burst trigger={ring} />
      {looking ? (
        <div className="py-10" role="status" aria-live="polite">
          <div className="flex justify-center"><div className="relative h-[120px] w-[120px]">{[0, 1, 2].map((i) => <motion.span key={i} className="absolute inset-0 rounded-full border border-plum/40" animate={{ scale: [0.4, 1.3], opacity: [0.7, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }} />)}<span className="absolute inset-0 grid place-items-center"><Logo size={34} /></span></div></div>
          <p className="font-display mt-8 text-[30px]">On cherche quelqu’un pour toi…</p>
        </div>
      ) : res === 'none' ? (
        <EmptyState art={<PathsArt className="w-[56%] max-w-[200px] opacity-80" />} title="Personne pour l’instant." text="Aujourd’hui, personne ne correspond vraiment à ce que tu cherches. Mieux vaut attendre une bonne rencontre que plusieurs moyennes." action={<Button variant="soft" onClick={() => setRes('idle')}>D’accord</Button>} />
      ) : res === 'limit' || !canPropose() ? (
        <>
          <div className="flex justify-center"><PathsArt className="w-[60%] max-w-[220px] opacity-85" /></div>
          <h2 className="font-display mx-auto mt-8 max-w-[320px] text-[40px] leading-[1.02] text-balance" data-testid="limit-title">Ta prochaine rencontre arrive demain.</h2>
          <p className="mx-auto mt-4 max-w-[290px] text-[15.5px] text-plum/65">Une seule proposition par jour : la qualité, pas la quantité.</p>
          {mode === 'demo' && <div className="mt-8"><Button variant="soft" onClick={() => { advance(); setRes('idle') }} testId="advance-day" full>Démo : passer au lendemain</Button></div>}
        </>
      ) : (
        <>
          <div className="flex justify-center"><PathsArt className="w-[44%] max-w-[168px]" /></div>
          <p className="kicker mt-6">Rencontrer avec intention</p>
          <h2 className="font-display mx-auto mt-3 max-w-[330px] text-[clamp(38px,11vw,50px)] leading-[1.0] text-balance">Ta rencontre du jour.</h2>
          <p className="mx-auto mt-3 max-w-[290px] text-[15px] leading-relaxed text-plum/65">Une seule personne. Pas de photo, pas de swipe.</p>
          <div className="mt-6"><Button onClick={find} testId="find-match" full>Voir ma proposition</Button></div>
        </>
      )}
    </section>
  )
}

/** Proposition de rencontre : la carte mystère. */
export function Proposal() {
  const { partner, sum } = useEnc()
  const respond = useStore((s) => s.respondProposal)
  const close = useUI((s) => s.close)
  const setTab = useUI((s) => s.setTab)
  const [confirmDecline, setConfirmDecline] = useState(false)
  if (!partner || !sum) return <Screen title="Rencontre" onBack={close}><EmptyState art={<Logo size={50} />} title="Rien à afficher." text="Cette proposition n’est plus disponible." action={<Button onClick={close}>Retour</Button>} /></Screen>
  const t = (i: number) => ({ initial: { opacity: 0, y: 14, filter: 'blur(6px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { delay: 0.4 + i * 0.42, duration: 0.8, ease } })
  return (
    <Screen title="Une rencontre" onBack={close} dark testId="proposal"
      footer={confirmDecline ? (
        <div className="flex flex-col gap-1"><p className="pb-2 text-center text-[14px] text-cream/70">Passer ? Cette personne ne te sera pas reproposée.</p><Button variant="peach" onClick={() => { respond(false); close() }} testId="decline-confirm" full>Oui, passer</Button><div className="flex justify-center"><Button variant="ghost" className="!text-cream/70" onClick={() => setConfirmDecline(false)}>Finalement, non</Button></div></div>
      ) : (
        <div className="flex flex-col gap-1"><motion.div {...t(5)}><Button variant="peach" onClick={() => { respond(true); sfx.chime(); close(); setTab('encounter') }} testId="accept-match" full>Commencer cette rencontre</Button></motion.div><div className="flex justify-center"><Button variant="ghost" className="!text-cream/60" onClick={() => setConfirmDecline(true)} testId="decline-match">Pas pour moi</Button></div></div>
      )}>
      <div className="relative mx-auto max-w-[480px] pb-6">
        <div className="pointer-events-none absolute -top-10 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,196,171,.22), transparent 65%)' }} />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease }} className="relative mt-4 flex justify-center"><Silhouette size={104} /></motion.div>
        <motion.h2 {...t(0)} className="font-display relative mt-6 text-center text-[64px] leading-none" data-testid="partner-name">{partner.pseudo}</motion.h2>
        <motion.p {...t(0)} className="relative mt-3 text-center text-[13px] tracking-[.18em] text-cream/55">{partnerAge(partner).toUpperCase()}</motion.p>
        <motion.p {...t(1)} className="relative mt-5 text-center text-[14px] text-cream/65">{partner.interests.join(' · ')}</motion.p>

        <div className="relative mt-12" data-testid="common-points">
          <motion.p {...t(2)} className="kicker" style={{ color: 'rgba(253,247,239,.5)' }}>Ce qui vous rapproche</motion.p>
          <ul>
            {(sum.shared.length ? sum.shared : [{ qid: 'x', text: 'Vous allez le découvrir ensemble.' }]).map((s, i) => (
              <motion.li key={s.qid} {...t(3 + i * 0.6)} className="font-display border-t border-cream/15 py-5 text-[27px] leading-[1.12] italic">{s.text}</motion.li>
            ))}
          </ul>
          {sum.different[0] && <motion.p {...t(5.2)} className="border-t border-cream/15 pt-4 text-[13.5px] leading-snug text-cream/55">{sum.different[0].text}</motion.p>}
        </div>

        <motion.div {...t(5.6)} className="relative mt-10 text-center">
          <p className="kicker" style={{ color: 'rgba(255,196,171,.8)' }}>Sa question pour toi</p>
          <p className="font-display mx-auto mt-3 max-w-[330px] text-[26px] leading-[1.15]">« {partner.intriguing} »</p>
          <p className="mt-6 text-[11.5px] text-cream/40">Aucun score. Aucune photo. {partner.pseudo} est un personnage fictif (démo).</p>
        </motion.div>
      </div>
    </Screen>
  )
}
