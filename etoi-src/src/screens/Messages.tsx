import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { DemoPill, Empty, Icon, Portrait, Sheet, Chip } from '../ui';
import { DAYS, ICEBREAKERS, PERIODS, commonSlots, slotLabel } from '../data';
import type { Tab } from '../App';

const hhmm = (t: number) => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function Messages({ go }: { go: (t: Tab) => void }) {
  const { s, byId, setChat } = useApp();
  const ids = Object.keys(s.chats).filter((id) => !s.blocked.includes(id)).sort((a, b) => (s.chats[b].at(-1)?.at ?? 0) - (s.chats[a].at(-1)?.at ?? 0));
  return (
    <div className="screen with-tabs">
      <div className="top"><div><div className="kicker">Conversations privées</div><h1 className="h2">Messages</h1></div><DemoPill /></div>
      <div className="scroll">
        {ids.map((id) => {
          const p = byId(id)!; const last = [...s.chats[id]].reverse().find((m) => m.from !== 'sys');
          return (
            <button key={id} className="conv" onClick={() => setChat(id)}>
              <Portrait p={p} className="avatar" />
              <span className="meta"><span className="nm">{p.name}</span><span className="last" style={{ display: 'block' }}>{last ? (last.kind === 'photo' ? 'Photo' : last.text) : 'Nouvelle connexion. Dites bonjour.'}</span></span>
              {last && <span className="small">{hhmm(last.at)}</span>}
            </button>
          );
        })}
        {!ids.length && <Empty title="Le premier mot," em="à votre rythme." text="Vos conversations apparaîtront ici dès qu'une connexion sera établie."><button className="btn amber" onClick={() => go('connections')}>Voir mes connexions</button></Empty>}
      </div>
    </div>
  );
}

export function Chat({ id }: { id: string }) {
  const { s, byId, setChat, send, typing, block, report, toast } = useApp();
  const p = byId(id)!;
  const msgs = s.chats[id] || [];
  const [text, setText] = useState('');
  const [sheet, setSheet] = useState<null | 'menu' | 'moment' | 'photo' | 'report'>(null);
  const [shown, setShown] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs.length, typing]);
  const mine = msgs.filter((m) => m.from === 'me').length;
  const lastMe = [...msgs].reverse().find((m) => m.from === 'me');
  const replied = lastMe && msgs.some((m) => m.from === 'them' && m.at > lastMe.at);

  const go = (t = text) => { const v = t.trim(); if (!v) return; send(id, v); setText(''); };

  return (
    <div className="screen" style={{ zIndex: 40, background: 'var(--coal)' }}>
      <header className="chat-head">
        <button className="icon-btn" onClick={() => setChat(null)} aria-label="Retour"><Icon n="back" /></button>
        <Portrait p={p} className="avatar" />
        <div className="who"><b>{p.name}</b><small>{p.zone}</small></div>
        <button className="icon-btn" onClick={() => setSheet('moment')} aria-label="Notre moment"><Icon n="cal" /></button>
        <button className="icon-btn" onClick={() => setSheet('menu')} aria-label="Plus d'options"><Icon n="more" /></button>
      </header>
      <div className="demo-bar">Conversation simulée · les réponses sont écrites d'avance</div>
      <div className="thread">
        {msgs.map((m) => m.from === 'sys' ? <div key={m.id} className="sys">{m.text}</div> : m.kind === 'photo' ? (
          <div key={m.id} className={`bub ${m.from} photo-msg ${m.from === 'me' || shown.includes(m.id) ? 'shown' : ''}`}>
            <Portrait hue={30} /><button onClick={() => setShown([...shown, m.id])}>Afficher la photo</button>
          </div>
        ) : (
          <div key={m.id} className={`bub ${m.from} ${m.kind === 'moment' ? 'moment' : ''}`}>
            {m.kind === 'moment' && <div className="kicker"><Icon n="cal" size={14} />Notre moment</div>}
            {m.text}<span className="time">{hhmm(m.at)}</span>
          </div>
        ))}
        {typing === id && <div className="typing" aria-label={`${p.name} écrit`}><i /><i /><i /></div>}
        {s.settings.readReceipts && replied && <div className="small" style={{ textAlign: 'right' }}>Lu</div>}
        <div ref={end} />
      </div>
      {mine === 0 && (
        <div>
          <div className="small" style={{ padding: '0 16px 6px' }}>Amorces, si tu ne sais pas par où commencer</div>
          <div className="starters">{ICEBREAKERS.map((q) => <Chip key={q} onClick={() => go(q)}>{q}</Chip>)}</div>
        </div>
      )}
      <form className="composer" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <button type="button" className="icon-btn" onClick={() => setSheet('photo')} aria-label="Envoyer une photo"><Icon n="image" /></button>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message…" aria-label="Message" />
        <button className="send" disabled={!text.trim()} aria-label="Envoyer"><Icon n="send" /></button>
      </form>

      {sheet === 'menu' && (
        <Sheet title={p.name} onClose={() => setSheet(null)}>
          <button className="row" onClick={() => setSheet('moment')}><span><b>Trouver notre moment</b><small>Créneaux compatibles, sans agenda partagé</small></span><Icon n="cal" /></button>
          <button className="row" onClick={() => setSheet('report')}><span><b>Signaler</b><small>Comportement inapproprié, faux profil, harcèlement</small></span><Icon n="flag" /></button>
          <button className="row" onClick={() => { setSheet(null); block(id); }}><span><b>Bloquer</b><small>Cette personne ne pourra plus vous voir ni vous écrire</small></span><Icon n="shield" /></button>
        </Sheet>
      )}
      {sheet === 'report' && (
        <Sheet title="Signaler" onClose={() => setSheet(null)}>
          {['Harcèlement ou insistance', 'Faux profil ou arnaque', 'Contenu inapproprié', 'Photo d\'enfant', 'Autre'].map((r) => (
            <button key={r} className="row" onClick={() => { report(id); setSheet(null); }}><b>{r}</b></button>
          ))}
          <p className="small" style={{ marginTop: 12 }}>En démonstration, le signalement n'est pas envoyé à une équipe de modération.</p>
        </Sheet>
      )}
      {sheet === 'photo' && (
        <Sheet title="Envoyer une photo" onClose={() => setSheet(null)}>
          <p className="lead" style={{ marginBottom: 14 }}>La photo est <b>floutée</b> chez le destinataire, qui choisit de l'afficher. Aucune photo d'enfant : l'envoi est refusé si l'une est détectée (modération à brancher).</p>
          <button className="btn amber block" onClick={() => { send(id, '', 'photo'); setSheet(null); }}>Envoyer une photo d'essai</button>
        </Sheet>
      )}
      {sheet === 'moment' && <Moment id={id} onClose={() => setSheet(null)} onPick={(slot) => { send(id, `Si on se retrouvait ${slotLabel(slot)} ? Un verre, un café, ce qui te fait envie.`, 'moment'); setSheet(null); toast('Proposition envoyée.'); }} />}
    </div>
  );
}

export function SlotGrid() {
  const { s, set } = useApp();
  const flip = (k: string) => set((x) => ({ ...x, slots: x.slots.includes(k) ? x.slots.filter((y) => y !== k) : [...x.slots, k] }));
  return (
    <div className="grid-slots" role="group" aria-label="Mes créneaux généraux">
      <span />{DAYS.map(([k, l]) => <span key={k} className="h">{l}</span>)}
      {PERIODS.map(([pk, pl]) => (<><span key={pk} className="r">{pl}</span>{DAYS.map(([dk]) => { const k = `${dk}-${pk}`; const on = s.slots.includes(k); return <button key={k} className={`cell ${on ? 'on' : ''}`} onClick={() => flip(k)} aria-pressed={on} aria-label={`${dk} ${pl}`} />; })}</>))}
    </div>
  );
}

function Moment({ id, onClose, onPick }: { id: string; onClose: () => void; onPick: (s: string) => void }) {
  const { s, byId } = useApp();
  const p = byId(id)!;
  const [edit, setEdit] = useState(false);
  const common = commonSlots(s.slots, p);
  return (
    <Sheet title="Notre moment" onClose={onClose}>
      <p className="lead" style={{ margin: '4px 0 16px' }}>{common.length ? <>Vous avez tous les deux un moment libre <b style={{ color: 'var(--amber)', fontWeight: 500 }}>{slotLabel(common[0])}</b>.</> : 'Aucun créneau commun pour le moment.'}</p>
      {common.slice(0, 4).map((c) => (
        <div key={c} className="slot-card"><b>{slotLabel(c)}</b><button className="btn amber sm" onClick={() => onPick(c)}>Proposer</button></div>
      ))}
      {!common.length && <p className="small" style={{ marginBottom: 12 }}>Élargissez vos créneaux, ou continuez à discuter : le bon moment viendra.</p>}
      <button className="link" onClick={() => setEdit(!edit)}>{edit ? 'Masquer mes créneaux' : 'Modifier mes créneaux'}</button>
      {edit && <div style={{ marginTop: 14 }}><SlotGrid /></div>}
      <div className="note"><Icon n="lock" size={18} /><span>Seuls les créneaux communs sont affichés. Ni vous ni {p.name} ne voyez l'emploi du temps de l'autre.</span></div>
    </Sheet>
  );
}
