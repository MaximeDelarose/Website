import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Burst, Button, ErrorState, Screen, Sheet, useBusy } from '../ui/kit'
import { Ico, Icon, Logo, Portrait, Silhouette } from '../ui/Art'
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
  return (
    <Screen title="Premier appel" onBack={phase === 'connected' || phase === 'connecting' ? undefined : close} closeIcon dark testId="call">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col items-center pb-6 pt-2 text-center">
        {!real && <p className="mb-4 text-[12px] leading-snug tracking-wide text-peach" data-testid="call-sim">SIMULATION — ce n’est pas un vrai appel. {partner.pseudo} est un personnage fictif ; ton micro n’est pas transmis.</p>}

        {phase === 'pre' && (
          <>
            <div className="flex items-center justify-center gap-4 py-8"><Silhouette size={96} /><Silhouette size={96} glow="#E8DFF7" /></div>
            <h2 className="font-display text-[44px] leading-[1.0]">Prêts à vous entendre&nbsp;?</h2>
            <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-cream/65">5 à 10 minutes suffisent, sans coupure forcée. Vos numéros ne sont jamais partagés. Tu peux raccrocher à tout moment.</p>
            <div className="mt-10 flex w-full flex-col gap-1"><Button variant="peach" onClick={start} testId="call-start" full>{real ? 'Appeler' : 'Lancer la simulation'}</Button><div className="flex justify-center"><Button variant="ghost" className="!text-cream/70" onClick={() => { close(); setTab('messages') }} testId="call-alt">Plutôt un message vocal</Button></div></div>
          </>
        )}

        {phase === 'connecting' && (
          <div className="mt-12 flex flex-col items-center gap-8" role="status" aria-live="polite" data-testid="call-connecting">
            <div className="relative grid h-40 w-40 place-items-center">{[0, 1, 2].map((i) => <motion.span key={i} className="absolute h-[70px] w-[70px] rounded-full border border-cream/40" animate={{ scale: [1, 2.4], opacity: [0.7, 0] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8 }} />)}<Logo size={44} color="#FDF7EF" mono /></div>
            <p className="font-display text-[32px]">Connexion…</p>
          </div>
        )}

        {(phase === 'connected' || phase === 'reconnecting') && (
          <>
            <div className="flex w-full items-center justify-around py-4">
              <Voice who="Toi" level={muted ? 0 : Math.max(lvl, 0.1)} glow="#E8DFF7" muted={muted} />
              <Voice who={partner.pseudo} level={0.5 + 0.3 * Math.sin(secs / 2)} glow="#FFC4AB" />
            </div>
            <p className="font-display mt-2 text-[56px] leading-none tabular-nums" data-testid="call-timer">{fmtTime(secs)}</p>
            <p className="mt-2 text-[12px] tracking-wide text-cream/45">{phase === 'reconnecting' ? 'Connexion instable, reconnexion…' : '5 à 10 min conseillées · aucune coupure forcée'}</p>
            <div className="mt-8 w-full border-t border-cream/15 pt-5 text-left">
              <p className="kicker" style={{ color: 'rgba(253,247,239,.5)' }}>Pour briser la glace · facultatif</p>
              <AnimatePresence mode="wait"><motion.p key={qi} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="font-display mt-3 min-h-[68px] text-[26px] leading-[1.12]" data-testid="icebreaker">{ICEBREAKERS[qi % ICEBREAKERS.length]}</motion.p></AnimatePresence>
              <button className="min-h-[44px] text-[14px] text-peach underline underline-offset-4" onClick={() => { setQi(qi + 1); sfx.tap() }}>Une autre question</button>
            </div>
            <div className="mt-auto flex w-full items-center justify-center gap-8 pt-8">
              <button type="button" aria-pressed={muted} aria-label={muted ? 'Réactiver le micro' : 'Couper le micro'} data-testid="call-mute" onClick={() => { const m = !muted; setMuted(m); engine.current?.setMuted(m); sfx.tap() }} className={cn('grid h-16 w-16 place-items-center rounded-full border transition-colors', muted ? 'border-peach bg-peach text-plum' : 'border-cream/35 text-cream')}><Ico d={muted ? Icon.micOff : Icon.mic} size={24} /></button>
              <button type="button" aria-label="Raccrocher" data-testid="call-hangup" onClick={hangup} className="grid h-[72px] w-[72px] place-items-center rounded-full bg-rose-600 text-white"><Ico d={Icon.phone} size={26} /></button>
            </div>
          </>
        )}

        {phase === 'failed' && (
          <div className="mt-10"><ErrorState title={detail === 'permission' ? 'Micro non autorisé.' : 'Connexion impossible.'} text={detail === 'permission' ? 'Autorise le micro dans les réglages de ton appareil, ou envoie plutôt un message vocal.' : detail === 'offline' ? 'Tu es hors ligne. Reconnecte-toi puis réessaie.' : 'L’appel n’a pas pu s’établir. Tu peux réessayer ou passer par un message vocal.'} onRetry={() => void start()} /><div className="mt-2"><Button variant="ghost" className="!text-cream/70" onClick={() => { close(); setTab('messages') }}>Envoyer un message vocal</Button></div></div>
        )}

        {phase === 'ended' && (
          <div className="mt-10 flex flex-col items-center gap-4" data-testid="call-ended">
            <Logo size={52} color="#FDF7EF" mono />
            <h2 className="font-display text-[40px] leading-none">{secs >= 5 ? 'Merci pour cet échange.' : short ? 'Appel très court.' : 'Appel terminé.'}</h2>
            <p className="max-w-[290px] text-[15px] leading-relaxed text-cream/65">{secs >= 5 ? 'Votre étape « La voix » est franchie. Prenez un instant avant de décider de la suite.' : 'Aucun souci : vous pourrez réessayer quand vous voulez.'}</p>
            <div className="mt-4 w-full"><Button variant="peach" onClick={() => { close(); setTab('encounter') }} testId="call-done" full>Retour à ma rencontre</Button></div>
          </div>
        )}
      </div>
    </Screen>
  )
}
function Voice({ who, level, glow, muted }: { who: string; level: number; glow: string; muted?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid h-[120px] w-[120px] place-items-center">
        <motion.span className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${glow}66, transparent 70%)` }} animate={{ scale: 1 + level * 0.4, opacity: 0.4 + level * 0.6 }} transition={{ type: 'spring', stiffness: 100, damping: 14 }} />
        <Silhouette size={72} pulse={false} glow={glow} />
      </div>
      <p className="text-[12px] tracking-[.14em] text-cream/70">{who.toUpperCase()}{muted ? ' · MICRO COUPÉ' : ''}</p>
    </div>
  )
}

// ============== DOUBLE CONSENTEMENT ==============
const ease = [0.22, 0.8, 0.24, 1] as [number, number, number, number]

export function ConsentScreen() {
  const close = useUI((s) => s.close)
  const replace = useUI((s) => s.replace)
  const { enc, partner, out } = useEnc()
  const consent = useStore((s) => s.consent)
  const [choice, setChoice] = useState<boolean | null>(null)
  const [phase, setPhase] = useState<'ask' | 'sending' | 'waiting' | 'kind'>('ask')
  useBusy(true)
  if (!enc || !partner) return <Screen title="Révélation" onBack={close} dark><div className="p-8 text-center text-cream/80">Rien à afficher.</div></Screen>
  const already = enc.consent.me !== null

  const submit = () => {
    setPhase('sending'); sfx.glow()
    setTimeout(() => {
      consent(choice!)
      const e = useStore.getState().encounter!
      if (e.status === 'revealed') replace({ name: 'reveal' })
      else if (e.consent.me !== null && e.consent.partner !== null) setPhase('kind')
      else setPhase('waiting')
    }, 1800)
  }
  const state = already && phase === 'ask' ? (out === 'revealed' ? 'revealed' : out === 'kind-end' ? 'kind' : 'waiting') : phase
  const Choice = ({ v, testId, children }: { v: boolean; testId: string; children: React.ReactNode }) => (
    <button type="button" data-testid={testId} aria-pressed={choice === v} onClick={() => { setChoice(v); sfx.select() }} className={cn('flex min-h-[72px] w-full items-center justify-between border-t border-cream/15 py-4 text-left transition-colors duration-300', choice === v ? 'text-peach' : 'text-cream/80')}>
      <span className="font-display text-[28px] leading-tight">{children}</span>
      <span className={cn('h-3 w-3 rounded-full border transition-colors', choice === v ? 'border-peach bg-peach' : 'border-cream/40')} />
    </button>
  )
  return (
    <Screen title="Révélation" onBack={phase === 'sending' ? undefined : close} closeIcon dark testId="consent">
      <div className="mx-auto flex min-h-full max-w-[480px] flex-col justify-center pb-10">
        {state === 'ask' && (
          <>
            <div className="mb-8 flex justify-center"><Silhouette size={96} /></div>
            <h2 className="font-display text-center text-[clamp(38px,11vw,50px)] leading-[1.0] text-balance" data-testid="consent-q">Tu as envie d’en découvrir un peu plus&nbsp;?</h2>
            <p className="mx-auto mt-5 max-w-[310px] text-center text-[14.5px] leading-relaxed text-cream/60">Ta réponse est <b className="font-medium text-cream">privée</b>. {partner.pseudo} ne saura jamais ce que tu as répondu : si les deux réponses sont « oui », vos photos apparaissent ensemble. Sinon, rien ne sera dévoilé.</p>
            <div className="mt-10 border-b border-cream/15">
              <Choice v testId="consent-yes">Oui, j’aimerais continuer</Choice>
              <Choice v={false} testId="consent-no">Je préfère en rester là</Choice>
            </div>
            {choice !== null && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8"><p className="mb-3 text-center text-[12.5px] text-cream/45">Une fois envoyée, ta réponse ne peut plus être modifiée.</p><Button variant="peach" onClick={submit} testId="consent-confirm" full>Confirmer ma réponse</Button></motion.div>}
          </>
        )}
        {state === 'sending' && <div role="status" aria-live="polite" className="text-center"><div className="relative mx-auto grid h-40 w-40 place-items-center">{[0, 1, 2].map((i) => <motion.span key={i} className="absolute h-20 w-20 rounded-full border border-peach/60" animate={{ scale: [1, 2.2], opacity: [0.7, 0] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.6 }} />)}<Logo size={44} color="#FDF7EF" mono /></div><p className="font-display mt-6 text-[30px]">Ta réponse voyage en toute discrétion…</p></div>}
        {state === 'waiting' && (
          <div className="text-center" data-testid="consent-waiting"><Silhouette size={96} /><h2 className="font-display mt-6 text-[40px] leading-none">Ta réponse est enregistrée.</h2><p className="mx-auto mt-4 max-w-[290px] text-[15px] text-cream/60">Nous te préviendrons dès que {partner.pseudo} aura répondu. Rien ne s’affichera avant.</p><div className="mt-8"><Button variant="peach" onClick={close} full>Retour</Button></div></div>
        )}
        {state === 'kind' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }} className="text-center" data-testid="consent-kind"><div className="flex justify-center"><Logo size={48} color="#FDF7EF" mono /></div><h2 className="font-display mt-8 text-[34px] leading-[1.08] text-balance">{KIND_END}</h2><p className="mx-auto mt-4 max-w-[290px] text-[14.5px] text-cream/55">Aucune photo n’a été partagée. Prends soin de toi.</p><div className="mt-10"><Button variant="peach" onClick={() => { close(); useStore.getState().set({ encounter: null }); useUI.getState().setTab('home') }} testId="consent-home" full>Retourner à mon espace</Button></div></motion.div>
        )}
        {state === 'revealed' && <div className="text-center"><Button variant="peach" onClick={() => replace({ name: 'reveal' })}>Voir la révélation</Button></div>}
      </div>
    </Screen>
  )
}

// ============== RÉVÉLATION ==============
const AL = 'M92 372 V196 C92 112 140 62 178 62'
const AR = 'M268 372 V196 C268 112 220 62 182 62'

export function RevealScreen() {
  const close = useUI((s) => s.close)
  const replace = useUI((s) => s.replace)
  const { enc, partner } = useEnc()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(reduce ? 3 : 0)
  const [mine, setMine] = useState<string | null>(null)
  const [ring, setRing] = useState(0)
  const profile = useStore((s) => s.profile)
  const hasPhoto = useStore((s) => s.hasPhoto)
  const allowed = canSeePhotos(enc)
  useBusy(true)
  useEffect(() => { if (hasPhoto) loadMyPhoto().then((b) => b && setMine(URL.createObjectURL(b))); return () => { if (mine) URL.revokeObjectURL(mine) } }, [hasPhoto]) // eslint-disable-line
  useEffect(() => {
    if (!allowed || reduce) return
    sfx.glow()
    // 0 : obscurité · 1 : deux traits se rejoignent · 2 : l'arche s'allume · 3 : les portraits émergent
    const ts = [setTimeout(() => setStep((v) => Math.max(v, 1)), 1200), setTimeout(() => setStep((v) => Math.max(v, 2)), 4200), setTimeout(() => { setStep((v) => { if (v < 3) { sfx.success(); setRing(Date.now()) } return 3 }) }, 6200)]
    return () => ts.forEach(clearTimeout)
  }, [allowed, reduce])

  // Garde de sécurité côté interface : sans double accord, aucune photo n'est rendue.
  if (!allowed || !partner) return <Screen title="Révélation" onBack={close} dark testId="reveal-denied"><div className="p-8 text-center text-cream/80">Aucune photo n’est accessible pour cette rencontre.</div></Screen>

  return (
    <div className="absolute inset-0 overflow-hidden bg-plum-900 text-cream" data-testid="reveal">
      <motion.div className="absolute inset-0" animate={{ background: step >= 2 ? 'radial-gradient(circle at 50% 42%, rgba(255,196,171,.38), rgba(42,20,56,1) 64%)' : 'radial-gradient(circle at 50% 42%, rgba(255,196,171,.05), rgba(42,20,56,1) 60%)' }} transition={{ duration: 2.4 }} />
      <Burst trigger={ring} />
      {step < 3 && <button className="pt-safe px-safe absolute right-0 top-0 z-20 min-h-[44px] text-[13px] text-cream/50" onClick={() => setStep(3)} data-testid="reveal-skip">Passer</button>}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-7 text-center">
        <AnimatePresence mode="wait">
          {step < 3 && (
            <motion.div key="arch" exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 1 }} className="relative w-full max-w-[340px]">
              <svg viewBox="0 0 360 400" className="w-full" fill="none" aria-hidden>
                <motion.path d={AL} stroke="#FDF7EF" strokeWidth="14" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: step >= 1 ? 1 : 0.08 }} transition={{ duration: 2.8, ease: [0.45, 0, 0.2, 1] }} />
                <motion.path d={AR} stroke="#FFC4AB" strokeWidth="14" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: step >= 1 ? 1 : 0.08 }} transition={{ duration: 2.8, ease: [0.45, 0, 0.2, 1] }} />
                <motion.circle cx="180" cy="248" r="8" fill="#FDF7EF" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: step >= 2 ? 1 : 0, scale: step >= 2 ? 1 : 0 }} style={{ transformOrigin: '180px 248px' }} transition={{ type: 'spring', stiffness: 100, damping: 12 }} />
              </svg>
              <motion.p key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }} className="font-display absolute inset-x-0 bottom-0 text-[26px] text-cream/85">{step === 0 ? 'Vous avez tous les deux dit oui.' : step === 1 ? 'Deux voix. Un même chemin.' : 'Voici ceux qui se cachaient derrière.'}</motion.p>
            </motion.div>
          )}
          {step >= 3 && (
            <motion.div key="ph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.6 }} className="flex flex-col items-center" data-testid="reveal-photos">
              <div className="flex items-end justify-center gap-3">
                <motion.div initial={{ x: -24, opacity: 0, filter: 'blur(14px)' }} animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 2.2, ease }} className="overflow-hidden rounded-[28px]">
                  {mine ? <img src={mine} alt="Ta photo" width={140} height={175} className="h-[175px] w-[140px] object-cover" /> : <div className="grid h-[175px] w-[140px] place-items-center bg-lavender"><Logo size={56} /></div>}
                </motion.div>
                <motion.div initial={{ x: 24, opacity: 0, filter: 'blur(14px)' }} animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 2.2, ease }} className="overflow-hidden rounded-[28px]"><Portrait spec={partner.portrait} size={140} radius={0} /></motion.div>
              </div>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.9 }} className="mt-10">
                <p className="kicker" style={{ color: 'rgba(255,196,171,.85)' }}>La révélation</p>
                <h2 className="font-display mt-3 text-[44px] leading-none">{profile?.pseudo} & {partner.pseudo}</h2>
                <p className="mx-auto mt-4 max-w-[290px] text-[15px] leading-relaxed text-cream/65">Vous avez pris le temps de vous découvrir. Votre espace commun vous attend.</p>
                <div className="mt-8 flex flex-col gap-1"><Button variant="peach" onClick={() => replace({ name: 'world' })} testId="reveal-enter" full>Entrer dans Notre monde</Button><div className="flex justify-center"><Button variant="ghost" className="!text-cream/60" onClick={close}>Plus tard</Button></div></div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
export { Sheet }
