/** Écrans du domaine : carte du domaine et écran d'un lieu (illustration au stade courant, objectifs, rénovation animée, services). */
import { h, tap } from '../ui/dom';
import { ui } from '../ui/ui';
import { icon } from '../ui/icons';
import { save, audio, events, reducedFx } from '../core/app';
import { haptic } from '../core/haptics';
import { fmt } from '../core/wallet';
import { resIconUrl } from '../game/art/world/resources';
import { canvasUrl, paint } from '../game/art/kit';
import { drawFurniture } from '../game/art/world/furniture';
import { FURNITURE } from '../data/world/furniture';
import { ROOMS } from '../data/world/rooms';
import { RES_NAMES, colorOf, PALETTE, type ClothId, type FurnitureId, type ResKind, type RoomId } from '../data/world/ids';
import { sparkleBurst, confetti, revealItem, RARITY_COLOR, type Rarity } from '../ui/fx/sparkle';
import { augusteSays } from '../ui/components/augusteSays';
import { PLACES, STAGES, type ChoiceDef, type Cost, type PlaceId, type Reward } from './places';
import * as L from './logic';
import { sceneCanvas, panoramaCanvas } from './art';

/** Remet un écran déjà construit au premier plan (il a pu être retiré par l'écran qui l'a remplacé). */
const reshow = (scr: HTMLElement): void => { scr.classList.remove('leaving'); scr.style.pointerEvents = ''; if (ui.screen !== scr || !scr.isConnected) ui.showScreen(scr); };
const ctx = (): L.Ctx => L.ctxOf(save.data);
const commit = (): void => { save.save(); events.emit('economy', undefined); };
const RES: ResKind[] = ['coins', 'flowers', 'fabric', 'cocoa'];

const colorsFor = (id: PlaceId, pending: Partial<Record<string, string>> = {}) => {
  const c = L.colorsOf(save.data.fun, id);
  return { wall: pending.wall || c.wall || undefined, cloth: pending.cloth || c.cloth || undefined, accent: pending.accent || c.accent || undefined };
};

function costChips(cost: Cost, have: (k: ResKind) => number): HTMLElement {
  const box = h('div.dm-cost');
  for (const k of RES) {
    const n = cost[k];
    if (!n) continue;
    box.append(h(`span.dm-chip${have(k) >= n ? '' : '.short'}`, h('img', { src: resIconUrl(k, 32), alt: RES_NAMES[k] }), h('b', `${fmt(have(k))}/${fmt(n)}`)));
  }
  return box;
}

// ------------------------------------------------------------------ récompenses (vignettes, « Équiper » / « Placer »)

const rarityOf = (r: Reward): Rarity => {
  if (r.t === 'furn') { const f = FURNITURE[r.id]; return f.price >= 400 ? 'epic' : f.price >= 250 ? 'rare' : f.price >= 120 ? 'uncommon' : 'common'; }
  if (r.t === 'cloth') return 'epic';
  return 'rare';
};
const furnThumb = (id: FurnitureId): string => canvasUrl(`dm:f:${id}`, () => { const f = FURNITURE[id]; return paint(f.w * 40, f.h * 40, 2, (c) => drawFurniture(c, id, f.w * 40, f.h * 40, colorOf(f.color))); });

async function clothThumb(id: ClothId): Promise<string> {
  try { return (await import('../ui/screens/world/dressing')).thumbUrl(id as never); } catch { return ''; }
}

export function rewardCard(r: Reward, g?: L.Granted): HTMLElement {
  const card = h('div.dm-rw', { style: `--rc:${RARITY_COLOR[rarityOf(r)]}` });
  const img = h('img', { alt: '', draggable: false });
  const art = h('div.dm-rw-art', img);
  if (r.t === 'furn') img.src = furnThumb(r.id);
  else if (r.t === 'cloth') void clothThumb(r.id).then((u) => { if (u) img.src = u; else art.replaceChildren(icon('hanger' as never, 28)); });
  else art.replaceChildren(icon(r.t === 'diamonds' ? 'gem' : r.t === 'flower' ? 'flower' : 'star', 30));
  card.append(art, h('span.dm-rw-n', L.describeReward(r)));
  if (g?.dup) card.append(h('small', g.coins ? `déjà possédé · +${g.coins} pièces` : 'déjà possédé'));
  return card;
}

async function placeFurniture(id: FurnitureId): Promise<void> {
  const room = FURNITURE[id].rooms.find((r) => save.data.world.castle.unlocked.includes(r) && ROOMS[r]) as RoomId | undefined;
  const m = await import('../ui/screens/world/castle');
  await m.openCastle(room);
}
async function equipCloth(id: ClothId): Promise<boolean> {
  const W = await import('../game/world/wardrobe');
  const ok = W.equip(id).ok;
  if (ok) { commit(); haptic('select'); }
  return ok;
}

/** Fenêtre « Tu as débloqué… » : apparition + rebond + paillettes + son + haptique, puis Équiper / Placer. */
function revealWindow(id: PlaceId, res: Extract<L.AdvanceResult, { ok: true }>): Promise<void> {
  return new Promise((resolve) => {
    const def = PLACES[id];
    const stageDef = def.stages[res.stage - 1];
    const calm = reducedFx();
    const grid = h('div.dm-rw-grid');
    const list = stageDef.rewards;
    const cards: HTMLElement[] = [];
    list.forEach((r, i) => {
      const g = res.granted[i];
      const card = rewardCard(r, g);
      if (g && !g.dup) {
        const act = h('div.dm-rw-act');
        if (r.t === 'cloth') { const b = h('button.btn.small.gold', 'Équiper'); b.addEventListener('click', tap(async () => { if (await equipCloth(r.id)) { b.textContent = 'Équipé ✓'; b.setAttribute('disabled', ''); } })); act.append(b); }
        if (r.t === 'furn') { const b = h('button.btn.small.lavande', 'Placer'); b.addEventListener('click', tap(() => { back.remove(); finish(); void placeFurniture(r.id); })); act.append(b); }
        if (act.childElementCount) card.append(act);
      }
      card.style.animationDelay = `${220 + i * 160}ms`;
      cards.push(card);
      grid.append(card);
    });
    const cont = h('button.btn.gold', res.opened ? 'Découvrir mon lieu ♡' : 'Continuer');
    const card = h('div.modal.panel.dm-reveal',
      h('h2', res.opened ? `${def.name} : ouvert !` : `Étape ${res.stage}/${STAGES} terminée`),
      h('p.dm-reveal-sub', res.opened ? def.openLine : stageDef.name),
      grid,
      h('div.actions', cont));
    const back = h('div.modal-backdrop.dm-back', card);
    let done = false;
    const finish = () => { if (done) return; done = true; resolve(); };
    cont.addEventListener('click', tap(() => { back.classList.add('leaving'); window.setTimeout(() => back.remove(), 180); finish(); }));
    ui.root.append(back);
    haptic('reward');
    audio.play('sparkle');
    window.setTimeout(() => {
      cards.forEach((c, i) => { window.setTimeout(() => { const r = c.getBoundingClientRect(); sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, { rarity: rarityOf(list[i]), count: calm ? 3 : 14 }); void revealItem(c.querySelector('.dm-rw-art')!, { rarity: rarityOf(list[i]), kind: list[i].t === 'furn' ? 'furniture' : list[i].t === 'cloth' ? 'dress' : 'item' }); }, i * 160); });
      if (res.opened) { const r = card.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + 40); haptic('chest'); }
    }, 260);
  });
}

// ------------------------------------------------------------------ écran d'un lieu

export function openPlace(id: PlaceId): Promise<void> {
  return new Promise((resolve) => {
    const def = PLACES[id];
    const calm = reducedFx();
    L.markSeen(save.data.fun, id);
    save.save();
    const pending: Partial<Record<string, string>> = {};
    let timer = 0;
    const body = h('div.screen-body.dm-body');
    const scr = h('div.bg-soft.dm-screen', ui.header(def.name, close), body);
    ui.showScreen(scr);

    function stageDots(stage: number): HTMLElement {
      return h('div.dm-dots', ...Array.from({ length: STAGES }, (_, i) => h(`i${i < stage ? '.on' : i === stage ? '.cur' : ''}`)));
    }

    async function doAdvance(btn: HTMLElement) {
      const res = L.advanceStage(ctx(), id);
      if (!res.ok) { haptic('error'); ui.toast({ title: 'Pas encore…', sub: failText(res.reason), icon: 'lock' }); return; }
      commit();
      delete pending.wall; delete pending.cloth; delete pending.accent;
      btn.setAttribute('disabled', '');
      const stage = body.querySelector('.dm-scene');
      stage?.classList.add('pop');
      render();
      await revealWindow(id, res);
      render();
    }
    const failText = (r: L.AdvanceFail): string => ({ free: 'Disponible avec le Mode libre', locked: 'Un prérequis manque', done: 'Déjà terminé', objectives: 'Termine d\'abord les objectifs', choice: 'Choisis ton style', cost: 'Il manque des ressources' }[r]);

    function choiceRow(ch: ChoiceDef, current: string | undefined): HTMLElement {
      const row = h('div.dm-choice', h('b', ch.q));
      const sw = h('div.dm-sw');
      for (const o of ch.options) {
        const name = PALETTE.find((p) => p.id === o)?.name ?? o;
        const b = h(`button.dm-swatch${current === o ? '.on' : ''}`, { 'aria-label': name, title: name, style: `--c:${colorOf(o)}` }, h('span', name));
        b.addEventListener('click', tap(() => { haptic('select'); L.choose(ctx(), id, ch.id, o); pending[ch.id] = o; save.save(); render(); }, { delay: 120 }));
        sw.append(b);
      }
      row.append(sw);
      return row;
    }

    function render(): void {
      window.clearInterval(timer);
      const c = ctx();
      const v = L.stageView(c, id);
      body.textContent = '';
      // illustration : stade courant, ou aperçu de l'étape suivante quand un style vient d'être choisi
      const previewing = v.status !== 'open' && v.choices.length > 0 && v.choices.some((ch) => pending[ch.id]);
      const cv = sceneCanvas(id, previewing ? Math.min(STAGES, v.stage + 1) : v.stage, colorsFor(id, pending));
      const scene = h('div.dm-scene', cv, previewing ? h('span.dm-pill', 'Aperçu de l\'étape suivante') : null, h('span.dm-stage', v.status === 'open' ? 'Ouvert ♡' : `${v.stage}/${STAGES}`));
      body.append(scene, stageDots(v.stage), h('p.dm-blurb', v.status === 'open' ? def.openLine : def.blurb));
      if (v.status === 'locked') {
        body.append(h('div.dm-card.lock', icon('lock', 22), h('div', h('b', 'Pas encore disponible'), h('small', !c.free ? 'Termine les cinq chapitres pour débloquer le Mode libre ♡' : v.unmet.map(L.reqLabel).join(' · ')))));
        for (const r of v.unmet) if (r.k === 'place') body.append(placeLink(r.id));
      }
      if (v.current) {
        const cur = v.current;
        body.append(h('div.dm-card', h('h3', `Étape ${cur.index + 1} · ${cur.name}`), h('p', cur.blurb)));
        // objectifs
        const list = h('div.dm-objs');
        for (const o of v.objs) {
          list.append(h(`div.dm-obj${o.done ? '.done' : ''}`, h('span.dm-chk', o.done ? '✓' : ''), h('div.dm-obj-t', h('span', o.label), h('div.dm-bar', h('i', { style: `width:${Math.round((o.have / o.need) * 100)}%` }))), h('b', o.unit === 'level' ? `niv. ${o.have}/${o.need}` : `${fmt(o.have)}/${fmt(o.need)}`)));
        }
        body.append(h('div.dm-card', h('h3', 'Objectifs'), list));
        for (const ch of v.choices) body.append(h('div.dm-card', choiceRow(ch, L.placeState(save.data.fun, id).choices[ch.id])));
        body.append(h('div.dm-card', h('h3', 'Coût'), costChips(cur.cost, (k) => c.world.res[k])));
        const rw = h('div.dm-rw-grid.small');
        for (const r of cur.rewards) rw.append(rewardCard(r));
        body.append(h('div.dm-card', h('h3', 'Récompenses'), rw));
        const verb = cur.index === STAGES - 1 ? 'Ouvrir le lieu' : cur.index === 0 ? 'Rénover' : cur.index === 1 ? 'Installer' : 'Décorer';
        const label = v.status === 'locked' ? 'Verrouillé' : v.choicesMissing.length ? 'Choisir un style' : !v.objsDone ? 'Objectifs en cours' : !v.afford ? 'Ressources manquantes' : `${verb} ♡`;
        const go = h(`button.btn.gold.wide.dm-go${v.ready ? '.ready' : ''}`, label);
        if (!v.ready) go.classList.add('wait');
        go.addEventListener('click', tap(() => { void doAdvance(go); }, { delay: 700 }));
        body.append(go);
      }
      if (v.status === 'open') {
        body.append(...openedBlock(v));
      }
      if (v.status !== 'open' && def.link?.early) body.append(linkBtn());
    }

    function placeLink(pid: PlaceId): HTMLElement {
      const b = h('button.btn.secondary.wide', `Voir : ${PLACES[pid].name}`);
      b.addEventListener('click', tap(() => { close(); void openPlace(pid); }));
      return b;
    }

    function linkBtn(): HTMLElement {
      const l = def.link!;
      const b = h('button.btn.lavande.wide', l.label);
      b.addEventListener('click', tap(() => void goLink(l.to)));
      return b;
    }

    async function goLink(to: NonNullable<typeof def.link>['to']) {
      if (to === 'casino') {
        await (await import('../casino')).openCasino();
        reshow(scr);
        return;
      }
      if (to === 'castle') await (await import('../ui/screens/world/castle')).openCastle();
      else if (to === 'garden') await (await import('../ui/screens/world/garden')).openGarden();
      else if (to === 'choc') await (await import('../ui/screens/world/chocolaterie')).openChocolaterie();
      else if (to === 'dressing') await (await import('../ui/screens/world/dressing')).openDressing();
      reshow(scr);
      render();
    }

    function openedBlock(v: L.StageView): HTMLElement[] {
      const out: HTMLElement[] = [];
      const svc = def.service;
      if (svc) {
        const card = h('div.dm-card.svc', h('h3', svc.title));
        const btns: { b: HTMLElement; sub: HTMLElement }[] = [];
        for (const o of svc.options) {
          const gain = h('div.dm-gain', ...RES.filter((k) => o.gain[k]).map((k) => h('span.dm-chip', h('img', { src: resIconUrl(k, 32), alt: RES_NAMES[k] }), h('b', `+${o.gain[k]}`))), o.hearts ? h('span.dm-chip', icon('heart', 14), h('b', `+${o.hearts}`)) : null);
          const sub = h('small');
          const b = h('button.dm-opt', h('b', o.name), h('span', o.desc), gain, sub);
          b.addEventListener('click', tap(() => {
            const r = L.claimService(ctx(), id, o.id, Date.now());
            if (!r.ok) { haptic('error'); return; }
            commit(); haptic('reward'); audio.play('sparkle');
            const rc = b.getBoundingClientRect(); sparkleBurst(rc.left + rc.width / 2, rc.top + rc.height / 2, { rarity: 'rare', count: calm ? 3 : 12 });
            augusteSays(o.line, 4200);
            render();
          }));
          btns.push({ b, sub });
          card.append(b);
        }
        const upd = () => {
          const w = L.serviceWaitMs(ctx(), id, Date.now());
          btns.forEach(({ b, sub }) => { b.toggleAttribute('disabled', w > 0); sub.textContent = w > 0 ? `Prochain service dans ${Math.ceil(w / 60000)} min` : svc.verb + ' ♡'; });
        };
        upd();
        timer = window.setInterval(() => { if (scr.isConnected) upd(); }, 15_000);
        out.push(card);
      }
      if (def.link) out.push(linkBtn());
      void v;
      return out;
    }

    render();
    function close() { window.clearInterval(timer); resolve(); }
  });
}

// ------------------------------------------------------------------ carte du domaine

export function openDomainMap(): Promise<void> {
  return new Promise((resolve) => {
    const body = h('div.screen-body.dm-body');
    const scr = h('div.bg-soft.dm-screen', ui.header('Carte du domaine', () => { off(); resolve(); }), body);
    ui.showScreen(scr);
    const off = events.on('economy', () => { if (scr.isConnected) render(); });
    function render(): void {
      const c = ctx();
      const nodes = L.mapNodes(c, Date.now());
      const sum = L.domainSummary(c, Date.now());
      body.textContent = '';
      body.append(h('div.dm-pano', panoramaCanvas(sum.open, sum.total), h('span.dm-pano-t', `${sum.open}/${sum.total} lieux ouverts`)));
      if (!c.free) body.append(h('div.dm-card.lock', icon('lock', 22), h('div', h('b', 'Les rénovations commencent avec le Mode libre'), h('small', 'Termine les cinq chapitres : l\'aventure continue ♡'))));
      const grid = h('div.dm-grid');
      for (const n of nodes) {
        const def = PLACES[n.id];
        const cv = sceneCanvas(n.id, n.stage, colorsFor(n.id));
        const card = h(`button.dm-node.${n.status}`, { style: `--tone:${def.tone}`, 'aria-label': `${def.name}. ${n.sub}. ${n.hint}` },
          h('div.dm-node-art', cv, n.status === 'locked' ? h('span.dm-lockv', icon('lock', 26)) : null, n.badge ? h(`span.dm-badge.b-${n.badge}`, n.badge === 'new' ? 'Nouveau' : n.badge === 'quest' ? 'Prêt !' : 'Récompense') : null),
          h('b', def.short), h('span.dm-state', n.sub), h('small', n.hint));
        card.addEventListener('click', tap(async () => { haptic('select'); await openPlace(n.id); reshow(scr); render(); }));
        grid.append(card);
      }
      body.append(grid);
    }
    render();
  });
}
