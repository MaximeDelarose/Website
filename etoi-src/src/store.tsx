import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, Msg, Profile } from './types';
import { DEMO_ME, PROFILES, initialState, slotsFromAvail } from './data';

const KEY = 'etoi.demo.v1';
const uid = () => Math.random().toString(36).slice(2, 9);

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initialState(), ...JSON.parse(raw) };
  } catch { /* stockage indisponible : on démarre à neuf */ }
  return initialState();
}

interface Toast { id: number; text: string }
interface Ctx {
  s: AppState;
  set: (fn: (s: AppState) => AppState) => void;
  profiles: Profile[];
  byId: (id: string) => Profile | undefined;
  toast: (t: string) => void;
  toasts: Toast[];
  typing: string | null;
  like: (id: string) => 'match' | 'sent';
  pass: (id: string) => void;
  send: (id: string, text: string, kind?: Msg['kind']) => void;
  openChat: (id: string) => void;
  block: (id: string) => void;
  report: (id: string) => void;
  startDemo: () => void;
  reset: () => void;
  match: string | null; closeMatch: () => void;
  chat: string | null; setChat: (id: string | null) => void;
  now: number;
}
const C = createContext<Ctx>(null as never);
export const useApp = () => useContext(C);

export function Provider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<AppState>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const [match, setMatch] = useState<string | null>(null);
  const [chat, setChat] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const sRef = useRef(s); sRef.current = s;

  useEffect(() => {
    try {
      // les photos importées restent en mémoire de session uniquement pour ne pas saturer le stockage
      localStorage.setItem(KEY, JSON.stringify({ ...s, me: { ...s.me, photo: s.me.photo && s.me.photo.length < 150000 ? s.me.photo : undefined } }));
    } catch { /* ignoré */ }
  }, [s]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 20000); return () => clearInterval(t); }, []);
  // fin automatique de « Ce soir »
  useEffect(() => { if (s.tonight.on && s.tonight.until < now) setS((x) => ({ ...x, tonight: { on: false, until: 0 } })); }, [now, s.tonight]);

  const set = useCallback((fn: (s: AppState) => AppState) => setS(fn), []);
  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  const byId = useCallback((id: string) => PROFILES.find((p) => p.id === id), []);
  const profiles = PROFILES;

  const like = (id: string) => {
    const p = PROFILES.find((x) => x.id === id)!;
    if (p.likesYou) {
      setS((x) => ({
        ...x, liked: [...x.liked, id], matches: [...x.matches, id],
        chats: { ...x.chats, [id]: [{ id: uid(), from: 'sys', kind: 'text', text: 'Vous vous êtes plu mutuellement. Écrivez le premier mot, à votre rythme.', at: Date.now() }] },
      }));
      setMatch(id);
      return 'match';
    }
    setS((x) => ({ ...x, liked: [...x.liked, id] }));
    toast('Intérêt envoyé, avec délicatesse.');
    return 'sent';
  };
  const pass = (id: string) => setS((x) => ({ ...x, passed: [...x.passed, id] }));

  const send = (id: string, text: string, kind: Msg['kind'] = 'text') => {
    const m: Msg = { id: uid(), from: 'me', kind, text, at: Date.now() };
    setS((x) => ({ ...x, chats: { ...x.chats, [id]: [...(x.chats[id] || []), m] } }));
    const p = PROFILES.find((q) => q.id === id)!;
    const nth = (sRef.current.chats[id] || []).filter((q) => q.from === 'them').length;
    if (nth >= p.replies.length) return;
    setTimeout(() => setTyping(id), 700);
    setTimeout(() => {
      setTyping(null);
      const r: Msg = { id: uid(), from: 'them', kind: 'text', text: p.replies[nth], at: Date.now() };
      setS((x) => ({
        ...x, chats: { ...x.chats, [id]: [...(x.chats[id] || []), r] },
        unread: { ...x.unread, [id]: sRef.current.unread[id] || 0 },
      }));
    }, 2300);
  };
  const openChat = (id: string) => {
    setS((x) => {
      if (x.chats[id]) return x;
      return { ...x, chats: { ...x.chats, [id]: [{ id: uid(), from: 'sys', kind: 'text', text: 'Conversation ouverte depuis « Ce soir ». Rien ne vous oblige à répondre vite.', at: Date.now() }] } };
    });
    setChat(id);
  };
  const block = (id: string) => {
    setS((x) => ({ ...x, blocked: [...x.blocked, id], matches: x.matches.filter((m) => m !== id) }));
    setChat(null); toast('Profil bloqué. Il ne peut plus vous voir ni vous écrire.');
  };
  const report = (id: string) => { setS((x) => ({ ...x, reported: [...x.reported, id] })); toast('Signalement envoyé. Merci de veiller sur la communauté.'); };

  const startDemo = () => setS((x) => ({
    ...x, stage: 'app', me: { ...DEMO_ME }, slots: slotsFromAvail(DEMO_ME.avail),
  }));
  const reset = () => { try { localStorage.removeItem(KEY); } catch { /* ignoré */ } setChat(null); setMatch(null); setS(initialState()); };

  const value = useMemo<Ctx>(() => ({
    s, set, profiles, byId, toast, toasts, typing, like, pass, send, openChat, block, report, startDemo, reset,
    match, closeMatch: () => setMatch(null), chat, setChat, now,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [s, toasts, typing, match, chat, now]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
