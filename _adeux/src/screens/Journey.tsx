import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Burst, Button, ErrorState, Screen, Sheet, useBusy } from '../ui/kit'
import { Buddy, Portrait, Silhouette } from '../ui/Art'
import { Waveform } from './Tabs'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { canInteract, canSeePhotos } from '../lib/journey'
import { KIND_END, useEnc } from '../ui/shared'
import { DemoCallEngine, LiveKitCallEngine, livekitConfigured, type CallEngine, type CallState } from '../lib/call'
import { ICEBREAKERS, COMPASS } from '../lib/content'
import { sfx } from '../lib/audio'
import { loadMyPhoto } from '../lib/photo'
import { cn, fmtTime } from '../lib/util'

// ============== APPEL VOCAL ==============
export function CallScreen() {
  const close = useUI((s) => s.close)
  const setTab = useUI((s) => s.setTab)
  const { enc, partner } = useEnc()
  const mode = useStore((s) => s.mode)
  const completeStep = useStore((s) => s.completeStep)
  const [phase, setPhase] = useState<'pre' | CallState>('pre')
  const [detail, setDetail] = useState<string>()
  const [secs, setSecs] = useState(0)
  const [muted, setMuted] = useState(false)
  const [qi, setQi] = useState(0)
  const [lvl, setLvl] = useState(0)
  const [short, setShort] = useState(false)
  const engine = useRef<CallEngine | null>(null)
  const real = mode === 'real' && livekitConfigured()
  useBusy(true) // jamais de rechargement pendant un appel

  useEffect(() => () => { engine.current?.disconnect() }, [])
  useEffect(() => {
    if (phase !== 'connected') return
    const t = setInterval(() => setSecs((s) => s + 1), 1000)
    const l = setInterval(() => setLvl(engine.current?.level() ?? 0), 120)
    return () => { clearInterval(t); clearInterval(l) }
  }, [phase])
  useEffect(() => {
    const off = () => { if (phase === 'connected') { setPhase('reconnecting') } }
    const on = () => { if (phase === 'reconnecting') setPhase('connected') }
    window.addEventListener('offline', off); window.addEventListener('online', on)
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on) }
  }, [phase])

  if (!enc || !partner || !canInteract(enc)) return <Screen title="Appel" onBack={close} dark><div className="p-8 text-center text-cream/80">Cette rencontre n’est plus active.</div></Screen>

  const start = async () => {
    const e = real ? new LiveKitCallEngine(enc.id) : new DemoCallEngine()
    engine.current = e
    e.onState((s, d) => { setPhase(s); setDetail(d); if (s === 'connected') sfx.ring() })
    setSecs(0); setPhase('connecting'); sfx.tap()
    await e.connect()
  }
  const hangup = () => {
    engine.current?.disconnect(); engine.current = null
    if (secs >= 5) { completeStep('voice'); sfx.chime(); setPhase('ended'); setShort(false) } else { setShort(secs > 0); setPhase('ended') }
  }
  const dark = 'bg-plum text-cream'
  return (
    <Screen title="Premier appel" onBack={phase === 'connected' || phase === 'connecting' ? undefined : close} closeIcon dark testId="call">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col items-center pb-6 pt-2 text-center">
        {!real && <div className="mb-3 rounded-2xl bg-peach/20 px-4 py-2.5 text-[13px] font-medium text-peach" data-testid="call-sim">⚠️ SIMULATION — ce n’est pas un vrai appel. {partner.pseudo} est un personnage fictif ; ton micro n’est pas transmis.</div>}

        {phase === 'pre' && (
          <>
            <div className="flex items-center justify-center gap-6 py-6"><Silhouette size={110} /><Silhouette size={110} glow="#F6B7A0" /></div>
            <h2 className="font-display text-[28px] font-semibold leading-tight">Prêts à vous entendre ?</h2>
            <p className="mt-2 max-w-[310px] text-[15px] leading-relaxed text-cream/75">5 à 10 minutes suffisent, sans coupure forcée. Vos numéros ne sont jamais partagés. Tu peux raccrocher à tout moment.</p>
            <div className="mt-6 flex w-full flex-col gap-2"><Button variant="peach" onClick={start} testId="call-start" full>{real ? 'Appeler' : 'Lancer la simulation'}</Button><Button variant="ghost" className="!text-cream/80" onClick={() => { close(); setTab('messages') }} testId="call-alt">Plutôt un message vocal</Button></div>
          </>
        )}

        {phase === 'connecting' && (
          <div className="mt-10 flex flex-col items-center gap-5" role="status" aria-live="polite" data-testid="call-connecting">
            <div className="relative grid h-40 w-40 place-items-center">{[0, 1, 2].map((i) => <motion.span key={i} className="absolute rounded-full border border-lavender/60" style={{ width: 70, height: 70 }} animate={{ scale: [1, 2.4], opacity: [0.7, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }} />)}<Silhouette size={90} pulse={false} /></div>
            <p className="font-display text-[24px]">Connexion…</p>
          </div>
        )}

        {(phase === 'connected' || phase === 'reconnecting') && (
          <>
            <div className="flex w-full items-center justify-around py-4">
              <Voice who="Toi" level={muted ? 0 : Math.max(lvl, 0.1)} glow="#A88BC7" muted={muted} />
              <Voice who={partner.pseudo} level={0.5 + 0.3 * Math.sin(secs / 2)} glow="#F6B7A0" />
            </div>
            <p className="font-display text-[34px] tabular-nums" data-testid="call-timer">{fmtTime(secs)}</p>
            <p className="text-[12.5px] text-cream/55">{phase === 'reconnecting' ? 'Connexion instable, reconnexion…' : '5 à 10 min conseillées · aucune coupure forcée'}</p>
            <div className="mt-5 w-full rounded-3xl bg-white/[.07] p-4 text-left">
              <p className="kicker !text-lavender">Pour briser la glace (facultatif)</p>
              <AnimatePresence mode="wait"><motion.p key={qi} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-display mt-1.5 min-h-[56px] text-[19px] leading-snug" data-testid="icebreaker">{ICEBREAKERS[qi % ICEBREAKERS.length]}</motion.p></AnimatePresence>
              <button className="mt-1 min-h-[44px] text-[14px] font-semibold text-peach" onClick={() => { setQi(qi + 1); sfx.tap() }}>Une autre question →</button>
            </div>
            <div className="mt-auto flex w-full items-center justify-center gap-6 pt-6">
              <button type="button" aria-pressed={muted} aria-label={muted ? 'Réactiver le micro' : 'Couper le micro'} data-testid="call-mute" onClick={() => { const m = !muted; setMuted(m); engine.current?.setMuted(m); sfx.tap() }} className={cn('grid h-16 w-16 place-items-center rounded-full text-2xl', muted ? 'bg-peach text-plum' : 'bg-white/15')}>{muted ? '🔇' : '🎙️'}</button>
              <button type="button" aria-label="Raccrocher" data-testid="call-hangup" onClick={hangup} className="grid h-[72px] w-[72px] place-items-center rounded-full bg-rose-600 text-3xl text-white">📞</button>
            </div>
          </>
        )}

        {phase === 'failed' && (
          <div className="mt-10"><ErrorState title={detail === 'permission' ? 'Micro non autorisé' : 'Connexion impossible'} text={detail === 'permission' ? 'Autorise le micro dans les réglages de ton appareil, ou envoie plutôt un message vocal.' : detail === 'offline' ? 'Tu es hors ligne. Reconnecte-toi puis réessaie.' : 'L’appel n’a pas pu s’établir. Aucune inquiétude, tu peux réessayer ou passer par un message vocal.'} onRetry={() => void start()} /><div className="mt-2"><Button variant="ghost" className="!text-cream/80" onClick={() => { close(); setTab('messages') }}>Envoyer un message vocal</Button></div></div>
        )}

        {phase === 'ended' && (
          <div className="mt-8 flex flex-col items-center gap-3" data-testid="call-ended">
            <Buddy size={90} mood="happy" arms="up" />
            <h2 className="font-display text-[26px] font-semibold">{secs >= 5 ? 'Merci pour cet échange' : short ? 'Appel très court' : 'Appel terminé'}</h2>
            <p className="max-w-[300px] text-[15px] text-cream/75">{secs >= 5 ? 'Votre étape « La voix » est franchie. Prenez un instant avant de décider de la suite.' : 'Aucun souci : vous pourrez réessayer quand vous voulez.'}</p>
            <Button variant="peach" onClick={() => { close(); setTab('encounter') }} testId="call-done" full>Retour à ma rencontre</Button>
          </div>
        )}
      </div>
      {dark && null}
    </Screen>
  )
}
function Voice({ who, level, glow, muted }: { who: string; level: number; glow: string; muted?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid h-[120px] w-[120px] place-items-center">
        <motion.span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${glow}99, transparent 70%)` }} animate={{ scale: 1 + level * 0.5, opacity: 0.5 + level * 0.5 }} transition={{ type: 'spring', stiffness: 120, damping: 12 }} />
        <Silhouette size={84} pulse={false} glow={glow} />
      </div>
      <p className="text-[13px] font-semibold">{who}{muted ? ' · micro coupé' : ''}</p>
      <div className="flex h-5 items-end gap-[3px]" aria-hidden>{[0, 1, 2, 3, 4].map((i) => <motion.span key={i} className="w-[4px] rounded-full bg-cream/70" animate={{ height: 4 + level * 16 * (0.5 + ((i * 3) % 5) / 5) }} />)}</div>
    </div>
  )
}

// ============== DOUBLE CONSENTEMENT ==============
export function ConsentScreen() {
  const close = useUI((s) => s.close)
  const replace = useUI((s) => s.replace)
  const { enc, partner, out } = useEnc()
  const consent = useStore((s) => s.consent)
  const [choice, setChoice] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<'ask' | 'confirm' | 'sending' | 'waiting' | 'kind'>('ask')
  useBusy(true)
  if (!enc || !partner) return <Screen title="Révélation" onBack={close} dark><div className="p-8 text-center text-cream/80">Rien à afficher.</div></Screen>
  const already = enc.consent.me !== null

  const submit = () => {
    setPhase('sending'); sfx.glow()
    setTimeout(() => {
      consent(choice!)
      const e = useStore.getState().encounter!
      if (e.status === 'revealed') { replace({ name: 'reveal' }) }
      else if (e.consent.me !== null && e.consent.partner !== null) setPhase('kind')
      else setPhase('waiting')
    }, 1600)
  }
  const state = already && phase === 'ask' ? (out === 'revealed' ? 'revealed' : out === 'kind-end' ? 'kind' : 'waiting') : phase
  return (
    <Screen title="Révélation" onBack={phase === 'sending' ? undefined : close} closeIcon dark testId="consent">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col items-center justify-center pb-10 text-center">
        {(state === 'ask' || state === 'confirm') && (
          <>
            <Silhouette size={140} glow="#F6B7A0" />
            <h2 className="font-display mt-4 text-[31px] font-semibold leading-[1.1] text-balance" data-testid="consent-q">Tu as envie d’en découvrir un peu plus ?</h2>
            <p className="mt-3 max-w-[320px] text-[15px] leading-relaxed text-cream/75">Ta réponse est <b>privée</b>. {partner.pseudo} ne saura jamais ce que tu as répondu : si les deux réponses sont « oui », vos photos apparaissent. Sinon, rien ne sera dévoilé.</p>
            <div className="mt-7 flex w-full flex-col gap-3">
              <button type="button" data-testid="consent-yes" aria-pressed={choice === true} onClick={() => { setChoice(true); setPhase('confirm'); sfx.select() }} className={cn('min-h-[60px] rounded-3xl border-2 px-5 text-[17px] font-semibold', choice === true ? 'border-peach bg-peach text-plum' : 'border-white/20 bg-white/[.07]')}>Oui, j’aimerais continuer</button>
              <button type="button" data-testid="consent-no" aria-pressed={choice === false} onClick={() => { setChoice(false); setPhase('confirm'); sfx.select() }} className={cn('min-h-[60px] rounded-3xl border-2 px-5 text-[17px] font-semibold', choice === false ? 'border-lavender bg-lavender text-plum' : 'border-white/20 bg-white/[.07]')}>Je préfère en rester là</button>
            </div>
            {choice !== null && <div className="mt-5 w-full"><p className="mb-2 text-[13px] text-cream/60">Une fois envoyée, ta réponse ne peut plus être modifiée.</p><Button variant="peach" onClick={submit} testId="consent-confirm" full>Confirmer ma réponse</Button></div>}
          </>
        )}
        {state === 'sending' && <div role="status" aria-live="polite"><motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}><Silhouette size={140} glow="#F6B7A0" /></motion.div><p className="font-display mt-4 text-[22px]">Ta réponse voyage en toute discrétion…</p></div>}
        {state === 'waiting' && (
          <div data-testid="consent-waiting"><Silhouette size={130} /><h2 className="font-display mt-4 text-[26px] font-semibold">Ta réponse est enregistrée</h2><p className="mx-auto mt-2 max-w-[300px] text-[15px] text-cream/75">Nous te préviendrons dès que {partner.pseudo} aura répondu. Rien ne s’affichera avant.</p><div className="mt-6"><Button variant="peach" onClick={close} full>Retour</Button></div></div>
        )}
        {state === 'kind' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="consent-kind"><Buddy size={90} mood="calm" /><h2 className="font-display mt-3 text-[25px] font-semibold leading-snug text-balance">{KIND_END}</h2><p className="mx-auto mt-3 max-w-[300px] text-[14.5px] text-cream/70">Aucune photo n’a été partagée. Prends soin de toi.</p><div className="mt-6"><Button variant="peach" onClick={() => { close(); useStore.getState().set({ encounter: null }); useUI.getState().setTab('home') }} testId="consent-home" full>Retourner à mon espace</Button></div></motion.div>
        )}
        {state === 'revealed' && <div><Button variant="peach" onClick={() => replace({ name: 'reveal' })}>Voir la révélation</Button></div>}
      </div>
    </Screen>
  )
}

// ============== RÉVÉLATION ==============
export function RevealScreen() {
  const close = useUI((s) => s.close)
  const replace = useUI((s) => s.replace)
  const { enc, partner } = useEnc()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(reduce ? 4 : 0)
  const [mine, setMine] = useState<string | null>(null)
  const [burst, setBurst] = useState(0)
  const profile = useStore((s) => s.profile)
  const hasPhoto = useStore((s) => s.hasPhoto)
  const allowed = canSeePhotos(enc)
  useBusy(true)
  useEffect(() => { if (hasPhoto) loadMyPhoto().then((b) => b && setMine(URL.createObjectURL(b))); return () => { if (mine) URL.revokeObjectURL(mine) } }, [hasPhoto]) // eslint-disable-line
  useEffect(() => {
    if (!allowed || reduce) return
    sfx.glow()
    const ts = [setTimeout(() => setStep(1), 1400), setTimeout(() => setStep(2), 3200), setTimeout(() => setStep(3), 5200), setTimeout(() => { setStep(4); sfx.success(); setBurst(Date.now()) }, 7200)]
    return () => ts.forEach(clearTimeout)
  }, [allowed, reduce])

  // Garde de sécurité côté interface : sans double accord, aucune photo n'est rendue.
  if (!allowed || !partner) return <Screen title="Révélation" onBack={close} dark testId="reveal-denied"><div className="p-8 text-center text-cream/80">Aucune photo n’est accessible pour cette rencontre.</div></Screen>

  return (
    <div className="absolute inset-0 overflow-hidden bg-plum-900 text-cream" data-testid="reveal">
      <motion.div className="absolute inset-0" animate={{ background: step >= 2 ? 'radial-gradient(circle at 50% 45%, rgba(246,183,160,.55), rgba(26,20,41,1) 62%)' : 'radial-gradient(circle at 50% 45%, rgba(168,139,199,.12), rgba(26,20,41,1) 60%)' }} transition={{ duration: 2 }} />
      <Burst trigger={burst} count={16} colors={['#F6B7A0', '#FFF7EF', '#F3C1CC']} />
      {step < 4 && <button className="pt-safe px-safe absolute right-0 top-0 z-20 min-h-[44px] text-[14px] font-semibold text-cream/60" onClick={() => setStep(4)} data-testid="reveal-skip">Passer</button>}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <AnimatePresence mode="wait">
          {step < 3 && (
            <motion.div key="sil" exit={{ opacity: 0, scale: 0.9 }} className="relative h-[260px] w-full max-w-[360px]">
              <motion.div className="absolute top-8" initial={{ left: '-30%', opacity: 0 }} animate={{ left: step === 0 ? '8%' : step === 1 ? '14%' : '26%', opacity: 1 }} transition={{ duration: 1.8, ease: 'easeInOut' }}><Silhouette size={130} pulse={false} /></motion.div>
              <motion.div className="absolute top-8" initial={{ right: '-30%', opacity: 0 }} animate={{ right: step === 0 ? '8%' : step === 1 ? '14%' : '26%', opacity: 1 }} transition={{ duration: 1.8, ease: 'easeInOut' }}><Silhouette size={130} pulse={false} glow="#F6B7A0" /></motion.div>
              <motion.p className="absolute inset-x-0 bottom-0 font-display text-[22px] text-cream/85" key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{step === 0 ? 'Vous avez tous les deux dit oui…' : step === 1 ? 'Deux voix, deux univers…' : 'Une lumière douce s’allume…'}</motion.p>
            </motion.div>
          )}
          {step >= 3 && (
            <motion.div key="ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }} className="flex flex-col items-center" data-testid="reveal-photos">
              <div className="flex items-center justify-center gap-4">
                <motion.div initial={{ x: -20, opacity: 0, filter: 'brightness(.3)' }} animate={{ x: 0, opacity: 1, filter: 'brightness(1)' }} transition={{ duration: 1.8 }} className="overflow-hidden rounded-[40px] shadow-soft">
                  {mine ? <img src={mine} alt="Ta photo" width={140} height={140} className="h-[140px] w-[140px] object-cover" /> : <div className="grid h-[140px] w-[140px] place-items-center bg-lavender"><Buddy size={90} mood="happy" /></div>}
                </motion.div>
                <motion.div initial={{ x: 20, opacity: 0, filter: 'brightness(.3)' }} animate={{ x: 0, opacity: 1, filter: 'brightness(1)' }} transition={{ duration: 1.8 }} className="overflow-hidden rounded-[40px] shadow-soft"><Portrait spec={partner.portrait} size={140} radius={0} /></motion.div>
              </div>
              {step >= 4 && (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8">
                  <p className="kicker !text-peach">La révélation</p>
                  <h2 className="font-display mt-1 text-[32px] font-semibold leading-tight">{profile?.pseudo} & {partner.pseudo}</h2>
                  <p className="mx-auto mt-2 max-w-[300px] text-[15px] text-cream/75">Vous avez pris le temps de vous découvrir. Votre espace commun vous attend.</p>
                  <div className="mt-6 flex flex-col gap-2"><Button variant="peach" onClick={() => replace({ name: 'world' })} testId="reveal-enter" full>Entrer dans Notre monde</Button><Button variant="ghost" className="!text-cream/70" onClick={close}>Plus tard</Button></div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
export { Sheet, COMPASS }
