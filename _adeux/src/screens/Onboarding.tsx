import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useRef, useState } from 'react'
import { Button, Progress, Screen } from '../ui/kit'
import { Ico, Icon, Logo } from '../ui/Art'
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
const ROMAN = { A: 'I', B: 'II', C: 'III' } as const

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
  const [saved, setSaved] = useState(false)

  const setStep = (n: number) => { setDir(n >= step ? 1 : -1); setStepRaw(n); setQIndex(n); setSaved(true); setTimeout(() => setSaved(false), 1200) }
  const patch = (p: Partial<Profile>) => { const n = { ...draft, ...p }; setDraft(n); saveProfile(n) } // sauvegarde automatique
  const next = () => {
    sfx.next(); buzz(5)
    if (fromRecap && step >= BASIC && step < RECAP) { setFromRecap(false); setStep(RECAP); return }
    setStep(Math.min(step + 1, RECAP))
  }
  const back = () => { sfx.back(); if (step > 0) setStep(step - 1); else close() }

  const qi = step - BASIC
  const q = qi >= 0 && qi < QUESTIONS.length ? QUESTIONS[qi] : null
  const label = step === RECAP ? 'Récapitulatif' : q ? `${ROMAN[q.cat]} · ${CATEGORIES[q.cat].name}` : 'Faisons connaissance'

  return (
    <Screen title={label} onBack={back} testId="onboarding" right={saved ? <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-plum/50" data-testid="autosave">Enregistré</motion.span> : undefined}>
      <div className="relative mx-auto flex min-h-full max-w-[480px] flex-col pb-6">
        <Progress value={step / RECAP} className="mb-8" />
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div key={step} custom={dir} className="flex flex-1 flex-col"
            initial={{ opacity: 0, x: 36 * dir, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -24 * dir, filter: 'blur(3px)' }} transition={{ duration: 0.34, ease: [0.22, 0.8, 0.24, 1] }}>
            {step === 0 && <Consent onNext={() => { patch({ adultDeclared: true }); next() }} />}
            {step === 1 && <Identity draft={draft} patch={patch} onNext={next} />}
            {step === 2 && <Prefs draft={draft} patch={patch} onNext={next} />}
            {step === 3 && <Area draft={draft} patch={patch} onNext={next} />}
            {step === 4 && <PhotoStep onNext={next} />}
            {q && <QuestionView key={q.id} q={q} index={qi} onDone={() => { sfx.select(); setTimeout(next, 260) }} />}
            {step === RECAP && <Recap onEdit={(i) => { setFromRecap(true); setStep(BASIC + i) }} onFinish={() => { finishOnboarding(); sfx.success(); close(); useUI.getState().setTab('home'); useUI.getState().toast(onboarded ? 'Profil mis à jour' : 'Ton profil est prêt', 'ok') }} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </Screen>
  )
}

function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-[clamp(34px,9.6vw,44px)] leading-[1.02] text-balance" data-testid="step-title">{children}</h2>
      {sub && <p className="mt-4 text-[15px] leading-relaxed text-plum/65">{sub}</p>}
    </div>
  )
}
const Foot = ({ children }: { children: React.ReactNode }) => <div className="mt-auto flex flex-col gap-1 pt-10">{children}</div>

function Check({ on, onChange, children, testId }: { on: boolean; onChange: (v: boolean) => void; children: React.ReactNode; testId: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} data-testid={testId} onClick={() => { sfx.tap(); onChange(!on) }} className="flex min-h-[56px] w-full items-start gap-4 border-t border-plum/12 py-4 text-left">
      <span className={cn('mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border transition-colors', on ? 'border-plum bg-plum text-cream' : 'border-plum/35')}>{on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>}</span>
      <span className="text-[15.5px] leading-snug">{children}</span>
    </button>
  )
}

function Consent({ onNext }: { onNext: () => void }) {
  const [ok18, setOk18] = useState(false)
  const [okData, setOkData] = useState(false)
  return (
    <>
      <div className="mb-8 flex items-center gap-3"><Logo size={34} /></div>
      <Title sub="Tes photos restent privées jusqu’à un accord mutuel. Nous ne demandons que ce qui sert à te proposer une rencontre, et tu peux tout supprimer à tout moment.">Avant de commencer</Title>
      <Check on={ok18} onChange={setOk18} testId="adult-check">Je déclare avoir <b>18 ans ou plus</b>.</Check>
      <Check on={okData} onChange={setOkData} testId="data-check">J’accepte que mes réponses servent à me proposer des rencontres.</Check>
      <p className="border-t border-plum/12 pt-4 text-[12px] leading-snug text-plum/50">Version de démonstration : la déclaration d’âge n’est pas une vérification d’identité. Politique de confidentialité à compléter avant tout lancement public.</p>
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
      <Title sub="Un prénom ou un pseudonyme : c’est le seul nom que l’autre verra avant la révélation.">Comment veux-tu qu’on t’appelle&nbsp;?</Title>
      <label className="kicker block" htmlFor="pseudo">Prénom ou pseudo</label>
      <input id="pseudo" data-testid="pseudo" className="field text-[22px]" value={draft.pseudo} maxLength={20} autoComplete="given-name" placeholder="Camille" onChange={(e) => patch({ pseudo: e.target.value })} />
      <label className="kicker mt-8 block" htmlFor="bd">Date de naissance</label>
      <input id="bd" data-testid="birthdate" type="date" className="field text-[22px]" max={maxBirth()} value={draft.birthdate} onChange={(e) => patch({ birthdate: e.target.value })} />
      {underage && <p role="alert" data-testid="underage" className="mt-3 text-[14px] font-medium text-rose-600">À DEUX est réservé aux adultes (18 ans et plus). Reviens le jour de tes 18 ans.</p>}
      <p className="mt-3 text-[12.5px] text-plum/50">Sert uniquement à calculer ton âge.</p>
      <div className="mt-8 flex items-center justify-between border-t border-plum/12 py-4">
        <span className="pr-4 text-[15px]">Afficher mon âge exact <span className="text-plum/50">(sinon, une tranche)</span></span>
        <Toggle on={draft.showExactAge} onChange={(v) => patch({ showExactAge: v })} label="Afficher mon âge exact" testId="exact-age" />
      </div>
      <Foot><Button onClick={onNext} disabled={!valid} testId="identity-next" full>Continuer</Button></Foot>
    </>
  )
}

export function Toggle({ on, onChange, label, testId }: { on: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} data-testid={testId} onClick={() => { sfx.tap(); onChange(!on) }} className="relative grid h-11 w-16 shrink-0 place-items-center">
      <span className={cn('absolute h-[28px] w-[50px] rounded-full transition-colors duration-300', on ? 'bg-plum' : 'bg-plum/18')} />
      <motion.span className="absolute left-[9px] h-[22px] w-[22px] rounded-full bg-cream" animate={{ x: on ? 22 : 0 }} transition={{ type: 'spring', stiffness: 520, damping: 32 }} />
    </button>
  )
}

function Prefs({ draft, patch, onNext }: { draft: Profile; patch: (p: Partial<Profile>) => void; onNext: () => void }) {
  const tog = (g: Gender) => patch({ seeks: draft.seeks.includes(g) ? draft.seeks.filter((x) => x !== g) : [...draft.seeks, g] })
  const ages = useMemo(() => Array.from({ length: 82 }, (_, i) => 18 + i), [])
  return (
    <>
      <Title sub="Ces informations servent uniquement à te proposer des rencontres compatibles. Elles ne sont jamais affichées.">Toi, et ce que tu cherches</Title>
      <p className="kicker mb-3">Je suis</p>
      <div className="flex flex-wrap gap-2">
        {[{ id: 'woman', label: 'Une femme' }, { id: 'man', label: 'Un homme' }, { id: 'nonbinary', label: 'Non-binaire' }].map((g) => (
          <Pill key={g.id} on={draft.gender === g.id} onClick={() => patch({ gender: g.id as Gender })} testId={`gender-${g.id}`}>{g.label}</Pill>
        ))}
      </div>
      <p className="kicker mb-3 mt-8">Je souhaite rencontrer</p>
      <div className="flex flex-wrap gap-2">{GENDERS.map((g) => <Pill key={g.id} on={draft.seeks.includes(g.id)} onClick={() => tog(g.id)} testId={`seek-${g.id}`}>{g.label}</Pill>)}</div>
      <p className="kicker mb-3 mt-8">Tranche d’âge · {draft.ageMin}–{draft.ageMax} ans</p>
      <div className="flex gap-6">
        <select aria-label="Âge minimum" data-testid="age-min" className="field text-[20px]" value={draft.ageMin} onChange={(e) => patch({ ageMin: Math.min(Number(e.target.value), draft.ageMax) })}>{ages.map((a) => <option key={a} value={a}>{a} ans</option>)}</select>
        <select aria-label="Âge maximum" data-testid="age-max" className="field text-[20px]" value={draft.ageMax} onChange={(e) => patch({ ageMax: Math.max(Number(e.target.value), draft.ageMin) })}>{ages.map((a) => <option key={a} value={a}>{a} ans</option>)}</select>
      </div>
      <Foot><Button onClick={onNext} disabled={!draft.seeks.length} testId="prefs-next" full>Continuer</Button></Foot>
    </>
  )
}

export function Pill({ on, onClick, children, testId }: { on: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <motion.button type="button" whileTap={{ scale: 0.96 }} aria-pressed={on} data-testid={testId} onClick={() => { sfx.select(); buzz(5); onClick() }}
      className={cn('min-h-[48px] rounded-full border px-5 text-[15px] transition-colors duration-300', on ? 'border-plum bg-plum text-cream' : 'border-plum/25 text-plum')}>{children}</motion.button>
  )
}

function Area({ draft, patch, onNext }: { draft: Profile; patch: (p: Partial<Profile>) => void; onNext: () => void }) {
  return (
    <>
      <Title sub="Nous n’utilisons que ta région, jamais ta position précise.">Où se passe ton histoire&nbsp;?</Title>
      <label className="kicker block" htmlFor="region">Ma région</label>
      <select id="region" data-testid="region" className="field text-[22px]" value={draft.region} onChange={(e) => patch({ region: e.target.value })}>{REGIONS.map((r) => <option key={r}>{r}</option>)}</select>
      <p className="kicker mb-3 mt-8">Distance souhaitée</p>
      <div className="flex flex-col items-start gap-2">
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
      <Title sub="Elle reste cachée. Elle ne sera visible que si vous êtes tous les deux d’accord, après avoir fait connaissance. Tu peux passer cette étape.">Une photo, pour plus tard</Title>
      <div className="mx-auto grid h-[150px] w-[120px] place-items-center rounded-[60px_60px_16px_16px] border border-plum/20 text-plum/60"><Ico d={Icon.lock} size={28} /></div>
      <p className="mt-5 text-center text-[14px] text-plum/60" data-testid="photo-state">{has ? 'Photo enregistrée et verrouillée.' : 'Aucune photo pour l’instant.'}</p>
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

/** Une seule grande question, quelques choix travaillés. */
function QuestionView({ q, onDone, index }: { q: Question; onDone: () => void; index: number }) {
  const { answers, answer } = useStore()
  const cur = answers[q.id]
  const [val, setVal] = useState<string | string[] | number | null>(cur?.v ?? (q.type === 'multi' ? [] : null))
  const [must, setMust] = useState(!!cur?.must)
  const [text, setText] = useState(typeof cur?.v === 'string' && q.type === 'open' ? cur.v : '')
  const save = (v: typeof val, m = must) => answer(q.id, { v, must: m })
  const ready = q.type === 'open' ? true : q.type === 'multi' ? (val as string[]).length > 0 : val != null

  return (
    <>
      <p className="kicker mb-5 flex items-center gap-2">{q.sensitive && <Ico d={Icon.lock} size={13} />}{String(index + 1).padStart(2, '0')} <span className="text-plum/30">/ {QUESTIONS.length}</span></p>
      <h2 className="font-display text-[clamp(34px,9.8vw,46px)] leading-[1.02] text-balance" data-testid="q-title">{q.title}</h2>
      {q.hint && <p className="mt-4 text-[14px] leading-relaxed text-plum/55">{q.hint}</p>}

      <div className="mt-9 flex-1">
        {(q.type === 'cards' || q.type === 'multi') && (
          <ul className="[&>li:last-child]:border-b [&>li:last-child]:border-plum/12">
            {q.options!.map((o, i) => {
              const arr = Array.isArray(val) ? val : []
              const on = q.type === 'multi' ? arr.includes(o.id) : val === o.id
              return (
                <Row key={o.id} id={o.id} i={i} on={on} multi={q.type === 'multi'} onClick={() => {
                  if (q.type === 'multi') { const n = on ? arr.filter((x) => x !== o.id) : arr.length >= (q.max ?? 3) ? [...arr.slice(1), o.id] : [...arr, o.id]; setVal(n); save(n) }
                  else { setVal(o.id); save(o.id) }
                }}>{o.label}</Row>
              )
            })}
          </ul>
        )}
        {q.type === 'dilemma' && (
          <div className="flex flex-col">
            {q.options!.map((o, i) => (
              <div key={o.id}>
                <motion.button type="button" aria-pressed={val === o.id} data-testid={`opt-${o.id}`} whileTap={{ scale: 0.985 }} onClick={() => { sfx.select(); buzz(6); setVal(o.id); save(o.id) }}
                  className={cn('w-full rounded-[22px] px-6 py-9 text-left transition-colors duration-300', val === o.id ? 'bg-plum text-cream' : 'bg-lavender/70 text-plum')}>
                  <span className="font-display block text-[28px] leading-[1.1]">{o.label}</span>
                </motion.button>
                {i === 0 && <p className="font-display py-3 text-center text-[20px] italic text-plum/45">ou</p>}
              </div>
            ))}
          </div>
        )}
        {q.type === 'scale' && <Scale q={q} value={val as number | null} onChange={(n) => { setVal(n); save(n); sfx.select(); buzz(5) }} />}
        {q.type === 'open' && <textarea data-testid="open-text" className="field min-h-[130px] resize-none text-[20px] leading-snug" maxLength={240} placeholder="Écris ce qui te vient…" value={text} onChange={(e) => { setText(e.target.value); setVal(e.target.value); save(e.target.value) }} />}
        {q.canBeMust && (
          <div className="flex items-center justify-between pt-3">
            <span className="pr-3 text-[14.5px]">{q.sensitive ? 'Je ne veux voir que des personnes qui le partagent' : 'C’est indispensable pour moi'}</span>
            <Toggle on={must} onChange={(m) => { setMust(m); if (val != null) save(val, m) }} label="Critère indispensable" testId="must" />
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col">
        <Button onClick={() => { if (q.type === 'open' && !text.trim()) answer(q.id, { v: null, skipped: true }); onDone() }} disabled={!ready} testId="q-next" full>{q.type === 'open' && !text.trim() ? 'Passer' : 'Continuer'}</Button>
        {q.optional && q.type !== 'open' && <div className="flex justify-center"><Button variant="ghost" testId="q-skip" onClick={() => { answer(q.id, { v: null, skipped: true }); onDone() }}>Passer cette question</Button></div>}
      </div>
    </>
  )
}

function Row({ id, i, on, multi, onClick, children }: { id: string; i: number; on: boolean; multi: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <li className="border-t border-plum/12">
      <motion.button type="button" aria-pressed={on} data-testid={`opt-${id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.05, duration: 0.45, ease: [0.22, 0.8, 0.24, 1] }}
        whileTap={{ x: 3 }} onClick={() => { sfx.select(); buzz(6); onClick() }} className="group flex min-h-[64px] w-full items-center gap-4 py-4 text-left">
        <span className={cn('grid h-[22px] w-[22px] shrink-0 place-items-center border transition-all duration-300', multi ? 'rounded-md' : 'rounded-full', on ? 'border-plum bg-plum' : 'border-plum/30')}>
          <motion.span initial={false} animate={{ scale: on ? 1 : 0 }} className={cn('block bg-cream', multi ? 'h-2 w-2 rounded-[2px]' : 'h-2 w-2 rounded-full')} />
        </span>
        <span className={cn('font-display text-[24px] leading-[1.15] transition-colors duration-300', on ? 'text-plum' : 'text-plum/75')}>{children}</span>
      </motion.button>
    </li>
  )
}

function Scale({ q, value, onChange }: { q: Question; value: number | null; onChange: (n: number) => void }) {
  const s = q.scale!
  return (
    <div className="pt-4">
      <div className="relative" role="radiogroup" aria-label={q.title}>
        <div className="absolute left-[22px] right-[22px] top-1/2 h-px -translate-y-1/2 bg-plum/25" />
        <motion.div className="absolute left-[22px] top-1/2 h-px -translate-y-1/2 bg-plum" initial={false} animate={{ width: value ? `calc((100% - 44px) * ${(value - 1) / (s.steps - 1)})` : 0 }} transition={{ type: 'spring', stiffness: 160, damping: 22 }} />
        <div className="relative flex items-center justify-between">
          {Array.from({ length: s.steps }, (_, i) => i + 1).map((n) => {
            const on = value === n
            return (
              <button key={n} type="button" role="radio" aria-checked={on} aria-label={`${n} sur ${s.steps}`} data-testid={`scale-${n}`} onClick={() => onChange(n)} className="grid h-[56px] w-[44px] place-items-center">
                <motion.span className="block rounded-full" initial={false} animate={{ width: on ? 26 : 12, height: on ? 26 : 12, backgroundColor: on || (value ?? 0) >= n ? '#3B1F4D' : '#FDF7EF', borderWidth: 1 }} style={{ border: '1px solid #3B1F4D' }} transition={{ type: 'spring', stiffness: 380, damping: 24 }} />
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-3 flex justify-between gap-6 text-[13px] leading-snug text-plum/60"><span className="max-w-[44%]">{s.left}</span><span className="max-w-[44%] text-right">{s.right}</span></div>
    </div>
  )
}

function Recap({ onEdit, onFinish }: { onEdit: (i: number) => void; onFinish: () => void }) {
  const { answers, profile } = useStore()
  return (
    <>
      <Title sub="Touche une réponse pour la modifier. Tout est enregistré automatiquement.">Voilà ce que tu cherches</Title>
      {profile && <p className="mb-6 text-[15px] text-plum/70"><span className="font-display text-[26px] text-plum">{profile.pseudo}</span><br />{profile.showExactAge ? `${ageFrom(profile.birthdate)} ans` : 'Âge en tranche'} · {profile.region} · profil privé</p>}
      {(['A', 'B', 'C'] as const).map((c) => (
        <section key={c} className="mb-8">
          <h3 className="kicker mb-1">{ROMAN[c]} · {CATEGORIES[c].name}</h3>
          <ul>
            {QUESTIONS.map((q, i) => q.cat === c && (
              <li key={q.id} className="border-t border-plum/12">
                <button type="button" onClick={() => onEdit(i)} data-testid={`recap-${q.id}`} className="min-h-[56px] w-full py-3.5 text-left">
                  <span className="block text-[12.5px] text-plum/50">{q.title}</span>
                  <span className="font-display mt-0.5 block text-[20px] leading-snug">{q.sensitive ? (answers[q.id]?.v ? 'Renseigné · privé' : 'Passée') : answerLabel(q, answers[q.id])}{answers[q.id]?.must ? ' — indispensable' : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Button onClick={onFinish} testId="finish-onboarding" full>Terminer</Button>
    </>
  )
}
