import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Burst, Button, Screen, useBusy } from '../ui/kit'
import { Buddy } from '../ui/Art'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { BRIDGE_SEGMENTS, COMPASS, MIRROR } from '../lib/content'
import { canInteract } from '../lib/journey'
import { bridgeLocked } from '../lib/games'
import { useEnc } from '../ui/shared'
import { sfx } from '../lib/audio'
import { buzz } from '../lib/haptics'
import { cn } from '../lib/util'

export function GameScreen({ kind }: { kind: 'mirror' | 'compass' | 'bridge' }) {
  const close = useUI((s) => s.close)
  const { enc, partner } = useEnc()
  useBusy(true)
  const title = kind === 'mirror' ? 'Le Miroir' : kind === 'bridge' ? 'Le Pont' : 'La Boussole'
  if (!enc || !partner || !canInteract(enc)) {
    return <Screen title={title} onBack={close}><div className="p-8 text-center"><Buddy size={90} mood="calm" /><p className="mt-4 text-[16px]">Cette rencontre n’est plus active : les activités sont terminées.</p><div className="mt-4"><Button onClick={close} testId="game-exit">Retour</Button></div></div></Screen>
  }
  return (
    <Screen title={title} onBack={close} closeIcon testId={`game-${kind}-screen`}>
      <div className="mx-auto max-w-[520px] pb-8">
        <p className="mb-3 text-center text-[12.5px] text-plum/55">🧪 Démo · {partner.pseudo} est un personnage fictif</p>
        {kind === 'mirror' ? <Mirror /> : kind === 'compass' ? <Compass /> : <Bridge />}
      </div>
    </Screen>
  )
}

// ====================== LE MIROIR ======================
function Mirror() {
  const g = useStore((s) => s.games.mirror)
  const { startMirror, mirrorAnswer, mirrorTick, mirrorFlip, send } = useStore()
  const { partner } = useEnc()
  const close = useUI((s) => s.close)
  const [pick, setPick] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [burst, setBurst] = useState(0)
  const [talk, setTalk] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => { if (!g || g.flipped && false) startMirror() }, [g, startMirror])
  useEffect(() => { const t = setInterval(mirrorTick, 400); return () => clearInterval(t) }, [mirrorTick])
  if (!g || !partner) return null
  const q = MIRROR.find((m) => m.id === g.qid)!
  const label = (id?: string) => q.options.find((o) => o.id === id)
  const ready = !!g.mine && !!g.theirs

  return (
    <div className="relative">
      <Burst trigger={burst} count={18} />
      <div className="rounded-[28px] bg-lavender-100 p-5 text-center shadow-soft">
        <p className="kicker">La question du Miroir</p>
        <h2 className="font-display mt-1 text-[25px] font-semibold leading-tight text-balance" data-testid="mirror-q">{q.q}</h2>
      </div>

      {!g.mine && (
        <div className="mt-4">
          <p className="mb-2 text-center text-[13.5px] text-plum/65">Réponds en secret. {partner.pseudo} ne verra rien avant que vous retourniez les cartes ensemble.</p>
          <div className="grid grid-cols-2 gap-3">
            {q.options.map((o, i) => (
              <motion.button key={o.id} type="button" data-testid={`mirror-opt-${o.id}`} aria-pressed={pick === o.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setPick(o.id); sfx.select(); buzz(8) }} className={cn('flex min-h-[116px] flex-col justify-between rounded-3xl border-2 p-4 text-left', pick === o.id ? 'border-plum bg-peach-200 shadow-pop' : 'border-plum/10 bg-white shadow-soft')}>
                <span className="text-3xl">{o.emoji}</span><span className="text-[14.5px] font-semibold leading-snug">{o.label}</span>
              </motion.button>
            ))}
          </div>
          <input className="field mt-3" data-testid="mirror-note" maxLength={120} placeholder="Un mot en plus (facultatif)" aria-label="Un mot en plus" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-3"><Button disabled={!pick} onClick={() => { mirrorAnswer(pick!, note.trim()); sfx.place() }} testId="mirror-lock" full>🔒 Verrouiller ma réponse</Button></div>
        </div>
      )}

      {g.mine && (
        <div className="mt-5">
          <div className="flex items-start justify-center gap-4" style={{ perspective: 1000 }}>
            <FlipCard flipped={g.flipped} who="Toi" front={<Face emoji={label(g.mine.opt)?.emoji} text={label(g.mine.opt)!.label} note={g.mine.note} />} sealed="🔒" ready testId="card-me" />
            <FlipCard flipped={g.flipped} who={partner.pseudo} front={g.theirs ? <Face emoji={label(g.theirs.opt)?.emoji} text={label(g.theirs.opt)!.label} note={g.theirs.note} /> : null} sealed={g.theirs ? '🔒' : '…'} ready={!!g.theirs} testId="card-partner" />
          </div>
          {!g.flipped && (
            <div className="mt-5 text-center" aria-live="polite">
              {!g.theirs ? <p className="text-[15px] text-plum/70" data-testid="mirror-wait">{partner.pseudo} réfléchit… Tu peux fermer, la carte t’attendra.</p> : <Button onClick={() => { mirrorFlip(); sfx.flip(); buzz([10, 40, 18]); setBurst(Date.now()) }} testId="mirror-flip" full>✨ Retourner les cartes</Button>}
              {!g.theirs && <div className="mt-3"><Button variant="soft" onClick={close} testId="mirror-later">Revenir plus tard</Button></div>}
            </div>
          )}
          {g.flipped && ready && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-5 space-y-3" data-testid="mirror-after">
              <div className="card p-5"><p className="kicker">Pour en discuter</p><p className="font-display mt-1 text-[20px] leading-snug">{q.follow}</p>
                {sent ? <p className="mt-3 text-[14px] font-semibold text-mint-600">Envoyé dans votre conversation ✓</p> : (
                  <><input className="field mt-3" data-testid="mirror-talk" aria-label="Ta réponse" maxLength={200} placeholder="Ta réponse…" value={talk} onChange={(e) => setTalk(e.target.value)} />
                    <div className="mt-2"><Button variant="soft" disabled={!talk.trim()} onClick={() => { send(`🪞 ${talk.trim()}`); setSent(true); sfx.msg() }} testId="mirror-send" full>Envoyer dans la conversation</Button></div></>
                )}
              </div>
              <Button onClick={() => { setPick(null); setNote(''); setTalk(''); setSent(false); startMirror() }} testId="mirror-again" full>Rejouer avec une autre question</Button>
              <Button variant="ghost" onClick={close} full>Terminer</Button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

function Face({ emoji, text, note }: { emoji?: string; text: string; note?: string }) {
  return <div className="flex h-full flex-col items-center justify-center gap-1.5 p-3 text-center"><span className="text-4xl">{emoji}</span><span className="text-[13.5px] font-bold leading-tight">{text}</span>{note && <span className="text-[11.5px] italic leading-tight text-plum/70">« {note} »</span>}</div>
}
function FlipCard({ flipped, who, front, sealed, ready, testId }: { flipped: boolean; who: string; front: React.ReactNode; sealed: string; ready: boolean; testId: string }) {
  return (
    <div className="flex w-[44%] max-w-[190px] flex-col items-center gap-2" data-testid={testId}>
      <p className="kicker">{who}</p>
      <motion.div className="relative h-[190px] w-full" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0, scale: ready && !flipped ? [1, 1.03, 1] : 1 }} transition={{ rotateY: { type: 'spring', stiffness: 70, damping: 14 }, scale: { repeat: Infinity, duration: 2 } }}>
        <div className="absolute inset-0 grid place-items-center rounded-3xl bg-plum shadow-soft" style={{ backfaceVisibility: 'hidden' }}>
          <div className="text-center text-cream"><div className="text-4xl">{sealed}</div><div className="font-display mt-1 text-lg opacity-70">À DEUX</div></div>
        </div>
        <div className="absolute inset-0 rounded-3xl bg-white shadow-soft" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{front}</div>
      </motion.div>
    </div>
  )
}

// ====================== LA BOUSSOLE ======================
const ANGLES: Record<string, number> = { n: 0, e: 90, s: 180, w: 270 }
function Needle({ angle, color, label }: { angle: number; color: string; label: string }) {
  return (
    <motion.g initial={{ rotate: 0 }} animate={{ rotate: angle }} transition={{ type: 'spring', stiffness: 50, damping: 8 }} style={{ transformOrigin: '110px 110px' }} aria-label={label}>
      <path d="M110 110 L103 110 L110 50 L117 110Z" fill={color} opacity=".9" />
      <circle cx="110" cy="52" r="6" fill={color} stroke="#fff" strokeWidth="2" />
    </motion.g>
  )
}
function CompassDial({ mine, theirs }: { mine?: number; theirs?: number }) {
  return (
    <svg viewBox="0 0 220 220" className="mx-auto w-[220px]" role="img" aria-label="Boussole des réactions">
      <circle cx="110" cy="110" r="100" fill="#fff" stroke="#231C39" strokeOpacity=".12" strokeWidth="3" />
      <circle cx="110" cy="110" r="84" fill="#EDE5F4" opacity=".6" />
      {['Dire', 'S’adapter', 'Recul', 'Compromis'].map((t, i) => {
        const a = (i * 90 - 90) * (Math.PI / 180)
        return <text key={t} x={110 + Math.cos(a) * 84 * (i % 2 === 1 ? 0.86 : 1)} y={110 + Math.sin(a) * 84 + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#231C39" opacity=".65">{t}</text>
      })}
      {mine !== undefined && <Needle angle={mine} color="#A88BC7" label="Ton choix" />}
      {theirs !== undefined && <Needle angle={theirs} color="#F6B7A0" label="Son choix" />}
      <circle cx="110" cy="110" r="8" fill="#231C39" />
    </svg>
  )
}

function Compass() {
  const g = useStore((s) => s.games.compass)
  const { startCompass, compassAnswer, compassFinish, send } = useStore()
  const { partner } = useEnc()
  const close = useUI((s) => s.close)
  const [idx, setIdx] = useState(0)
  const [sel, setSel] = useState<string | null>(null)
  const [reveal, setReveal] = useState(false)
  const [react, setReact] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [burst, setBurst] = useState(0)

  useEffect(() => { if (!g) startCompass() }, [g, startCompass])
  const firstOpen = useMemo(() => (g ? g.ids.findIndex((id) => !g.mine[id]) : 0), [g?.ids.join(), g?.done]) // eslint-disable-line
  useEffect(() => { if (g && firstOpen > 0) setIdx(firstOpen); if (g && firstOpen === -1) setIdx(g.ids.length - 1) }, []) // eslint-disable-line
  useEffect(() => { setReveal(false); if (!g) return; const sid = g.ids[idx]; if (g.mine[sid]) { const t = setTimeout(() => setReveal(true), 900); return () => clearTimeout(t) } }, [idx, g?.mine[g?.ids[idx] ?? ''] ]) // eslint-disable-line
  if (!g || !partner) return null
  const sid = g.ids[idx]
  const sc = COMPASS.find((c) => c.id === sid)!
  const my = g.mine[sid], their = g.theirs[sid]
  const myWay = sc.ways.find((w) => w.id === my), theirWay = sc.ways.find((w) => w.id === their)
  const last = idx === g.ids.length - 1
  const delta = myWay && theirWay ? Math.min(Math.abs(myWay.angle - theirWay.angle), 360 - Math.abs(myWay.angle - theirWay.angle)) : 0

  if (g.done) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center" data-testid="compass-done">
        <Buddy size={90} mood="happy" arms="up" />
        <h2 className="font-display mt-2 text-[26px] font-semibold">Belle exploration !</h2>
        <p className="mx-auto mt-2 max-w-[310px] text-[15px] text-plum/75">Il n’y a pas de bonne boussole. Vos différences sont des conversations en attente.</p>
        <div className="mt-5 flex flex-col gap-2"><Button onClick={() => { setIdx(0); setReveal(false); setSel(null); setReact(null); startCompass() }} testId="compass-again" full>Explorer d’autres situations</Button><Button variant="ghost" onClick={close}>Terminer</Button></div>
      </motion.div>
    )
  }
  return (
    <div className="relative">
      <Burst trigger={burst} />
      <p className="mb-2 text-center text-[12.5px] font-semibold text-plum/55">Situation {idx + 1} / {g.ids.length}</p>
      <div className="rounded-[28px] bg-mint p-5 text-center shadow-soft"><p className="kicker">{sc.title}</p><h2 className="font-display mt-1 text-[22px] font-semibold leading-snug text-balance" data-testid="compass-text">{sc.text}</h2></div>
      <div className="mt-4"><CompassDial mine={myWay ? myWay.angle : sel ? sc.ways.find((w) => w.id === sel)!.angle : undefined} theirs={reveal && theirWay ? theirWay.angle : undefined} /></div>
      {!my ? (
        <div className="mt-3 flex flex-col gap-2.5">
          <p className="text-center text-[13.5px] text-plum/65">Comment réagirais-tu ?</p>
          {sc.ways.map((w) => (
            <motion.button key={w.id} type="button" data-testid={`way-${w.id}`} aria-pressed={sel === w.id} whileTap={{ scale: 0.97 }} onClick={() => { setSel(w.id); sfx.select(); buzz(8) }}
              className={cn('min-h-[58px] rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-semibold leading-snug', sel === w.id ? 'border-plum bg-lavender-100 shadow-pop' : 'border-plum/10 bg-white')}>{w.label}</motion.button>
          ))}
          <Button disabled={!sel} onClick={() => { compassAnswer(sid, sel!); sfx.place() }} testId="compass-validate" full>Valider ma réaction</Button>
        </div>
      ) : (
        <div className="mt-3 space-y-3" aria-live="polite">
          <div className="flex justify-center gap-4 text-[12.5px] font-semibold"><span><i className="mr-1.5 inline-block h-3 w-3 rounded-full bg-lavender align-middle" />Toi</span><span><i className="mr-1.5 inline-block h-3 w-3 rounded-full bg-peach align-middle" />{partner.pseudo}</span></div>
          {!reveal ? <p className="text-center text-[15px] text-plum/70" data-testid="compass-wait">{partner.pseudo} choisit sa direction…</p> : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3" data-testid="compass-reveal">
              <div className="card p-4 text-[14.5px] leading-snug"><p><b className="text-plum">Toi :</b> {myWay!.label}<br /><span className="text-plum/65">{myWay!.why}</span></p><p className="mt-3"><b>{partner.pseudo} :</b> {theirWay!.label}<br /><span className="text-plum/65">{theirWay!.why}</span></p></div>
              <p className="rounded-2xl bg-lavender-100 p-3.5 text-center text-[14px] font-medium" data-testid="compass-verdict">{delta === 0 ? 'Vous avez choisi la même direction. Et si vous en parliez pour comprendre pourquoi ?' : delta === 90 ? 'Des chemins voisins. Ni meilleurs ni moins bons : juste deux façons de tenir à quelqu’un.' : 'Des chemins opposés. Aucun n’est meilleur : chacun répond à un besoin différent.'}</p>
              <div className="flex justify-center gap-2" role="group" aria-label="Réagir">
                {[['😄', 'Ça me ressemble'], ['🤔', 'Intéressant'], ['💬', 'J’aimerais en parler']].map(([e, t]) => (
                  <button key={e} type="button" aria-label={t} aria-pressed={react === e} data-testid={`react-${e}`} onClick={() => { setReact(e); sfx.select(); setBurst(Date.now()); send(`🧭 ${e} ${t} — « ${sc.title} »`) }} className={cn('grid h-12 min-w-[56px] place-items-center rounded-2xl text-2xl', react === e ? 'bg-peach' : 'bg-plum/[.07]')}>{e}</button>
                ))}
              </div>
              <input className="field" data-testid="compass-comment" aria-label="Un commentaire" maxLength={160} placeholder="Un commentaire pour l’autre (facultatif)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <Button onClick={() => { if (comment.trim()) { send(`🧭 ${comment.trim()}`); setComment('') } sfx.next(); if (last) { compassFinish(); setBurst(Date.now()); sfx.success() } else { setIdx(idx + 1); setSel(null); setReact(null) } }} testId="compass-next" full>{last ? 'Terminer' : 'Situation suivante'}</Button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

// ====================== LE PONT ======================
type Shape = 'flat' | 'round' | 'slant'
const SHAPES: Shape[] = ['flat', 'round', 'slant']
const NEED: Shape[] = ['round', 'flat', 'slant', 'round']
const shapePath = (s: Shape) => (s === 'flat' ? 'M0 0H40V14H0Z' : s === 'round' ? 'M0 14V8Q0 0 8 0H32Q40 0 40 8V14Z' : 'M8 0H40L32 14H0Z')
const SLOT_X = (k: number) => 92 + k * 46

function Bridge() {
  const g = useStore((s) => s.games.bridge)
  const { startBridge, bridgePlace, bridgeTick, bridgeStone } = useStore()
  const { partner } = useEnc()
  const close = useUI((s) => s.close)
  const [wrong, setWrong] = useState(0)
  const [tries, setTries] = useState(0)
  const [burst, setBurst] = useState(0)
  const [flying, setFlying] = useState<Shape | null>(null)

  useEffect(() => { if (!g || g.done && false) startBridge() }, [g, startBridge])
  useEffect(() => { const t = setInterval(bridgeTick, 450); return () => clearInterval(t) }, [bridgeTick])
  const locked = g ? bridgeLocked(g) : 0
  const [lastLocked, setLastLocked] = useState(0)
  useEffect(() => { if (locked > lastLocked) { sfx.place(); buzz(14); setBurst(Date.now()); setLastLocked(locked) } }, [locked, lastLocked])
  useEffect(() => { if (g?.done) { sfx.success(); setBurst(Date.now()) } }, [g?.done])
  if (!g || !partner) return null

  const k = g.mine // index de ma prochaine pièce
  const need = NEED[Math.min(k, BRIDGE_SEGMENTS - 1)]
  const place = (s: Shape) => {
    if (g.mine >= BRIDGE_SEGMENTS || flying) return
    if (s === need) { setFlying(s); sfx.place(); setTimeout(() => { bridgePlace(); setFlying(null); setTries(0) }, 380) }
    else { setWrong((w) => w + 1); setTries((t) => t + 1); sfx.oops(); buzz(20) }
  }
  const allMine = g.mine >= BRIDGE_SEGMENTS
  const waiting = g.mine > g.theirs

  return (
    <div className="relative" data-testid="bridge">
      <Burst trigger={burst} count={22} />
      <div className="overflow-hidden rounded-[28px] bg-gradient-to-b from-lavender-100 to-cream-200 shadow-soft">
        <svg viewBox="0 0 360 200" className="w-full" role="img" aria-label={`Pont en construction : ${locked} sur ${BRIDGE_SEGMENTS} sections assemblées`}>
          <circle cx="300" cy="40" r="18" fill="#F6B7A0" opacity=".7" />
          <path d="M0 150 Q60 140 80 150 L80 200 L0 200Z" fill="#CDE8DA" /><path d="M360 150 Q300 140 280 150 L280 200 L360 200Z" fill="#CDE8DA" />
          <rect x="0" y="152" width="82" height="48" fill="#A3CDB6" /><rect x="278" y="152" width="82" height="48" fill="#A3CDB6" />
          {[0, 1, 2].map((i) => <motion.path key={i} d={`M82 ${168 + i * 10} q 15 -7 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 26 0`} stroke="#A88BC7" strokeOpacity=".5" strokeWidth="3" fill="none" strokeLinecap="round" animate={{ x: [0, 8, 0] }} transition={{ duration: 3 + i, repeat: Infinity }} />)}
          {Array.from({ length: BRIDGE_SEGMENTS }).map((_, i) => (
            <g key={i} transform={`translate(${SLOT_X(i) - 20}, 140)`}>
              <path d={shapePath(NEED[i])} fill="none" stroke="#231C39" strokeOpacity=".3" strokeDasharray="3 3" strokeWidth="1.6" />
              {g.mine > i && <motion.path d={shapePath(NEED[i])} fill="#A88BC7" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 14 }} />}
              {g.theirs > i && <motion.path d="M-2 -2 Q20 -14 42 -2" stroke="#F6B7A0" strokeWidth="4" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />}
              {locked > i && <motion.path d={shapePath(NEED[i])} fill="none" stroke="#231C39" strokeWidth="1.8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />}
            </g>
          ))}
          {allMine && g.theirs >= BRIDGE_SEGMENTS && (
            <g transform="translate(178,108)">
              <motion.path d="M-14 12 L0 -8 L14 12Z" fill={g.stone.me && g.stone.partner ? '#F6B7A0' : '#fff'} stroke="#231C39" strokeWidth="2" animate={g.done ? { y: [0, -3, 0] } : { opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1.6 }} />
            </g>
          )}
        </svg>
        <div className="pointer-events-none relative -mt-[88px] flex items-end justify-between px-3 pb-2">
          <motion.div animate={g.done ? { x: 108 } : { x: 0 }} transition={{ duration: 1.6, ease: 'easeInOut' }}><Buddy size={58} color="#A88BC7" accent="#F6B7A0" mood={g.done ? 'shy' : 'happy'} arms={g.done ? 'up' : 'down'} /></motion.div>
          <motion.div animate={g.done ? { x: -108 } : { x: 0 }} transition={{ duration: 1.6, ease: 'easeInOut' }}><Buddy size={58} color="#F6B7A0" accent="#A88BC7" flip mood={g.done ? 'shy' : waiting ? 'think' : 'happy'} arms={g.done ? 'up' : 'down'} /></motion.div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-2.5 text-[13px] font-semibold">
        <span><i className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-lavender align-middle" />Tes planches {Math.min(g.mine, 4)}/4</span>
        <span><i className="mr-1.5 inline-block h-3 w-3 rounded-sm bg-peach align-middle" />Ses cordes {g.theirs}/4</span>
      </div>

      {g.done ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="mt-5 text-center" data-testid="bridge-done">
          <h2 className="font-display text-[26px] font-semibold">Vous l’avez construit ensemble 🌉</h2>
          <p className="mx-auto mt-2 max-w-[300px] text-[15px] text-plum/75">Deux rives, deux séries de pièces, un seul pont. Chacun a apporté ce qui manquait à l’autre.</p>
          <div className="mt-4 flex flex-col gap-2"><Button onClick={() => { startBridge(); setLastLocked(0) }} testId="bridge-again" full>Reconstruire un pont</Button><Button variant="ghost" onClick={close}>Terminer</Button></div>
        </motion.div>
      ) : !allMine ? (
        <div className="mt-4" data-testid="bridge-tray">
          <p className="mb-2 text-center text-[14px] text-plum/75">Section {k + 1} : cherche la planche qui s’emboîte dans le gabarit en pointillés.</p>
          <div className="flex justify-center gap-3">
            {SHAPES.map((s) => (
              <motion.button key={s} type="button" data-testid={`piece-${s}`} aria-label={`Planche ${s === 'flat' ? 'droite' : s === 'round' ? 'arrondie' : 'biseautée'}`} whileTap={{ scale: 0.9 }}
                animate={wrong && tries > 0 && s !== need ? { x: [0, -4, 4, 0] } : undefined} onClick={() => place(s)}
                className={cn('grid h-[76px] w-[96px] place-items-center rounded-2xl border-2 bg-white shadow-soft', tries >= 2 && s === need ? 'border-peach ring-4 ring-peach/40' : 'border-plum/10')}>
                <svg viewBox="-4 -4 48 22" width="62"><path d={shapePath(s)} fill="#A88BC7" /></svg>
              </motion.button>
            ))}
          </div>
          <p className="mt-2 h-5 text-center text-[13px] text-plum/60" aria-live="polite">{tries > 0 ? 'Hmm, ça ne s’emboîte pas tout à fait. Essaie-en une autre 🙂' : ''}</p>
        </div>
      ) : (
        <div className="mt-4 text-center" aria-live="polite">
          {g.theirs < BRIDGE_SEGMENTS ? <p className="text-[15px] text-plum/75" data-testid="bridge-wait">Tes planches sont posées. {partner.pseudo} termine ses cordes…</p> : (
            <>
              <p className="mb-3 text-[15px] text-plum/75">Dernière étape : posez la clé de voûte, chacun votre moitié.</p>
              <Button onClick={() => bridgeStone()} disabled={g.stone.me} testId="bridge-stone" full>{g.stone.me ? 'Ta moitié est posée ✓' : 'Poser ma moitié de pierre'}</Button>
            </>
          )}
        </div>
      )}
      {waiting && !g.done && !allMine && <p className="mt-2 text-center text-[13px] text-plum/55">Prends ton temps : {partner.pseudo} avance de son côté.</p>}
      <AnimatePresence />
    </div>
  )
}
