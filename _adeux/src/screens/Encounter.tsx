import { motion } from 'motion/react'
import { useState } from 'react'
import { Button, EmptyState, IconButton, Screen, Sheet } from '../ui/kit'
import { Buddy, Portrait, Silhouette } from '../ui/Art'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { STAGES, canInteract } from '../lib/journey'
import { KIND_END, partnerAge, useEnc } from '../ui/shared'
import { cn } from '../lib/util'
import { sfx } from '../lib/audio'

export function EncounterTab() {
  const { enc, partner, sum, photos, out } = useEnc()
  const setTab = useUI((s) => s.setTab)
  const open = useUI((s) => s.open)
  const { answerIntro, introAnswer, pauseEnc, resumeEnc } = useStore()
  const [menu, setMenu] = useState(false)
  const [text, setText] = useState('')

  if (!enc || !partner || ['declined'].includes(enc.status)) {
    return (
      <Screen title="Notre rencontre">
        <EmptyState art={<Buddy size={100} mood="calm" />} title="Pas encore de rencontre" text="Ici se construira ton histoire avec une personne à la fois. Rends-toi à l’accueil pour découvrir ta proposition." action={<Button onClick={() => setTab('home')} testId="goto-home">Aller à l’accueil</Button>} />
      </Screen>
    )
  }
  const ended = enc.status === 'closed' || enc.status === 'blocked'
  const live = canInteract(enc)

  return (
    <Screen title="Notre rencontre" right={!ended ? <IconButton label="Options de la rencontre" onClick={() => setMenu(true)} testId="enc-menu"><span aria-hidden className="text-xl leading-none">⋯</span></IconButton> : undefined}>
      <div className="mx-auto max-w-[520px] pb-6">
        <div className="flex flex-col items-center pt-1 text-center">
          {photos ? <Portrait spec={partner.portrait} size={150} radius={44} /> : <Silhouette size={140} pulse={!ended} glow={ended ? '#8C82A8' : '#A88BC7'} />}
          <h2 className="font-display mt-1 text-[30px] font-semibold" data-testid="enc-partner">{partner.pseudo}</h2>
          <p className="text-[14px] text-plum/65">{partnerAge(partner)}{photos ? '' : ' · photo cachée'} · <span className="font-semibold">fictif·ve (démo)</span></p>
        </div>

        {ended ? (
          <div className="card mt-5 p-5 text-center" data-testid="enc-ended"><p className="font-display text-[22px] font-semibold leading-snug">{out === 'kind-end' ? KIND_END : enc.status === 'blocked' ? 'Cette rencontre est terminée.' : 'Tu as quitté cette rencontre.'}</p><div className="mt-4"><Button onClick={() => { useStore.getState().set({ encounter: null }); setTab('home') }} full testId="enc-back-home">Retourner à mon espace</Button></div></div>
        ) : (
          <>
            {enc.status === 'paused' && (
              <div className="card mt-5 flex items-center justify-between gap-3 p-4" data-testid="enc-paused"><p className="text-[14.5px]">Rencontre en pause. Rien ne bouge tant que tu ne reprends pas.</p><Button onClick={resumeEnc} variant="peach" testId="resume">Reprendre</Button></div>
            )}
            <Journey stage={enc.stage} revealed={enc.status === 'revealed'} />

            {live && enc.status !== 'revealed' && (
              <motion.div key={enc.stage} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card mt-4 p-5" data-testid={`step-card-${enc.stage}`}>
                {enc.stage === 0 && !enc.done.intro && (
                  <>
                    <p className="kicker">Pour démarrer</p>
                    <p className="font-display mt-1 text-[21px] leading-snug">« {partner.intriguing} »</p>
                    <p className="mt-1 text-[13.5px] text-plum/65">{partner.pseudo} a posé cette question. Réponds en quelques mots, il ou elle te répondra aussi.</p>
                    <textarea data-testid="intro-answer" className="field mt-3 min-h-[92px] resize-none" maxLength={240} placeholder="Ta réponse…" value={text} onChange={(e) => setText(e.target.value)} />
                    <div className="mt-3"><Button onClick={() => { sfx.chime(); answerIntro(text.trim()) }} disabled={text.trim().length < 2} testId="intro-send" full>Envoyer ma réponse</Button></div>
                  </>
                )}
                {enc.done.intro && enc.stage < 3 && introAnswer !== null && (
                  <div className="mb-4 rounded-2xl bg-lavender-100 p-4 text-[14.5px]" data-testid="intro-exchange">
                    <p className="kicker">Votre échange de départ</p>
                    <p className="mt-2"><b>Toi :</b> {introAnswer}</p>
                    <p className="mt-1"><b>{partner.pseudo} :</b> {partner.voice[1]}</p>
                  </div>
                )}
                {enc.stage === 1 && (
                  <>
                    <p className="kicker">Prochaine étape</p>
                    <p className="font-display mt-1 text-[21px] leading-snug">Jouez ensemble, ne serait-ce qu’une fois.</p>
                    <p className="mt-1 text-[13.5px] text-plum/65">Un mini-jeu ou « Notre moment » suffit. Rien d’obligatoire.</p>
                    <div className="mt-3"><Button onClick={() => setTab('activities')} testId="goto-activities" full>Choisir une activité</Button></div>
                  </>
                )}
                {enc.stage === 2 && (
                  <>
                    <p className="kicker">Prochaine étape</p>
                    <p className="font-display mt-1 text-[21px] leading-snug">Faites connaissance par la voix.</p>
                    <p className="mt-1 text-[13.5px] text-plum/65">Un appel de 5 à 10 minutes si vous êtes tous les deux à l’aise, ou un message vocal. Vos numéros restent privés.</p>
                    <div className="mt-3 flex flex-col gap-2"><Button onClick={() => open({ name: 'call' })} testId="start-call" full>Proposer un appel vocal</Button><Button variant="soft" onClick={() => setTab('messages')} testId="goto-voice-msg" full>Envoyer un message vocal</Button></div>
                  </>
                )}
                {enc.stage === 3 && (
                  <>
                    <p className="kicker">La révélation</p>
                    <p className="font-display mt-1 text-[21px] leading-snug">Tu as envie d’en découvrir un peu plus ?</p>
                    <p className="mt-1 text-[13.5px] text-plum/65">{enc.consent.me === null ? 'Ta réponse reste secrète. Rien ne s’affiche sans l’accord des deux.' : 'Ta réponse est enregistrée. Tu seras prévenu·e quand l’autre aura répondu.'}</p>
                    {enc.consent.me === null && <div className="mt-3"><Button onClick={() => open({ name: 'consent' })} testId="goto-consent" full>Répondre en privé</Button></div>}
                  </>
                )}
              </motion.div>
            )}

            {enc.status === 'revealed' && (
              <div className="mt-4 flex flex-col gap-2"><Button onClick={() => open({ name: 'world' })} testId="goto-world" full>Entrer dans Notre monde</Button><Button variant="soft" onClick={() => open({ name: 'reveal' })} testId="replay-reveal" full>Revoir la révélation</Button></div>
            )}

            {sum && (
              <div className="mt-4 rounded-3xl bg-white/70 p-5" data-testid="enc-common">
                <p className="kicker">Ce que vous avez en commun</p>
                <ul className="mt-2 space-y-2">{sum.shared.map((s) => <li key={s.qid} className="flex gap-2 text-[14.5px]"><span aria-hidden>✨</span>{s.text}</li>)}</ul>
                {sum.different[0] && <p className="mt-3 text-[13.5px] text-plum/70"><span aria-hidden>🧭 </span>{sum.different[0].text}</p>}
              </div>
            )}
          </>
        )}
      </div>
      <SafetySheet open={menu} onClose={() => setMenu(false)} paused={enc.status === 'paused'} />
    </Screen>
  )
}

const STAGE_ICON = ['🔎', '🧩', '🎙️', '🌅']
function Journey({ stage, revealed }: { stage: number; revealed: boolean }) {
  return (
    <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="Progression de la rencontre" data-testid="journey">
      {STAGES.map((s, i) => {
        const done = revealed || i < stage
        const cur = !revealed && i === stage
        return (
          <li key={s.id} className="flex flex-col items-center gap-1.5 text-center" aria-current={cur ? 'step' : undefined}>
            <motion.span animate={cur ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 2.4, repeat: Infinity }}
              className={cn('grid h-12 w-12 place-items-center rounded-full text-xl transition-colors', done ? 'bg-plum text-cream' : cur ? 'bg-peach text-plum ring-4 ring-peach/40' : 'bg-plum/10 text-plum/40')}>{done ? '✓' : STAGE_ICON[i]}</motion.span>
            <span className={cn('text-[11.5px] font-semibold leading-tight', cur || done ? 'text-plum' : 'text-plum/45')}>{s.short}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function SafetySheet({ open, onClose, paused }: { open: boolean; onClose: () => void; paused: boolean }) {
  const { pauseEnc, resumeEnc, leaveEnc, blockEnc, reportEnc } = useStore()
  const toast = useUI((s) => s.toast)
  const [view, setView] = useState<'menu' | 'leave' | 'block' | 'report'>('menu')
  const [reason, setReason] = useState('')
  const done = (msg: string) => { setView('menu'); onClose(); toast(msg, 'ok') }
  const revealedNoPause = useStore((st) => st.encounter?.status === 'revealed')
  const reasons = ['Comportement irrespectueux', 'Propos déplacés', 'Profil suspect ou faux', 'Pression ou insistance', 'Autre']
  return (
    <Sheet open={open} onClose={() => { setView('menu'); onClose() }} title={view === 'menu' ? 'Options de la rencontre' : view === 'leave' ? 'Quitter la rencontre ?' : view === 'block' ? 'Bloquer cette personne ?' : 'Signaler'} testId="safety-sheet">
      {view === 'menu' && (
        <div className="flex flex-col gap-2 pb-2">
          {revealedNoPause ? null : <Button variant="soft" onClick={() => { paused ? resumeEnc() : pauseEnc(); done(paused ? 'Rencontre reprise.' : 'Rencontre en pause.') }} testId="pause">{paused ? 'Reprendre la rencontre' : 'Mettre en pause'}</Button>}
          <Button variant="soft" onClick={() => setView('leave')} testId="leave">Quitter la rencontre</Button>
          <Button variant="soft" onClick={() => setView('report')} testId="report">Signaler un comportement</Button>
          <Button variant="primary" className="!bg-rose-600" onClick={() => setView('block')} testId="block">Bloquer</Button>
        </div>
      )}
      {view === 'leave' && (<div className="flex flex-col gap-2 pb-2"><p className="text-[15px] text-plum/75">Tu peux partir à tout moment, sans explication. Cette personne ne te sera pas reproposée.</p><Button onClick={() => { leaveEnc(); done('Tu as quitté la rencontre.') }} testId="leave-confirm">Quitter</Button><Button variant="ghost" onClick={() => setView('menu')}>Annuler</Button></div>)}
      {view === 'block' && (<div className="flex flex-col gap-2 pb-2"><p className="text-[15px] text-plum/75">Plus aucun échange ne sera possible dans les deux sens, et aucune photo ne sera accessible. L’autre personne n’est pas prévenue du détail.</p><Button className="!bg-rose-600 !text-white" onClick={() => { blockEnc(); done('Personne bloquée. Les échanges sont terminés.') }} testId="block-confirm">Bloquer définitivement</Button><Button variant="ghost" onClick={() => setView('menu')}>Annuler</Button></div>)}
      {view === 'report' && (
        <div className="flex flex-col gap-2 pb-2">
          {reasons.map((r) => <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)} className={cn('min-h-[48px] rounded-2xl border-2 px-4 text-left text-[15px] font-medium', reason === r ? 'border-plum bg-peach-200' : 'border-plum/10 bg-white')}>{r}</button>)}
          <Button disabled={!reason} onClick={() => { reportEnc(reason); setReason(''); done('Merci, ton signalement est enregistré.') }} testId="report-send">Envoyer le signalement</Button>
          <Button variant="ghost" onClick={() => setView('menu')}>Retour</Button>
        </div>
      )}
    </Sheet>
  )
}
