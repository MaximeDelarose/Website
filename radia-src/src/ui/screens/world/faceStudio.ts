/**
 * « Personnaliser Radia » : aperçu en direct + sections (Peau, Visage, Yeux, Sourcils, Nez, Bouche, Cheveux, Voile, Maquillage,
 * Mes visages). Un BROUILLON est modifié ; « Appliquer » l'enregistre dans la sauvegarde, « Annuler » rétablit exactement l'état précédent.
 * Rien n'est payant ni verrouillé ici (les coiffures possédées se choisissent ; les autres s'achètent au dressing).
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
import { HAIRS } from '../../../data/world/wardrobe';
import { HAIR_IDS, type HairId } from '../../../data/world/ids';
import { makeCanvas } from '../../../game/art/kit';
import {
  BLUSH_COLORS, BROW_COLORS, BROW_SHAPES, EYE_COLORS, EYE_SHAPES, FACE_SHAPES, HAIR_COLORS, LINER_STYLES, LIP_COLORS, MOUTH_SHAPES, NOSE_SHAPES,
  SHADOW_COLORS, SKIN_TONES, VEIL_COLORS, VEIL_STYLES, defaultFace, faceKey, sanitizeFace, skinPalette, type FaceCustom,
} from '../../../data/world/face';

type Tab = 'skin' | 'shape' | 'eyes' | 'brows' | 'nose' | 'mouth' | 'hair' | 'veil' | 'makeup' | 'saved';
const TABS: [Tab, string][] = [['skin', 'Peau'], ['shape', 'Visage'], ['eyes', 'Yeux'], ['brows', 'Sourcils'], ['nose', 'Nez'], ['mouth', 'Bouche'], ['hair', 'Cheveux'], ['veil', 'Voile'], ['makeup', 'Maquillage'], ['saved', 'Mes visages']];
const clone = (f: FaceCustom): FaceCustom => sanitizeFace(JSON.parse(JSON.stringify(f)));

let busy = false;

export function openFaceStudio(): Promise<void> {
  if (busy) return Promise.resolve();
  busy = true;
  return new Promise<void>((resolve) => {
    const wd = world().wardrobe;
    const startFace = clone(wd.face);
    const startHair: HairId = wd.look.hair;
    let draft = clone(wd.face);
    let hair: HairId = startHair;
    let tab: Tab = 'skin';
    let full = false;
    let raf = 0;
    let finished = false;

    const preview = h('div.fs-preview');
    const panel = h('div.fs-panel');
    const tabsEl = h('nav.fs-tabs', { role: 'tablist', 'aria-label': 'Sections' });
    const dirty = (): boolean => faceKey(draft) !== faceKey(startFace) || hair !== startHair;

    // ---------------------------------------------------------------- aperçu en direct
    function drawPreview() {
      raf = 0;
      setFaceCustom(draft); // les dessins (cache compris) suivent le brouillon
      const look = { ...wd.look, hair };
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
        case 'skin':
          put(
            sec('Teinte de peau', h('div.fs-sw.big', ...SKIN_TONES.map((t) => h(`button.fs-swatch${t.id === d.skin.tone ? '.on' : ''}`, { 'aria-label': t.name, 'aria-pressed': String(t.id === d.skin.tone), style: `background:${skinPalette({ tone: t.id, hue: 0, light: 0, sat: 0, warm: 0 }).base}`, on: { click: tap(() => change(() => { d.skin.tone = t.id; }), { sound: false }) } })))),
            sec('Réglages fins', slider('Teinte', d.skin.hue, (n) => { d.skin.hue = n; }), slider('Luminosité', d.skin.light, (n) => { d.skin.light = n; }, -1, 'Plus foncée', 'Plus claire'), slider('Saturation', d.skin.sat, (n) => { d.skin.sat = n; }, -1, 'Plus douce', 'Plus vive'), slider('Chaleur (sous-ton)', d.skin.warm, (n) => { d.skin.warm = n; }, -1, 'Rosé', 'Doré')));
          break;
        case 'shape': put(sec('Forme du visage', chips(FACE_SHAPES, d.shape, (v) => { d.shape = v; }))); break;
        case 'eyes':
          put(sec('Forme des yeux', chips(EYE_SHAPES, d.eyes.shape, (v) => { d.eyes.shape = v; })),
            sec('Proportions', slider('Taille', d.eyes.size, (n) => { d.eyes.size = n; }), slider('Écartement', d.eyes.spacing, (n) => { d.eyes.spacing = n; }, -1, 'Rapprochés', 'Écartés'), slider('Taille de l’iris', d.eyes.irisSize, (n) => { d.eyes.irisSize = n; })),
            sec('Couleur des yeux', swatches(EYE_COLORS, d.eyes.iris, (v) => { d.eyes.iris = v; }, 'Couleur des yeux')));
          break;
        case 'brows':
          put(sec('Forme des sourcils', chips(BROW_SHAPES, d.brows.shape, (v) => { d.brows.shape = v; })),
            sec('Réglages', slider('Épaisseur', d.brows.thick, (n) => { d.brows.thick = n; }), slider('Courbure', d.brows.curve, (n) => { d.brows.curve = n; }, -1, 'Plus droits', 'Plus arqués')),
            sec('Couleur', swatches(BROW_COLORS, d.brows.color, (v) => { d.brows.color = v; }, 'Couleur des sourcils')));
          break;
        case 'nose':
          put(sec('Forme du nez', chips(NOSE_SHAPES, d.nose.shape, (v) => { d.nose.shape = v; })),
            sec('Proportions', slider('Taille', d.nose.size, (n) => { d.nose.size = n; }), slider('Largeur', d.nose.width, (n) => { d.nose.width = n; }), slider('Longueur', d.nose.length, (n) => { d.nose.length = n; })));
          break;
        case 'mouth':
          put(sec('Forme de la bouche', chips(MOUTH_SHAPES, d.mouth.shape, (v) => { d.mouth.shape = v; })),
            sec('Lèvres', slider('Volume (plus fines ↔ plus pulpeuses)', d.mouth.fullness, (n) => { d.mouth.fullness = n; }), slider('Largeur du sourire', d.mouth.width, (n) => { d.mouth.width = n; })),
            sec('Rouge à lèvres', toggle('Rouge à lèvres', d.makeup.lipstick, (v) => { d.makeup.lipstick = v; }), d.makeup.lipstick ? swatches(LIP_COLORS, d.mouth.lip, (v) => { d.mouth.lip = v; }, 'Couleur des lèvres') : null));
          break;
        case 'hair': {
          const owned = new Set<string>(wd.hairOwned);
          put(sec('Couleur des cheveux', swatches(['', ...HAIR_COLORS], d.hairColor, (v) => { d.hairColor = v; }, 'Couleur des cheveux', 'couleur d’origine')),
            sec('Coiffure', h('div.fs-chips', ...HAIR_IDS.filter((id) => owned.has(id)).map((id) => h(`button.fs-chip${id === hair ? '.on' : ''}`, { 'aria-pressed': String(id === hair), on: { click: tap(() => change(() => { hair = id; }), { sound: false }) } }, HAIRS[id].name))),
              h('p.fs-note', 'D’autres coiffures se débloquent au dressing ♡')));
          break;
        }
        case 'veil':
          put(sec('Voile / foulard', chips(VEIL_STYLES, d.veil.style, (v) => { d.veil.style = v; })),
            d.veil.style !== 'none' ? sec('Couleur', swatches(VEIL_COLORS, d.veil.color, (v) => { d.veil.color = v; }, 'Couleur du voile')) : null,
            d.veil.style !== 'none' && d.veil.style !== 'silk' ? sec('Style', toggle('Version plus élégante', d.veil.elegant || d.veil.style === 'elegant', (v) => { d.veil.elegant = v; })) : null,
            d.veil.style !== 'none' ? h('p.fs-note', 'Le voile remplace les cheveux tant qu’il est porté.') : null);
          break;
        case 'makeup':
          put(sec('Eye-liner', chips(LINER_STYLES, d.makeup.liner, (v) => { d.makeup.liner = v; })),
            sec('Fard à paupières', swatches(SHADOW_COLORS, d.makeup.shadow, (v) => { d.makeup.shadow = v; }, 'Fard à paupières', 'aucun')),
            sec('Blush', slider('Intensité du blush', d.makeup.blush, (n) => { d.makeup.blush = n; }, 0), swatches(BLUSH_COLORS, d.makeup.blushColor, (v) => { d.makeup.blushColor = v; }, 'Couleur du blush')),
            sec('Mascara & style', slider('Mascara', d.makeup.mascara, (n) => { d.makeup.mascara = n; }, 0), slider('Style', d.makeup.intensity, (n) => { d.makeup.intensity = n; }, -1, 'Plus doux', 'Plus marqué')));
          break;
        case 'saved': {
          const slots = h('div.fs-slots');
          wd.faces.forEach((f, i) => {
            const mini = makeCanvas(120, 90); mini.className = 'fs-mini';
            const prev = draft;
            try { setFaceCustom(f ? f.face : defaultFace()); const src = makeCanvas(240, 600); drawAvatar(src.getContext('2d')!, { ...wd.look, hair }, 240, 600, { expr: 'smile' }); mini.getContext('2d')!.drawImage(src, 14, 18, 212, 157, 0, 0, 120, 90); } finally { setFaceCustom(prev); }
            const row = h('div.fs-slot', mini, h('div.fs-slot-t', h('b', f ? f.name : `Emplacement ${i + 1}`), h('small', f ? 'Visage enregistré' : 'Vide')),
              h('div.fs-slot-a',
                ...(f ? [h('button.btn.small.secondary', { 'aria-label': `Charger ${f.name}`, on: { click: tap(() => change(() => { draft = clone(f.face); }), { sound: false }) } }, 'Charger')] : []),
                h('button.btn.small', { 'aria-label': f ? `Remplacer ${f.name}` : `Enregistrer dans l’emplacement ${i + 1}`, on: { click: tap(() => { wd.faces[i] = { name: f?.name ?? `Mon visage ${i + 1}`, face: clone(draft) }; save.save(); ui.toast({ title: 'Visage enregistré ♡', sub: wd.faces[i]!.name, icon: 'heart', ms: 2200 }); renderPanel(false); }, { sound: false }) } }, f ? 'Remplacer' : 'Enregistrer'),
                ...(f ? [h('button.btn.small.secondary', { 'aria-label': `Supprimer ${f.name}`, on: { click: tap(async () => { if (await ui.confirm('Supprimer ce visage ?', 'Seul l’emplacement est vidé : ton visage actuel ne change pas.', 'Supprimer', 'Garder')) { wd.faces[i] = null; save.save(); renderPanel(false); } }, { sound: false }) } }, '✕')] : [])));
            slots.append(row);
          });
          put(sec('Mes visages enregistrés', h('p.fs-note', 'Enregistre ton visage actuel dans un emplacement pour le retrouver plus tard.'), slots));
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
        wd.face = clone(draft); wd.look.hair = hair;
        save.save(); applySavedFace();
        haptic('reward');
        ui.toast({ title: 'Radia est mise à jour ♡', sub: 'Ton nouveau visage apparaît partout', icon: 'heart', ms: 2600 });
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
      h('button.btn.secondary', { 'aria-label': 'Revenir au visage d’origine', on: { click: tap(async () => { if (await ui.confirm('Revenir au visage d’origine ?', 'Tous les réglages du brouillon sont remis à zéro (rien n’est appliqué avant « Appliquer »).', 'Réinitialiser', 'Garder')) { draft = defaultFace(); refresh(); renderPanel(false); } }, { sound: false }) } }, 'Origine'),
      h('button.btn', { on: { click: tap(() => end(true)) } }, 'Appliquer ♡'));
    const scr = h('div.screen.bg-soft.fs-screen', ui.header('Personnaliser Radia ♡', () => void leave()), h('div.fs-body', preview, viewBtns, tabsEl, panel), actions);
    ui.showScreen(scr);
    renderPanel(true); drawPreview();
  });
}
