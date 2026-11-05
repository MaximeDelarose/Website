/**
 * « Personnaliser Radia » : aperçu en direct + sections (Maquillage, Voile, Mes maquillages). La TÊTE de Radia est une référence unique :
 * ni peau, ni forme du visage, ni yeux, sourcils, nez, bouche ou cheveux ne se modifient ici. Le maquillage est une surcouche légère.
 * Un BROUILLON est modifié ; « Appliquer » l'enregistre dans la sauvegarde, « Annuler » rétablit exactement l'état précédent.
 */
import './faceStudio.css';
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { save } from '../../../core/app';
import { haptic } from '../../../core/haptics';
import { world } from '../../../core/world';
import { drawAvatar } from '../../../game/art/world/avatar';
import { radiaBustCanvas } from '../../../game/art/world/radiaNow';
import { setFaceCustom } from '../../../game/art/characters';
import { applySavedFace } from '../../../game/world/look';
import { makeCanvas } from '../../../game/art/kit';
import {
  BLUSH_COLORS, LIP_COLORS, SHADOW_COLORS, VEIL_COLORS, VEIL_STYLES, defaultFace, faceKey, sanitizeFace, type FaceCustom,
} from '../../../data/world/face';

type Tab = 'makeup' | 'veil' | 'saved';
const TABS: [Tab, string][] = [['makeup', 'Maquillage'], ['veil', 'Voile'], ['saved', 'Mes maquillages']];
const clone = (f: FaceCustom): FaceCustom => sanitizeFace(JSON.parse(JSON.stringify(f)));

let busy = false;

export function openFaceStudio(): Promise<void> {
  if (busy) return Promise.resolve();
  busy = true;
  return new Promise<void>((resolve) => {
    const wd = world().wardrobe;
    const startFace = clone(wd.face);
    let draft = clone(wd.face);
    let tab: Tab = 'makeup';
    let full = false;
    let raf = 0;
    let finished = false;

    const preview = h('div.fs-preview');
    const panel = h('div.fs-panel');
    const tabsEl = h('nav.fs-tabs', { role: 'tablist', 'aria-label': 'Sections' });
    const dirty = (): boolean => faceKey(draft) !== faceKey(startFace);

    // ---------------------------------------------------------------- aperçu en direct
    function drawPreview() {
      raf = 0;
      setFaceCustom(draft); // les dessins (cache compris) suivent le brouillon
      const look = { ...wd.look };
      preview.replaceChildren();
      const w = Math.min(360, (ui.root.clientWidth || 393) - 40);
      if (full) {
        const hh = Math.round(w * 1.25); const ww = Math.round(hh * 0.4);
        const c = makeCanvas(ww * 2, hh * 2); c.style.cssText = `width:${ww}px;height:${hh}px`;
        drawAvatar(c.getContext('2d')!, look, c.width, c.height, { expr: 'smile' });
        preview.append(c);
      } else {
        // buste net : on dessine l'avatar du brouillon puis on recadre sur le visage et les épaules
        const src = makeCanvas(480, 1200);
        drawAvatar(src.getContext('2d')!, look, 480, 1200, { expr: 'smile' });
        const ow = w * 2, oh = Math.round(ow * 0.74);
        const c = makeCanvas(ow, oh); c.style.cssText = `width:${w}px;height:${Math.round(oh / 2)}px`;
        const k = 2; // 480/240
        c.getContext('2d')!.drawImage(src, 14 * k, 18 * k, 212 * k, 157 * k, 0, 0, ow, oh);
        preview.append(c);
      }
      void radiaBustCanvas;
    }
    const refresh = () => { if (!raf) raf = requestAnimationFrame(drawPreview); };
    const change = (fn: () => void) => { fn(); haptic('select'); refresh(); renderPanel(false); };

    // ---------------------------------------------------------------- briques d'interface
    const chips = <T extends string>(list: readonly { id: T; name: string }[], cur: T, set: (v: T) => void): HTMLElement =>
      h('div.fs-chips', ...list.map((o) => h(`button.fs-chip${o.id === cur ? '.on' : ''}`, { 'aria-pressed': String(o.id === cur), on: { click: tap(() => change(() => set(o.id)), { sound: false }) } }, o.name)));
    const swatches = (cols: readonly string[], cur: string, set: (v: string) => void, label: string, allowNone = ''): HTMLElement =>
      h('div.fs-sw', { role: 'group', 'aria-label': label }, ...cols.map((c) => h(`button.fs-swatch${c === cur ? '.on' : ''}${c === '' ? '.none' : ''}`, { 'aria-label': `${label} ${c || allowNone || 'aucun'}`, 'aria-pressed': String(c === cur), style: c ? `background:${c}` : '', on: { click: tap(() => change(() => set(c)), { sound: false }) } }, c === '' ? '∅' : '')));
    const slider = (label: string, v: number, set: (n: number) => void, min = -1, lo = '−', hi = '+'): HTMLElement => {
      const out = h('b.fs-val', String(Math.round(v * 100)));
      const inp = h('input', { type: 'range', min: String(min * 100), max: '100', step: '5', value: String(Math.round(v * 100)), 'aria-label': label }) as HTMLInputElement;
      inp.addEventListener('input', () => { set(Number(inp.value) / 100); out.textContent = inp.value; refresh(); });
      inp.addEventListener('change', () => haptic('select'));
      return h('label.fs-slider', h('span.fs-lbl', label, out), h('div.fs-rng', h('small', lo), inp, h('small', hi)));
    };
    const toggle = (label: string, on: boolean, set: (v: boolean) => void): HTMLElement =>
      h(`button.fs-toggle${on ? '.on' : ''}`, { role: 'switch', 'aria-checked': String(on), on: { click: tap(() => change(() => set(!on)), { sound: false }) } }, h('span', label), h('i'));
    const sec = (t: string, ...kids: (Node | null)[]): HTMLElement => h('section.fs-sec', h('h4', t), ...kids.filter((k): k is Node => !!k));

    // ---------------------------------------------------------------- sections
    function renderPanel(scrollTop = true) {
      const keep = panel.scrollTop;
      panel.replaceChildren();
      const put = (...k: (Node | null)[]): void => panel.append(...(k.filter((x): x is Node => !!x)));
      const d = draft;
      switch (tab) {
        case 'veil':
          put(sec('Voile / foulard', chips(VEIL_STYLES, d.veil.style, (v) => { d.veil.style = v; })),
            d.veil.style !== 'none' ? sec('Couleur', swatches(VEIL_COLORS, d.veil.color, (v) => { d.veil.color = v; }, 'Couleur du voile')) : null,
            d.veil.style !== 'none' && d.veil.style !== 'silk' ? sec('Style', toggle('Version plus élégante', d.veil.elegant || d.veil.style === 'elegant', (v) => { d.veil.elegant = v; })) : null,
            d.veil.style !== 'none' ? h('p.fs-note', 'Le voile remplace les cheveux tant qu’il est porté.') : null);
          break;
        case 'makeup':
          put(h('p.fs-note', 'Le maquillage se pose en léger par-dessus le visage de Radia : sa tête ne change jamais ♡'),
            sec('Eye-liner', chips([{ id: 'wing', name: 'Naturel (d’origine)' }, { id: 'bold', name: 'Appuyé' }] as const, d.makeup.liner === 'bold' ? 'bold' : 'wing', (v) => { d.makeup.liner = v; })),
            sec('Fard à paupières', swatches(SHADOW_COLORS, d.makeup.shadow, (v) => { d.makeup.shadow = v; }, 'Fard à paupières', 'aucun')),
            sec('Blush', slider('Blush ajouté', d.makeup.blush, (n) => { d.makeup.blush = n; }, 0, 'Naturel', 'Plus marqué'), swatches(BLUSH_COLORS, d.makeup.blushColor, (v) => { d.makeup.blushColor = v; }, 'Couleur du blush')),
            sec('Rouge à lèvres & gloss', swatches(LIP_COLORS, d.mouth.lip, (v) => { d.mouth.lip = v; d.makeup.lipstick = true; }, 'Couleur du rouge à lèvres')));
          break;
        case 'saved': {
          const slots = h('div.fs-slots');
          wd.faces.forEach((f, i) => {
            const mini = makeCanvas(120, 90); mini.className = 'fs-mini';
            const prev = draft;
            try { setFaceCustom(f ? f.face : defaultFace()); const src = makeCanvas(240, 600); drawAvatar(src.getContext('2d')!, { ...wd.look }, 240, 600, { expr: 'smile' }); mini.getContext('2d')!.drawImage(src, 14, 18, 212, 157, 0, 0, 120, 90); } finally { setFaceCustom(prev); }
            const row = h('div.fs-slot', mini, h('div.fs-slot-t', h('b', f ? f.name : `Emplacement ${i + 1}`), h('small', f ? 'Maquillage enregistré' : 'Vide')),
              h('div.fs-slot-a',
                ...(f ? [h('button.btn.small.secondary', { 'aria-label': `Charger ${f.name}`, on: { click: tap(() => change(() => { draft = clone(f.face); }), { sound: false }) } }, 'Charger')] : []),
                h('button.btn.small', { 'aria-label': f ? `Remplacer ${f.name}` : `Enregistrer dans l’emplacement ${i + 1}`, on: { click: tap(() => { wd.faces[i] = { name: f?.name ?? `Mon maquillage ${i + 1}`, face: clone(draft) }; save.save(); ui.toast({ title: 'Maquillage enregistré ♡', sub: wd.faces[i]!.name, icon: 'heart', ms: 2200 }); renderPanel(false); }, { sound: false }) } }, f ? 'Remplacer' : 'Enregistrer'),
                ...(f ? [h('button.btn.small.secondary', { 'aria-label': `Supprimer ${f.name}`, on: { click: tap(async () => { if (await ui.confirm('Supprimer ce maquillage ?', 'Seul l’emplacement est vidé : ton maquillage actuel ne change pas.', 'Supprimer', 'Garder')) { wd.faces[i] = null; save.save(); renderPanel(false); } }, { sound: false }) } }, '✕')] : [])));
            slots.append(row);
          });
          put(sec('Mes maquillages enregistrés', h('p.fs-note', 'Enregistre ton maquillage actuel dans un emplacement pour le retrouver plus tard.'), slots));
          break;
        }
      }
      panel.scrollTop = scrollTop ? 0 : keep;
      for (const t of tabsEl.children) t.classList.toggle('on', (t as HTMLElement).dataset.tab === tab);
    }
    for (const [id, label] of TABS) tabsEl.append(h('button.fs-tab', { role: 'tab', 'data-tab': id, on: { click: tap(() => { tab = id; renderPanel(true); }, { sound: false }) } }, label));

    // ---------------------------------------------------------------- fin : appliquer / annuler
    function end(apply: boolean) {
      if (finished) return; finished = true;
      if (apply) {
        wd.face = clone(draft);
        save.save(); applySavedFace();
        haptic('reward');
        ui.toast({ title: 'Radia est mise à jour ♡', sub: 'Ton maquillage apparaît partout', icon: 'heart', ms: 2600 });
      } else applySavedFace(); // rétablit exactement le visage enregistré
      cancelAnimationFrame(raf);
      ui.closeScreen(); busy = false; resolve();
    }
    async function leave() {
      if (dirty() && !(await ui.confirm('Quitter sans appliquer ?', 'Tes changements ne seront pas enregistrés.', 'Quitter', 'Continuer'))) return;
      end(false);
    }
    const viewBtns = h('div.fs-view', h('button.fs-chip.on', { 'aria-pressed': 'true', on: { click: tap((e) => { full = false; (e.currentTarget as HTMLElement).classList.add('on'); (e.currentTarget as HTMLElement).nextElementSibling?.classList.remove('on'); drawPreview(); }, { sound: false }) } }, 'Visage'),
      h('button.fs-chip', { 'aria-pressed': 'false', on: { click: tap((e) => { full = true; (e.currentTarget as HTMLElement).classList.add('on'); (e.currentTarget as HTMLElement).previousElementSibling?.classList.remove('on'); drawPreview(); }, { sound: false }) } }, 'Corps entier'));
    const actions = h('div.fs-actions',
      h('button.btn.secondary', { on: { click: tap(() => void leave(), { sound: false }) } }, 'Annuler'),
      h('button.btn.secondary', { 'aria-label': 'Remettre le maquillage d’origine', on: { click: tap(async () => { if (await ui.confirm('Remettre le maquillage d’origine ?', 'Les réglages du brouillon sont remis à zéro (rien n’est appliqué avant « Appliquer »).', 'Réinitialiser', 'Garder')) { draft = defaultFace(); refresh(); renderPanel(false); } }, { sound: false }) } }, 'Origine'),
      h('button.btn', { on: { click: tap(() => end(true)) } }, 'Appliquer ♡'));
    const scr = h('div.screen.bg-soft.fs-screen', ui.header('Personnaliser Radia ♡', () => void leave()), h('div.fs-body', preview, viewBtns, tabsEl, panel), actions);
    ui.showScreen(scr);
    renderPanel(true); drawPreview();
  });
}
