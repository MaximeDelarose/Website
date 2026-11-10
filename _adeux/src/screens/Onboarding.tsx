import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { Burst, Button, Progress, Screen } from '../ui/kit'
import { Buddy } from '../ui/Art'
import { CATEGORIES, GENDERS, QUESTIONS, REGIONS, answerLabel, type Question } from '../lib/content'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { ageFrom, isAdult } from '../lib/matching'
import type { Gender, Profile } from '../lib/types'
import { processPhoto, saveMyPhoto, removeMyPhoto } from '../lib/photo'
import { sfx } from '../lib/audio'
import { buzz } from '../lib/haptics'
import { cn } from '../lib/util'

// Étapes : 0 consentement · 1 identité · 2 préférences · 3 zone · 4 photo · 5..(5+N-1) questions · dernière = récap
const BASIC = 5
const RECAP = BASIC + QUESTIONS.length
const maxBirth = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().slice(0, 10) }

export const DEFAULT_PROFILE: Profile = {
  pseudo: '', birthdate: '', gender: 'woman', seeks: [], ageMin: 25, ageMax: 40, region: 'Île-de-France', scope: 'country', showExactAge: false, adultDeclared: false,
}

export function Onboarding() {
  const { profile, saveProfile, qIndex, setQIndex, finishOnboarding, onboarded } = useStore()
  const close = useUI((s) => s.close)
  const [draft, setDraft] = useState<Profile>(profile ?? DEFAULT_PROFILE)
  const [step, setStepRaw] = useState(() => Math.min(Math.max(qIndex, 0), RECAP))
  const [dir, setDir] = useState(1)
  const [fromRecap, setFromRecap] = useState(false)
  const [burst, setBurst] = useState(0)
  const [saved, setSaved] = useState(false)

  const setStep = (n: number) => { setDir(n >= step ? 1 : -1); setStepRaw(n); setQIndex(n); setSaved(true); setTimeout(() => setSaved(false), 1200) }
  const patch = (p: Partial<Profile>) => { const n = { ...draft, ...p }; setDraft(n); saveProfile(n) } // sauvegarde automatique

  const next = () => {
    sfx.next(); buzz(6)
    if (fromRecap && step >= BASIC && step < RECAP) { setFromRecap(false); setStep(RECAP); return }
    setStep(Math.min(step + 1, RECAP))
  }
  const back = () => { sfx.back(); if (step > 0) setStep(step - 1); else close() }

  const qi = step - BASIC
  const q = qi >= 0 && qi < QUESTIONS.length ? QUESTIONS[qi] : null
  const progress = step / RECAP
  const catBreak = q && (qi === 0 || QUESTIONS[qi - 1].cat !== q.cat)

  return (
    <Screen
      title={step === RECAP ? 'Ton récapitulatif' : q ? CATEGORIES[q.cat].name : 'Faisons connaissance'}
      onBack={back} testId="onboarding"
      right={saved ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] font-semibold text-mint-600" data-testid="autosave">✓ Enregistré</motion.span> : undefined}
    >
      <div className="relative mx-auto flex min-h-full max-w-[480px] flex-col pb-4">
        <Progress value={progress} color={q ? CATEGORIES[q.cat].color : '#A88BC7'} className="mb-4" />
        <Burst trigger={burst} />
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={step} custom={dir} className="flex flex-1 flex-col"
            initial={{ opacity: 0, x: 50 * dir, rotate: dir * 1.2 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={{ opacity: 0, x: -50 * dir }} transition={{ duration: 0.28 }}>
            {step === 0 && <Consent onNext={() => { patch({ adultDeclared: true }); next() }} />}
            {step === 1 && <Identity draft={draft} patch={patch} onNext={next} />}
            {step === 2 && <Prefs draft={draft} patch={patch} onNext={next} />}
            {step === 3 && <Area draft={draft} patch={patch} onNext={next} />}
            {step === 4 && <PhotoStep onNext={next} />}
            {q && <QuestionCard key={q.id} q={q} intro={!!catBreak && !fromRecap} index={qi} onDone={() => { setBurst(Date.now()); sfx.select(); setTimeout(next, 380) }} />}
            {step === RECAP && <Recap onEdit={(i) => { setFromRecap(true); setStep(BASIC + i) }} onFinish={() => { finishOnboarding(); sfx.success(); close(); useUI.getState().setTab('home'); useUI.getState().toast(onboarded ? 'Profil mis à jour ✓' : 'Ton profil est prêt. Bienvenue !', 'ok') }} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Screen>
  )
}

function Heading({ title, sub, buddy }: { title: string; sub?: string; buddy?: boolean }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-[28px] font-semibold leading-[1.1] text-balance" data-testid="step-title">{title}</h2>
        {sub && <p className="mt-2 text-[15px] leading-relaxed text-plum/70">{sub}</p>}
      </div>
      {buddy && <Buddy size={54} mood="happy" />}
    </div>
  )
}
function Foot({ children }: { children: React.ReactNode }) { return <div className="mt-auto flex flex-col gap-2 pt-6">{children}</div> }

function Consent({ onNext }: { onNext: () => void }) {
  const [ok18, setOk18] = useState(false)
  const [okData, setOkData] = useState(false)
  return (
    <>
      <Heading title="Avant de commencer" sub="Quelques mots sur ce que nous faisons de tes informations." buddy />
      <div className="card space-y-3 p-4 text-[14.5px] leading-relaxed text-plum/85">
        <p>• Tes <b>photos restent privées</b> : personne ne les voit tant que vous n’avez pas tous les deux dit oui.</p>
        <p>• Nous ne demandons que ce qui sert à te proposer une rencontre.</p>
        <p>• Tu peux <b>tout supprimer</b> à tout moment depuis ton profil.</p>
        <p className="text-[12.5px] text-plum/60">Version de test : la déclaration d’âge n’est pas une vérification d’identité. Politique de confidentialité à compléter avant tout lancement public.</p>
      </div>
      <label className="mt-4 flex min-h-[48px] items-start gap-3 text-[15px]"><input data-testid="adult-check" type="checkbox" className="mt-1 h-6 w-6 accent-[#231C39]" checked={ok18} onChange={(e) => setOk18(e.target.checked)} /><span>Je déclare avoir <b>18 ans ou plus</b>.</span></label>
      <label className="flex min-h-[48px] items-start gap-3 text-[15px]"><input data-testid="data-check" type="checkbox" className="mt-1 h-6 w-6 accent-[#231C39]" checked={okData} onChange={(e) => setOkData(e.target.checked)} /><span>J’accepte que mes réponses servent à me proposer des rencontres.</span></label>
      <Foot><Button onClick={onNext} disabled={!ok18 || !okData} testId="consent-next" full>Continuer</Button></Foot>
    </>
  )
}

function Identity({ draft, patch, onNext }: { draft: Profile; patch: (p: Partial<Profile>) => void; onNext: () => void }) {
  const age = draft.birthdate ? ageFrom(draft.birthdate) : null
  const underage = !!draft.birthdate && !isAdult(draft.birthdate)
  const invalidAge = !!draft.birthdate && (age === null || age < 18 || age > 99)
  const valid = draft.pseudo.trim().length >= 2 && !!draft.birthdate && !invalidAge
  return (
    <>
      <Heading title="Comment veux-tu qu’on t’appelle ?" sub="Un prénom ou un pseudonyme : c’est le seul nom que l’autre verra avant la révélation." />
      <label className="kicker mb-1.5 block" htmlFor="pseudo">Prénom ou pseudo</label>
      <input id="pseudo" data-testid="pseudo" className="field" value={draft.pseudo} maxLength={20} autoComplete="given-name" placeholder="Ex. Camille" onChange={(e) => patch({ pseudo: e.target.value })} />
      <label className="kicker mb-1.5 mt-5 block" htmlFor="bd">Date de naissance</label>
      <input id="bd" data-testid="birthdate" type="date" className="field" max={maxBirth()} value={draft.birthdate} onChange={(e) => patch({ birthdate: e.target.value })} />
      {underage && <p role="alert" data-testid="underage" className="mt-2 rounded-2xl bg-rose px-4 py-3 text-[14px] font-medium">À DEUX est réservé aux adultes (18 ans et plus). Reviens nous voir le jour de tes 18 ans.</p>}
      <p className="mt-2 text-[12.5px] text-plum/60">Utilisée uniquement pour calculer ton âge. Tu choisis si l’âge exact ou une tranche est visible.</p>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-plum/[.05] px-4 py-3">
        <span className="pr-3 text-[14.5px]">Afficher mon âge exact (sinon : une tranche)</span>
        <Toggle on={draft.showExactAge} onChange={(v) => patch({ showExactAge: v })} label="Afficher mon âge exact" testId="exact-age" />
      </div>
      <Foot><Button onClick={onNext} disabled={!valid} testId="identity-next" full>Continuer</Button></Foot>
    </>
  )
}

export function Toggle({ on, onChange, label, testId }: { on: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} data-testid={testId} onClick={() => { sfx.tap(); onChange(!on) }}
      className="relative grid h-11 w-16 shrink-0 place-items-center">
      <span className={cn('absolute h-8 w-14 rounded-full transition-colors', on ? 'bg-plum' : 'bg-plum/20')} />
      <motion.span className="absolute left-[7px] h-6 w-6 rounded-full bg-cream" animate={{ x: on ? 24 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
  )
}

function Prefs({ draft, patch, onNext }: { draft: Profile; patch: (p: Partial<Profile>) => void; onNext: () => void }) {
  const tog = (g: Gender) => patch({ seeks: draft.seeks.includes(g) ? draft.seeks.filter((x) => x !== g) : [...draft.seeks, g] })
  const ages = useMemo(() => Array.from({ length: 82 }, (_, i) => 18 + i), [])
  return (
    <>
      <Heading title="Toi et ce que tu cherches" sub="Ces informations servent uniquement à te proposer des rencontres compatibles. Elles ne sont jamais affichées sur ton profil." />
      <p className="kicker mb-2">Je suis</p>
      <div className="flex flex-wrap gap-2">
        {[{ id: 'woman', label: 'Une femme' }, { id: 'man', label: 'Un homme' }, { id: 'nonbinary', label: 'Non-binaire' }].map((g) => (
          <Pill key={g.id} on={draft.gender === g.id} onClick={() => patch({ gender: g.id as Gender })} testId={`gender-${g.id}`}>{g.label}</Pill>
        ))}
      </div>
      <p className="kicker mb-2 mt-5">Je souhaite rencontrer (plusieurs choix possibles)</p>
      <div className="flex flex-wrap gap-2">
        {GENDERS.map((g) => <Pill key={g.id} on={draft.seeks.includes(g.id)} onClick={() => tog(g.id)} testId={`seek-${g.id}`}>{g.label}</Pill>)}
      </div>
      <p className="kicker mb-2 mt-5">Tranche d’âge : {draft.ageMin}–{draft.ageMax} ans</p>
      <div className="flex gap-3">
        <select aria-label="Âge minimum" data-testid="age-min" className="field" value={draft.ageMin} onChange={(e) => patch({ ageMin: Math.min(Number(e.target.value), draft.ageMax) })}>{ages.map((a) => <option key={a} value={a}>{a} ans</option>)}</select>
        <select aria-label="Âge maximum" data-testid="age-max" className="field" value={draft.ageMax} onChange={(e) => patch({ ageMax: Math.max(Number(e.target.value), draft.ageMin) })}>{ages.map((a) => <option key={a} value={a}>{a} ans</option>)}</select>
      </div>
      <Foot><Button onClick={onNext} disabled={!draft.seeks.length} testId="prefs-next" full>Continuer</Button></Foot>
    </>
  )
}

export function Pill({ on, onClick, children, testId }: { on: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.95 }} aria-pressed={on} data-testid={testId} onClick={() => { sfx.select(); buzz(6); onClick() }}
      className={cn('min-h-[48px] rounded-full border-2 px-5 text-[15px] font-semibold transition-colors', on ? 'border-plum bg-plum text-cream' : 'border-plum/15 bg-white text-plum')}>{children}</motion.button>
  )
}

function Area({ draft, patch, onNext }: { draft: Profile; patch: (p: Partial<Profile>) => void; onNext: () => void }) {
  return (
    <>
      <Heading title="Où se passe ton histoire ?" sub="Nous n’utilisons que ta région (jamais ta position précise)." />
      <label className="kicker mb-1.5 block" htmlFor="region">Ma région</label>
      <select id="region" data-testid="region" className="field" value={draft.region} onChange={(e) => patch({ region: e.target.value })}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
      <p className="kicker mb-2 mt-5">Distance souhaitée</p>
      <div className="flex flex-col gap-2">
        <Pill on={draft.scope === 'region'} onClick={() => patch({ scope: 'region' })} testId="scope-region">Dans ma région</Pill>
        <Pill on={draft.scope === 'country'} onClick={() => patch({ scope: 'country' })} testId="scope-country">Partout, la distance ne me gêne pas</Pill>
      </div>
      <Foot><Button onClick={onNext} testId="area-next" full>Continuer</Button></Foot>
    </>
  )
}

function PhotoStep({ onNext }: { onNext: () => void }) {
  const has = useStore((s) => s.hasPhoto)
  const set = useStore((s) => s.set)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const pick = async (f?: File) => {
    if (!f) return
    setBusy(true); setErr('')
    try { await saveMyPhoto(await processPhoto(f)); set({ hasPhoto: true }); sfx.select() } catch { setErr('Cette image n’a pas pu être lue. Essaie une autre photo.') }
    setBusy(false)
  }
  return (
    <>
      <Heading title="Une photo, pour plus tard" sub="Elle reste cachée. Elle ne sera visible que si vous êtes tous les deux d’accord après avoir fait connaissance. Tu peux passer cette étape." />
      <div className="card mx-auto grid h-44 w-44 place-items-center overflow-hidden rounded-[40px] text-center">
        {has ? <div className="text-5xl">🔒</div> : <Buddy mood="shy" size={80} />}
      </div>
      <p className="mt-3 text-center text-[14px] text-plum/70" data-testid="photo-state">{has ? 'Photo enregistrée et verrouillée.' : 'Aucune photo pour l’instant.'}</p>
      {err && <p role="alert" className="mt-2 text-center text-[14px] text-rose-600">{err}</p>}
      <input ref={ref} type="file" accept="image/*" hidden data-testid="photo-input" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="soft" onClick={() => ref.current?.click()} disabled={busy}>{has ? 'Changer' : 'Ajouter une photo'}</Button>
        {has && <Button variant="ghost" onClick={async () => { await removeMyPhoto(); set({ hasPhoto: false }) }}>Retirer</Button>}
      </div>
      <Foot><Button onClick={onNext} testId="photo-next" full>{has ? 'Continuer' : 'Passer cette étape'}</Button></Foot>
    </>
  )
}

function QuestionCard({ q, onDone, intro, index }: { q: Question; onDone: () => void; intro: boolean; index: number }) {
  const { answers, answer } = useStore()
  const cur = answers[q.id]
  const [showIntro, setShowIntro] = useState(intro)
  const [val, setVal] = useState<string | string[] | number | null>(cur?.v ?? (q.type === 'multi' ? [] : null))
  const [must, setMust] = useState(!!cur?.must)
  const [text, setText] = useState(typeof cur?.v === 'string' && q.type === 'open' ? cur.v : '')
  const cat = CATEGORIES[q.cat]
  const save = (v: typeof val, m = must) => answer(q.id, { v, must: m })

  if (showIntro) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center" data-testid="category-intro">
        <div className="grid h-24 w-24 place-items-center rounded-full text-4xl" style={{ background: cat.color }}>{q.cat === 'A' ? '🧭' : q.cat === 'B' ? '💞' : '🌍'}</div>
        <p className="kicker">Partie {q.cat} sur 3</p>
        <h2 className="font-display text-[32px] font-semibold leading-tight">{cat.name}</h2>
        <p className="max-w-[290px] text-[16px] text-plum/75">{cat.blurb}</p>
        <Button onClick={() => setShowIntro(false)} testId="category-go">C’est parti</Button>
      </div>
    )
  }

  const ready = q.type === 'open' ? true : q.type === 'multi' ? (val as string[]).length > 0 : val != null
  return (
    <>
      <p className="kicker mb-2" style={{ color: '#231C39' }}><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: cat.color }} />{cat.name} · {index + 1}/{QUESTIONS.length}</p>
      <h2 className="font-display text-[27px] font-semibold leading-[1.12] text-balance" data-testid="q-title">{q.title}</h2>
      {q.hint && <p className="mt-1.5 text-[14px] text-plum/65">{q.hint}</p>}
      <div className="mt-5 flex-1">
        {q.type === 'cards' && (
          <div className="grid grid-cols-2 gap-3">
            {q.options!.map((o, i) => (
              <OptionCard key={o.id} o={o} on={val === o.id} delay={i * 0.05} onClick={() => { setVal(o.id); save(o.id) }} />
            ))}
          </div>
        )}
        {q.type === 'multi' && (
          <div className="grid grid-cols-2 gap-3">
            {q.options!.map((o, i) => {
              const arr = val as string[]
              const on = arr.includes(o.id)
              return <OptionCard key={o.id} o={o} on={on} delay={i * 0.04} onClick={() => {
                const n = on ? arr.filter((x) => x !== o.id) : arr.length >= (q.max ?? 3) ? [...arr.slice(1), o.id] : [...arr, o.id]
                setVal(n); save(n)
              }} />
            })}
          </div>
        )}
        {q.type === 'dilemma' && (
          <div className="flex flex-col items-stretch gap-3">
            {q.options!.map((o, i) => (
              <div key={o.id} className="flex flex-col items-stretch gap-3">
                <OptionCard o={o} on={val === o.id} big delay={i * 0.1} onClick={() => { setVal(o.id); save(o.id) }} />
                {i === 0 && <div className="text-center font-display text-[18px] italic text-plum/50">ou</div>}
              </div>
            ))}
          </div>
        )}
        {q.type === 'scale' && <Scale q={q} value={val as number | null} onChange={(n) => { setVal(n); save(n); sfx.select(); buzz(6) }} />}
        {q.type === 'open' && (
          <textarea data-testid="open-text" className="field min-h-[130px] resize-none" maxLength={240} placeholder="Écris ce qui te vient…" value={text} onChange={(e) => { setText(e.target.value); setVal(e.target.value); save(e.target.value) }} />
        )}
        {q.canBeMust && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-peach-200/60 px-4 py-3">
            <span className="pr-3 text-[14.5px]">C’est <b>indispensable</b> pour moi</span>
            <Toggle on={must} onChange={(m) => { setMust(m); if (val != null) save(val, m) }} label="Critère indispensable" testId="must" />
          </div>
        )}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={() => { if (q.type === 'open' && !text.trim()) answer(q.id, { v: null, skipped: true }); onDone() }} disabled={!ready} testId="q-next" full>
          {q.type === 'open' && !text.trim() ? 'Passer' : 'Continuer'}
        </Button>
        {q.optional && q.type !== 'open' && <Button variant="ghost" testId="q-skip" onClick={() => { answer(q.id, { v: null, skipped: true }); onDone() }}>Passer cette question</Button>}
      </div>
    </>
  )
}

function OptionCard({ o, on, onClick, big, delay = 0 }: { o: { id: string; label: string; emoji: string }; on: boolean; onClick: () => void; big?: boolean; delay?: number }) {
  return (
    <motion.button type="button" aria-pressed={on} data-testid={`opt-${o.id}`}
      initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay, type: 'spring', stiffness: 300, damping: 24 }}
      whileTap={{ scale: 0.95 }} onClick={() => { sfx.select(); buzz(8); onClick() }}
      className={cn('relative flex rounded-3xl border-2 text-left transition-colors', big ? 'min-h-[104px] flex-row items-center gap-4 px-5' : 'min-h-[118px] flex-col justify-between p-4', on ? 'border-plum bg-peach-200 shadow-pop' : 'border-plum/10 bg-white shadow-soft')}>
      <span className={cn('grid place-items-center rounded-2xl bg-cream-200', big ? 'h-14 w-14 text-3xl' : 'h-11 w-11 text-2xl')}>{o.emoji}</span>
      <span className={cn('font-semibold leading-snug', big ? 'text-[18px]' : 'text-[14.5px]')}>{o.label}</span>
      <AnimatePresence>{on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-plum text-[13px] text-cream">✓</motion.span>}</AnimatePresence>
    </motion.button>
  )
}

function Scale({ q, value, onChange }: { q: Question; value: number | null; onChange: (n: number) => void }) {
  const s = q.scale!
  return (
    <div className="card p-5">
      <div className="flex items-end justify-between gap-1" role="radiogroup" aria-label={q.title}>
        {Array.from({ length: s.steps }, (_, i) => i + 1).map((n) => {
          const on = value === n
          return (
            <motion.button key={n} type="button" role="radio" aria-checked={on} aria-label={`${n} sur ${s.steps}`} data-testid={`scale-${n}`} whileTap={{ scale: 0.9 }}
              onClick={() => onChange(n)} className="grid min-h-[56px] min-w-[44px] flex-1 place-items-center">
              <motion.span animate={{ scale: on ? 1.15 : 1, backgroundColor: on ? '#231C39' : n <= (value ?? 0) ? '#F6B7A0' : '#EDE5F4' }}
                className="block rounded-full" style={{ width: 22 + n * 6, height: 22 + n * 6 }} />
            </motion.button>
          )
        })}
      </div>
      <div className="mt-3 flex justify-between gap-4 text-[12.5px] font-semibold text-plum/65"><span className="max-w-[45%]">{s.left}</span><span className="max-w-[45%] text-right">{s.right}</span></div>
    </div>
  )
}

function Recap({ onEdit, onFinish }: { onEdit: (i: number) => void; onFinish: () => void }) {
  const { answers, profile } = useStore()
  return (
    <>
      <Heading title="Voilà qui tu es" sub="Touche une réponse pour la modifier. Tout est enregistré automatiquement." buddy />
      {profile && (
        <div className="card mb-3 flex items-center justify-between p-4"><div><p className="font-display text-[20px] font-semibold">{profile.pseudo}</p><p className="text-[13px] text-plum/65">{profile.showExactAge ? `${ageFrom(profile.birthdate)} ans` : 'Âge en tranche'} · {profile.region}</p></div><span className="chip bg-mint">Privé</span></div>
      )}
      {(['A', 'B', 'C'] as const).map((c) => (
        <section key={c} className="mb-4">
          <h3 className="kicker mb-2">{CATEGORIES[c].name}</h3>
          <div className="flex flex-col gap-2">
            {QUESTIONS.map((q, i) => q.cat === c && (
              <button key={q.id} type="button" onClick={() => onEdit(i)} data-testid={`recap-${q.id}`} className="card min-h-[56px] p-3.5 text-left active:scale-[.99]">
                <p className="text-[12.5px] font-semibold text-plum/60">{q.title}</p>
                <p className="mt-0.5 text-[14.5px] font-medium leading-snug">{answerLabel(q, answers[q.id])}{answers[q.id]?.must ? ' · indispensable' : ''}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
      <Button onClick={onFinish} testId="finish-onboarding" full>Terminer et découvrir</Button>
    </>
  )
}
