import { motion } from 'motion/react'
import { useState } from 'react'
import { Button, Screen, Sheet } from '../ui/kit'
import { Buddy } from '../ui/Art'
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
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-b from-rose to-peach-200 shadow-soft">
          <svg viewBox="0 0 360 250" className="w-full" role="img" aria-label={`Votre petit monde : ${total} éléments sur ${items.length}`} data-testid="world-scene">
            <circle cx="290" cy="46" r="22" fill="#FFF7EF" opacity=".85" />
            <ellipse cx="180" cy="210" rx="150" ry="34" fill="#A3CDB6" /><ellipse cx="180" cy="200" rx="150" ry="30" fill="#CDE8DA" />
            {has('bridge') && (<motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><path d="M236 196 Q268 168 300 196" stroke="#231C39" strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M236 196 Q268 176 300 196" stroke="#A88BC7" strokeWidth="9" fill="none" strokeLinecap="round" opacity=".8" /></motion.g>)}
            <g><path d="M118 190 V138 L160 108 L202 138 V190Z" fill="#FFF7EF" /><path d="M108 140 L160 100 L212 140Z" fill="#F6B7A0" /><rect x="148" y="158" width="24" height="32" rx="6" fill="#A88BC7" /><rect x="126" y="150" width="16" height="16" rx="4" fill="#CDE8DA" /><rect x="178" y="150" width="16" height="16" rx="4" fill="#CDE8DA" />
              <motion.circle cx="160" cy="130" r="5" fill="#FFF7EF" animate={{ opacity: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 3 }} /></g>
            {has('garden') && [0, 1, 2, 3, 4].map((i) => <motion.g key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }} style={{ transformOrigin: `${40 + i * 18}px 196px` }}><line x1={40 + i * 18} y1="196" x2={40 + i * 18} y2="182" stroke="#2F7A5A" strokeWidth="2.5" /><circle cx={40 + i * 18} cy="178" r="6" fill={['#F3C1CC', '#F6B7A0', '#A88BC7', '#FFF7EF', '#F3C1CC'][i]} /></motion.g>)}
            {has('lantern') && (<g><rect x="219" y="150" width="3" height="40" fill="#231C39" /><motion.rect x="212" y="138" width="17" height="16" rx="5" fill="#F6B7A0" animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 2.2 }} /></g>)}
            {has('compass') && (<g transform="translate(98,190)"><ellipse cx="0" cy="0" rx="14" ry="6" fill="#8C82A8" /><circle cx="0" cy="-8" r="8" fill="#fff" stroke="#231C39" strokeWidth="1.5" /><path d="M0 -14 L2 -8 L0 -2 L-2 -8Z" fill="#F6B7A0" /></g>)}
            {has('journal') && (<g transform="translate(138,194)"><rect x="-10" y="-7" width="20" height="14" rx="3" fill="#A88BC7" /><rect x="-7" y="-5" width="14" height="10" rx="2" fill="#FFF7EF" /></g>)}
            {has('tree') && (<g><rect x="316" y="148" width="6" height="44" fill="#7A5A3A" /><circle cx="319" cy="140" r="22" fill="#2F7A5A" opacity=".85" />{[0, 1, 2].map((i) => <circle key={i} cx={308 + i * 11} cy={136 + (i % 2) * 8} r="4" fill="#F3C1CC" />)}</g>)}
          </svg>
          <div className="pointer-events-none relative -mt-[78px] flex justify-center gap-1 pb-3"><Buddy size={50} color="#A88BC7" accent="#F6B7A0" mood="happy" /><Buddy size={50} color="#F6B7A0" accent="#A88BC7" flip mood="shy" /></div>
        </div>
        <p className="mt-3 text-center text-[13px] text-plum/60">Votre monde grandit avec ce que vous vivez ensemble : jamais avec une note.</p>

        <section className="mt-5">
          <h3 className="kicker mb-2">Ce que vous avez construit ({total}/{items.length})</h3>
          <div className="grid grid-cols-1 gap-1.5">{items.map((i) => <div key={i.id} data-testid={`world-item-${i.id}`} className={cn('flex min-h-[48px] items-center justify-between rounded-2xl px-4 py-2 text-[14.5px]', i.ok ? 'bg-mint font-semibold' : 'bg-plum/[.05] text-plum/55')}><span>{i.ok ? '✓ ' : '○ '}{i.label}</span>{!i.ok && <span className="text-[12px]">{i.hint}</span>}</div>)}</div>
        </section>

        <section className="mt-6">
          <h3 className="kicker mb-2">Carnet de souvenirs</h3>
          <div className="card p-4">
            <div className="flex gap-2"><input className="field !py-3" data-testid="memory-input" aria-label="Nouveau souvenir" maxLength={300} placeholder="Un souvenir que tu veux garder…" value={mem} onChange={(e) => setMem(e.target.value)} /><Button onClick={() => { addMemory(mem); setMem(''); sfx.chime() }} disabled={!mem.trim()} testId="memory-add">Ajouter</Button></div>
            <ul className="mt-3 space-y-2" data-testid="memories">{memories.length === 0 && <li className="text-[14px] text-plum/55">Aucun souvenir pour l’instant. Ils sont toujours ajoutés volontairement.</li>}{memories.map((m) => <li key={m.id} className="rounded-2xl bg-lavender-100 px-4 py-2.5 text-[14.5px]">{m.text}</li>)}</ul>
            {!privacy.shareMemories && <p className="mt-2 text-[12.5px] text-plum/55">Tes souvenirs sont privés (réglage du profil).</p>}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="kicker mb-2">Questions à découvrir</h3>
          <div className="space-y-2">{DISCOVER.map((q) => <button key={q} type="button" onClick={() => { if (canInteract(enc)) { send(`💭 ${q}`); useUI.getState().toast('Question envoyée dans la conversation.', 'ok'); sfx.msg() } }} className="card min-h-[56px] w-full px-4 py-3 text-left text-[14.5px] font-medium active:scale-[.99]">{q}</button>)}</div>
        </section>

        <section className="mt-6">
          <h3 className="kicker mb-2">Propositions de rendez-vous</h3>
          <div className="card p-4">
            <ul className="space-y-2" data-testid="plans">{plans.length === 0 && <li className="text-[14px] text-plum/55">Quand vous serez prêts, vous pourrez proposer une rencontre — au rythme de chacun, dans un lieu public.</li>}{plans.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 rounded-2xl bg-peach-200/60 px-4 py-2.5 text-[14.5px]"><span><b>{p.idea}</b><br /><span className="text-[12.5px] text-plum/65">{p.when}</span></span><span className={cn('chip', p.state === 'accepted' ? 'bg-mint' : 'bg-white')}>{p.state === 'accepted' ? 'Accepté ✓' : 'Proposé…'}</span></li>)}</ul>
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
