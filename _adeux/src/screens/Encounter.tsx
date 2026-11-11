import { motion } from 'motion/react'
import { useState } from 'react'
import { Button, EmptyState, IconButton, Screen, Sheet } from '../ui/kit'
import { Logo, PathsArt, Portrait, Silhouette } from '../ui/Art'
import { useStore } from '../lib/store'
import { useUI } from '../lib/ui'
import { STAGES, canInteract } from '../lib/journey'
import { KIND_END, partnerAge, useEnc } from '../ui/shared'
import { cn } from '../lib/util'
import { sfx } from '../lib/audio'

const ease = [0.22, 0.8, 0.24, 1] as [number, number, number, number]

export function EncounterTab() {
  const { enc, partner, sum, photos, out } = useEnc()
  const setTab = useUI((s) => s.setTab)
  const open = useUI((s) => s.open)
  const { answerIntro, introAnswer, resumeEnc } = useStore()
  const [menu, setMenu] = useState(false)
  const [text, setText] = useState('')

  if (!enc || !partner || enc.status === 'declined') {
    return (
      <Screen title="Rencontre">
        <EmptyState art={<PathsArt className="w-[56%] max-w-[200px] opacity-80" />} title="Pas encore de rencontre." text="Ici se construira ton histoire, avec une personne à la fois. Retrouve ta proposition sur l’accueil." action={<Button onClick={() => setTab('home')} testId="goto-home">Aller à l’accueil</Button>} />
      </Screen>
    )
  }
  const ended = enc.status === 'closed' || enc.status === 'blocked'
  const live = canInteract(enc)

  return (
    <Screen title="Rencontre" right={!ended ? <IconButton label="Options de la rencontre" onClick={() => setMenu(true)} testId="enc-menu"><span aria-hidden className="text-2xl leading-none">···</span></IconButton> : undefined}>
      <div className="mx-auto max-w-[520px] pb-10">
        <div className="flex flex-col items-center pt-2 text-center">
          {photos ? <Portrait spec={partner.portrait} size={112} radius={56} /> : <Silhouette size={88} dark={false} pulse={!ended} glow={ended ? '#A898B3' : '#FFC4AB'} />}
          <h2 className="font-display mt-4 text-[52px] leading-none" data-testid="enc-partner">{partner.pseudo}</h2>
          <p className="mt-3 text-[12px] tracking-[.18em] text-plum/50">{partnerAge(partner).toUpperCase()}{photos ? '' : ' · PHOTO CACHÉE'} · FICTIF·VE (DÉMO)</p>
        </div>

        {ended ? (
          <div className="mt-10 text-center" data-testid="enc-ended"><p className="font-display text-[32px] leading-[1.08] text-balance">{out === 'kind-end' ? KIND_END : enc.status === 'blocked' ? 'Cette rencontre est terminée.' : 'Tu as quitté cette rencontre.'}</p><div className="mt-8"><Button onClick={() => { useStore.getState().set({ encounter: null }); setTab('home') }} full testId="enc-back-home">Retourner à mon espace</Button></div></div>
        ) : (
          <>
            {enc.status === 'paused' && (
              <div className="mt-8 flex items-center justify-between gap-4 border-y border-plum/12 py-4" data-testid="enc-paused"><p className="text-[14.5px] text-plum/70">En pause. Rien ne bouge tant que tu ne reprends pas.</p><Button onClick={resumeEnc} variant="peach" testId="resume">Reprendre</Button></div>
            )}
            <Journey stage={enc.stage} revealed={enc.status === 'revealed'} />

            {live && enc.status !== 'revealed' && (
              <motion.div key={enc.stage} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease }} className="mt-10" data-testid={`step-card-${enc.stage}`}>
                {enc.stage === 0 && !enc.done.intro && (
                  <>
                    <p className="kicker">Pour démarrer</p>
                    <p className="font-display mt-3 text-[32px] leading-[1.08]">« {partner.intriguing} »</p>
                    <textarea data-testid="intro-answer" className="field mt-6 min-h-[92px] resize-none text-[19px]" maxLength={240} placeholder="Ta réponse, en quelques mots…" value={text} onChange={(e) => setText(e.target.value)} />
                    <div className="mt-6"><Button onClick={() => { sfx.chime(); answerIntro(text.trim()) }} disabled={text.trim().length < 2} testId="intro-send" full>Envoyer ma réponse</Button></div>
                  </>
                )}
                {enc.done.intro && enc.stage < 3 && introAnswer !== null && (
                  <div className="mb-10 border-l border-plum/25 pl-5" data-testid="intro-exchange">
                    <p className="kicker">Votre échange de départ</p>
                    <p className="font-display mt-3 text-[22px] leading-snug">{introAnswer}</p>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-plum/60"><span className="text-plum">{partner.pseudo}</span> — {partner.voice[1]}</p>
                  </div>
                )}
                {enc.stage === 1 && (
                  <>
                    <p className="kicker">Étape suivante</p>
                    <p className="font-display mt-3 text-[34px] leading-[1.06]">Faites quelque chose ensemble, ne serait-ce qu’une fois.</p>
                    <p className="mt-3 text-[14.5px] text-plum/60">Une activité à deux suffit. Rien n’est obligatoire.</p>
                    <div className="mt-6"><Button onClick={() => setTab('activities')} testId="goto-activities" full>Choisir une activité</Button></div>
                  </>
                )}
                {enc.stage === 2 && (
                  <>
                    <p className="kicker">Étape suivante</p>
                    <p className="font-display mt-3 text-[34px] leading-[1.06]">Entendez-vous, à votre rythme.</p>
                    <p className="mt-3 text-[14.5px] text-plum/60">Un appel de 5 à 10 minutes si vous êtes tous les deux à l’aise, ou un message vocal. Vos numéros restent privés.</p>
                    <div className="mt-6 flex flex-col gap-1"><Button onClick={() => open({ name: 'call' })} testId="start-call" full>Proposer un appel vocal</Button><div className="flex justify-center"><Button variant="ghost" onClick={() => setTab('messages')} testId="goto-voice-msg">Envoyer un message vocal</Button></div></div>
                  </>
                )}
                {enc.stage === 3 && (
                  <>
                    <p className="kicker">La révélation</p>
                    <p className="font-display mt-3 text-[34px] leading-[1.06]">Tu as envie d’en découvrir un peu plus&nbsp;?</p>
                    <p className="mt-3 text-[14.5px] text-plum/60">{enc.consent.me === null ? 'Ta réponse reste secrète. Rien ne s’affiche sans l’accord des deux.' : 'Ta réponse est enregistrée. Tu seras prévenu·e quand l’autre aura répondu.'}</p>
                    {enc.consent.me === null && <div className="mt-6"><Button onClick={() => open({ name: 'consent' })} testId="goto-consent" full>Répondre en privé</Button></div>}
                  </>
                )}
              </motion.div>
            )}

            {enc.status === 'revealed' && <div className="mt-10 flex flex-col gap-1"><Button onClick={() => open({ name: 'world' })} testId="goto-world" full>Entrer dans Notre monde</Button><div className="flex justify-center"><Button variant="ghost" onClick={() => open({ name: 'reveal' })} testId="replay-reveal">Revoir la révélation</Button></div></div>}

            {sum && (
              <div className="mt-12" data-testid="enc-common">
                <p className="kicker mb-1">Ce que vous avez en commun</p>
                <ul>{sum.shared.map((s) => <li key={s.qid} className="font-display border-t border-plum/12 py-4 text-[21px] italic leading-snug">{s.text}</li>)}</ul>
                {sum.different[0] && <p className="border-t border-plum/12 pt-4 text-[13.5px] leading-snug text-plum/55">{sum.different[0].text}</p>}
              </div>
            )}
          </>
        )}
      </div>
      <SafetySheet open={menu} onClose={() => setMenu(false)} paused={enc.status === 'paused'} />
    </Screen>
  )
}

/** Progression : quatre points sur un fil, jamais un parcours de jeu. */
function Journey({ stage, revealed }: { stage: number; revealed: boolean }) {
  return (
    <ol className="relative mt-9 grid grid-cols-4" aria-label="Progression de la rencontre" data-testid="journey">
      <div className="absolute left-[12.5%] right-[12.5%] top-[5px] h-px bg-plum/15" />
      <motion.div className="absolute left-[12.5%] top-[5px] h-px bg-plum" initial={false} animate={{ width: `${revealed ? 75 : Math.min(stage, 3) * 25}%` }} transition={{ duration: 0.9, ease }} />
      {STAGES.map((s, i) => {
        const done = revealed || i < stage, cur = !revealed && i === stage
        return (
          <li key={s.id} className="relative flex flex-col items-center gap-2 text-center" aria-current={cur ? 'step' : undefined}>
            <span className="relative block h-[11px] w-[11px]">
              {cur && <motion.span className="absolute inset-[-5px] rounded-full border border-plum/50" animate={{ scale: [1, 1.5], opacity: [0.7, 0] }} transition={{ duration: 2.2, repeat: Infinity }} />}
              <span className={cn('absolute inset-0 rounded-full border transition-colors duration-500', done || cur ? 'border-plum bg-plum' : 'border-plum/30 bg-cream')} />
            </span>
            <span className={cn('text-[11px] tracking-wide', cur ? 'font-medium text-plum' : done ? 'text-plum/70' : 'text-plum/35')}>{s.short}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function SafetySheet({ open, onClose, paused }: { open: boolean; onClose: () => void; paused: boolean }) {
  const { pauseEnc, resumeEnc, leaveEnc, blockEnc, reportEnc } = useStore()
  const toast = useUI((s) => s.toast)
  const revealedNoPause = useStore((st) => st.encounter?.status === 'revealed')
  const [view, setView] = useState<'menu' | 'leave' | 'block' | 'report'>('menu')
  const [reason, setReason] = useState('')
  const done = (msg: string) => { setView('menu'); onClose(); toast(msg, 'ok') }
  const reasons = ['Comportement irrespectueux', 'Propos déplacés', 'Profil suspect ou faux', 'Pression ou insistance', 'Autre']
  const Item = ({ children, onClick, testId, danger }: { children: React.ReactNode; onClick: () => void; testId: string; danger?: boolean }) => (
    <button type="button" data-testid={testId} onClick={() => { sfx.tap(); onClick() }} className={cn('flex min-h-[58px] w-full items-center border-t border-plum/12 text-left text-[17px]', danger && 'text-rose-600')}>{children}</button>
  )
  return (
    <Sheet open={open} onClose={() => { setView('menu'); onClose() }} title={view === 'menu' ? 'Cette rencontre' : view === 'leave' ? 'Quitter ?' : view === 'block' ? 'Bloquer ?' : 'Signaler'} testId="safety-sheet">
      {view === 'menu' && (
        <div className="pb-4">
          {!revealedNoPause && <Item testId="pause" onClick={() => { paused ? resumeEnc() : pauseEnc(); done(paused ? 'Rencontre reprise.' : 'Rencontre en pause.') }}>{paused ? 'Reprendre la rencontre' : 'Mettre en pause'}</Item>}
          <Item testId="leave" onClick={() => setView('leave')}>Quitter la rencontre</Item>
          <Item testId="report" onClick={() => setView('report')}>Signaler un comportement</Item>
          <Item testId="block" danger onClick={() => setView('block')}>Bloquer</Item>
        </div>
      )}
      {view === 'leave' && (<div className="flex flex-col gap-1 pb-4"><p className="pb-4 text-[15px] text-plum/65">Tu peux partir à tout moment, sans explication. Cette personne ne te sera pas reproposée.</p><Button onClick={() => { leaveEnc(); done('Tu as quitté la rencontre.') }} testId="leave-confirm">Quitter</Button><Button variant="ghost" onClick={() => setView('menu')}>Annuler</Button></div>)}
      {view === 'block' && (<div className="flex flex-col gap-1 pb-4"><p className="pb-4 text-[15px] text-plum/65">Plus aucun échange ne sera possible, dans les deux sens, et aucune photo ne sera accessible.</p><Button className="!bg-rose-600 !text-white" onClick={() => { blockEnc(); done('Personne bloquée. Les échanges sont terminés.') }} testId="block-confirm">Bloquer définitivement</Button><Button variant="ghost" onClick={() => setView('menu')}>Annuler</Button></div>)}
      {view === 'report' && (
        <div className="pb-4">
          {reasons.map((r) => <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)} className={cn('flex min-h-[54px] w-full items-center justify-between border-t border-plum/12 text-left text-[16px]', reason === r && 'font-medium')}>{r}{reason === r && <span aria-hidden>●</span>}</button>)}
          <div className="mt-4 flex flex-col gap-1"><Button disabled={!reason} onClick={() => { reportEnc(reason); setReason(''); done('Merci, ton signalement est enregistré.') }} testId="report-send">Envoyer le signalement</Button><Button variant="ghost" onClick={() => setView('menu')}>Retour</Button></div>
        </div>
      )}
    </Sheet>
  )
}
export { Logo }
