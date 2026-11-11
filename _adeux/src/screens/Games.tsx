import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Burst, Button, Screen, useBusy } from '../ui/kit'
import { Logo } from '../ui/Art'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { BRIDGE_SEGMENTS, COMPASS, MIRROR } from '../lib/content'
import { canInteract } from '../lib/journey'
import { bridgeLocked } from '../lib/games'
import { useEnc } from '../ui/shared'
import { sfx } from '../lib/audio'
import { buzz } from '../lib/haptics'
import { cn } from '../lib/util'

const ease = [0.22, 0.8, 0.24, 1] as [number, number, number, number]

export function GameScreen({ kind }: { kind: 'mirror' | 'compass' | 'bridge' }) {
  const close = useUI((s) => s.close)
  const { enc, partner } = useEnc()
  useBusy(true)
  const title = kind === 'mirror' ? 'Le Miroir' : kind === 'bridge' ? 'Le Pont' : 'La Boussole'
  const dark = kind === 'compass'
  if (!enc || !partner || !canInteract(enc)) {
    return <Screen title={title} onBack={close}><div className="p-8 text-center"><p className="font-display text-[30px] leading-tight">Cette rencontre n’est plus active.</p><div className="mt-6"><Button onClick={close} testId="game-exit">Retour</Button></div></div></Screen>
  }
  return (
    <Screen title={title} onBack={close} closeIcon dark={dark} testId={`game-${kind}-screen`}>
      <div className="mx-auto max-w-[520px] pb-10">
        {kind === 'mirror' ? <Mirror /> : kind === 'compass' ? <Compass /> : <Bridge />}
        <p className="mt-10 text-center text-[11px] tracking-wide" style={{ opacity: 0.4 }}>Démonstration · {partner.pseudo} est un personnage fictif</p>
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
  const [ring, setRing] = useState(0)
  const [talk, setTalk] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => { if (!g) startMirror() }, [g, startMirror])
  useEffect(() => { const t = setInterval(mirrorTick, 400); return () => clearInterval(t) }, [mirrorTick])
  if (!g || !partner) return null
  const q = MIRROR.find((m) => m.id === g.qid)!
  const label = (id?: string) => q.options.find((o) => o.id === id)
  const ready = !!g.mine && !!g.theirs

  return (
    <div className="relative">
      <Burst trigger={ring} />
      <p className="kicker mt-2">Une question pour deux</p>
      <h2 className="font-display mt-4 text-[clamp(34px,9.8vw,46px)] leading-[1.03] text-balance" data-testid="mirror-q">{q.q}</h2>

      {!g.mine && (
        <div className="mt-8">
          <p className="mb-2 text-[13.5px] text-plum/55">Réponds en secret. {partner.pseudo} ne verra rien avant que vous révéliez ensemble.</p>
          <ul className="border-b border-plum/12">
            {q.options.map((o, i) => (
              <li key={o.id} className="border-t border-plum/12">
                <motion.button type="button" data-testid={`mirror-opt-${o.id}`} aria-pressed={pick === o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease }} whileTap={{ x: 3 }}
                  onClick={() => { setPick(o.id); sfx.select(); buzz(6) }} className="flex min-h-[64px] w-full items-center gap-4 py-4 text-left">
                  <span className={cn('grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border transition-colors duration-300', pick === o.id ? 'border-plum bg-plum' : 'border-plum/30')}><motion.span initial={false} animate={{ scale: pick === o.id ? 1 : 0 }} className="h-2 w-2 rounded-full bg-cream" /></span>
                  <span className={cn('font-display text-[24px] leading-[1.15] transition-colors', pick === o.id ? 'text-plum' : 'text-plum/70')}>{o.label}</span>
                </motion.button>
              </li>
            ))}
          </ul>
          <input className="field mt-4" data-testid="mirror-note" maxLength={120} placeholder="Un mot en plus (facultatif)" aria-label="Un mot en plus" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-8"><Button disabled={!pick} onClick={() => { mirrorAnswer(pick!, note.trim()); sfx.place() }} testId="mirror-lock" full>Sceller ma réponse</Button></div>
        </div>
      )}

      {g.mine && (
        <div className="mt-10">
          <div className="grid grid-cols-2 gap-3" style={{ perspective: 1100 }}>
            <Panel flipped={g.flipped} who="Toi" ready testId="card-me" face={<Face text={label(g.mine.opt)!.label} note={g.mine.note} />} />
            <Panel flipped={g.flipped} who={partner.pseudo} ready={!!g.theirs} testId="card-partner" face={g.theirs ? <Face text={label(g.theirs.opt)!.label} note={g.theirs.note} /> : null} />
          </div>
          {!g.flipped && (
            <div className="mt-8 text-center" aria-live="polite">
              {!g.theirs ? <p className="text-[15px] text-plum/60" data-testid="mirror-wait">{partner.pseudo} réfléchit… Tu peux fermer, sa réponse t’attendra.</p> : <Button onClick={() => { mirrorFlip(); sfx.flip(); buzz([8, 30, 14]); setRing(Date.now()) }} testId="mirror-flip" full>Révéler ensemble</Button>}
              {!g.theirs && <div className="mt-2 flex justify-center"><Button variant="ghost" onClick={close} testId="mirror-later">Revenir plus tard</Button></div>}
            </div>
          )}
          {g.flipped && ready && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7, ease }} className="mt-10" data-testid="mirror-after">
              <p className="kicker">Pour en parler</p>
              <p className="font-display mt-3 text-[28px] leading-[1.1]">{q.follow}</p>
              {sent ? <p className="mt-5 text-[14px] text-mint-600">Envoyé dans votre conversation.</p> : (
                <><input className="field mt-4" data-testid="mirror-talk" aria-label="Ta réponse" maxLength={200} placeholder="Ta réponse…" value={talk} onChange={(e) => setTalk(e.target.value)} />
                  <div className="mt-4"><Button variant="soft" disabled={!talk.trim()} onClick={() => { send(talk.trim()); setSent(true); sfx.msg() }} testId="mirror-send" full>Envoyer dans la conversation</Button></div></>
              )}
              <div className="mt-8 flex flex-col gap-1"><Button onClick={() => { setPick(null); setNote(''); setTalk(''); setSent(false); startMirror() }} testId="mirror-again" full>Une autre question</Button><div className="flex justify-center"><Button variant="ghost" onClick={close}>Terminer</Button></div></div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}

function Face({ text, note }: { text: string; note?: string }) {
  return <div className="flex h-full flex-col justify-between p-5 text-left"><span className="font-display text-[26px] leading-[1.08]">{text}</span>{note && <span className="mt-3 text-[12.5px] italic leading-snug text-plum/60">« {note} »</span>}</div>
}
function Panel({ flipped, who, face, ready, testId }: { flipped: boolean; who: string; face: React.ReactNode; ready: boolean; testId: string }) {
  return (
    <div data-testid={testId}>
      <p className="kicker mb-3">{who}</p>
      <motion.div className="relative h-[210px] w-full" style={{ transformStyle: 'preserve-3d' }} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 55, damping: 15, mass: 1.1 }}>
        <div className="absolute inset-0 grid place-items-center rounded-[22px] bg-plum" style={{ backfaceVisibility: 'hidden' }}>
          <motion.div animate={ready && !flipped ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.5 }} transition={{ duration: 2.6, repeat: Infinity }}><Logo size={46} color="#FDF7EF" mono /></motion.div>
        </div>
        <div className="absolute inset-0 rounded-[22px] bg-lavender" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>{face}</div>
      </motion.div>
    </div>
  )
}

// ====================== LA BOUSSOLE ======================
const DIRS = [{ id: 'n', angle: 0, name: 'Dire' }, { id: 'e', angle: 90, name: 'S’adapter' }, { id: 's', angle: 180, name: 'Recul' }, { id: 'w', angle: 270, name: 'Compromis' }]
const POS: Record<string, string> = { n: 'left-1/2 top-[10%] -translate-x-1/2', e: 'right-[7%] top-1/2 -translate-y-1/2', s: 'bottom-[10%] left-1/2 -translate-x-1/2', w: 'left-[7%] top-1/2 -translate-y-1/2' }

function Needle({ angle, color, label, len = 104 }: { angle: number; color: string; label: string; len?: number }) {
  return (
    <g transform="translate(160 160)" aria-label={label}>
      <motion.g initial={{ rotate: 0 }} animate={{ rotate: angle }} transition={{ type: 'spring', stiffness: 45, damping: 10, mass: 1.1 }} style={{ originX: 0.5, originY: 1 }}>
        <line x1="0" y1="0" x2="0" y2={-len} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="0" cy={-len} r="5" fill={color} />
      </motion.g>
    </g>
  )
}

function Dial({ mine, theirs, onPick, picked, interactive }: { mine?: number; theirs?: number; onPick?: (id: string) => void; picked?: string | null; interactive: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const pointer = (e: React.PointerEvent) => {
    if (!interactive || !box.current || !onPick) return
    const r = box.current.getBoundingClientRect()
    const a = (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI
    const snapped = (Math.round(((a + 360) % 360) / 90) * 90) % 360
    const d = DIRS.find((x) => x.angle === snapped)!
    if (d.id !== picked) onPick(d.id)
  }
  const ticks = useMemo(() => Array.from({ length: 72 }, (_, i) => i), [])
  return (
    <div ref={box} className="relative mx-auto aspect-square w-full max-w-[320px] touch-none select-none"
      onPointerDown={(e) => { dragging.current = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); pointer(e) }}
      onPointerMove={(e) => dragging.current && pointer(e)} onPointerUp={() => (dragging.current = false)} onPointerCancel={() => (dragging.current = false)}>
      <svg viewBox="0 0 320 320" className="absolute inset-0 h-full w-full" role="img" aria-label="Boussole des réactions">
        <circle cx="160" cy="160" r="150" stroke="#FDF7EF" strokeOpacity=".28" fill="none" />
        <circle cx="160" cy="160" r="96" stroke="#FDF7EF" strokeOpacity=".12" fill="none" />
        {ticks.map((i) => { const a = (i * 5 * Math.PI) / 180, big = i % 18 === 0; return <line key={i} x1={160 + Math.sin(a) * (big ? 138 : 143)} y1={160 - Math.cos(a) * (big ? 138 : 143)} x2={160 + Math.sin(a) * 150} y2={160 - Math.cos(a) * 150} stroke="#FDF7EF" strokeOpacity={big ? 0.8 : 0.3} /> })}
        {mine !== undefined && <Needle angle={mine} color="#FDF7EF" label="Ton choix" />}
        {theirs !== undefined && <Needle angle={theirs} color="#FFC4AB" label="Son choix" len={84} />}
        <circle cx="160" cy="160" r="5" fill="#FDF7EF" />
      </svg>
      {DIRS.map((d) => (
        <button key={d.id} type="button" data-testid={interactive ? `way-${d.id}` : undefined} disabled={!interactive} aria-label={d.name} aria-pressed={picked === d.id} onClick={(e) => { e.stopPropagation(); onPick?.(d.id) }}
          className={cn('absolute min-h-[44px] min-w-[44px] rounded-full px-2 text-[11px] font-medium uppercase tracking-[.14em] transition-colors duration-300', POS[d.id], picked === d.id ? 'text-peach' : 'text-cream/60')}>{d.name}</button>
      ))}
    </div>
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
  const [ring, setRing] = useState(0)

  useEffect(() => { if (!g) startCompass() }, [g, startCompass])
  const firstOpen = useMemo(() => (g ? g.ids.findIndex((id) => !g.mine[id]) : 0), [g?.ids.join(), g?.done]) // eslint-disable-line
  useEffect(() => { if (g && firstOpen > 0) setIdx(firstOpen); if (g && firstOpen === -1) setIdx(g.ids.length - 1) }, []) // eslint-disable-line
  useEffect(() => { setReveal(false); if (!g) return; const sid = g.ids[idx]; if (g.mine[sid]) { const t = setTimeout(() => setReveal(true), 900); return () => clearTimeout(t) } }, [idx, g?.mine[g?.ids[idx] ?? '']]) // eslint-disable-line
  if (!g || !partner) return null
  const sid = g.ids[idx]
  const sc = COMPASS.find((c) => c.id === sid)!
  const my = g.mine[sid], their = g.theirs[sid]
  const myWay = sc.ways.find((w) => w.id === my), theirWay = sc.ways.find((w) => w.id === their)
  const selWay = sc.ways.find((w) => w.id === sel)
  const last = idx === g.ids.length - 1
  const delta = myWay && theirWay ? Math.min(Math.abs(myWay.angle - theirWay.angle), 360 - Math.abs(myWay.angle - theirWay.angle)) : 0
  const chips = ['Ça me ressemble', 'Intéressant', 'J’aimerais en parler']

  if (g.done) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-10 text-center" data-testid="compass-done">
        <div className="flex justify-center"><Logo size={52} color="#FDF7EF" mono /></div>
        <h2 className="font-display mt-8 text-[44px] leading-[1.0]">Belle exploration.</h2>
        <p className="mx-auto mt-4 max-w-[300px] text-[15px] leading-relaxed text-cream/65">Il n’y a pas de bonne boussole. Vos différences sont des conversations en attente.</p>
        <div className="mt-10 flex flex-col gap-1"><Button variant="peach" onClick={() => { setIdx(0); setReveal(false); setSel(null); setReact(null); startCompass() }} testId="compass-again" full>Explorer d’autres situations</Button><div className="flex justify-center"><Button variant="ghost" className="!text-cream/70" onClick={close}>Terminer</Button></div></div>
      </motion.div>
    )
  }
  return (
    <div className="relative">
      <Burst trigger={ring} />
      <p className="kicker mt-2" style={{ color: 'rgba(253,247,239,.5)' }}>Situation {idx + 1} sur {g.ids.length} · {sc.title}</p>
      <h2 className="font-display mt-4 text-[clamp(30px,8.6vw,40px)] leading-[1.06] text-balance" data-testid="compass-text">{sc.text}</h2>
      <div className="mt-8">
        <Dial mine={myWay ? myWay.angle : selWay?.angle} theirs={reveal && theirWay ? theirWay.angle : undefined} picked={my ?? sel} interactive={!my} onPick={(id) => { setSel(id); sfx.select(); buzz(6) }} />
      </div>

      {!my ? (
        <div className="mt-6 text-center">
          <p className="font-display min-h-[78px] text-[24px] leading-[1.15]" aria-live="polite">{selWay ? selWay.label : <span className="text-cream/45">Touche ou fais glisser pour choisir ta direction.</span>}</p>
          <div className="mt-6"><Button variant="peach" disabled={!sel} onClick={() => { compassAnswer(sid, sel!); sfx.place() }} testId="compass-validate" full>Valider ma réaction</Button></div>
        </div>
      ) : (
        <div className="mt-6" aria-live="polite">
          {!reveal ? <p className="text-center text-[15px] text-cream/60" data-testid="compass-wait">{partner.pseudo} choisit sa direction…</p> : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} data-testid="compass-reveal">
              <div className="border-t border-cream/15 py-4"><p className="kicker" style={{ color: 'rgba(253,247,239,.5)' }}>Toi</p><p className="font-display mt-1.5 text-[22px] leading-snug">{myWay!.label}</p><p className="mt-1 text-[13px] text-cream/55">{myWay!.why}</p></div>
              <div className="border-t border-cream/15 py-4"><p className="kicker" style={{ color: 'rgba(255,196,171,.8)' }}>{partner.pseudo}</p><p className="font-display mt-1.5 text-[22px] italic leading-snug">{theirWay!.label}</p><p className="mt-1 text-[13px] text-cream/55">{theirWay!.why}</p></div>
              <p className="border-t border-cream/15 py-4 text-[14px] leading-relaxed text-cream/75" data-testid="compass-verdict">{delta === 0 ? 'Même direction. Et si vous en parliez pour comprendre pourquoi ?' : delta === 90 ? 'Des chemins voisins. Ni meilleurs ni moins bons : deux façons de tenir à quelqu’un.' : 'Des chemins opposés. Aucun n’est meilleur : chacun répond à un besoin différent.'}</p>
              <div className="flex flex-wrap gap-2 py-2" role="group" aria-label="Réagir">
                {chips.map((t, i) => <button key={t} type="button" aria-pressed={react === t} data-testid={`react-${i}`} onClick={() => { setReact(t); sfx.select(); setRing(Date.now()); send(`${t} — « ${sc.title} »`) }} className={cn('min-h-[44px] rounded-full border px-4 text-[13.5px] transition-colors', react === t ? 'border-peach bg-peach text-plum' : 'border-cream/30 text-cream/80')}>{t}</button>)}
              </div>
              <input className="field mt-3 !border-cream/30 !text-cream placeholder:!text-cream/35 focus:!border-cream" data-testid="compass-comment" aria-label="Un commentaire" maxLength={160} placeholder="Un mot pour l’autre (facultatif)" value={comment} onChange={(e) => setComment(e.target.value)} />
              <div className="mt-6"><Button variant="peach" onClick={() => { if (comment.trim()) { send(comment.trim()); setComment('') } sfx.next(); if (last) { compassFinish(); setRing(Date.now()); sfx.success() } else { setIdx(idx + 1); setSel(null); setReact(null) } }} testId="compass-next" full>{last ? 'Terminer' : 'Situation suivante'}</Button></div>
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
const SHAPE_NAME: Record<Shape, string> = { flat: 'droite', round: 'cintrée', slant: 'biseautée' }
const shapePath = (s: Shape) => (s === 'flat' ? 'M0 2H40V16H0Z' : s === 'round' ? 'M0 16V10Q0 0 20 0Q40 0 40 10V16Z' : 'M9 2H40L31 16H0Z')
const SLOT_X = (k: number) => 98 + k * 44

function Bridge() {
  const g = useStore((s) => s.games.bridge)
  const { startBridge, bridgePlace, bridgeTick, bridgeStone } = useStore()
  const { partner } = useEnc()
  const close = useUI((s) => s.close)
  const [tries, setTries] = useState(0)
  const [ring, setRing] = useState(0)
  const [flying, setFlying] = useState(false)
  const [lastLocked, setLastLocked] = useState(0)

  useEffect(() => { if (!g) startBridge() }, [g, startBridge])
  useEffect(() => { const t = setInterval(bridgeTick, 450); return () => clearInterval(t) }, [bridgeTick])
  const locked = g ? bridgeLocked(g) : 0
  useEffect(() => { if (locked > lastLocked) { sfx.place(); buzz(12); setRing(Date.now()); setLastLocked(locked) } }, [locked, lastLocked])
  useEffect(() => { if (g?.done) { sfx.success(); setRing(Date.now()) } }, [g?.done])
  if (!g || !partner) return null

  const k = g.mine
  const need = NEED[Math.min(k, BRIDGE_SEGMENTS - 1)]
  const place = (s: Shape) => {
    if (g.mine >= BRIDGE_SEGMENTS || flying) return
    if (s === need) { setFlying(true); sfx.place(); setTimeout(() => { bridgePlace(); setFlying(false); setTries(0) }, 360) }
    else { setTries((t) => t + 1); sfx.oops(); buzz(16) }
  }
  const allMine = g.mine >= BRIDGE_SEGMENTS
  const bothReady = allMine && g.theirs >= BRIDGE_SEGMENTS

  return (
    <div className="relative" data-testid="bridge">
      <Burst trigger={ring} />
      <p className="kicker mt-2">Deux rives, une construction</p>
      <h2 className="font-display mt-4 text-[clamp(34px,9.8vw,46px)] leading-[1.03] text-balance">{g.done ? 'Le pont est achevé.' : 'Construire ensemble, pierre après pierre.'}</h2>

      <div className="-mx-[28px] mt-7 overflow-hidden bg-gradient-to-b from-lavender to-cream-200">
        <svg viewBox="0 0 360 230" className="w-full" role="img" aria-label={`Pont en construction : ${locked} sections sur ${BRIDGE_SEGMENTS}`}>
          <motion.circle cx="290" cy="58" r="22" fill="#FFC4AB" initial={{ opacity: 0.7 }} animate={{ opacity: g.done ? 1 : 0.7, scale: g.done ? 1.12 : 1 }} style={{ transformOrigin: '290px 58px' }} transition={{ duration: 1.6 }} />
          <rect x="0" y="160" width="86" height="70" fill="#3B1F4D" /><rect x="274" y="160" width="86" height="70" fill="#3B1F4D" />
          {[0, 1, 2].map((i) => <motion.path key={i} d={`M86 ${186 + i * 12} q 22 -6 44 0 t 44 0 t 44 0 t 44 0`} stroke="#3B1F4D" strokeOpacity=".22" strokeWidth="1" fill="none" animate={{ x: [0, 10, 0] }} transition={{ duration: 6 + i * 1.5, repeat: Infinity, ease: 'easeInOut' }} />)}
          <line x1="86" y1="160" x2="274" y2="160" stroke="#3B1F4D" strokeOpacity=".15" strokeDasharray="2 5" />
          {Array.from({ length: BRIDGE_SEGMENTS }).map((_, i) => (
            <g key={i} transform={`translate(${SLOT_X(i) - 20}, 144)`}>
              <path d={shapePath(NEED[i])} fill="none" stroke="#3B1F4D" strokeOpacity=".35" strokeDasharray="2 3" strokeWidth="1" />
              {g.mine > i && <motion.path d={shapePath(NEED[i])} fill="#3B1F4D" initial={{ y: -46, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }} />}
              {g.theirs > i && <motion.path d="M-3 -4 Q20 -22 43 -4" stroke="#B8593A" strokeWidth="1.6" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease }} />}
              {locked > i && <motion.rect x="-1" y="-1" width="42" height="18" rx="2" fill="none" stroke="#FFC4AB" strokeWidth="1.4" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.55] }} transition={{ duration: 1.2 }} />}
            </g>
          ))}
          {bothReady && <motion.path d="M168 124 L180 100 L192 124Z" fill={g.stone.me && g.stone.partner ? '#FFC4AB' : 'none'} stroke="#3B1F4D" strokeWidth="1.4" animate={g.done ? { opacity: 1 } : { opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 2 }} />}
          <motion.circle r="6" cy="150" fill="#FDF7EF" stroke="#3B1F4D" strokeWidth="1.5" initial={{ cx: 54 }} animate={{ cx: g.done ? 172 : 54 }} transition={{ duration: 2.2, ease: 'easeInOut' }} />
          <motion.circle r="6" cy="150" fill="#3B1F4D" initial={{ cx: 306 }} animate={{ cx: g.done ? 188 : 306 }} transition={{ duration: 2.2, ease: 'easeInOut' }} />
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between text-[12.5px] text-plum/60"><span>Tes pierres {Math.min(g.mine, 4)}/4</span><span>Ses câbles {g.theirs}/4</span></div>

      {g.done ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.7 }} className="mt-8" data-testid="bridge-done">
          <p className="font-display text-[26px] leading-snug">Chacun a apporté ce qui manquait à l’autre.</p>
          <div className="mt-8 flex flex-col gap-1"><Button onClick={() => { startBridge(); setLastLocked(0) }} testId="bridge-again" full>Construire un autre pont</Button><div className="flex justify-center"><Button variant="ghost" onClick={close}>Terminer</Button></div></div>
        </motion.div>
      ) : !allMine ? (
        <div className="mt-8" data-testid="bridge-tray">
          <p className="mb-4 text-center text-[14.5px] text-plum/65">Section {k + 1} · cherche la pierre qui épouse le gabarit en pointillés.</p>
          <div className="flex justify-center gap-3">
            {SHAPES.map((s) => (
              <motion.button key={s} type="button" data-testid={`piece-${s}`} aria-label={`Pierre ${SHAPE_NAME[s]}`} whileTap={{ scale: 0.94 }} animate={tries > 0 && s !== need ? { x: [0, -3, 3, 0] } : undefined} onClick={() => place(s)}
                className={cn('grid h-[76px] w-[96px] place-items-center rounded-[18px] border transition-colors', tries >= 2 && s === need ? 'border-plum bg-peach-200' : 'border-plum/20')}>
                <svg viewBox="-4 -4 48 24" width="58"><path d={shapePath(s)} fill="#3B1F4D" /></svg>
              </motion.button>
            ))}
          </div>
          <p className="mt-4 h-5 text-center text-[13px] text-plum/55" aria-live="polite">{tries > 0 ? 'Elle ne s’emboîte pas tout à fait. Essaie-en une autre.' : ''}</p>
        </div>
      ) : (
        <div className="mt-8 text-center" aria-live="polite">
          {!bothReady ? <p className="text-[15px] text-plum/65" data-testid="bridge-wait">Tes pierres sont posées. {partner.pseudo} termine ses câbles…</p> : (
            <><p className="mb-5 text-[15px] text-plum/65">Dernière étape : poser la clef de voûte, chacun sa moitié.</p><Button onClick={() => bridgeStone()} disabled={g.stone.me} testId="bridge-stone" full>{g.stone.me ? 'Ta moitié est posée' : 'Poser ma moitié de clef'}</Button></>
          )}
        </div>
      )}
    </div>
  )
}
