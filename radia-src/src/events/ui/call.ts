/**
 * Appel entrant de « A » dans RADIA (interface inspirée d'un appel iPhone, sans prétendre à un vrai appel système :
 * aucun accès aux contacts, au micro ni aux appels réels). Le vocal ne démarre qu'APRÈS « Décrocher ».
 */
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { icon } from '../../ui/icons';
import { audio, reducedFx } from '../../core/app';
import { speakerFace } from '../ctx';
import { loadVoice, playVoice, type VoiceClip, type VoicePlayer } from '../voice';

export type CallResult = 'start' | 'later';

const fmt = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const CSS = `
.call-layer{position:absolute;inset:0;z-index:98;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:calc(var(--sat) + 70px) 24px calc(var(--sab) + 44px);background:radial-gradient(120% 80% at 50% 20%,rgba(60,44,92,.9),rgba(14,10,26,.94));backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);color:#fff;animation:fadeIn .35s ease}
.call-layer.out{animation:fadeOut .3s ease forwards;pointer-events:none}
.call-top{text-align:center}
.call-app{font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.65;margin-bottom:6px}
.call-name{font-size:44px;font-weight:700;line-height:1}
.call-st{margin-top:8px;font-size:18px;opacity:.8;min-height:24px}
.call-av{position:relative;width:176px;height:176px;margin:8px 0}
.call-av img{position:relative;z-index:2;width:100%;height:100%;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px rgba(255,255,255,.22),0 14px 40px rgba(0,0,0,.5);background:#3b3152;transform:scale(calc(1 + var(--lvl,0) * .07));transition:transform .06s linear}
.call-av i{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(255,255,255,.35);animation:callRing 2.2s ease-out infinite}
.call-av i:nth-child(2){animation-delay:.7s}.call-av i:nth-child(3){animation-delay:1.4s}
.call-layer.live .call-av i{border-color:rgba(255,160,200,.5);animation-duration:1.6s}
.call-layer.ringing .call-av img{animation:callShake 1.3s ease-in-out infinite}
@keyframes callRing{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.9);opacity:0}}
@keyframes callShake{0%,100%{transform:rotate(0)}10%{transform:rotate(-5deg)}20%{transform:rotate(5deg)}30%{transform:rotate(-4deg)}40%{transform:rotate(3deg)}50%{transform:none}}
.call-mid{width:100%;max-width:360px;text-align:center;min-height:92px}
.call-sub{font-size:17px;line-height:1.4;font-weight:600;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.4)}
.call-bar{height:4px;border-radius:2px;background:rgba(255,255,255,.2);overflow:hidden;margin-top:10px}.call-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff9cc0,#ffd86b)}
.call-end{max-width:340px;text-align:center}
.call-end h3{margin:0 0 6px;font-size:24px}.call-end p{margin:0 0 14px;font-size:19px;opacity:.92}
.call-btns{display:flex;gap:42px;justify-content:center;align-items:flex-start;width:100%}
.call-btn{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:14px;color:#fff}
.call-btn b{width:74px;height:74px;border-radius:50%;display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,0,0,.4)}
.call-btn.ok b{background:#34c759;animation:callPulse 1.2s ease-in-out infinite}.call-btn.no b{background:#ff3b30}
.call-btn:active b{transform:scale(.93)}
.call-btn.no svg{transform:rotate(135deg)}
@keyframes callPulse{0%,100%{box-shadow:0 0 0 0 rgba(52,199,89,.55),0 8px 20px rgba(0,0,0,.4)}50%{box-shadow:0 0 0 14px rgba(52,199,89,0),0 8px 20px rgba(0,0,0,.4)}}
.call-cta{display:flex;flex-direction:column;gap:10px;width:100%;max-width:340px}
.call-cta .btn{min-height:52px;font-size:18px}
`;

interface Opts { /** 'incoming' : sonnerie + décrocher/refuser ; 'replay' : réécoute depuis le téléphone */ mode: 'incoming' | 'replay'; canStart: boolean }

/** Appel entrant (ou réécoute du message). Résout 'start' (direction le dressing) ou 'later'. */
export async function runCall(o: Opts): Promise<CallResult> {
  if (!document.getElementById('call-css')) { const s = document.createElement('style'); s.id = 'call-css'; s.textContent = CSS; document.head.append(s); }
  const clipPromise: Promise<VoiceClip | null> = loadVoice(); // déchiffré avant le toucher (iOS exige un geste pour lancer le son)
  return new Promise<CallResult>((resolve) => {
    const incoming = o.mode === 'incoming';
    const avatar = h('img', { src: speakerFace('auguste'), alt: 'A' }) as HTMLImageElement;
    const name = h('div.call-name', 'A');
    const st = h('div.call-st', incoming ? 'appel entrant…' : 'Message vocal');
    const mid = h('div.call-mid');
    const bottom = h('div.call-bottom');
    const layer = h(`div.call-layer${incoming ? '.ringing' : ''}`,
      h('div.call-top', h('div.call-app', 'Appel dans RADIA'), name, st),
      h('div.call-av', h('i'), h('i'), h('i'), avatar),
      mid, bottom);
    ui.root.append(layer);
    let player: VoicePlayer | null = null;
    let raf = 0;
    let finished = false;

    const finish = (r: CallResult) => {
      if (finished) return;
      finished = true;
      audio.ringStop();
      player?.stop();
      cancelAnimationFrame(raf);
      audio.duckRelease(1.6);
      layer.classList.add('out');
      window.setTimeout(() => layer.remove(), 320);
      resolve(r);
    };

    const btn = (cls: string, label: string, ic: string, fn: () => void) => {
      const b = h(`button.call-btn.${cls}`, { 'aria-label': label }, h('b', icon(ic, 34)), h('span', label));
      b.addEventListener('click', tap(fn, { sound: false }));
      return b;
    };
    const endPanel = () => {
      layer.classList.remove('live');
      st.textContent = 'Appel terminé';
      mid.textContent = '';
      mid.append(h('div.call-end', h('h3', 'Auguste t’a invitée à une soirée surprise ♡'), h('p', 'Mets-toi sur ton trente et un !')));
      bottom.textContent = '';
      const cta = h('div.call-cta');
      if (o.canStart) cta.append(h('button.btn.gold', { on: { click: tap(() => finish('start')) } }, 'Direction le dressing ♡'));
      cta.append(h('button.btn.secondary', { on: { click: tap(() => finish('later'), { sound: false }) } }, o.canStart ? 'Plus tard' : 'Fermer'));
      bottom.append(cta);
      audio.play('sparkle');
    };

    const answer = async () => {
      audio.ringStop();
      layer.classList.remove('ringing');
      layer.classList.add('live');
      bottom.textContent = '';
      const clip = await clipPromise;
      audio.duckHold(0.12, 0.9); // la musique baisse doucement
      bottom.append(btn('no', 'Raccrocher', 'handset', () => { player?.stop(); finish('later'); }));
      if (!clip) {
        // pas de clé / fichier introuvable : message écrit (jamais de voix de synthèse)
        st.textContent = 'en ligne';
        mid.append(h('div.call-sub', 'Radia ? J’ai une surprise pour toi, ce soir…'));
        await new Promise((r) => window.setTimeout(r, 3500));
        if (!finished) endPanel();
        return;
      }
      player = playVoice(clip); // lancé dans le geste du toucher
      const bar = h('i');
      const sub = h('div.call-sub');
      mid.append(sub, h('div.call-bar', bar));
      const el = player.el;
      const an = player.analyser;
      const buf = an ? new Uint8Array(an.frequencyBinCount) : null;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        const dur = isFinite(el.duration) && el.duration > 0 ? el.duration : 0;
        st.textContent = fmt(el.currentTime);
        bar.style.width = dur ? `${Math.min(100, (el.currentTime / dur) * 100)}%` : '0';
        if (an && buf) { an.getByteFrequencyData(buf); let s = 0; for (let i = 2; i < 40; i++) s += buf[i]; layer.style.setProperty('--lvl', reducedFx() ? '0' : String(Math.min(1, s / 40 / 160))); }
        if (clip.transcript) { const cur = [...clip.transcript].reverse().find((l) => l.t <= el.currentTime); if (cur && sub.textContent !== cur.text) sub.textContent = cur.text; }
      };
      loop();
      const why = await player.ended;
      cancelAnimationFrame(raf);
      if (finished) return;
      if (why === 'error') { mid.textContent = ''; mid.append(h('div.call-sub', 'Le message vocal n’a pas pu démarrer. Touche pour réessayer depuis ton téléphone ♡')); await new Promise((r) => window.setTimeout(r, 2200)); }
      if (!finished) endPanel();
    };

    if (incoming) {
      audio.ringStart();
      bottom.append(h('div.call-btns', btn('no', 'Refuser', 'handset', () => finish('later')), btn('ok', 'Décrocher', 'handset', () => void answer())));
    } else {
      bottom.append(h('div.call-btns', btn('ok', 'Écouter', 'play', () => void answer()), btn('no', 'Fermer', 'close', () => finish('later'))));
      st.textContent = 'Message vocal de A';
    }
  });
}
