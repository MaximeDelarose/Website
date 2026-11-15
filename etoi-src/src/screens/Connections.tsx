import { useState } from 'react';
import { useApp } from '../store';
import { DemoPill, Empty, Portrait, Chip } from '../ui';
import type { Tab } from '../App';

export default function Connections({ go }: { go: (t: Tab) => void }) {
  const { s, byId, openChat } = useApp();
  const [seg, setSeg] = useState<'mutual' | 'wait'>('mutual');
  const mutual = s.matches.map(byId).filter(Boolean).filter((p) => !s.blocked.includes(p!.id));
  const wait = s.liked.filter((id) => !s.matches.includes(id) && !s.blocked.includes(id)).map(byId).filter(Boolean);
  const list = seg === 'mutual' ? mutual : wait;

  return (
    <div className="screen with-tabs">
      <div className="top"><div><div className="kicker">Intérêts réciproques</div><h1 className="h2">Connexions</h1></div><DemoPill /></div>
      <div className="pad" style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <Chip on={seg === 'mutual'} onClick={() => setSeg('mutual')}>Réciproques · {mutual.length}</Chip>
        <Chip on={seg === 'wait'} onClick={() => setSeg('wait')}>En attente · {wait.length}</Chip>
      </div>
      <div className="scroll">
        {list.map((p, i) => p && (
          <button key={p.id} className="person" style={{ animationDelay: `${i * 80}ms` }} onClick={() => seg === 'mutual' && openChat(p.id)}>
            <Portrait p={p} className={`avatar ${seg === 'mutual' ? 'lit' : ''}`} />
            <span className="meta"><span className="nm">{p.name}, {p.age}</span><span className="sub" style={{ display: 'block' }}>{p.zone}</span></span>
            {seg === 'mutual' ? <span className="go">Écrire</span> : <span className="small">Pas encore de réponse</span>}
          </button>
        ))}
        {!list.length && (seg === 'mutual'
          ? <Empty title="Votre première" em="connexion" text="Elle apparaîtra ici dès qu'un intérêt sera réciproque. Ni avant, ni autrement."><button className="btn amber" onClick={() => go('discover')}>Découvrir</button></Empty>
          : <Empty title="Rien en" em="attente." text="Les intérêts que vous envoyez sans réponse restent ici, discrètement." />)}
      </div>
    </div>
  );
}
