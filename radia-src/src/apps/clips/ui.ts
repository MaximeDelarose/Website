/**
 * TikTak — l'application de petites vidéos du téléphone du jeu : fil vertical plein écran (défilement par
 * glissé / scroll-snap), clips générés et animés en Canvas 2D, likes, favoris, commentaires fictifs, partage vers
 * l'album interne, publications de Radia et fans fictifs. Rien ne sort du jeu.
 */
import './clips.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { registerBusy, emitPhone } from '../../events/bus';
import { haptic } from '../../core/haptics';
import { radiaFaceCanvas } from '../../game/art/world/radiaNow';
import { renderPhoto } from '../../events/photo/render';
import { genClip, parseGenId, commentsFor, type Clip } from './gen';
import { buildThreads, type ThreadMsg } from './threads';
import { canvasUrl } from '../../game/art/kit';
import { medallionCanvas } from '../../game/art/characters';
import { hasPhotos, photoUrlNow } from '../../core/photos';
import { makeScene, SW, SH, type SceneDraw } from './scenes';
import { clipsState, snapState, persist, photoById, catOpts, worldFans, reduced } from '../store';
import { isLiked, isFaved, toggleLike, toggleFav, addComment, addReply, toggleMsgLike, likesOf, commentCountOf, profileTotals, proposalsFor, fansLeftToday, DAILY_FAN_CAP, removeMine, type MinePost, type Proposal } from './model';
import { publishClip, publishPhotoClip, shareClipToAlbum, postStory, clipsOfferClosed } from '../service';
import { ico, fmtCount, tick, heartBurst, note } from '../kit';
import { hash } from '../util';
import { flags } from './ui-state';
import type { Pending } from '../snap/model';

let layer: HTMLElement | null = null;
registerBusy(() => !!layer);

type Tab = 'foryou' | 'faves' | 'profile';

/** Une publication de Radia (sauvegardée) vue comme un clip. */
export function mineToClip(p: MinePost, now = Date.now(), liked = false): Clip {
  return { id: p.id, tpl: 'mine', topic: 'photo', by: 'radia', name: 'Radia', hue: 335, title: p.title, caption: p.caption, tags: p.tags, sound: p.sound, scene: p.scene, dur: p.dur, likes: likesOf(p, now, liked), comments: commentCountOf(p, now), mine: true, at: p.at };
}
/** Retrouve un clip d'après son identifiant (généré ou publié par Radia). */
export function clipById(id: string): Clip | null {
  const c = clipsState();
  const m = c.mine.find((p) => p.id === id);
  if (m) return mineToClip(m, Date.now(), isLiked(c, id));
  const g = parseGenId(id);
  return g ? genClip(g.seed, g.n) : null;
}

// ---------------------------------------------------------------- lecture (une seule boucle d'animation)
class PostView {
  el: HTMLElement; cv: HTMLCanvasElement; draw: SceneDraw | null = null; g: CanvasRenderingContext2D; dpr: number; t0 = 0; painted = false;
  constructor(public clip: Clip, el: HTMLElement, cv: HTMLCanvasElement) {
    this.el = el; this.cv = cv;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(SW * this.dpr); cv.height = Math.round(SH * this.dpr);
    this.g = cv.getContext('2d')!;
  }
  paint(t: number): void {
    if (!this.draw) {
      this.draw = makeScene(this.clip.scene, {
        fans: worldFans(), title: this.clip.title, dur: this.clip.dur, catOpts: catOpts(),
        photo: (id) => { const rec = photoById(id); if (!rec) return null; const m = snapState().photos.find((p) => p.id === id); return { rec, meta: { cat: !!m?.cat, stickers: m?.stickers ?? [], catOpts: catOpts() } }; },
      });
    }
    const g = this.g; g.save(); g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    try { this.draw(g, SW, SH, t % this.clip.dur); } catch { /* une scène ne casse jamais l'application */ }
    g.restore();
    this.painted = true;
  }
}

export function openClips(startTab: Tab = 'foryou', opts: { moment?: string } = {}): void {
  if (layer) return;
  flags.open = true;
  const st = clipsState();
  st.opened++;
  let tab: Tab = startTab;
  let views: PostView[] = [];
  let active: PostView | null = null;
  let paused = false;
  let raf = 0, lastDraw = 0, cost = 0;
  let io: IntersectionObserver | null = null, io2: IntersectionObserver | null = null;
  let genIdx = 0, mineIdx = 0, slot = 0;
  /** Le fil repart d'un point différent à chaque ouverture (même graine : jamais deux clips identiques d'affilée). */
  const startIdx = ((st.opened - 1) * 7) % 150;
  const root = h('div.clp-layer');
  layer = root;
  const body = h('div.clp-body');
  const toast = (o: { title: string; sub?: string; ms?: number }): void => note(root, o.title, o.sub, o.ms);
  const heartHost = h('div.clp-hearthost');
  const tabsEl = h('div.clp-tabs');
  const pend = () => snapState().pending.filter((p) => p.clips);
  const pendBtn = h('button.clp-pending', { 'aria-label': 'Moments à publier', on: { click: tap(() => openMoments(), { sound: false }) } });
  const top = h('div.clp-top',
    h('button.clp-x', { 'aria-label': 'Fermer', on: { click: tap(() => close(), { sound: false }) } }, ico('close', 22)),
    tabsEl,
    h('button.clp-x.clp-new', { 'aria-label': 'Publier un souvenir', on: { click: tap(() => openComposer(), { sound: false }) } }, ico('plus', 24)));
  root.append(body, top, pendBtn, heartHost);
  ui.root.append(root);
  tick('pop2');

  const TABS: [Tab, string][] = [['foryou', 'Pour toi'], ['faves', 'Favoris'], ['profile', 'Profil']];
  for (const [k, label] of TABS) tabsEl.append(h('button.clp-tab', { 'data-tab': k, on: { click: tap(() => { if (tab !== k) { tab = k; render(); } }, { sound: false }) } }, label));

  function close(): void {
    stopLoop(); io?.disconnect(); io2?.disconnect();
    root.classList.add('out'); window.setTimeout(() => root.remove(), 240);
    layer = null; flags.open = false; persist(); emitPhone();
  }
  function refreshPending(): void {
    const n = pend().length;
    pendBtn.hidden = n === 0; pendBtn.textContent = '';
    if (n) pendBtn.append(ico('sparkle', 16), h('span', `${n} moment${n > 1 ? 's' : ''} à publier`));
  }
  function startLoop(): void {
    if (raf) return;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!active || paused || reduced() || document.hidden) return;
      // cadence adaptative : ~30 i/s, moins si l'appareil peine (jamais plus d'une image par 2,2 × le coût de dessin)
      if (now - lastDraw < Math.max(33, cost * 2.2)) return;
      lastDraw = now;
      const t1 = performance.now();
      active.paint((now - active.t0) / 1000);
      cost = cost * 0.7 + (performance.now() - t1) * 0.3;
    };
    raf = requestAnimationFrame(loop);
  }
  function stopLoop(): void { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function setActive(v: PostView | null): void {
    if (active === v) return;
    active = v; paused = false;
    root.classList.remove('paused');
    if (v) { v.t0 = performance.now(); v.paint(0); }
  }

  // ---------------- fil
  function nextClip(): Clip {
    const mine = st.mine;
    slot++;
    if (mine.length && slot % 4 === 0) { const p = mine[(mine.length - 1 - mineIdx++ % mine.length)]; return mineToClip(p, Date.now(), isLiked(st, p.id)); }
    return genClip(st.seed, genIdx++);
  }
  function buildFeed(clips: Clip[], more?: () => Clip[]): HTMLElement {
    const feed = h('div.clp-feed');
    views = []; active = null;
    io?.disconnect();
    const add = (list: Clip[]) => { for (const c of list) { const v = buildPost(c); views.push(v); feed.append(v.el); io!.observe(v.el); io2!.observe(v.el); } };
    // actif = la publication visible à ≥ 60 % (sans marge) ; image fixe = celles qui approchent (marge)
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const v = views.find((x) => x.el === e.target); if (!v) continue;
        if (e.isIntersecting && e.intersectionRatio >= 0.6) { setActive(v); if (more && views.indexOf(v) >= views.length - 3) add(more()); }
      }
    }, { root: feed, threshold: [0, 0.6] });
    io2?.disconnect();
    io2 = new IntersectionObserver((entries) => {
      for (const e of entries) { const v = views.find((x) => x.el === e.target); if (v && !v.painted && e.isIntersecting) v.paint(v.clip.dur * 0.4); }
    }, { root: feed, rootMargin: '100% 0px' });
    add(list0(clips));
    return feed;
  }
  const list0 = (c: Clip[]) => c;

  function buildPost(clip: Clip): PostView {
    const cv = h('canvas.clp-cv') as HTMLCanvasElement;
    const hue = clip.hue;
    const like = h('button.clp-act', { 'aria-label': 'J’aime' });
    const likeN = h('b', '');
    const com = h('button.clp-act', { 'aria-label': 'Commentaires' }, ico('comment', 30), h('b', fmtCount(clip.comments + (st.comments[clip.id]?.length ?? 0))));
    const fav = h('button.clp-act', { 'aria-label': 'Favori' });
    const share = h('button.clp-act', { 'aria-label': 'Partager' }, ico('share', 28), h('b', 'Partager'));
    const syncLike = () => { const on = isLiked(st, clip.id); like.classList.toggle('on', on); likeN.textContent = fmtCount(clip.likes + (on && !clip.mine ? 1 : 0)); };
    const syncFav = () => { const on = isFaved(st, clip.id); fav.classList.toggle('on', on); };
    like.append(ico('heart', 32), likeN); fav.append(ico('bookmark', 28), h('b', 'Favori'));
    syncLike(); syncFav();
    const doLike = (e?: { x: number; y: number }) => {
      const on = toggleLike(st, clip.id); syncLike(); persist();
      if (on) { tick('heart'); like.classList.remove('pop'); void like.offsetWidth; like.classList.add('pop'); if (e) heartBurst(heartHost, e.x, e.y, 1); }
      else haptic('select');
    };
    like.addEventListener('click', () => doLike());
    fav.addEventListener('click', () => { const on = toggleFav(st, clip.id); syncFav(); persist(); tick(on ? 'sparkle' : 'pop1'); toast({ title: on ? 'Ajouté aux favoris ♡' : 'Retiré des favoris' }); if (tab === 'faves' && !on) render(); });
    com.addEventListener('click', () => { tick('pop2'); openComments(clip, () => { com.querySelector('b')!.textContent = fmtCount(clip.comments + (st.comments[clip.id]?.length ?? 0)); }); });
    share.addEventListener('click', () => { tick('pop2'); openShare(clip); });
    const rail = h('div.clp-rail', like, com, fav, share);
    if (clip.mine) rail.append(h('button.clp-act', { 'aria-label': 'Supprimer', on: { click: tap(async () => { if (await ui.confirm('Supprimer cette publication ?', 'Les fans gagnés restent à toi ♡', 'Supprimer', 'Garder')) { removeMine(st, clip.id); persist(); render(); } }, { sound: false }) } }, ico('trash', 24), h('b', 'Suppr.')));
    const av = h('span.clp-av', { style: `--h:${hue}` }, clip.mine ? radiaFaceCanvas('smile', 80) : h('i', clip.name.slice(0, 1)));
    if (clip.mine) { const cvAv = av.querySelector('canvas') as HTMLCanvasElement; cvAv.removeAttribute('style'); }
    const info = h('div.clp-info',
      h('div.clp-by', av, h('b', `@${clip.by}`), clip.mine ? h('i.clp-badge', 'Radia ♡') : null),
      h('p.clp-title', clip.title),
      h('p.clp-cap', clip.caption),
      h('p.clp-tags', clip.tags.map((t) => `#${t}`).join(' ')),
      h('div.clp-snd', h('span.clp-eq', h('i'), h('i'), h('i'), h('i')), h('span.clp-sndtxt', h('span', `${clip.sound} · son original`))));
    const playMark = h('div.clp-playmark', ico('play', 54));
    const post = h('section.clp-post', { 'data-id': clip.id }, cv, h('div.clp-shade'), playMark, rail, info);
    const view = new PostView(clip, post, cv);
    // double toucher = cœur ; simple toucher = pause
    let lastTap = 0, tapT = 0;
    post.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      const r = root.getBoundingClientRect();
      const x = (e as MouseEvent).clientX - r.left, y = (e as MouseEvent).clientY - r.top, now = performance.now();
      if (now - lastTap < 320) { window.clearTimeout(tapT); lastTap = 0; if (!isLiked(st, clip.id)) doLike({ x, y }); else { tick('heart'); heartBurst(heartHost, x, y, 1); } return; }
      lastTap = now;
      tapT = window.setTimeout(() => { if (active === view) { paused = !paused; root.classList.toggle('paused', paused); haptic('select'); } }, 330);
    });
    return view;
  }

  // ---------------- feuilles (commentaires, partage, publication)
  function sheet(title: string, content: Node, onClose?: () => void): { el: HTMLElement; close: () => void } {
    const back = h('div.clp-sheet-back');
    const el = h('div.clp-sheet', h('div.clp-grip'), h('div.clp-sheet-h', h('b', title), h('button.clp-x.dark', { 'aria-label': 'Fermer', on: { click: tap(() => closeIt(), { sound: false }) } }, ico('close', 20))), content);
    const closeIt = () => { el.classList.add('out'); back.classList.add('out'); window.setTimeout(() => { el.remove(); back.remove(); }, 220); onClose?.(); };
    back.addEventListener('click', closeIt);
    root.append(back, el);
    return { el, close: closeIt };
  }
  /** Commentaires : fils de discussion (compliments, questions, critiques…) ; Auguste défend Radia, ses réponses reçoivent des likes fictifs. */
  function openComments(clip: Clip, changed: () => void): void {
    const list = h('div.clp-comlist');
    const augAv = (): string => (hasPhotos() && photoUrlNow('head-new')) || canvasUrl('med:auguste:smile', () => medallionCanvas('auguste', { expr: 'smile' }, 120));
    const threads = buildThreads({ id: clip.id, topic: clip.topic, likes: clip.likes, mine: clip.mine }, commentsFor(clip.id, clip.topic));
    let replyTo: { id: string; by: string } | null = null;
    const input = h('input.clp-input', { type: 'text', maxLength: 120, placeholder: 'Ajouter un commentaire…', 'aria-label': 'Commentaire' }) as HTMLInputElement;
    const target = h('div.clp-target', { hidden: 'true' });
    const setReply = (m: ThreadMsg | null) => {
      replyTo = m ? { id: m.id, by: m.by } : null;
      input.placeholder = m ? `Répondre à ${m.by === 'auguste' ? 'Auguste' : '@' + m.by}…` : 'Ajouter un commentaire…';
      target.textContent = '';
      if (m) { target.removeAttribute('hidden'); target.append(h('span', `Réponse à ${m.by === 'auguste' ? 'Auguste' : '@' + m.by}`), h('button.clp-x.dark', { 'aria-label': 'Annuler la réponse', on: { click: tap(() => setReply(null), { sound: false }) } }, ico('close', 14))); input.focus(); } else target.setAttribute('hidden', 'true');
    };
    const nf = (n: number): string => n.toLocaleString('fr-FR');
    /** Les likes d'Auguste montent progressivement (sauf animations réduites). */
    const countUp = (el: HTMLElement, to: number): void => {
      if (reduced() || to < 30) { el.textContent = nf(to); return; }
      const t0 = performance.now(); const dur = Math.min(1100, 450 + to * 0.35);
      const step = (now: number) => { const k = Math.min(1, (now - t0) / dur); el.textContent = nf(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    const msgEl = (m: ThreadMsg, isReply: boolean, animate: boolean): HTMLElement => {
      const isA = m.by === 'auguste';
      const av = isA ? h('img.clp-cav.aug', { src: augAv(), alt: 'Auguste' }) : h('span.clp-cav', { style: `--h:${hash(m.by) % 360}` }, m.by.slice(0, 1).toUpperCase());
      const liked = st.msgLiked.includes(m.id);
      const count = h('b', animate && isA ? '0' : nf(m.likes + (liked ? 1 : 0)));
      const heart = h(`button.clp-mh${liked ? '.on' : ''}`, { 'aria-label': 'Aimer ce commentaire' }, ico('heart', 15), count);
      heart.addEventListener('click', tap(() => { const on = toggleMsgLike(st, m.id); persist(); heart.classList.toggle('on', on); count.textContent = nf(m.likes + (on ? 1 : 0)); if (on) { tick('heart'); const r = heart.getBoundingClientRect(); heartBurst(root, r.left + 8, r.top, 3); } }, { sound: false }));
      if (animate && isA) countUp(count, m.likes + (liked ? 1 : 0));
      const who = isA ? h('b', 'Auguste', h('i.clp-badge', 'compte d\u2019Auguste')) : h('b', `@${m.by}`);
      const body = h('div.clp-cb', who, h('p', m.text), h('div.clp-meta', heart, isA || !isReply ? h('button.clp-rp', { on: { click: tap(() => setReply(m), { sound: false }) } }, 'Répondre') : null));
      const el = h(`div.clp-com${isReply ? '.rep' : ''}${isA ? '.augu' : ''}${m.viral ? '.viral' : ''}`, av, body);
      return el;
    };
    const fill = (animate = true) => {
      list.textContent = '';
      for (const t of st.comments[clip.id] ?? []) list.append(h('div.clp-com.me', h('span.clp-cav.me', 'R'), h('div', h('b', 'Radia'), h('p', t))));
      for (const th of threads) {
        const box = h('div.clp-th', msgEl(th.root, false, animate));
        for (const r of th.replies) {
          box.append(msgEl(r, true, animate));
          for (const mine of st.replies[r.id] ?? []) box.append(h('div.clp-com.rep.me', h('span.clp-cav.me', 'R'), h('div', h('b', 'Radia'), h('p', mine), r.by === 'auguste' ? h('small.clp-ah', '♥ Auguste a aimé') : null)));
        }
        for (const mine of st.replies[th.root.id] ?? []) box.append(h('div.clp-com.rep.me', h('span.clp-cav.me', 'R'), h('div', h('b', 'Radia'), h('p', mine))));
        list.append(box);
      }
    };
    fill(true);
    const send = () => {
      const text = input.value;
      if (replyTo) { if (addReply(st, replyTo.id, text)) { input.value = ''; persist(); setReply(null); fill(false); tick('pop1'); } return; }
      if (addComment(st, clip.id, text)) { input.value = ''; persist(); fill(false); list.scrollTop = 0; tick('pop1'); changed(); }
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    const chips = h('div.clp-chips', ...['Merci ♡', 'Trop gentil !', 'Haha, oui !', 'Je rougis…'].map((t) => h('button.clp-chip', { on: { click: tap(() => { input.value = replyTo?.by === 'auguste' ? ({ 'Merci ♡': 'Merci mon cœur ♡', 'Trop gentil !': 'Tu me défends trop bien !', 'Haha, oui !': 'T\u2019es bête 😂', 'Je rougis…': 'Je t\u2019aime ♡' } as Record<string, string>)[t] ?? t : t; send(); }, { sound: false }) } }, t)));
    sheet(`${fmtCount(clip.comments)} commentaires`, h('div.clp-sheet-b', list, target, chips, h('div.clp-send', input, h('button.clp-sendbtn', { 'aria-label': 'Envoyer', on: { click: tap(send, { sound: false }) } }, ico('send', 20)))));
  }
  function openShare(clip: Clip): void {
    const s = sheet('Partager', h('div.clp-sheet-b',
      h('p.clp-note', 'Tout reste dans le jeu : rien n’est envoyé sur de vrais réseaux.'),
      h('button.clp-opt', { on: { click: tap(() => { const rec = shareClipToAlbum(clip); s.close(); toast({ title: 'Enregistré dans l’album ♡', sub: `« ${rec.title} » est dans Photos souvenirs.` }); }, { sound: false }) } }, ico('image', 22), h('span', h('b', 'Enregistrer dans l’album'), h('small', 'Une photo souvenir, visible dans le téléphone'))),
      h('button.clp-opt', { on: { click: tap(() => { const rec = shareClipToAlbum(clip); postStory([rec.id], clip.caption.slice(0, 60), 'clip'); s.close(); toast({ title: 'Story publiée ♡', sub: 'Retrouve-la dans Snapchien.' }); }, { sound: false }) } }, ico('camera', 22), h('span', h('b', 'Raconter en story'), h('small', 'Dans Snapchien, avec réactions'))),
      h('button.clp-opt.ghost', { on: { click: tap(() => s.close(), { sound: false }) } }, h('span', h('b', 'Annuler')))));
  }

  // ---------------- publier un souvenir (photo de Snap) et moments proposés
  function doPublish(prop: Proposal, kind: string, pendingId?: string): void {
    const r = publishClip(prop, kind, pendingId);
    celebrate(r.fans, r.invited);
    refreshPending(); render();
  }
  function celebrate(fans: number, invited: boolean): void {
    tick('reward'); haptic('reward');
    const r = root.getBoundingClientRect();
    heartBurst(heartHost, r.width / 2, r.height * 0.45, 12);
    toast({ title: 'Publié dans TikTak ♡', sub: fans > 0 ? `+${fans} fans (fictifs)` : 'Tes fans du jour sont déjà au rendez-vous, reviens demain ♡' });
    if (invited) window.setTimeout(() => toast({ title: 'Message d’Auguste', sub: 'Il a vu ta vidéo… regarde ton téléphone ♡', ms: 3200 }), 1400);
  }
  function openComposer(): void {
    const snaps = snapState().photos.slice().reverse();
    let chosen = st.drafts.length && snaps.some((p) => p.id === st.drafts[st.drafts.length - 1].photo) ? st.drafts[st.drafts.length - 1].photo : '';
    let caption = chosen ? st.drafts[st.drafts.length - 1].caption : '';
    const grid = h('div.clp-pgrid');
    const cap = h('input.clp-input', { type: 'text', maxLength: 100, placeholder: 'Une légende (facultatif)', 'aria-label': 'Légende' }) as HTMLInputElement;
    cap.value = caption;
    const go = h('button.btn.clp-go', 'Publier dans TikTak') as HTMLButtonElement;
    const sync = () => { go.disabled = !chosen; for (const b of grid.querySelectorAll('button')) b.classList.toggle('on', (b as HTMLElement).dataset.id === chosen); };
    for (const p of snaps.slice(0, 18)) {
      const rec = photoById(p.id); if (!rec) continue;
      const th = renderPhoto(rec, 160); th.className = 'clp-pth';
      const b = h('button.clp-pcell', { 'data-id': p.id, on: { click: tap(() => { chosen = p.id; sync(); }, { sound: false }) } }, th);
      grid.append(b);
    }
    const chips = h('div.clp-chips', ...['Un petit souvenir ♡', 'Ma soirée préférée', 'Look du jour', 'Coucou vous !'].map((t) => h('button.clp-chip', { on: { click: tap(() => { cap.value = t; }, { sound: false }) } }, t)));
    const empty = h('div.clp-empty', h('p', 'Pas encore de photo ! Prends-en une dans Snapchien, puis reviens la publier ici.'), h('button.btn.secondary', { on: { click: tap(() => { s.close(); close(); void import('../snap/ui').then((m) => m.openSnap('camera')); }, { sound: false }) } }, 'Ouvrir Snapchien'));
    const s = sheet('Publier un souvenir', h('div.clp-sheet-b', ...(snaps.length ? [h('p.clp-note', 'Choisis une photo de ton album Snapchien :'), grid, cap, chips, go] : [empty])), () => {
      if (chosen && !published) { st.drafts = [{ photo: chosen, caption: cap.value.slice(0, 100), at: Date.now() }]; persist(); }
    });
    let published = false;
    go.addEventListener('click', () => {
      if (!chosen) return;
      published = true; st.drafts = [];
      const r = publishPhotoClip(chosen, cap.value, 'Un souvenir');
      s.close(); celebrate(r.fans, r.invited); render();
    });
    sync();
  }
  function openMoments(): void {
    const box = h('div.clp-sheet-b', h('p.clp-note', 'Des moments de ta carrière sont prêts. Rien n’est publié sans toi ♡'));
    const s = sheet('Moments à publier', box);
    for (const m of pend()) box.append(h('div.clp-mrow', h('div', h('b', m.title), h('small', 'Choisis ta vidéo')), h('button.btn.small', { on: { click: tap(() => { s.close(); window.setTimeout(() => openChooser(m), 240); }, { sound: false }) } }, 'Publier'), h('button.btn.small.secondary', { on: { click: tap(() => { clipsOfferClosed(m.id); s.close(); refreshPending(); }, { sound: false }) } }, 'Ignorer')));
    if (!pend().length) box.append(h('p.clp-empty', 'Rien à publier pour le moment.'));
  }
  /** Choix entre 3 versions animées du moment, puis publication. */
  function openChooser(m: Pending): void {
    const props = proposalsFor(m);
    let sel = 0; const prevs: PostView[] = [];
    const wrap = h('div.clp-choices');
    const cap = h('input.clp-input', { type: 'text', maxLength: 120, 'aria-label': 'Légende' }) as HTMLInputElement;
    cap.value = props[0].caption;
    props.forEach((p, i) => {
      const cv = h('canvas.clp-pv') as HTMLCanvasElement;
      const cell = h('button.clp-choice', { 'aria-label': p.title, on: { click: tap(() => { sel = i; cap.value = props[i].caption; wrap.querySelectorAll('.clp-choice').forEach((c, j) => c.classList.toggle('on', j === i)); }, { sound: false }) } }, cv, h('span', p.title));
      if (i === 0) cell.classList.add('on');
      wrap.append(cell);
      const clip = genLike(p, i);
      const pv = new PostView(clip, cell, cv); prevs.push(pv);
    });
    const go = h('button.btn.clp-go', `Publier dans TikTak`);
    const s = sheet(m.title, h('div.clp-sheet-b', h('p.clp-note', 'Choisis la version que tu préfères :'), wrap, cap, go), () => { cancelAnimationFrame(pr); });
    let pr = 0; const t0 = performance.now();
    const animate = (now: number) => { pr = requestAnimationFrame(animate); if (reduced()) { if (now - t0 < 200) prevs.forEach((v) => v.paint(1.2)); return; } prevs.forEach((v) => v.paint((now - t0) / 1000)); };
    pr = requestAnimationFrame(animate);
    go.addEventListener('click', () => { const p = { ...props[sel], caption: cap.value.trim() || props[sel].caption }; s.close(); doPublish(p, m.kind, m.id); });
  }
  const genLike = (p: Proposal, i: number): Clip => ({ id: `pv${i}`, tpl: 'pv', topic: p.topic, by: 'radia', name: 'Radia', hue: 335, title: p.title, caption: p.caption, tags: p.tags, sound: '', scene: p.scene, dur: 4, likes: 0, comments: 0 });

  // ---------------- profil
  function buildProfile(): HTMLElement {
    const now = Date.now();
    const tot = profileTotals(st, now);
    const left = fansLeftToday(st, now);
    const grid = h('div.clp-pg');
    const mine = st.mine.slice().reverse();
    for (const p of mine) {
      const cell = h('button.clp-pcell2', { 'aria-label': p.title, on: { click: tap(() => openMine(p.id), { sound: false }) } });
      const cv = h('canvas.clp-thumb') as HTMLCanvasElement; cell.append(cv, h('span', `♥ ${fmtCount(likesOf(p, now, isLiked(st, p.id)))}`));
      grid.append(cell);
      const pv = new PostView(mineToClip(p, now), cell, cv); pv.cv.width = 144; pv.cv.height = 256; pv.dpr = 0.5;
      cellsToPaint.push(pv);
    }
    const prof = h('div.clp-profile',
      h('div.clp-pcover'),
      h('div.clp-phead', h('span.clp-pav', radiaFaceCanvas('smile', 140)), h('h2', 'Radia'), h('small', '@radia · compte fictif du jeu')),
      h('div.clp-stats', h('div', h('b', fmtCount(tot.posts)), h('small', 'publications')), h('div', h('b', fmtCount(tot.likes)), h('small', 'j’aime')), h('div', h('b', fmtCount(worldFans())), h('small', 'fans'))),
      h('div.clp-daily', h('small', `Fans gagnés aujourd’hui : ${DAILY_FAN_CAP - left} / ${DAILY_FAN_CAP}`), h('i', h('b', { style: `width:${Math.round(((DAILY_FAN_CAP - left) / DAILY_FAN_CAP) * 100)}%` }))),
      h('div.clp-prow', h('button.btn.small', { on: { click: tap(() => openComposer(), { sound: false }) } }, 'Publier un souvenir'), h('button.btn.small.secondary', { on: { click: tap(() => { close(); void import('../snap/ui').then((m) => m.openSnap('camera')); }, { sound: false }) } }, 'Prendre une photo')),
      mine.length ? grid : h('p.clp-empty', 'Aucune publication pour l’instant. Quand un moment de carrière arrive, tu pourras le publier ici ♡'));
    return prof;
  }
  const cellsToPaint: PostView[] = [];
  function openMine(id: string): void {
    const idx = st.mine.slice().reverse().findIndex((p) => p.id === id);
    const list = st.mine.slice().reverse().map((p) => mineToClip(p, Date.now(), isLiked(st, p.id)));
    tab = 'foryou'; showFeed(list.slice(Math.max(0, idx)), undefined, 'Mes publications');
  }
  function showFeed(clips: Clip[], more?: () => Clip[], label?: string): void {
    body.textContent = '';
    stopLoopKeep();
    const feed = buildFeed(clips, more);
    body.append(feed);
    if (label) body.append(h('button.clp-backchip', { on: { click: tap(() => render(), { sound: false }) } }, ico('back', 16), h('span', label)));
    startLoop();
    if (reduced()) root.classList.add('reduced');
  }
  const stopLoopKeep = () => { cellsToPaint.length = 0; };

  function render(): void {
    tabsEl.querySelectorAll('.clp-tab').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.tab === tab));
    refreshPending();
    root.classList.toggle('prof', tab === 'profile');
    if (tab === 'foryou') { genIdx = startIdx; mineIdx = 0; slot = 0; showFeed(Array.from({ length: 4 }, () => nextClip()), () => Array.from({ length: 5 }, () => nextClip())); }
    else if (tab === 'faves') {
      const clips = st.faved.slice().reverse().map((id) => clipById(id)).filter((c): c is Clip => !!c);
      if (!clips.length) { body.textContent = ''; stopLoopKeep(); active = null; body.append(h('div.clp-emptyfull', ico('bookmark', 54), h('p', 'Tes favoris apparaîtront ici ♡'), h('small', 'Touche le marque-page sur un clip que tu veux revoir.'))); }
      else showFeed(clips);
    } else {
      body.textContent = ''; active = null; stopLoopKeep();
      const prof = buildProfile(); body.append(prof);
      for (const pv of cellsToPaint) pv.paint(pv.clip.dur * 0.45);
    }
  }
  render();
  if (opts.moment) { const m = pend().find((x) => x.id === opts.moment); if (m) window.setTimeout(() => openChooser(m), 350); }
  window.setTimeout(() => { if (tab === 'foryou' && !st.mine.length && !st.liked.length) toast({ title: 'Double toucher = cœur ♡', sub: 'Glisse vers le haut pour la suite.', ms: 2600 }); }, 700);
}
