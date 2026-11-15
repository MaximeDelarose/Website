import { useState } from 'react';
import { Provider, useApp } from './store';
import { Icon, Portrait, Toasts } from './ui';
import Welcome from './screens/Welcome';
import Onboarding from './screens/Onboarding';
import Discover from './screens/Discover';
import Tonight from './screens/Tonight';
import Connections from './screens/Connections';
import Messages, { Chat } from './screens/Messages';
import Me from './screens/Me';

export type Tab = 'discover' | 'tonight' | 'connections' | 'messages' | 'me';
const TABS: [Tab, string, string][] = [['discover', 'Découvrir', 'compass'], ['tonight', 'Ce soir', 'moon'], ['connections', 'Connexions', 'link'], ['messages', 'Messages', 'chat'], ['me', 'Moi', 'user']];

function Shell() {
  const { s, toasts, match, closeMatch, byId, chat, setChat } = useApp();
  const [tab, setTab] = useState<Tab>('discover');
  const m = match ? byId(match) : null;
  const unread = Object.values(s.chats).filter((c) => c.at(-1)?.from === 'them').length;
  return (
    <div className="app">
      {s.stage === 'welcome' && <Welcome />}
      {s.stage === 'onboarding' && <Onboarding />}
      {s.stage === 'app' && (
        <>
          <div key={tab} style={{ position: 'absolute', inset: 0 }}>
            {tab === 'discover' && <Discover go={setTab} />}
            {tab === 'tonight' && <Tonight />}
            {tab === 'connections' && <Connections go={setTab} />}
            {tab === 'messages' && <Messages go={setTab} />}
            {tab === 'me' && <Me />}
          </div>
          <nav className="tabs" aria-label="Navigation principale">
            {TABS.map(([k, l, i]) => (
              <button key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined}>
                <Icon n={i} />{l}
                {k === 'tonight' && s.tonight.on && <i className="live" />}
                {k === 'messages' && unread > 0 && <span className="badge">{unread}</span>}
              </button>
            ))}
          </nav>
          {chat && <Chat id={chat} key={chat} />}
          {m && (
            <div className="match">
              <div className="pair"><Portrait src={s.me.photo} hue={34} /><Portrait p={m} /></div>
              <h2>C'est <em>réciproque.</em></h2>
              <p>{m.name} et vous avez envie de faire connaissance. Écrivez le premier mot, quand vous voulez.</p>
              <button className="btn amber" onClick={() => { closeMatch(); setTab('messages'); setChat(m.id); }}>Écrire à {m.name}</button>
              <button className="link" style={{ marginTop: 16 }} onClick={closeMatch}>Plus tard</button>
            </div>
          )}
        </>
      )}
      <Toasts items={toasts} />
    </div>
  );
}
export default function App() { return <Provider><Shell /></Provider>; }
