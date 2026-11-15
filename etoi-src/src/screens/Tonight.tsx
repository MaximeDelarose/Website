import { useState } from 'react';
import { useApp } from '../store';
import { eligible, reasons } from '../data';
import { Chip, DemoPill, Empty, Icon, Portrait } from '../ui';

const OPTS = [['1 h', 1], ['2 h', 2], ['Jusqu\'à 23 h', 0]] as const;

export default function Tonight() {
  const { s, set, profiles, toast, openChat, now } = useApp();
  const [dur, setDur] = useState(2);
  const on = s.tonight.on;
  const until = new Date(s.tonight.until).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const start = () => {
    let end = Date.now() + dur * 3600e3;
    if (dur === 0) { const d = new Date(); d.setHours(23, 0, 0, 0); if (+d < Date.now() + 600e3) d.setDate(d.getDate() + 1); end = +d; }
    set((x) => ({ ...x, tonight: { on: true, until: end } }));
    toast('C\'est allumé. Tu peux l\'éteindre à tout moment.');
  };
  const stop = () => { set((x) => ({ ...x, tonight: { on: false, until: 0 } })); toast('Éteint. Plus personne ne te voit.'); };

  const people = profiles.filter((p) => p.avail.includes('soiree') && eligible(s.me, p) && !s.blocked.includes(p.id));
  void now;

  return (
    <div className="screen with-tabs">
      <div className="top"><div><div className="kicker">Quand la maison est calme</div><h1 className="h2">Ce <em>soir</em></h1></div><DemoPill /></div>
      <div className="scroll">
        <section className={`lamp ${on ? 'on' : ''}`}>
          <div className="orb"><Icon n="moon" size={34} /></div>
          <h2>{on ? <>Tu es <em>là</em> jusqu'à {until}.</> : 'Ce soir, je prends du temps pour moi.'}</h2>
          <p>{on ? 'Les personnes compatibles voient seulement que tu es disponible pour échanger.' : 'Active-le si tu as envie de discuter un moment. Temporaire, et désactivable à tout moment.'}</p>
          {on ? (
            <button className="btn quiet" onClick={stop}>Éteindre</button>
          ) : (
            <>
              <div className="durations">{OPTS.map(([l, h]) => <Chip key={l} on={dur === h} onClick={() => setDur(h)}>{l}</Chip>)}</div>
              <button className="btn amber block" onClick={start}>Je suis là</button>
            </>
          )}
        </section>
        <div className="note" style={{ margin: '14px 16px 0' }}>
          <Icon n="lock" size={18} />
          <span>Jamais de « enfants couchés » ni de « seul·e chez moi » : seule l'information « disponible pour échanger » est partagée. Réciprocité : tu ne vois les autres que lorsque tu es visible.</span>
        </div>

        {on ? (
          <>
            <div className="sect-title"><div className="kicker">Disponibles pour échanger · {people.length}</div></div>
            {people.map((p, i) => (
              <button key={p.id} className="person" style={{ animationDelay: `${i * 90}ms` }} onClick={() => openChat(p.id)}>
                <Portrait p={p} className="avatar lit" />
                <span className="meta">
                  <span className="nm">{p.name}, {p.age}</span>
                  <span className="sub" style={{ display: 'block' }}>{p.zone} · {reasons(s.me, s.slots, p).slice(0, 2).map((r) => r.label).join(' · ') || 'Disponible pour échanger'}</span>
                </span>
                <span className="go"><i className="dot-live" />Écrire</span>
              </button>
            ))}
            {!people.length && <Empty title="Personne pour" em="l'instant." text="Reviens dans un moment : les soirées se remplissent doucement." />}
          </>
        ) : (
          <Empty title="Un soir," em="sans pression." text="Allume ta lumière quand tu as envie d'une vraie discussion. Éteins-la quand tu veux." />
        )}
      </div>
    </div>
  );
}
