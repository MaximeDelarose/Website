import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Button, EmptyState, ErrorState, IconButton, Screen, Sheet, useBusy } from '../ui/kit'
import { Buddy } from '../ui/Art'
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
        <EmptyState art={<Buddy size={100} mood="think" />} title="Les activités se vivent à deux" text="Dès que ta rencontre commencera, tu pourras jouer avec ta personne : Le Miroir, Le Pont, La Boussole et Notre moment." action={<Button onClick={() => setTab('home')} testId="act-home">Aller à l’accueil</Button>} />
      </Screen>
    )
  }
  const count = (k: string) => log.filter((l) => l.kind === k).length
  const cards = [
    { kind: 'mirror' as const, title: 'Le Miroir', emoji: '🪞', color: 'bg-lavender-100', text: 'Répondez en secret, puis retournez les cartes ensemble.', time: '≈ 2 min', state: games.mirror && !games.mirror.flipped ? (games.mirror.mine ? 'En attente de retournement' : 'Reprendre') : count('mirror') ? `Joué ${count('mirror')}×` : 'Nouveau' },
    { kind: 'bridge' as const, title: 'Le Pont', emoji: '🌉', color: 'bg-peach-200', text: 'Deux rives, deux séries de pièces. Construisez un pont ensemble.', time: '≈ 2 min', state: games.bridge && !games.bridge.done ? 'Reprendre' : count('bridge') ? `Joué ${count('bridge')}×` : 'Nouveau' },
    { kind: 'compass' as const, title: 'La Boussole', emoji: '🧭', color: 'bg-mint', text: 'Des situations à deux. Chacun choisit sa façon de réagir.', time: '≈ 3 min', state: games.compass && !games.compass.done ? 'Reprendre' : count('compass') ? `Joué ${count('compass')}×` : 'Nouveau' },
  ]
  const mo = todaysMoment(useStore.getState().today())
  return (
    <Screen title="Activités">
      <div className="mx-auto max-w-[520px] pb-6">
        <DemoBanner />
        <p className="mb-4 mt-3 text-[15px] text-plum/70">Avec {partner.pseudo}. Aucune obligation : une seule activité suffit pour avancer.</p>
        <div className="flex flex-col gap-3">
          {cards.map((c, i) => (
            <motion.button key={c.kind} type="button" data-testid={`game-${c.kind}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileTap={{ scale: 0.98 }}
              onClick={() => { sfx.tap(); open({ name: 'game', kind: c.kind }) }} className={cn('flex min-h-[112px] items-center gap-4 rounded-3xl p-5 text-left shadow-soft', c.color)}>
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/70 text-4xl">{c.emoji}</span>
              <span className="min-w-0 flex-1"><span className="font-display block text-[22px] font-semibold leading-tight">{c.title}</span><span className="mt-0.5 block text-[13.5px] leading-snug text-plum/75">{c.text}</span><span className="mt-1.5 flex gap-2"><span className="chip bg-white/70 !py-1 text-[12px]">{c.time}</span><span className="chip bg-plum/10 !py-1 text-[12px]">{c.state}</span></span></span>
            </motion.button>
          ))}
          <motion.button type="button" data-testid="activity-moment" whileTap={{ scale: 0.98 }} onClick={() => open({ name: 'moment' })} className="flex min-h-[96px] items-center gap-4 rounded-3xl bg-rose p-5 text-left shadow-soft">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/70 text-3xl">🌙</span>
            <span className="flex-1"><span className="kicker block">Notre moment du jour</span><span className="font-display block text-[20px] font-semibold leading-tight">{mo.title}</span><span className="text-[13px] text-plum/70">{mDone?.mine ? 'Partagé ✓' : mDone?.skipped ? 'Passé, sans souci' : 'Facultatif, quand tu veux'}</span></span>
          </motion.button>
        </div>
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
    sendVoice(key); answerMoment('🎙️ Message vocal partagé'); sfx.chime()
  }
  return (
    <Screen title="Notre moment" onBack={close} closeIcon testId="moment">
      <div className="mx-auto max-w-[520px] pb-8 pt-2">
        <div className="rounded-[32px] bg-rose p-6 text-center shadow-soft">
          <div className="text-4xl" aria-hidden>🌙</div>
          <p className="kicker mt-2">{mo.title}</p>
          <h2 className="font-display mt-2 text-[26px] font-semibold leading-[1.15] text-balance" data-testid="moment-prompt">{mo.prompt}</h2>
          <p className="mt-2 text-[13px] text-plum/65">Facultatif. Pas de série à maintenir, rien ne se perd si tu passes.</p>
        </div>
        {!live || !partner ? (
          <p className="mt-6 text-center text-[15px] text-plum/70">Cette activité est disponible pendant une rencontre active.</p>
        ) : entry?.mine ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-3" data-testid="moment-done">
            <div className="card p-4"><p className="kicker">Toi</p><p className="mt-1 text-[16px]">{entry.mine}</p></div>
            <motion.div initial={{ rotateX: 90 }} animate={{ rotateX: 0 }} transition={{ delay: 0.5 }} className="card bg-lavender-100 p-4"><p className="kicker">{partner.pseudo}</p><p className="mt-1 text-[16px]">{entry.theirs}</p></motion.div>
            <Button onClick={close} variant="soft" full>Terminer</Button>
          </motion.div>
        ) : entry?.skipped ? (
          <div className="mt-6 text-center"><p className="text-[16px]">Aucun souci. Le prochain moment sera là demain 🌱</p><div className="mt-4 flex flex-col gap-2"><Button variant="soft" onClick={() => useStore.getState().set({ moments: { ...useStore.getState().moments, [k]: {} } })}>Finalement, je participe</Button><Button onClick={close}>Fermer</Button></div></div>
        ) : (
          <div className="mt-5">
            {mo.options ? (
              <div className="flex flex-col gap-3">{mo.options.map((o) => <Button key={o} variant="soft" className="!h-auto !min-h-[64px] !rounded-3xl !py-3 !text-left !leading-snug" onClick={() => { answerMoment(o); sfx.chime() }} testId="moment-option">{o}</Button>)}</div>
            ) : mo.kind === 'voice' ? (
              <div className="card p-5 text-center" data-testid="moment-voice">
                {rec.state === 'unsupported' || rec.state === 'denied' || rec.state === 'error' ? (
                  <ErrorState title={rec.state === 'denied' ? 'Micro non autorisé' : 'Enregistrement indisponible'} text={rec.state === 'denied' ? 'Autorise le micro dans les réglages de ton navigateur, ou réponds par écrit.' : 'Ton appareil ne permet pas l’enregistrement. Tu peux répondre par écrit.'} />
                ) : rec.state === 'recording' ? (
                  <><Waveform /><p className="font-display my-2 text-3xl">{fmtTime(rec.seconds)}</p><Button onClick={submitVoice} testId="moment-voice-send" full>Envoyer</Button><Button variant="ghost" onClick={rec.cancel}>Annuler</Button></>
                ) : (
                  <><Button onClick={() => void rec.start()} testId="moment-voice-rec" full>🎙️ Enregistrer</Button></>
                )}
              </div>
            ) : (
              <>
                <textarea data-testid="moment-text" className="field min-h-[110px] resize-none" maxLength={300} placeholder="Ta réponse…" value={text} onChange={(e) => setText(e.target.value)} />
                <div className="mt-3"><Button disabled={text.trim().length < 2} onClick={() => { answerMoment(text.trim()); sfx.chime() }} testId="moment-send" full>Partager</Button></div>
              </>
            )}
            <div className="mt-2 text-center"><Button variant="ghost" onClick={() => { skipMoment(); close() }} testId="moment-skip">Pas aujourd’hui</Button></div>
          </div>
        )}
      </div>
    </Screen>
  )
}

export function Waveform({ level = 0.6, bars = 18 }: { level?: number; bars?: number }) {
  return (
    <div className="flex h-14 items-center justify-center gap-[3px]" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span key={i} className="w-[4px] rounded-full bg-plum" animate={{ height: [8, 10 + ((i * 17) % 38) * level, 8] }} transition={{ duration: 0.8 + (i % 5) * 0.12, repeat: Infinity, delay: i * 0.04 }} />
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

  if (!enc || !partner || enc.stage < 1 && !chat.length) {
    return (
      <Screen title="Messages">
        <EmptyState art={<Buddy size={100} mood="shy" />} title="Pas encore de conversation" text={enc && partner ? `La messagerie s’ouvre après votre premier échange de départ avec ${partner.pseudo}.` : 'Les messages s’ouvrent quand une rencontre commence, après un premier échange.'} action={<Button onClick={() => setTab(enc ? 'encounter' : 'home')} testId="msg-goto">{enc ? 'Voir ma rencontre' : 'Aller à l’accueil'}</Button>} />
      </Screen>
    )
  }
  const submit = () => { if (!text.trim()) return; send(text); setText(''); sfx.tap() }
  return (
    <div className="absolute inset-0 flex flex-col bg-cream" data-testid="messages">
      <header className="pt-safe px-safe pb-2"><h1 className="font-display text-center text-[19px] font-semibold">{partner.pseudo}</h1><p className="text-center text-[12px] text-plum/55">{live ? 'Conversation privée · fictif (démo)' : 'Conversation terminée'}</p></header>
      <div className="scroll-y px-safe min-h-0 flex-1 py-2" data-testid="chat-list" role="log" aria-live="polite">
        {chat.length === 0 && <p className="mt-10 text-center text-[14.5px] text-plum/60">Dis bonjour 👋 Vous pouvez aussi vous envoyer un message vocal.</p>}
        <div className="flex flex-col gap-2">
          {chat.map((m) => <Bubble key={m.id} m={m} />)}
          {typing && <div className="flex gap-1 self-start rounded-2xl bg-white px-4 py-3 shadow-soft" aria-label={`${partner.pseudo} écrit`}>{[0, 1, 2].map((i) => <motion.span key={i} className="h-2 w-2 rounded-full bg-plum/40" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}</div>}
          <div ref={end} />
        </div>
      </div>
      {live ? (
        <div className="px-safe flex items-end gap-2 border-t border-plum/10 bg-cream pb-2 pt-2">
          <IconButton label="Message vocal" onClick={() => setMicOpen(true)} testId="mic-open"><span aria-hidden>🎙️</span></IconButton>
          <input data-testid="chat-input" className="field !min-h-[48px] flex-1 !rounded-full !py-2.5" value={text} maxLength={1000} placeholder="Ton message…" aria-label="Ton message" enterKeyHint="send" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
          <IconButton label="Envoyer" onClick={submit} className="!bg-plum !text-cream" testId="chat-send"><span aria-hidden>↑</span></IconButton>
        </div>
      ) : <p className="px-safe pb-3 pt-2 text-center text-[14px] text-plum/65" data-testid="chat-closed">Cette conversation est terminée.</p>}
      <VoiceSheet open={micOpen} onClose={() => setMicOpen(false)} onSend={(k) => { sendVoice(k); setMicOpen(false) }} />
    </div>
  )
}

function Bubble({ m }: { m: Message }) {
  if (m.from === 'system') return <p className="my-2 self-center rounded-full bg-plum/[.06] px-3 py-1 text-center text-[12.5px] text-plum/65">{m.text}</p>
  const me = m.from === 'me'
  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} data-testid={me ? 'msg-me' : 'msg-partner'}
      className={cn('max-w-[82%] rounded-3xl px-4 py-2.5 text-[15.5px] leading-snug shadow-soft', me ? 'self-end rounded-br-md bg-plum text-cream' : 'self-start rounded-bl-md bg-white')}>
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
  if (missing) return <span className="text-[14px] opacity-70">🎙️ Message vocal (non disponible sur cet appareil)</span>
  return (
    <button type="button" data-testid="voice-play" className="flex min-h-[36px] items-center gap-2" disabled={!url}
      onClick={() => { const el = a.current; if (!el) return; if (playing) { el.pause(); setPlaying(false) } else { void el.play(); setPlaying(true) } }}>
      <span className={cn('grid h-8 w-8 place-items-center rounded-full', dark ? 'bg-cream text-plum' : 'bg-plum text-cream')}>{playing ? '❚❚' : '▶'}</span>
      <span className="flex items-end gap-[2px]" aria-hidden>{Array.from({ length: 14 }).map((_, i) => <span key={i} className={cn('w-[3px] rounded-full', dark ? 'bg-cream/70' : 'bg-plum/50')} style={{ height: 6 + ((i * 7) % 14) }} />)}</span>
      <span className="text-[12.5px] opacity-80">Message vocal</span>
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
      <div className="pb-2 text-center">
        {rec.state === 'unsupported' && <ErrorState title="Enregistrement indisponible" text="Ton appareil ne permet pas l’enregistrement audio. Tu peux écrire un message à la place." />}
        {rec.state === 'denied' && <ErrorState title="Micro non autorisé" text="Autorise le micro pour À DEUX dans les réglages de ton appareil, puis réessaie." onRetry={() => void rec.start()} />}
        {rec.state === 'error' && <ErrorState title="Micro introuvable" text="Aucun micro n’a pu être utilisé." onRetry={() => void rec.start()} />}
        {rec.state === 'idle' && <><p className="mb-4 text-[15px] text-plum/70">Quelques secondes suffisent. Ton numéro n’est jamais partagé.</p><Button onClick={() => void rec.start()} testId="voice-rec" full>🎙️ Commencer</Button></>}
        {rec.state === 'recording' && <><Waveform /><p className="font-display my-2 text-3xl" data-testid="rec-timer">{fmtTime(rec.seconds)}</p><Button onClick={send} testId="voice-send" full>Envoyer</Button><Button variant="ghost" onClick={close}>Annuler</Button></>}
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
  const p = s.profile ?? DEMO_PROFILE

  return (
    <Screen title="Profil">
      <div className="mx-auto max-w-[520px] pb-8">
        <div className="flex flex-col items-center pt-1 text-center">
          <Buddy size={92} mood="happy" />
          <h2 className="font-display text-[28px] font-semibold" data-testid="profile-name">{s.profile?.pseudo ?? 'Toi'}</h2>
          <p className="text-[13.5px] text-plum/60">{s.mode === 'demo' ? 'Compte local de démonstration' : 'Compte connecté'}</p>
        </div>
        <Group title="Mon profil">
          <Row onClick={() => { s.setQIndex(5); open({ name: 'onboarding' }) }} testId="edit-profile">Modifier mes réponses</Row>
          <Row onClick={() => { s.setQIndex(1); open({ name: 'onboarding' }) }} testId="edit-basics">Modifier mes informations</Row>
        </Group>
        <Group title="Confidentialité">
          <Line label="Afficher mon âge exact" sub="Sinon, seule une tranche est visible."><Toggle on={s.privacy.showExactAge} onChange={(v) => { s.setPrivacy({ showExactAge: v }); if (s.profile) s.saveProfile({ ...s.profile, showExactAge: v }) }} label="Âge exact" testId="priv-age" /></Line>
          <Line label="Partager mes souvenirs" sub="Visibles par la personne de ton espace commun."><Toggle on={s.privacy.shareMemories} onChange={(v) => s.setPrivacy({ shareMemories: v })} label="Partager mes souvenirs" testId="priv-mem" /></Line>
          <Line label="Mes photos" sub={s.hasPhoto ? 'Verrouillées : jamais visibles sans double accord.' : 'Aucune photo ajoutée.'}>{s.hasPhoto && <Button variant="soft" className="!min-h-[44px] !px-4 !text-[14px]" onClick={async () => { await removeMyPhoto(); s.set({ hasPhoto: false }); toast('Photo supprimée.', 'ok') }}>Retirer</Button>}</Line>
        </Group>
        <Group title="Ambiance">
          <Line label="Sons doux" sub="Effets sonores originaux."><Toggle on={s.privacy.sound} onChange={(v) => { s.setPrivacy({ sound: v }); setSoundEnabled(v); if (v) sfx.chime() }} label="Sons" testId="sound" /></Line>
        </Group>
        {s.blocked.length > 0 && <Group title="Sécurité"><Line label={`${s.blocked.length} personne(s) bloquée(s)`} sub="Elles ne te seront plus jamais proposées." /></Group>}
        {s.mode === 'demo' && (
          <Group title="🧪 Outils de démo">
            <Line label="Passer au lendemain" sub={`Jour simulé n°${s.dayOffset}`}><Button variant="soft" className="!min-h-[44px] !px-4 !text-[14px]" testId="demo-nextday" onClick={() => { s.set({ dayOffset: s.dayOffset + 1 }); toast('Un jour plus tard…', 'info') }}>+1 jour</Button></Line>
            <Line label="Le partenaire fictif accepte la révélation" sub="Pour tester les deux issues."><Toggle on={s.partnerWillAccept} onChange={(v) => s.set({ partnerWillAccept: v })} label="Partenaire accepte" testId="demo-partner-yes" /></Line>
            <Row onClick={() => { s.set({ encounter: null, lastProposalDay: null, games: { mirror: null, compass: null, bridge: null, rounds: { mirror: 0, compass: 0 } }, gameLog: [], chat: [], moments: {}, excluded: [], blocked: [], introAnswer: null, memories: [], plans: [], history: [] }); toast('Rencontres réinitialisées.', 'ok') }} testId="demo-reset-enc">Réinitialiser les rencontres</Row>
          </Group>
        )}
        <Group title="Application">
          <Row onClick={() => setInstall(true)} testId="install-help">Installer sur l’écran d’accueil</Row>
          <Line label={`Version ${APP_VERSION}`} sub={`Build ${BUILD_ID}${updateReady ? ' · mise à jour disponible' : ''}`}>
            <Button variant="soft" className="!min-h-[44px] !px-4 !text-[14px]" testId="check-update" onClick={async () => { setChecking(true); const r = await checkForUpdate(); setChecking(false); toast(r ? 'Une nouvelle version est disponible.' : 'Tu as la dernière version.', 'ok') }}>{checking ? '…' : 'Vérifier'}</Button>
          </Line>
        </Group>
        <Group title="Données">
          <Row onClick={() => setDel(true)} danger testId="delete-data">Supprimer mon compte et mes données</Row>
          <p className="px-4 pb-3 text-[12px] leading-snug text-plum/55">Prototype : la politique de confidentialité et la conformité RGPD doivent être complétées et vérifiées avant tout lancement. L’âge est déclaré, non vérifié.</p>
        </Group>
      </div>
      <Sheet open={del} onClose={() => setDel(false)} title="Tout supprimer ?" testId="delete-sheet">
        <p className="text-[15px] text-plum/75">Ton profil, tes réponses, tes messages, tes souvenirs et ta photo seront effacés de cet appareil. Cette action est définitive.</p>
        <div className="mt-4 flex flex-col gap-2 pb-2"><Button className="!bg-rose-600 !text-white" testId="delete-confirm" onClick={() => { s.deleteAllData(); void removeMyPhoto(); setDel(false); toast('Toutes tes données ont été supprimées.', 'ok') }} full>Supprimer définitivement</Button><Button variant="ghost" onClick={() => setDel(false)}>Annuler</Button></div>
      </Sheet>
      <Sheet open={install} onClose={() => setInstall(false)} title="Installer À DEUX" testId="install-sheet">
        <ol className="list-decimal space-y-2 pb-4 pl-5 text-[15px] leading-relaxed">
          <li>Ouvre cette page dans <b>Safari</b> sur ton iPhone.</li>
          <li>Touche le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li>
          <li>Fais défiler et choisis <b>« Sur l’écran d’accueil »</b>.</li>
          <li>Garde « Ouvrir comme une app » activé, puis touche <b>Ajouter</b>.</li>
        </ol>
        <p className="pb-3 text-[13px] text-plum/60">L’application s’ouvrira ensuite en plein écran. Les mises à jour arrivent toutes seules : un message discret te proposera de mettre à jour.</p>
      </Sheet>
    </Screen>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6"><h3 className="kicker mb-2 px-1">{title}</h3><div className="card divide-y divide-plum/10 overflow-hidden">{children}</div></section>
}
function Row({ children, onClick, danger, testId }: { children: React.ReactNode; onClick: () => void; danger?: boolean; testId?: string }) {
  return <button type="button" data-testid={testId} onClick={() => { sfx.tap(); onClick() }} className={cn('flex min-h-[56px] w-full items-center justify-between px-4 text-left text-[15.5px] font-semibold active:bg-plum/5', danger && 'text-rose-600')}>{children}<span aria-hidden className="text-plum/30">›</span></button>
}
function Line({ label, sub, children }: { label: string; sub?: string; children?: React.ReactNode }) {
  return <div className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-2.5"><div className="min-w-0"><p className="text-[15px] font-semibold leading-snug">{label}</p>{sub && <p className="text-[12.5px] leading-snug text-plum/60">{sub}</p>}</div>{children}</div>
}
export { deleteVoice, AnimatePresence }
