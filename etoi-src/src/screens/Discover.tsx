import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { eligible, reasons, INTENTIONS, AVAIL_LABEL } from '../data';
import { Chip, DemoPill, Empty, Icon, Portrait } from '../ui';
import type { Tab } from '../App';

export default function Discover({ go }: { go: (t: Tab) => void }) {
  const { s, profiles, like, pass } = useApp();
  const [total] = useState(() => 5);
  const [done, setDone] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const queue = profiles
    .filter((p) => eligible(s.me, p) && ![...s.passed, ...s.liked, ...s.blocked].includes(p.id))
    .map((p) => ({ p, r: reasons(s.me, s.slots, p) }))
    .sort((a, b) => b.r.length - a.r.length);
  const cur = done < total ? queue[0] : undefined;
  const left = Math.min(total - done, queue.length);
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }); }, [cur?.p.id]);

  const decide = (kind: 'pass' | 'like') => {
    if (!cur) return;
    kind === 'pass' ? pass(cur.p.id) : like(cur.p.id);
    setDone((n) => n + 1);
  };
  const tonightOn = s.tonight.on && cur?.p.avail.includes('soiree');

  return (
    <div className="screen with-tabs">
      <div className="top"><div><div className="kicker">Sélection du jour</div><h1 className="h2">Découvrir</h1></div><DemoPill /></div>
      {cur ? (
        <>
          <div className="counter">{Array.from({ length: Math.min(total, done + left) }).map((_, i) => <i key={i} className={i <= done ? 'on' : ''} />)}<span>{left} profil{left > 1 ? 's' : ''} pour aujourd'hui</span></div>
          <div className="scroll" ref={scroller}>
            <article className="card" key={cur.p.id}>
              <div className="hero">
                <Portrait p={cur.p} />
                {cur.p.fake !== false && <span className="fake-tag">Profil fictif</span>}
                {tonightOn && <span className="tonight-tag"><i className="dot-live" />Ce soir</span>}
                <div className="ident">
                  <h2>{cur.p.name}, <span>{cur.p.age}</span></h2>
                  <div className="where"><Icon n="pin" size={15} />{cur.p.zone}{s.settings.showDistance && ` · environ ${cur.p.km} km`}</div>
                </div>
              </div>
              <div className="body">
                <div className="sec"><p className="quote">« {cur.p.bio} »</p></div>
                <div className="sec"><div className="label">Pourquoi vous pourriez vous plaire</div>
                  <div className="why">{cur.r.length ? cur.r.map((x) => <Chip key={x.key} ember>{x.label}</Chip>) : <span className="small">Peu de points communs évidents, mais la curiosité compte.</span>}</div>
                </div>
                <div className="sec"><div className="label">Ce qu'iel recherche</div><p className="lead">{INTENTIONS[cur.p.intention]}. {cur.p.seeking}</p></div>
                <div className="sec"><div className="label">Centres d'intérêt</div><div className="chips">{cur.p.interests.map((i) => <Chip key={i} ember={s.me.interests.includes(i)}>{i}</Chip>)}</div></div>
                <div className="sec"><div className="label">Disponibilités</div><p className="lead">{cur.p.avail.map((a) => AVAIL_LABEL[a]).join(' · ')}</p></div>
              </div>
            </article>
            <div style={{ height: 96 }} />
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--nav-h) + var(--safe-b))', zIndex: 10, pointerEvents: 'none' }}>
            <div className="decide" style={{ pointerEvents: 'auto' }}>
              <button className="btn quiet" onClick={() => decide('pass')}>Passer</button>
              <button className="btn amber" onClick={() => decide('like')}>Faire connaissance</button>
            </div>
          </div>
        </>
      ) : (
        <div className="scroll"><Empty title="C'est tout pour" em="aujourd'hui." text="Nous préférons peu de profils, mais choisis. Revenez demain, ou voyez qui est disponible ce soir.">
          <button className="btn amber" onClick={() => go('tonight')}>Voir « Ce soir »</button>
        </Empty></div>
      )}
    </div>
  );
}
