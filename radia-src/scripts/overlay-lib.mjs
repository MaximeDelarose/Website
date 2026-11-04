// Logique PURE du contrôle des superpositions (aucun accès au DOM) : testée par tests/overlay-logic.test.ts,
// utilisée par scripts/overlay-check.mjs, qui lui passe des descriptions d'éléments relevées dans la page.

/** Seuils d'un calque « plein écran » : ≥ 90 % de la largeur ET ≥ 50 % de la hauteur de la fenêtre. */
export const FULL_W = 0.9;
export const FULL_H = 0.5;

/** Opacité (0..1) d'une couleur CSS ; « transparent » = 0 ; formats inconnus = 1 (prudence). */
export function colorAlpha(c) {
  const s = String(c ?? '').trim().toLowerCase();
  if (!s || s === 'transparent') return 0;
  let m = s.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean);
    if (p.length < 4) return 1;
    const a = p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3]);
    return Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1;
  }
  m = s.match(/^(?:hsla?|color|lab|lch|oklab|oklch)\(([^)]+)\)$/);
  if (m) {
    const slash = m[1].split('/');
    if (slash.length === 2) { const a = slash[1].trim(); const v = a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; }
    const p = m[1].split(/[,\s]+/).filter(Boolean);
    if (/^hsla/.test(s) && p.length >= 4) { const v = parseFloat(p[3]); return Number.isFinite(v) ? v : 1; }
    return 1;
  }
  m = s.match(/^#([0-9a-f]{8}|[0-9a-f]{4})$/);
  if (m) { const h = m[1]; return h.length === 8 ? parseInt(h.slice(6), 16) / 255 : parseInt(h[3] + h[3], 16) / 255; }
  return 1;
}

/** Le fond de l'élément assombrit-il ou masque-t-il quelque chose ? (couleur alpha>0, image/dégradé, flou d'arrière-plan) */
export function hasPaint(n) {
  return colorAlpha(n.bg) > 0 || (!!n.bgImage && n.bgImage !== 'none') || (!!n.backdrop && n.backdrop !== 'none');
}

/** Part de la fenêtre couverte par le rectangle (après découpe aux bords de la fenêtre). */
export function coverage(r, vw, vh) {
  const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
  const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  return { w: vw ? w / vw : 0, h: vh ? h / vh : 0 };
}
export const isFullscreen = (r, vw, vh) => { const c = coverage(r, vw, vh); return c.w >= FULL_W && c.h >= FULL_H; };

/** Visible : affiché, non masqué, opacité perceptible. */
export const isVisible = (n) => n.display !== 'none' && n.visibility !== 'hidden' && n.opacity > 0.02;

/** Vrai si l'élément fait partie des calques attendus à cet instant (par jeton de classe ou par id). */
export function isAllowed(n, allow) {
  if (!allow || !allow.length) return false;
  // un calque attendu autorise aussi son contenu (ex. .dy-card dans .dy-back) : `anc` = classes des ancêtres
  const toks = new Set(`${n.cls ?? ''} ${n.anc ?? ''}`.split(/\s+/).filter(Boolean));
  return allow.some((a) => (a.startsWith('#') ? n.id === a.slice(1) : a.startsWith('.') ? toks.has(a.slice(1)) : n.tag === a));
}

/**
 * Classe un élément plein écran :
 *  - « blocker »  : visible, peint, intercepte le toucher et se trouve au-dessus de l'interface (sans être attendu) ;
 *  - « ghost »    : intercepte le toucher mais invisible (opacité ≈ 0) alors qu'il couvre l'écran ;
 *  - « dimmer »   : ne capte pas le toucher mais garde un fond non transparent (assombrissement résiduel) ;
 *  - null         : sans problème.
 * `n` : { tag,id,cls, rect, display, visibility, opacity, pe, bg, bgImage, backdrop, onTop }
 */
export function classify(n, vw, vh, allow = []) {
  if (!isFullscreen(n.rect, vw, vh)) return null;
  if (isAllowed(n, allow)) return null;
  if (n.display === 'none') return null;
  const paint = hasPaint(n);
  if (n.pe !== 'none') {
    if (n.visibility === 'hidden') return null;
    if (n.opacity <= 0.02) return n.onTop ? 'ghost' : null;
    if (paint && n.onTop) return 'blocker';
    return null;
  }
  if (paint && isVisible(n)) return 'dimmer';
  return null;
}

/** Anomalies d'état global (luminosité, défilement, classes de masquage laissées en place). */
export function globalIssues(g) {
  const out = [];
  for (const e of g.roots ?? []) {
    if (e.opacity < 0.99) out.push(`${e.name} : opacité ${e.opacity}`);
    if (e.filter && e.filter !== 'none') out.push(`${e.name} : filtre « ${e.filter} »`);
    if (e.pe === 'none' && e.name !== '#ui' && e.name !== '#game') out.push(`${e.name} : pointer-events:none`);
    if (e.name === '#game' && e.pe === 'none') out.push('#game : pointer-events:none');
    if (e.visibility === 'hidden' || e.display === 'none') out.push(`${e.name} : masqué`);
  }
  if (g.bodyStyle) out.push(`body : style en ligne « ${g.bodyStyle} »`);
  if (g.rootClass && /\bev-active\b/.test(g.rootClass) && !g.eventExpected) out.push('#ui garde la classe ev-active');
  if ((g.underCount ?? 0) > 0 && !g.eventExpected) out.push(`${g.underCount} élément(s) ev-under restent masqués`);
  if (g.canvasFilter && g.canvasFilter !== 'none') out.push(`canvas : filtre « ${g.canvasFilter} »`);
  return out;
}

/** Éléments en train de quitter qui traînent (classe leaving/out) alors que l'écran est stabilisé. */
export function leftovers(nodes) {
  return nodes.filter((n) => /(^|\s)(leaving|out)(\s|$)/.test(n.cls ?? '') && n.display !== 'none').map((n) => n.sel);
}

/** Rapport lisible d'un point de contrôle. */
export function formatReport(label, findings) {
  if (!findings.length) return `OK  ${label}`;
  return [`KO  ${label}`, ...findings.map((f) => `      - ${f}`)].join('\n');
}

/** Description courte d'un élément (pour les rapports). */
export function describe(n) {
  const c = String(n.cls ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 3).map((x) => '.' + x).join('');
  return `${n.tag}${n.id ? '#' + n.id : ''}${c}`;
}

/** Évalue un point de contrôle complet et rend la liste des problèmes (chaînes). */
export function evaluate({ vw, vh, nodes, globals, allow = [], settled = true }) {
  const f = [];
  for (const n of nodes) {
    const k = classify(n, vw, vh, allow);
    const pct = `${Math.round(coverage(n.rect, vw, vh).w * 100)}×${Math.round(coverage(n.rect, vw, vh).h * 100)} %`;
    const z = n.z && n.z !== 'auto' ? ` z=${n.z}` : '';
    if (k === 'blocker') f.push(`calque plein écran opaque au-dessus de l'interface : ${describe(n)} (${pct}${z}, fond ${n.bg}${n.bgImage !== 'none' ? ' + image' : ''}${n.backdrop !== 'none' ? ' + flou' : ''}, toucher actif)`);
    else if (k === 'ghost') f.push(`calque invisible qui bloque le toucher : ${describe(n)} (${pct}${z})`);
    else if (k === 'dimmer') f.push(`assombrissement résiduel (toucher traversant mais fond non transparent) : ${describe(n)} (${pct}${z}, fond ${n.bg}${n.bgImage !== 'none' ? ' + image' : ''}${n.backdrop !== 'none' ? ' + flou' : ''})`);
  }
  if (settled) for (const s of leftovers(nodes)) f.push(`élément « leaving/out » resté après stabilisation : ${s}`);
  if (globals) f.push(...globalIssues(globals));
  return f;
}

/**
 * Collisions de noms de classes CSS : une classe « simple » (sélecteur `.nom` seul, sans parent ni état) déclarée dans PLUSIEURS
 * feuilles avec des propriétés différentes finit par mélanger deux composants (cause du bug `.fx-layer`).
 * `files` : [{ path, css }]. Rend [{ cls, defs: [{ path, body }] }] pour les classes définies dans ≥ 2 feuilles.
 */
export function findCssCollisions(files) {
  const map = new Map();
  for (const f of files) {
    let t = String(f.css).replace(/\/\*[\s\S]*?\*\//g, '');
    // on ignore les blocs @media/@supports/@keyframes (états responsives de la même règle)
    t = t.replace(/@(media|supports|keyframes|-webkit-keyframes)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    for (const m of t.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const sel of m[1].split(',')) {
        const mm = sel.trim().match(/^\.([A-Za-z_][\w-]*)$/);
        if (!mm) continue;
        const body = m[2].replace(/\s+/g, ' ').trim();
        if (!map.has(mm[1])) map.set(mm[1], []);
        map.get(mm[1]).push({ path: f.path, body });
      }
    }
  }
  const out = [];
  for (const [cls, defs] of map) {
    if (new Set(defs.map((d) => d.path)).size > 1) out.push({ cls, defs });
  }
  return out.sort((a, b) => a.cls.localeCompare(b.cls));
}

/** Paires de rectangles qui se chevauchent de plus de `tol` px dans les DEUX sens (les simples contacts de bord sont ignorés). */
export function overlappingPairs(items, tol = 2) {
  const out = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i].rect, b = items[j].rect;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > tol && h > tol) out.push([items[i].name, items[j].name, Math.round(w), Math.round(h)]);
    }
  }
  return out;
}

/** Éléments hors de la fenêtre (même partiellement, au-delà de `tol` px) ou dont la zone tactile est inférieure à `min` px. */
export function layoutIssues(items, vw, vh, { min = 44, tol = 1 } = {}) {
  const out = [];
  for (const it of items) {
    const r = it.rect;
    if (r.left < -tol || r.top < -tol || r.right > vw + tol || r.bottom > vh + tol) out.push(`hors de l'écran : ${it.name} (${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)})`);
    if (it.touch && (it.hit?.w ?? r.right - r.left) < min - 0.5) out.push(`zone tactile trop étroite : ${it.name} (${Math.round(it.hit?.w ?? r.right - r.left)} px < ${min})`);
    if (it.touch && (it.hit?.h ?? r.bottom - r.top) < min - 0.5) out.push(`zone tactile trop basse : ${it.name} (${Math.round(it.hit?.h ?? r.bottom - r.top)} px < ${min})`);
  }
  return out;
}

/** Éléments (texte) qui dépassent d'une boîte (feuille, fenêtre) à gauche/droite de plus de `tol` px : texte coupé ou débordant. */
export function outsideBox(items, box, tol = 1) {
  return items.filter((it) => it.rect.left < box.left - tol || it.rect.right > box.right + tol).map((it) => `${it.name} dépasse de la boîte (${Math.round(it.rect.left)}→${Math.round(it.rect.right)} pour ${Math.round(box.left)}→${Math.round(box.right)})`);
}
