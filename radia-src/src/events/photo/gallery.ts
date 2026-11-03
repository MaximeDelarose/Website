/** Galerie des photos souvenirs + visionneuse plein écran. */
import type { PhotoRec } from '../types';
import { renderPhoto, exportPng, drawPhoto, warmPhotos } from './render';
import { fmtDate } from './data';
import { ensurePhotoStyles } from './styles';
import { reducedFx } from '../../core/app';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Grille de vignettes (2 colonnes), plus récentes d'abord ; rendu paresseux au défilement. */
export function buildGallery(photos: PhotoRec[], opts: { onSelect?: (p: PhotoRec) => void } = {}): HTMLElement {
  ensurePhotoStyles();
  void warmPhotos();
  const root = el('div');
  if (!photos.length) {
    root.append(el('div', 'pg-empty', 'Pas encore de photo souvenir… Les invitations en font de jolies ♡'));
    return root;
  }
  const grid = el('div', 'pg-grid');
  root.append(grid);
  const list = [...photos].sort((a, b) => b.ts - a.ts);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const TW = Math.round(190 * dpr);
  const pending = new Map<Element, () => void>();
  const io = typeof IntersectionObserver !== 'undefined'
    ? new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { const f = pending.get(en.target); if (f) { pending.delete(en.target); io!.unobserve(en.target); f(); } }
    }, { rootMargin: '200px' })
    : null;
  for (const p of list) {
    const card = el('button', 'pg-card');
    card.type = 'button';
    const ph = el('canvas');
    ph.width = TW; ph.height = Math.round(TW * 1.25);
    const draw = (): void => {
      try { const src = renderPhoto(p, TW, Math.round(TW * 1.25), 0); ph.getContext('2d')!.drawImage(src, 0, 0); } catch { /* décor indisponible */ }
    };
    if (io) { pending.set(ph, draw); io.observe(ph); } else draw();
    card.append(ph, el('b', '', p.title), el('small', '', fmtDate(p.ts)));
    card.addEventListener('click', () => (opts.onSelect ? opts.onSelect(p) : openPhotoViewer(p)));
    grid.append(card);
  }
  // nettoyage quand la galerie quitte le DOM
  const mo = new MutationObserver(() => { if (!root.isConnected && grid.isConnected === false) { io?.disconnect(); mo.disconnect(); } });
  mo.observe(document.body, { childList: true, subtree: true });
  return root;
}

/** Visionneuse plein écran superposée (photo animée, titre, PNG, fermer). */
export function openPhotoViewer(photo: PhotoRec): void {
  ensurePhotoStyles();
  void warmPhotos();
  const host = document.getElementById('ui') ?? document.body;
  const back = el('div', 'pv-back');
  const box = el('div', 'pv-box');
  const cv = el('canvas');
  box.append(cv);
  const title = el('div', 'pv-title', photo.title);
  title.append(el('small', '', fmtDate(photo.ts)));
  const acts = el('div', 'pv-acts');
  const png = el('button', 'btn gold ev-btn', 'Enregistrer en PNG');
  const close = el('button', 'btn secondary ev-btn', 'Fermer');
  acts.append(png, close);
  back.append(box, title, acts);
  host.append(back);

  let raf = 0, alive = true, last = 0;
  const fit = (): void => {
    const bw = box.clientWidth || 360, bh = box.clientHeight || 450;
    const cw = Math.min(bw, bh * 0.8), dpr = Math.min(2, window.devicePixelRatio || 1);
    const pw = Math.round(cw * dpr), ph = Math.round(cw * 1.25 * dpr);
    if (cv.width !== pw) { cv.width = pw; cv.height = ph; }
    cv.style.width = `${Math.round(cw)}px`; cv.style.height = `${Math.round(cw * 1.25)}px`;
  };
  const frame = (now: number): void => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (now - last < 50 && !reducedFx()) return;
    last = now;
    fit();
    const g = cv.getContext('2d')!;
    g.clearRect(0, 0, cv.width, cv.height);
    drawPhoto(g, photo, cv.width, cv.height, reducedFx() ? 0 : now / 1000);
  };
  raf = requestAnimationFrame(frame);
  const end = (): void => { if (!alive) return; alive = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); back.remove(); };
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') end(); };
  window.addEventListener('keydown', onKey);
  close.addEventListener('click', end);
  back.addEventListener('click', (e) => { if (e.target === back || e.target === box) end(); });
  png.addEventListener('click', () => { png.disabled = true; void exportPng(photo).finally(() => { png.disabled = false; }); });
}
