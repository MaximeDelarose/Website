import { motion } from 'motion/react'
import { useState } from 'react'
import { Burst, Button, EmptyState, Screen } from '../ui/kit'
import { Buddy, Portrait, Silhouette, Sparkle } from '../ui/Art'
import { useStore, answeredCount, todaysMoment } from '../lib/store'
import { useUI } from '../lib/ui'
import { QUESTIONS } from '../lib/content'
import { STAGES, isLive } from '../lib/journey'
import { KIND_END, partnerAge, useEnc } from '../ui/shared'
import { sfx } from '../lib/audio'

export function Home() {
  const { profile, basicsDone, onboarded, answers, mode, qIndex } = useStore()
  const { enc, partner, photos, out } = useEnc()
  const open = useUI((s) => s.open)
  const setTab = useUI((s) => s.setTab)

  let hero: React.ReactNode
  if (!profile || !basicsDone) {
    hero = <Hero art={<Buddy size={120} mood="happy" arms="wave" />} kicker="Bienvenue" title="Ton histoire commence ici" text="Quelques cartes pour faire connaissance. Pas de formulaire, juste de la curiosité." cta="Commencer mon profil" onCta={() => open({ name: 'onboarding' })} testId="home-new" />
  } else if (!onboarded) {
    const n = answeredCount(answers)
    hero = <Hero art={<Buddy size={110} mood="shy" />} kicker="Profil en cours" title={`Encore ${QUESTIONS.length - n} cartes à découvrir`} text="Tout est enregistré automatiquement. Reprends là où tu t’étais arrêté·e." cta="Continuer mon profil" onCta={() => open({ name: 'onboarding' })} testId="home-incomplete" progress={n / QUESTIONS.length} />
  } else if (!enc || ['declined', 'closed', 'blocked'].includes(enc.status)) {
    hero = <Searching ended={enc?.status} kind={out === 'kind-end'} />
  } else if (enc.status === 'proposed' && partner) {
    hero = <Hero art={<Silhouette size={130} />} kicker="Une rencontre te attend" title={`${partner.pseudo} aimerait te découvrir`} text="Une personne, à votre rythme. Jette un œil à ce que vous avez en commun." cta="Découvrir la proposition" onCta={() => open({ name: 'proposal' })} testId="home-proposed" />
  } else if (enc.status === 'revealed' && partner) {
    hero = <Hero art={photos ? <Portrait spec={partner.portrait} size={120} radius={36} /> : <Silhouette />} kicker="Connexion confirmée" title={`Toi & ${partner.pseudo}`} text="Votre espace commun est ouvert. Prenez soin de votre petit monde." cta="Entrer dans Notre monde" onCta={() => open({ name: 'world' })} testId="home-confirmed" tone="mint" />
  } else if (enc.stage >= 3 && partner && enc.consent.me === null) {
    hero = <Hero art={<Silhouette glow="#F6B7A0" />} kicker="La révélation est possible" title="Tu as envie d’en découvrir un peu plus ?" text="Si vous le souhaitez tous les deux, vos photos s’afficheront ensemble. Sinon, rien ne sera dévoilé." cta="Répondre en privé" onCta={() => open({ name: 'consent' })} testId="home-reveal" tone="peach" />
  } else if (enc.stage >= 3 && partner) {
    hero = <Hero art={<Silhouette />} kicker="Ta réponse est enregistrée" title="Merci, c’est noté" text="Tu seras prévenu·e dès que la réponse de l’autre sera arrivée." cta="Voir ma rencontre" onCta={() => setTab('encounter')} testId="home-waiting" />
  } else if (partner) {
    const next = enc.stage === 0 ? 'Réponds à la question de départ' : enc.stage === 1 ? 'Choisissez un jeu à deux' : 'Partagez vos voix'
    hero = <Hero art={<Silhouette />} kicker={`Étape ${enc.stage + 1} · ${STAGES[enc.stage].name}`} title={`Toi & ${partner.pseudo}`} text={`${next}. Rien ne presse : vous avancez à votre rythme.`} cta="Poursuivre" onCta={() => setTab('encounter')} testId="home-active" stage={enc.stage} />
  }

  const moment = isLive(enc) && enc.status !== 'paused' ? todaysMoment(useStore.getState().today()) : null
  const mDone = useStore((s) => s.moments[s.today()])

  return (
    <Screen title="Accueil" scroll>
      <div className="mx-auto max-w-[520px] pb-6 pt-1">
        {mode === 'demo' && <DemoBanner />}
        <p className="mb-1 mt-3 text-[15px] text-plum/70">{profile ? `Bonjour ${profile.pseudo} 👋` : 'Bonjour 👋'}</p>
        {hero}
        {moment && (
          <motion.button initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} whileTap={{ scale: 0.98 }} data-testid="home-moment"
            onClick={() => open({ name: 'moment' })} className="card mt-4 flex min-h-[72px] w-full items-center gap-4 p-4 text-left">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose text-2xl">🌙</span>
            <span className="min-w-0 flex-1"><span className="kicker block">Notre moment du jour</span><span className="block truncate font-semibold">{moment.title}</span><span className="text-[13px] text-plum/60">{mDone?.mine ? 'Partagé ✓' : mDone?.skipped ? 'Passé, sans souci' : 'Facultatif · 1 minute'}</span></span>
            <span aria-hidden className="text-plum/40">›</span>
          </motion.button>
        )}
        <Principles />
      </div>
    </Screen>
  )
}

export function DemoBanner() {
  return <div data-testid="demo-banner" className="mt-2 flex items-center gap-2 rounded-2xl bg-lavender-100 px-3.5 py-2.5 text-[13px] font-medium text-plum"><span aria-hidden>🧪</span> Mode démo : simulation avec des personnages fictifs. Aucune vraie personne.</div>
}

function Hero({ art, kicker, title, text, cta, onCta, testId, progress, tone, stage }: { art: React.ReactNode; kicker: string; title: string; text: string; cta: string; onCta: () => void; testId: string; progress?: number; tone?: 'mint' | 'peach'; stage?: number }) {
  const bg = tone === 'mint' ? 'bg-mint' : tone === 'peach' ? 'bg-peach-200' : 'bg-lavender-100'
  return (
    <motion.section data-testid={testId} initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      className={`relative overflow-hidden rounded-[32px] ${bg} px-6 pb-6 pt-7 text-center shadow-soft`}>
      <Sparkle className="absolute left-6 top-6 opacity-70" size={16} /><Sparkle className="absolute right-8 top-14 opacity-60" size={11} color="#A88BC7" />
      <div className="flex justify-center">{art}</div>
      <p className="kicker mt-3">{kicker}</p>
      <h2 className="font-display mt-1 text-[28px] font-semibold leading-[1.1] text-balance">{title}</h2>
      <p className="mx-auto mt-2 max-w-[300px] text-[15px] leading-relaxed text-plum/75">{text}</p>
      {stage !== undefined && (<div className="mx-auto mt-4 flex max-w-[240px] items-center gap-1.5" aria-label={`Étape ${stage + 1} sur 4`}>{[0, 1, 2, 3].map((i) => <span key={i} className={`h-2 flex-1 rounded-full ${i <= stage ? 'bg-plum' : 'bg-plum/15'}`} />)}</div>)}
      {progress !== undefined && (<div className="mx-auto mt-4 h-2 max-w-[240px] overflow-hidden rounded-full bg-plum/10"><div className="h-full rounded-full bg-plum" style={{ width: `${progress * 100}%` }} /></div>)}
      <div className="mt-5"><Button onClick={onCta} testId={`${testId}-cta`} full>{cta}</Button></div>
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
  const [burst, setBurst] = useState(0)

  const find = () => {
    setLooking(true); sfx.tap()
    setTimeout(() => {
      const r = propose()
      setLooking(false)
      if (r === 'ok') { setBurst(Date.now()); sfx.chime(); open({ name: 'proposal' }) } else setRes(r === 'limit' ? 'limit' : 'none')
    }, 1400)
  }

  if (ended) {
    return (
      <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-6 text-center" data-testid="home-ended">
        <div className="flex justify-center"><Buddy size={90} mood="calm" /></div>
        <h2 className="font-display mt-3 text-[24px] font-semibold leading-tight">{kind ? KIND_END : ended === 'blocked' ? 'Cette rencontre est terminée.' : ended === 'declined' ? 'Pas de souci, ce n’était pas le bon moment.' : 'Tu as quitté cette rencontre.'}</h2>
        <p className="mt-2 text-[14.5px] text-plum/70">{ended === 'blocked' ? 'Cette personne ne pourra plus te contacter. Prends soin de toi.' : 'Tu peux retourner à ton espace quand tu le souhaites.'}</p>
        <div className="mt-4"><Button onClick={ack} testId="ack-end" full>Retourner à mon espace</Button></div>
      </motion.section>
    )
  }
  return (
    <section data-testid="home-searching" className="relative overflow-hidden rounded-[32px] bg-lavender-100 px-6 pb-6 pt-7 text-center shadow-soft">
      <Burst trigger={burst} />
      {looking ? (
        <div className="py-6" role="status" aria-live="polite">
          <div className="flex justify-center"><motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} className="grid h-24 w-24 place-items-center rounded-full border-2 border-dashed border-plum/30"><Buddy size={48} mood="think" bob={false} /></motion.div></div>
          <p className="font-display mt-4 text-[22px] font-semibold">On cherche quelqu’un pour toi…</p>
          <p className="mt-1 text-[14px] text-plum/65">Une seule personne, bien choisie.</p>
        </div>
      ) : res === 'none' ? (
        <EmptyState art={<Buddy size={96} mood="calm" />} title="Personne pour l’instant" text="Aujourd’hui, aucune personne ne correspond vraiment à ce que tu cherches. C’est normal : mieux vaut attendre une bonne rencontre que beaucoup de moyennes." action={<Button variant="soft" onClick={() => setRes('idle')}>D’accord</Button>} />
      ) : res === 'limit' || !canPropose() ? (
        <>
          <div className="flex justify-center"><Buddy size={100} mood="calm" /></div>
          <h2 className="font-display mt-3 text-[26px] font-semibold leading-tight" data-testid="limit-title">Ta prochaine rencontre arrive demain</h2>
          <p className="mx-auto mt-2 max-w-[300px] text-[15px] text-plum/75">Au plus une proposition par jour : on préfère la qualité à la quantité.</p>
          {mode === 'demo' && <div className="mt-4"><Button variant="soft" onClick={() => { advance(); setRes('idle') }} testId="advance-day" full>🧪 Démo : passer au lendemain</Button></div>}
        </>
      ) : (
        <>
          <div className="flex justify-center"><Buddy size={110} mood="happy" arms="wave" /></div>
          <p className="kicker mt-3">Prêt·e ?</p>
          <h2 className="font-display mt-1 text-[28px] font-semibold leading-[1.1]">Découvre ta rencontre du jour</h2>
          <p className="mx-auto mt-2 max-w-[300px] text-[15px] text-plum/75">Une seule personne à la fois. Pas de photos, pas de swipe : on commence par ce qui compte.</p>
          <div className="mt-5"><Button onClick={find} testId="find-match" full>Voir ma proposition</Button></div>
        </>
      )}
    </section>
  )
}

function Principles() {
  const items = [['🌱', 'Qualité plutôt que quantité', 'Une rencontre active à la fois.'], ['🎭', 'Personnalité avant physique', 'Les photos viennent en dernier.'], ['🤝', 'Toujours libre', 'Tu peux refuser, pauser ou quitter.']]
  return (
    <div className="mt-6 grid gap-2">
      {items.map(([e, t, s]) => (
        <div key={t} className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3"><span className="text-xl" aria-hidden>{e}</span><div><p className="text-[14px] font-semibold">{t}</p><p className="text-[13px] text-plum/65">{s}</p></div></div>
      ))}
    </div>
  )
}

/** Proposition de rencontre : la carte mystère. */
export function Proposal() {
  const { partner, sum } = useEnc()
  const respond = useStore((s) => s.respondProposal)
  const close = useUI((s) => s.close)
  const setTab = useUI((s) => s.setTab)
  const [confirmDecline, setConfirmDecline] = useState(false)
  if (!partner || !sum) return <Screen title="Rencontre" onBack={close}><EmptyState art={<Buddy size={90} />} title="Rien à afficher" text="Cette proposition n’est plus disponible." action={<Button onClick={close}>Retour</Button>} /></Screen>
  const reveal = (i: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.35 + i * 0.35 } })
  return (
    <Screen title="Ta rencontre" onBack={close} dark testId="proposal"
      footer={confirmDecline ? (
        <div className="flex flex-col gap-2"><p className="text-center text-[14px] text-cream/80">Passer ? Cette personne ne te sera pas reproposée.</p><Button variant="peach" onClick={() => { respond(false); close() }} testId="decline-confirm" full>Oui, passer</Button><Button variant="ghost" className="!text-cream" onClick={() => setConfirmDecline(false)}>Finalement, non</Button></div>
      ) : (
        <div className="flex flex-col gap-2"><Button variant="peach" onClick={() => { respond(true); sfx.chime(); close(); setTab('encounter') }} testId="accept-match" full>Commencer cette rencontre</Button><Button variant="ghost" className="!text-cream/80" onClick={() => setConfirmDecline(true)} testId="decline-match">Pas pour moi</Button></div>
      )}>
      <div className="mx-auto max-w-[480px] pb-6 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 120, damping: 14 }} className="mt-2 flex justify-center"><Silhouette size={150} /></motion.div>
        <motion.h2 {...reveal(0)} className="font-display mt-2 text-[34px] font-semibold" data-testid="partner-name">{partner.pseudo}</motion.h2>
        <motion.p {...reveal(0)} className="text-[15px] text-cream/75">{partnerAge(partner)} · près de chez toi</motion.p>
        <motion.div {...reveal(1)} className="mt-3 flex flex-wrap justify-center gap-2">{partner.interests.map((i) => <span key={i} className="chip bg-white/10 text-cream">{i}</span>)}</motion.div>
        <motion.div {...reveal(2)} className="mt-5 rounded-3xl bg-white/[.07] p-5 text-left" data-testid="common-points">
          <p className="kicker !text-lavender">Ce qui vous rapproche</p>
          <ul className="mt-2 space-y-2.5">{sum.shared.length ? sum.shared.map((s) => <li key={s.qid} className="flex gap-2.5 text-[15px] leading-snug"><span aria-hidden>✨</span>{s.text}</li>) : <li className="text-[15px]">Vous allez le découvrir ensemble.</li>}</ul>
          {sum.different[0] && <p className="mt-3 border-t border-white/10 pt-3 text-[14px] leading-snug text-cream/80"><span aria-hidden>🧭 </span>{sum.different[0].text}</p>}
        </motion.div>
        <motion.div {...reveal(3)} className="mt-4 rounded-3xl bg-peach/20 p-5 text-left">
          <p className="kicker !text-peach">Une question intrigante</p>
          <p className="font-display mt-1.5 text-[20px] leading-snug">« {partner.intriguing} »</p>
        </motion.div>
        <motion.p {...reveal(4)} className="mt-4 text-[12.5px] text-cream/55">Aucun score, aucune photo. 🧪 {partner.pseudo} est un personnage fictif (démo).</motion.p>
      </div>
    </Screen>
  )
}
