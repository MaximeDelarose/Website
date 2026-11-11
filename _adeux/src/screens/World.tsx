import { motion } from 'motion/react'
import { useState } from 'react'
import { Button, Screen, Sheet } from '../ui/kit'
import { Logo } from '../ui/Art'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { canInteract, canSeePhotos } from '../lib/journey'
import { useEnc } from '../ui/shared'
import { cn } from '../lib/util'
import { sfx } from '../lib/audio'

const DISCOVER = [
  'Quelle est la chose la plus courageuse que tu aies faite récemment ?',
  'Quel endroit te donne l’impression d’être chez toi ?',
  'Quelle habitude de couple te ferait sourire ?',
  'Quel sera notre premier rendez-vous idéal ?',
]

export function WorldScreen() {
  const close = useUI((s) => s.close)
  const { enc, partner } = useEnc()
  const { gameLog, moments, memories, chat, plans, privacy, addMemory, proposePlan, send } = useStore()
  const [mem, setMem] = useState('')
  const [planOpen, setPlanOpen] = useState(false)
  const [idea, setIdea] = useState('')
  const [when, setWhen] = useState('')
  if (!enc || !partner || !canSeePhotos(enc)) return <Screen title="Notre monde" onBack={close}><div className="p-8 text-center">Ton espace commun s’ouvrira quand vous aurez tous les deux dit oui à la révélation.</div></Screen>
  const n = (k: string) => gameLog.filter((g) => g.kind === k).length
  const msgs = chat.filter((c) => c.from !== 'system').length
  const items = [
    { id: 'house', label: 'La petite maison', ok: true, hint: 'Votre point de départ' },
    { id: 'bridge', label: 'Le pont', ok: n('bridge') > 0, hint: 'Construisez Le Pont ensemble' },
    { id: 'garden', label: 'Le jardin', ok: Object.values(moments).some((m) => m.mine), hint: 'Partagez un « Notre moment »' },
    { id: 'lantern', label: 'La lanterne', ok: n('mirror') > 0, hint: 'Retournez les cartes du Miroir' },
    { id: 'compass', label: 'La pierre-boussole', ok: n('compass') > 0, hint: 'Explorez La Boussole' },
    { id: 'journal', label: 'Le carnet', ok: memories.length > 0, hint: 'Ajoutez un souvenir' },
    { id: 'tree', label: 'L’arbre à messages', ok: msgs >= 6, hint: 'Échangez quelques messages' },
  ]
  const has = (id: string) => items.find((i) => i.id === id)!.ok
  const total = items.filter((i) => i.ok).length

  return (
    <Screen title="Notre monde" onBack={close} testId="world">
      <div className="mx-auto max-w-[520px] pb-8">
        <div className="-mx-[28px] overflow-hidden bg-gradient-to-b from-lavender via-cream-200 to-cream">
          <svg viewBox="0 0 360 250" className="w-full" role="img" aria-label={`Votre petit monde : ${total} éléments sur ${items.length}`} data-testid="world-scene">
            <motion.circle cx="292" cy="52" r="24" fill="#FFC4AB" animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 6, repeat: Infinity }} />
            <line x1="20" y1="206" x2="340" y2="206" stroke="#3B1F4D" strokeOpacity=".35" />
            {/* la maison : formes pures */}
            <g stroke="#3B1F4D" strokeWidth="1.6" fill="none"><path d="M118 206V146H190V206" /><path d="M110 148L154 112L198 148" /><rect x="142" y="170" width="24" height="36" fill="#3B1F4D" /><rect x="124" y="160" width="12" height="12" /><rect x="172" y="160" width="12" height="12" /></g>
            <motion.circle cx="154" cy="136" r="3" fill="#FFC4AB" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 3 }} />
            {has('bridge') && <motion.path d="M214 206 Q250 150 286 206" stroke="#3B1F4D" strokeWidth="1.6" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4 }} />}
            {has('garden') && [0, 1, 2, 3, 4].map((i) => <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.12 }}><line x1={40 + i * 14} y1="206" x2={40 + i * 14} y2="188" stroke="#3B1F4D" strokeOpacity=".7" /><circle cx={40 + i * 14} cy="184" r="3.2" fill={i % 2 ? '#FFC4AB' : '#3B1F4D'} /></motion.g>)}
            {has('lantern') && <g><line x1="212" y1="206" x2="212" y2="172" stroke="#3B1F4D" /><motion.circle cx="212" cy="166" r="6" fill="#FFC4AB" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 2.6 }} /></g>}
            {has('compass') && <g transform="translate(96 196)"><circle r="8" stroke="#3B1F4D" strokeWidth="1.4" fill="none" /><line x1="0" y1="-6" x2="0" y2="6" stroke="#3B1F4D" /></g>}
            {has('journal') && <rect x="82" y="198" width="14" height="8" stroke="#3B1F4D" strokeWidth="1.4" fill="#E8DFF7" />}
            {has('tree') && <g><line x1="320" y1="206" x2="320" y2="168" stroke="#3B1F4D" strokeWidth="1.6" /><circle cx="320" cy="156" r="18" stroke="#3B1F4D" strokeWidth="1.4" fill="none" />{[0, 1, 2].map((i) => <circle key={i} cx={312 + i * 8} cy={152 + (i % 2) * 8} r="2.5" fill="#FFC4AB" />)}</g>}
            <circle cx="238" cy="198" r="4.5" fill="#FDF7EF" stroke="#3B1F4D" strokeWidth="1.4" /><circle cx="250" cy="198" r="4.5" fill="#3B1F4D" />
          </svg>
        </div>
        <p className="mt-4 text-[13px] text-plum/55">Votre monde grandit avec ce que vous vivez ensemble, jamais avec une note.</p>

        <section className="mt-9">
          <h3 className="kicker mb-1">Ce que vous avez construit · {total}/{items.length}</h3>
          <ul>{items.map((i) => <li key={i.id} data-testid={`world-item-${i.id}`} className={cn('flex min-h-[52px] items-center justify-between border-t border-plum/12 py-3', i.ok ? '' : 'text-plum/45')}><span className="font-display text-[22px] leading-none">{i.label}</span><span className="text-[12px]">{i.ok ? 'construit' : i.hint}</span></li>)}</ul>
        </section>

        <section className="mt-10">
          <h3 className="kicker mb-1">Carnet de souvenirs</h3>
          <div>
            <div className="flex gap-2"><input className="field !py-3" data-testid="memory-input" aria-label="Nouveau souvenir" maxLength={300} placeholder="Un souvenir que tu veux garder…" value={mem} onChange={(e) => setMem(e.target.value)} /><Button onClick={() => { addMemory(mem); setMem(''); sfx.chime() }} disabled={!mem.trim()} testId="memory-add">Ajouter</Button></div>
            <ul className="mt-3 space-y-2" data-testid="memories">{memories.length === 0 && <li className="text-[14px] text-plum/55">Aucun souvenir pour l’instant. Ils sont toujours ajoutés volontairement.</li>}{memories.map((m) => <li key={m.id} className="font-display border-t border-plum/12 py-3 text-[21px] leading-snug">{m.text}</li>)}</ul>
            {!privacy.shareMemories && <p className="mt-2 text-[12.5px] text-plum/55">Tes souvenirs sont privés (réglage du profil).</p>}
          </div>
        </section>

        <section className="mt-10">
          <h3 className="kicker mb-1">Questions à découvrir</h3>
          <div className="border-b border-plum/12">{DISCOVER.map((q) => <button key={q} type="button" onClick={() => { if (canInteract(enc)) { send(q); useUI.getState().toast('Question envoyée dans la conversation.', 'ok'); sfx.msg() } }} className="font-display min-h-[56px] w-full border-t border-plum/12 py-4 text-left text-[22px] leading-snug">{q}</button>)}</div>
        </section>

        <section className="mt-10">
          <h3 className="kicker mb-1">Propositions de rendez-vous</h3>
          <div>
            <ul className="space-y-2" data-testid="plans">{plans.length === 0 && <li className="text-[14px] text-plum/55">Quand vous serez prêts, vous pourrez proposer une rencontre — au rythme de chacun, dans un lieu public.</li>}{plans.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 border-t border-plum/12 py-3 text-[15px]"><span><b>{p.idea}</b><br /><span className="text-[12.5px] text-plum/65">{p.when}</span></span><span className={cn('chip', p.state === 'accepted' ? 'bg-mint' : 'bg-lavender')}>{p.state === 'accepted' ? 'Accepté' : 'Proposé'}</span></li>)}</ul>
            <div className="mt-3"><Button variant="soft" onClick={() => setPlanOpen(true)} testId="plan-open" full>Proposer un rendez-vous</Button></div>
            <p className="mt-2 text-[12px] text-plum/55">Pour une première rencontre : un lieu public, préviens un·e proche.</p>
          </div>
        </section>
      </div>
      <Sheet open={planOpen} onClose={() => setPlanOpen(false)} title="Proposer un rendez-vous" testId="plan-sheet">
        <div className="space-y-3 pb-3">
          <input className="field" data-testid="plan-idea" aria-label="Idée" maxLength={80} placeholder="Ex. Un café au marché" value={idea} onChange={(e) => setIdea(e.target.value)} />
          <input className="field" data-testid="plan-when" aria-label="Quand" maxLength={60} placeholder="Ex. Samedi en fin de matinée" value={when} onChange={(e) => setWhen(e.target.value)} />
          <Button disabled={!idea.trim()} onClick={() => { proposePlan(idea.trim(), when.trim() || 'Quand ça vous convient'); setIdea(''); setWhen(''); setPlanOpen(false); sfx.chime() }} testId="plan-send" full>Envoyer la proposition</Button>
          <p className="text-center text-[12.5px] text-plum/55">L’autre personne peut accepter, refuser ou proposer autre chose.</p>
        </div>
      </Sheet>
    </Screen>
  )
}
