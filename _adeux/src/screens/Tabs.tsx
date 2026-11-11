import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Button, EmptyState, ErrorState, IconButton, Screen, Sheet, useBusy } from '../ui/kit'
import { Ico, Icon, Logo, PathsArt } from '../ui/Art'
import { Toggle } from './Onboarding'
import { DemoBanner } from './Home'
import { useStore, todaysMoment, typingListeners, type Message } from '../lib/store'
import { useUI } from '../lib/ui'
import { canInteract } from '../lib/journey'
import { useEnc } from '../ui/shared'
import { cn, fmtTime, uid } from '../lib/util'
import { sfx, setSoundEnabled } from '../lib/audio'
import { deleteVoice, loadVoice, saveVoice, useRecorder } from '../lib/voice'
import { APP_VERSION, BUILD_ID, checkForUpdate, usePWA } from '../lib/pwa'
import { removeMyPhoto } from '../lib/photo'
import { DEMO_PROFILE } from '../lib/demoSeed'

// ============ ACTIVITÉS ============
export function ActivitiesTab() {
  const { enc, partner } = useEnc()
  const open = useUI((s) => s.open)
  const setTab = useUI((s) => s.setTab)
  const games = useStore((s) => s.games)
  const log = useStore((s) => s.gameLog)
  const mDone = useStore((s) => s.moments[s.today()])
  const live = canInteract(enc)

  if (!live || !partner) {
    return (
      <Screen title="Activités">
        <EmptyState art={<PathsArt className="w-[52%] max-w-[190px] opacity-80" />} title="Les activités se vivent à deux." text="Dès que ta rencontre commencera, tu retrouveras ici Le Miroir, Le Pont, La Boussole et Notre moment." action={<Button onClick={() => setTab('home')} testId="act-home">Aller à l’accueil</Button>} />
      </Screen>
    )
  }
  const count = (k: string) => log.filter((l) => l.kind === k).length
  const rows = [
    { kind: 'mirror' as const, n: 'I', title: 'Le Miroir', text: 'Répondre en secret. Découvrir ensemble.', state: games.mirror && !games.mirror.flipped ? (games.mirror.mine ? 'En attente' : 'Reprendre') : count('mirror') ? `Joué ${count('mirror')} fois` : '2 min' },
    { kind: 'bridge' as const, n: 'II', title: 'Le Pont', text: 'Deux rives. Une construction à quatre mains.', state: games.bridge && !games.bridge.done ? 'Reprendre' : count('bridge') ? `Joué ${count('bridge')} fois` : '2 min' },
    { kind: 'compass' as const, n: 'III', title: 'La Boussole', text: 'Comprendre comment l’autre choisit.', state: games.compass && !games.compass.done ? 'Reprendre' : count('compass') ? `Joué ${count('compass')} fois` : '3 min' },
  ]
  const mo = todaysMoment(useStore.getState().today())
  return (
    <Screen title="Activités">
      <div className="mx-auto max-w-[520px] pb-10">
        <DemoBanner />
        <h2 className="font-display mt-6 text-[44px] leading-[1.0]">À faire ensemble.</h2>
        <p className="mt-3 max-w-[300px] text-[15px] text-plum/60">Avec {partner.pseudo}. Une seule activité suffit pour avancer.</p>
        <ul className="mt-8">
          {rows.map((c, i) => (
            <motion.li key={c.kind} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.09, duration: 0.55 }} className="border-t border-plum/12">
              <button type="button" data-testid={`game-${c.kind}`} onClick={() => { sfx.tap(); open({ name: 'game', kind: c.kind }) }} className="flex min-h-[104px] w-full items-center gap-5 py-5 text-left">
                <span className="font-display w-9 shrink-0 text-[20px] italic text-plum/35">{c.n}</span>
                <span className="min-w-0 flex-1"><span className="font-display block text-[34px] leading-none">{c.title}</span><span className="mt-2 block text-[14px] leading-snug text-plum/60">{c.text}</span></span>
                <span className="shrink-0 text-right text-[12px] text-plum/45">{c.state}</span>
              </button>
            </motion.li>
          ))}
          <li className="border-y border-plum/12">
            <button type="button" data-testid="activity-moment" onClick={() => open({ name: 'moment' })} className="flex min-h-[96px] w-full items-center gap-5 py-5 text-left">
              <span className="font-display w-9 shrink-0 text-[20px] italic text-plum/35">IV</span>
              <span className="min-w-0 flex-1"><span className="font-display block text-[34px] leading-none">Notre moment</span><span className="mt-2 block text-[14px] leading-snug text-plum/60">{mo.title} · facultatif</span></span>
              <span className="shrink-0 text-right text-[12px] text-plum/45">{mDone?.mine ? 'Partagé' : mDone?.skipped ? 'Passé' : 'Aujourd’hui'}</span>
            </button>
          </li>
        </ul>
      </div>
    </Screen>
  )
}

// ============ NOTRE MOMENT ============
export function MomentScreen() {
  const close = useUI((s) => s.close)
  const { enc, partner } = useEnc()
  const k = useStore((s) => s.today())
  const entry = useStore((s) => s.moments[k])
  const { answerMoment, skipMoment, sendVoice } = useStore()
  const mo = todaysMoment(k)
  const [text, setText] = useState('')
  const rec = useRecorder(30)
  useBusy(true)
  const live = canInteract(enc)

  const submitVoice = async () => {
    const b = await rec.stop(); if (!b) return
    const key = uid(); await saveVoice(key, b)
    sendVoice(key); answerMoment('Message vocal partagé'); sfx.chime()
  }
  return (
    <Screen title="Notre moment" onBack={close} closeIcon testId="moment">
      <div className="mx-auto max-w-[520px] pb-10 pt-4">
        <p className="kicker">{mo.title}</p>
        <h2 className="font-display mt-4 text-[clamp(34px,9.6vw,44px)] leading-[1.04] text-balance" data-testid="moment-prompt">{mo.prompt}</h2>
        <p className="mt-4 text-[13.5px] text-plum/50">Facultatif. Pas de série à maintenir : rien ne se perd si tu passes.</p>
        {!live || !partner ? (
          <p className="mt-8 text-[15px] text-plum/60">Cette activité est disponible pendant une rencontre active.</p>
        ) : entry?.mine ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-10" data-testid="moment-done">
            <div className="border-t border-plum/12 py-5"><p className="kicker">Toi</p><p className="font-display mt-2 text-[26px] leading-snug">{entry.mine}</p></div>
            <motion.div initial={{ opacity: 0, filter: 'blur(8px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ delay: 0.7, duration: 0.9 }} className="border-t border-plum/12 py-5"><p className="kicker">{partner.pseudo}</p><p className="font-display mt-2 text-[26px] italic leading-snug">{entry.theirs}</p></motion.div>
            <div className="mt-6"><Button onClick={close} variant="soft" full>Terminer</Button></div>
          </motion.div>
        ) : entry?.skipped ? (
          <div className="mt-10"><p className="font-display text-[26px] leading-snug">Aucun souci. Le prochain moment sera là demain.</p><div className="mt-8 flex flex-col gap-1"><Button variant="soft" onClick={() => useStore.getState().set({ moments: { ...useStore.getState().moments, [k]: {} } })}>Finalement, je participe</Button><Button variant="ghost" onClick={close}>Fermer</Button></div></div>
        ) : (
          <div className="mt-10">
            {mo.options ? (
              <ul className="border-b border-plum/12">{mo.options.map((o) => <li key={o} className="border-t border-plum/12"><button type="button" data-testid="moment-option" onClick={() => { answerMoment(o); sfx.chime() }} className="min-h-[72px] w-full py-5 text-left font-display text-[24px] leading-snug">{o}</button></li>)}</ul>
            ) : mo.kind === 'voice' ? (
              <div className="text-center" data-testid="moment-voice">
                {rec.state === 'unsupported' || rec.state === 'denied' || rec.state === 'error' ? (
                  <ErrorState title={rec.state === 'denied' ? 'Micro non autorisé.' : 'Enregistrement indisponible.'} text={rec.state === 'denied' ? 'Autorise le micro dans les réglages de ton navigateur, ou réponds par écrit.' : 'Ton appareil ne permet pas l’enregistrement. Tu peux répondre par écrit.'} />
                ) : rec.state === 'recording' ? (
                  <><Waveform /><p className="font-display my-3 text-[44px]">{fmtTime(rec.seconds)}</p><Button onClick={submitVoice} testId="moment-voice-send" full>Envoyer</Button><Button variant="ghost" onClick={rec.cancel}>Annuler</Button></>
                ) : (
                  <Button onClick={() => void rec.start()} testId="moment-voice-rec" full><Ico d={Icon.mic} size={18} /> Enregistrer</Button>
                )}
              </div>
            ) : (
              <>
                <textarea data-testid="moment-text" className="field min-h-[110px] resize-none text-[20px]" maxLength={300} placeholder="Ta réponse…" value={text} onChange={(e) => setText(e.target.value)} />
                <div className="mt-6"><Button disabled={text.trim().length < 2} onClick={() => { answerMoment(text.trim()); sfx.chime() }} testId="moment-send" full>Partager</Button></div>
              </>
            )}
            <div className="mt-2 flex justify-center"><Button variant="ghost" onClick={() => { skipMoment(); close() }} testId="moment-skip">Pas aujourd’hui</Button></div>
          </div>
        )}
      </div>
    </Screen>
  )
}

export function Waveform({ level = 0.6, bars = 22, light }: { level?: number; bars?: number; light?: boolean }) {
  return (
    <div className="flex h-14 items-center justify-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span key={i} className={cn('w-[2px] rounded-full', light ? 'bg-cream' : 'bg-plum')} animate={{ height: [6, 8 + ((i * 17) % 38) * level, 6] }} transition={{ duration: 0.9 + (i % 5) * 0.14, repeat: Infinity, delay: i * 0.04, ease: 'easeInOut' }} />
      ))}
    </div>
  )
}

// ============ MESSAGES ============
export function MessagesTab() {
  const { enc, partner } = useEnc()
  const chat = useStore((s) => s.chat)
  const send = useStore((s) => s.send)
  const sendVoice = useStore((s) => s.sendVoice)
  const setTab = useUI((s) => s.setTab)
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const [micOpen, setMicOpen] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const live = canInteract(enc)
  useEffect(() => { typingListeners.add(setTyping); return () => { typingListeners.delete(setTyping) } }, [])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [chat.length, typing])
  useBusy(text.length > 0)

  if (!enc || !partner || (enc.stage < 1 && !chat.length)) {
    return (
      <Screen title="Messages">
        <EmptyState art={<PathsArt className="w-[52%] max-w-[190px] opacity-80" />} title="Pas encore de conversation." text={enc && partner ? `La messagerie s’ouvre après votre premier échange avec ${partner.pseudo}.` : 'Les messages s’ouvrent quand une rencontre commence, après un premier échange.'} action={<Button onClick={() => setTab(enc ? 'encounter' : 'home')} testId="msg-goto">{enc ? 'Voir ma rencontre' : 'Aller à l’accueil'}</Button>} />
      </Screen>
    )
  }
  const submit = () => { if (!text.trim()) return; send(text); setText(''); sfx.tap() }
  return (
    <div className="absolute inset-0 flex flex-col bg-cream" data-testid="messages">
      <header className="pt-safe px-safe pb-3 text-center"><h1 className="font-display text-[30px] leading-none">{partner.pseudo}</h1><p className="mt-1.5 text-[11px] tracking-[.16em] text-plum/45">{live ? 'CONVERSATION PRIVÉE · FICTIF·VE (DÉMO)' : 'CONVERSATION TERMINÉE'}</p></header>
      <div className="mx-6 border-t border-plum/10" />
      <div className="scroll-y px-safe min-h-0 flex-1 py-4" data-testid="chat-list" role="log" aria-live="polite">
        {chat.length === 0 && <p className="font-display mt-10 text-center text-[24px] italic text-plum/45">Dis bonjour.</p>}
        <div className="flex flex-col gap-2.5">
          {chat.map((m) => <Bubble key={m.id} m={m} />)}
          {typing && <div className="flex gap-1 self-start rounded-[20px] bg-lavender px-4 py-3.5" aria-label={`${partner.pseudo} écrit`}>{[0, 1, 2].map((i) => <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-plum/50" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.1, delay: i * 0.18 }} />)}</div>}
          <div ref={end} />
        </div>
      </div>
      {live ? (
        <div className="px-safe flex items-center gap-1 border-t border-plum/10 bg-cream pb-2 pt-2">
          <IconButton label="Message vocal" onClick={() => setMicOpen(true)} testId="mic-open"><Ico d={Icon.mic} size={21} /></IconButton>
          <input data-testid="chat-input" className="min-h-[48px] flex-1 border-0 bg-transparent px-2 text-[16px] outline-none placeholder:text-plum/35" value={text} maxLength={1000} placeholder="Ton message…" aria-label="Ton message" enterKeyHint="send" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <IconButton label="Envoyer" onClick={submit} className="!bg-plum !text-cream" testId="chat-send"><Ico d={Icon.send} size={20} w={2} /></IconButton>
        </div>
      ) : <p className="px-safe pb-4 pt-3 text-center text-[14px] text-plum/55" data-testid="chat-closed">Cette conversation est terminée.</p>}
      <VoiceSheet open={micOpen} onClose={() => setMicOpen(false)} onSend={(k) => { sendVoice(k); setMicOpen(false) }} />
    </div>
  )
}

function Bubble({ m }: { m: Message }) {
  if (m.from === 'system') return <p className="my-3 self-center text-center text-[12px] tracking-wide text-plum/45">{m.text}</p>
  const me = m.from === 'me'
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 0.8, 0.24, 1] }} data-testid={me ? 'msg-me' : 'msg-partner'}
      className={cn('max-w-[82%] px-4 py-3 text-[15.5px] leading-snug', me ? 'self-end rounded-[22px_22px_6px_22px] bg-plum text-cream' : 'self-start rounded-[22px_22px_22px_6px] bg-lavender')}>
      {m.kind === 'voice' ? <VoicePlayer k={m.voiceKey!} dark={me} /> : m.text}
    </motion.div>
  )
}

function VoicePlayer({ k, dark }: { k: string; dark?: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)
  const [playing, setPlaying] = useState(false)
  const a = useRef<HTMLAudioElement>(null)
  useEffect(() => { let u: string | undefined; loadVoice(k).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u) } else setMissing(true) }); return () => { if (u) URL.revokeObjectURL(u) } }, [k])
  if (missing) return <span className="text-[14px] opacity-70">Message vocal (indisponible sur cet appareil)</span>
  return (
    <button type="button" data-testid="voice-play" className="flex min-h-[36px] items-center gap-3" disabled={!url}
      onClick={() => { const el = a.current; if (!el) return; if (playing) { el.pause(); setPlaying(false) } else { void el.play(); setPlaying(true) } }}>
      <span className={cn('grid h-8 w-8 place-items-center rounded-full', dark ? 'bg-cream text-plum' : 'bg-plum text-cream')}><Ico d={playing ? Icon.pause : Icon.play} size={14} w={2} /></span>
      <span className="flex items-center gap-[2px]" aria-hidden>{Array.from({ length: 16 }).map((_, i) => <span key={i} className={cn('w-[2px] rounded-full', dark ? 'bg-cream/70' : 'bg-plum/50')} style={{ height: 6 + ((i * 7) % 14) }} />)}</span>
      <span className="text-[12px] opacity-70">Vocal</span>
      {url && <audio ref={a} src={url} onEnded={() => setPlaying(false)} />}
    </button>
  )
}

function VoiceSheet({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (key: string) => void }) {
  const rec = useRecorder(60)
  useBusy(open)
  const close = () => { rec.cancel(); onClose() }
  const send = async () => { const b = await rec.stop(); if (!b) return; const key = uid(); await saveVoice(key, b); onSend(key); sfx.chime() }
  return (
    <Sheet open={open} onClose={close} title="Message vocal" testId="voice-sheet">
      <div className="pb-4 text-center">
        {rec.state === 'unsupported' && <ErrorState title="Enregistrement indisponible." text="Ton appareil ne permet pas l’enregistrement audio. Tu peux écrire un message à la place." />}
        {rec.state === 'denied' && <ErrorState title="Micro non autorisé." text="Autorise le micro pour À DEUX dans les réglages de ton appareil, puis réessaie." onRetry={() => void rec.start()} />}
        {rec.state === 'error' && <ErrorState title="Micro introuvable." text="Aucun micro n’a pu être utilisé." onRetry={() => void rec.start()} />}
        {rec.state === 'idle' && <><p className="mb-6 text-[15px] text-plum/60">Quelques secondes suffisent. Ton numéro n’est jamais partagé.</p><Button onClick={() => void rec.start()} testId="voice-rec" full><Ico d={Icon.mic} size={18} /> Commencer</Button></>}
        {rec.state === 'recording' && <><Waveform /><p className="font-display my-3 text-[44px]" data-testid="rec-timer">{fmtTime(rec.seconds)}</p><Button onClick={send} testId="voice-send" full>Envoyer</Button><Button variant="ghost" onClick={close}>Annuler</Button></>}
      </div>
    </Sheet>
  )
}

// ============ PROFIL ============
export function ProfileTab() {
  const s = useStore()
  const open = useUI((u) => u.open)
  const toast = useUI((u) => u.toast)
  const [del, setDel] = useState(false)
  const [install, setInstall] = useState(false)
  const [checking, setChecking] = useState(false)
  const updateReady = usePWA((p) => p.updateReady)

  return (
    <Screen title="Profil">
      <div className="mx-auto max-w-[520px] pb-10">
        <div className="pt-2">
          <Logo size={34} />
          <h2 className="font-display mt-5 text-[52px] leading-none" data-testid="profile-name">{s.profile?.pseudo ?? 'Toi'}</h2>
          <p className="mt-3 text-[13px] text-plum/50">{s.mode === 'demo' ? 'Compte de démonstration, local à cet appareil' : 'Compte connecté'}</p>
        </div>
        <Group title="Mon profil">
          <Row onClick={() => { s.setQIndex(5); open({ name: 'onboarding' }) }} testId="edit-profile">Modifier mes réponses</Row>
          <Row onClick={() => { s.setQIndex(1); open({ name: 'onboarding' }) }} testId="edit-basics">Modifier mes informations</Row>
        </Group>
        <Group title="Confidentialité">
          <Line label="Afficher mon âge exact" sub="Sinon, seule une tranche est visible."><Toggle on={s.privacy.showExactAge} onChange={(v) => { s.setPrivacy({ showExactAge: v }); if (s.profile) s.saveProfile({ ...s.profile, showExactAge: v }) }} label="Âge exact" testId="priv-age" /></Line>
          <Line label="Partager mes souvenirs" sub="Visibles par la personne de ton espace commun."><Toggle on={s.privacy.shareMemories} onChange={(v) => s.setPrivacy({ shareMemories: v })} label="Partager mes souvenirs" testId="priv-mem" /></Line>
          <Line label="Mes convictions" sub="Privées, jamais affichées. Utilisées uniquement si tu l’as demandé."><span className="text-[13px] text-plum/45">{s.answers.faith?.v && s.answers.faith.v !== 'private' ? 'Renseignées' : 'Non renseignées'}</span></Line>
          <Line label="Mes photos" sub={s.hasPhoto ? 'Verrouillées : jamais visibles sans double accord.' : 'Aucune photo ajoutée.'}>{s.hasPhoto && <Button variant="ghost" onClick={async () => { await removeMyPhoto(); s.set({ hasPhoto: false }); toast('Photo supprimée.', 'ok') }}>Retirer</Button>}</Line>
        </Group>
        <Group title="Ambiance">
          <Line label="Sons doux" sub="Effets sonores discrets."><Toggle on={s.privacy.sound} onChange={(v) => { s.setPrivacy({ sound: v }); setSoundEnabled(v); if (v) sfx.chime() }} label="Sons" testId="sound" /></Line>
        </Group>
        {s.blocked.length > 0 && <Group title="Sécurité"><Line label={`${s.blocked.length} personne(s) bloquée(s)`} sub="Elles ne te seront plus jamais proposées." /></Group>}
        {s.mode === 'demo' && (
          <Group title="Outils de démonstration">
            <Line label="Passer au lendemain" sub={`Jour simulé n°${s.dayOffset}`}><Button variant="soft" className="!min-h-[44px] !px-5 !text-[14px]" testId="demo-nextday" onClick={() => { s.set({ dayOffset: s.dayOffset + 1 }); toast('Un jour plus tard.', 'info') }}>+1 jour</Button></Line>
            <Line label="Le partenaire fictif accepte la révélation" sub="Pour tester les deux issues."><Toggle on={s.partnerWillAccept} onChange={(v) => s.set({ partnerWillAccept: v })} label="Partenaire accepte" testId="demo-partner-yes" /></Line>
            <Row onClick={() => { s.set({ encounter: null, lastProposalDay: null, games: { mirror: null, compass: null, bridge: null, rounds: { mirror: 0, compass: 0 } }, gameLog: [], chat: [], moments: {}, excluded: [], blocked: [], introAnswer: null, memories: [], plans: [], history: [] }); toast('Rencontres réinitialisées.', 'ok') }} testId="demo-reset-enc">Réinitialiser les rencontres</Row>
          </Group>
        )}
        <Group title="Application">
          <Row onClick={() => setInstall(true)} testId="install-help">Installer sur l’écran d’accueil</Row>
          <Line label={`Version ${APP_VERSION}`} sub={`Build ${BUILD_ID}${updateReady ? ' · mise à jour disponible' : ''}`}>
            <Button variant="soft" className="!min-h-[44px] !px-5 !text-[14px]" testId="check-update" onClick={async () => { setChecking(true); const r = await checkForUpdate(); setChecking(false); toast(r ? 'Une nouvelle version est disponible.' : 'Tu as la dernière version.', 'ok') }}>{checking ? '…' : 'Vérifier'}</Button>
          </Line>
        </Group>
        <Group title="Données">
          <Row onClick={() => setDel(true)} danger testId="delete-data">Supprimer mon compte et mes données</Row>
          <p className="pt-3 text-[12px] leading-snug text-plum/45">Version de démonstration : politique de confidentialité et conformité RGPD à compléter avant tout lancement. L’âge est déclaré, non vérifié.</p>
        </Group>
      </div>
      <Sheet open={del} onClose={() => setDel(false)} title="Tout supprimer ?" testId="delete-sheet">
        <p className="text-[15px] leading-relaxed text-plum/65">Ton profil, tes réponses, tes messages, tes souvenirs et ta photo seront effacés de cet appareil. Cette action est définitive.</p>
        <div className="mt-6 flex flex-col gap-1 pb-4"><Button className="!bg-rose-600 !text-white" testId="delete-confirm" onClick={() => { s.deleteAllData(); void removeMyPhoto(); setDel(false); toast('Toutes tes données ont été supprimées.', 'ok') }} full>Supprimer définitivement</Button><Button variant="ghost" onClick={() => setDel(false)}>Annuler</Button></div>
      </Sheet>
      <Sheet open={install} onClose={() => setInstall(false)} title="Installer À DEUX" testId="install-sheet">
        <ol className="space-y-4 pb-4 text-[16px] leading-relaxed">
          <li><span className="font-display mr-2 italic text-plum/40">1</span>Ouvre cette page dans <b>Safari</b> sur ton iPhone.</li>
          <li><span className="font-display mr-2 italic text-plum/40">2</span>Touche <b>Partager</b> (le carré avec une flèche vers le haut).</li>
          <li><span className="font-display mr-2 italic text-plum/40">3</span>Choisis <b>« Sur l’écran d’accueil »</b>.</li>
          <li><span className="font-display mr-2 italic text-plum/40">4</span>Garde « Ouvrir comme une app » activé, puis <b>Ajouter</b>.</li>
        </ol>
        <p className="pb-4 text-[13px] text-plum/55">L’application s’ouvre ensuite en plein écran. Les mises à jour arrivent seules : un message discret te proposera de mettre à jour.</p>
      </Sheet>
    </Screen>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-10"><h3 className="kicker mb-1">{title}</h3><div className="divide-y divide-plum/12 border-b border-plum/12">{children}</div></section>
}
function Row({ children, onClick, danger, testId }: { children: React.ReactNode; onClick: () => void; danger?: boolean; testId?: string }) {
  return <button type="button" data-testid={testId} onClick={() => { sfx.tap(); onClick() }} className={cn('flex min-h-[58px] w-full items-center justify-between border-t border-plum/12 text-left text-[16.5px] first:border-t-0', danger && 'text-rose-600')}>{children}<span aria-hidden className="text-plum/30">→</span></button>
}
function Line({ label, sub, children }: { label: string; sub?: string; children?: React.ReactNode }) {
  return <div className="flex min-h-[64px] items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-[15.5px] leading-snug">{label}</p>{sub && <p className="mt-0.5 text-[12.5px] leading-snug text-plum/50">{sub}</p>}</div>{children}</div>
}
export { deleteVoice, AnimatePresence }
