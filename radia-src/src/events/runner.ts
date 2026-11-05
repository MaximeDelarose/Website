/**
 * Lanceur d'événements : déroule les étapes (dressing → trajet → activité → dialogues → photo),
 * sauvegarde la progression à chaque étape (reprise possible), verse la récompense UNE fois,
 * puis rend la main au mode d'origine (fusion ou Mon monde) exactement comme elle l'avait laissé.
 */
import { h, tap } from '../ui/dom';
import { ui } from '../ui/ui';
import { icon } from '../ui/icons';
import { audio, save, game as getGame, reducedFx } from '../core/app';
import { stat, checkAchievements } from '../core/progress';
import { createCtx } from './ctx';
import { loadActivity } from './registry';
import { eventById } from './data';
import { mountStage, type StageView } from './ui/stageView';
import { grantReward, type RewardOutcome } from './rewards';
import { recordDone, setInviteState } from './manager';
import { ev, nextId } from './api';
import { showConclusion } from './ui/conclusion';
import type { ActiveRun, ActivityResult, EventDef, EventStep, PlaceId } from './types';
import type { ClothId } from '../data/world/ids';

let layer: HTMLElement | null = null;
let running = false;

export const isEventRunning = (): boolean => running;

/** Mode d'origine : on le met en pause et on le retrouve à la fin. */
function captureOrigin(): { mode: ActiveRun['origin']['mode']; restore: () => void } {
  let mode: ActiveRun['origin']['mode'] = 'title';
  let resumeMerge = false;
  const g = (() => { try { return getGame(); } catch { return null; } })();
  const merge = g?.scene.getScene('merge');
  if (merge && merge.sys.isActive()) { mode = 'merge'; resumeMerge = true; g!.scene.pause('merge'); }
  const prev = ui.screen;
  if (!resumeMerge && prev) { mode = 'world'; prev.classList.add('ev-under'); } // l'écran d'origine reste masqué pendant l'événement
  return {
    mode,
    restore: () => {
      if (resumeMerge) { try { g!.scene.resume('merge'); } catch { /* ignoré */ } }
      prev?.classList.remove('ev-under');
      if (prev && prev.dataset.closed === '1') {
        // l'écran a été rendu au plateau pendant l'événement : ne jamais le rétablir (il recouvrirait la grille)
      } else if (prev && !prev.isConnected) {
        prev.classList.remove('leaving');
        prev.style.pointerEvents = '';
        ui.showScreen(prev);
      } else if (prev && ui.screen !== prev) {
        prev.classList.remove('leaving');
        prev.style.pointerEvents = '';
        ui.showScreen(prev);
      }
    },
  };
}

const stepLabel = (s: EventStep): string => (s.t === 'dress' ? 'Tenue' : s.t === 'travel' ? 'Trajet' : s.t === 'scene' ? 'Moment' : s.t === 'photo' ? 'Photo' : 'Jeu');

/** Démarre (ou reprend) un événement. Renvoie quand il est terminé ou quitté. */
export async function startEvent(def: EventDef, runId: string, resume?: ActiveRun): Promise<'done' | 'quit'> {
  if (running) return 'quit';
  running = true;
  const st = ev();
  const origin = captureOrigin();
  const run: ActiveRun = resume ?? { runId, eventId: def.id, step: 0, data: {}, origin: { mode: origin.mode }, startedAt: Date.now() };
  if (!def.ephemeral) { st.current = run; setInviteState(st, run.runId, 'seen'); } // une scène « revue » n'est jamais enregistrée comme activité en cours
  save.save();

  let alive = true;
  let stage: StageView | null = null;
  const root = h('div.ev-layer');
  layer = root;
  const body = h('div.ev-body');
  const title = h('h2', def.title);
  const dots = h('div.ev-dots', ...def.steps.map((s) => h('i', { title: stepLabel(s) })));
  // quête en plusieurs phases : indicateur clair (étapes terminées, en cours, objectif)
  const phaseOf = (i: number): number => { let p = 0; (def.phases ?? []).forEach((ph, k) => { if (i >= ph.from) p = k; }); return p; };
  const phaseBar = def.phases ? h('div.ev-phases', ...def.phases.map((ph, k) => h('div.ev-ph', h('i', String(k + 1)), h('small', ph.label)))) : null;
  const goal = def.phases ? h('div.ev-goal') : null;
  let quitting = false;
  const quitBtn = h('button.icon-btn', { 'aria-label': 'Quitter l’événement' }, icon('close'));
  root.append(h('div.ev-top', quitBtn, title, h('div', { style: 'width:44px' })), phaseBar ?? dots);
  if (goal) root.append(goal);
  root.append(body);
  ui.root.append(root);
  ui.root.classList.add('ev-active');
  audio.play('whoosh');

  const setDots = (i: number) => {
    [...dots.children].forEach((d, k) => { d.className = k < i ? 'on' : k === i ? 'cur' : ''; });
    if (phaseBar && def.phases) {
      const cur = phaseOf(i);
      [...phaseBar.children].forEach((d, k) => { d.className = `ev-ph${k < cur ? ' done' : k === cur ? ' cur' : ''}`; (d.firstChild as HTMLElement).textContent = k < cur ? '✓' : String(k + 1); });
      if (goal) goal.textContent = `Objectif : ${def.phases[cur].goal}`;
    }
  };
  const clearBody = () => { stage?.dispose(); stage = null; root.classList.remove('stage'); body.textContent = ''; };
  const showStage = (place: PlaceId, opts: { auguste?: boolean; kids?: ActiveRun['data'] extends never ? never : import('../data/world/ids').KidId[]; walk?: boolean }) => {
    clearBody();
    root.classList.add('stage');
    stage = mountStage(body, place, opts, () => alive);
  };

  const quitPromise = new Promise<'quit'>((resolve) => {
    quitBtn.addEventListener('click', tap(async () => {
      if (quitting) return;
      quitting = true;
      const ok = await ui.confirm('Quitter l’événement ?', 'Pas de souci : tu pourras le reprendre depuis ton téléphone ♡', 'Quitter', 'Continuer');
      quitting = false;
      if (ok) resolve('quit');
    }));
  });

  let lastPlace: PlaceId = 'home';
  const withAuguste = def.sender === 'auguste' || def.category === 'romantic' || def.category === 'golden';

  const play = async (): Promise<'done'> => {
    for (let i = run.step; i < def.steps.length; i++) {
      if (!alive) break;
      run.step = i;
      setDots(i);
      save.save();
      const s = def.steps[i];
      const repeatNow = st.done[def.id]?.count ?? 0;
      const mkCtx = (params: Record<string, unknown>) => createCtx({ root: body, eventId: def.id, runId: run.runId, params, data: run.data, repeat: st.done[def.id]?.count ?? 0, alive: () => alive });
      if (s.t === 'dress') {
        const { openDressing } = await import('../ui/screens/world/dressing');
        await openDressing({ title: 'Ta tenue ♡', hint: s.hint, cta: 'Je suis prête ♡', mood: s.mood });
        ui.closeScreen();
        audio.play('sparkle');
      } else if (s.t === 'travel') {
        lastPlace = s.place;
        showStage(s.place, { auguste: withAuguste, walk: true, kids: undefined });
        body.append(h('div.ev-travel', h('b', s.label)), h('div.ev-skip', 'Touche pour passer'));
        audio.play('whoosh');
        await new Promise<void>((res) => {
          let done = false;
          const end = () => { if (!done) { done = true; res(); } };
          body.addEventListener('click', end, { once: true });
          window.setTimeout(end, reducedFx() ? 900 : 2600);
        });
      } else if (s.t === 'scene') {
        const kids = [...new Set(s.lines.map((l) => l.who).filter((w) => w === 'kid1' || w === 'kid2' || w === 'kid3'))] as import('../data/world/ids').KidId[];
        showStage(lastPlace, { auguste: withAuguste && !kids.length, walk: false, kids });
        const { ctx, dispose } = mkCtx({});
        try { for (const l of s.lines) { if (!alive) break; await ctx.say(l.who, l.text, l.expr); } } finally { dispose(); }
      } else if (s.t === 'activity') {
        clearBody();
        const { ctx, dispose } = mkCtx({ ...(s.params ?? {}), ...(s.id === 'braceletReveal' ? { replay: repeatNow > 0 } : {}) });
        try {
          // test automatisé uniquement (window.__EV_FAST) : saute le mini-jeu, le reste de l'événement se déroule normalement
          const fast = (window as unknown as { __EV_FAST?: boolean }).__EV_FAST === true;
          const opts = (s.params?.options as string[] | undefined) ?? [];
          const res: ActivityResult = fast
            ? { score: 80, ok: true, data: s.id === 'shopTry' ? { pick: opts[0] } : s.id === 'menuPick' ? { menu: 'restaurant', starter: 'burrata', main: 'truffe', dessert: 'tiramisu' } : s.id === 'guessMenu' ? { perfect: false, hits: 1 } : {} }
            : await (await loadActivity(s.id))(ctx);
          run.data[s.id] = { ...(res.data ?? {}), score: res.score, ok: res.ok };
          if (typeof res.score === 'number') run.data[`${s.id}#score`] = res.score;
        } finally { dispose(); }
      } else if (s.t === 'photo') {
        clearBody();
        const { ctx, dispose } = mkCtx({ place: s.place, title: s.title, withAuguste: s.withAuguste ?? false, withKids: s.withKids ?? [] });
        try {
          const act = await loadActivity('photoBooth');
          const res = await act(ctx);
          run.data.photo = { ...(res.data ?? {}) };
        } finally { dispose(); }
      }
    }
    return 'done';
  };

  const cleanup = () => {
    alive = false;
    stage?.dispose();
    root.classList.add('out');
    window.setTimeout(() => root.remove(), 260);
    ui.root.classList.remove('ev-active');
    layer = null;
    running = false;
  };

  let outcome: 'done' | 'quit';
  try {
    outcome = await Promise.race([play(), quitPromise]);
  } catch (e) {
    console.error('Événement interrompu', e);
    outcome = 'quit';
  }

  if (outcome === 'quit' && def.ephemeral) { cleanup(); origin.restore(); return 'quit'; }
  if (outcome === 'quit') {
    // suspendu : l'activité reste dans le téléphone (« Reprendre »), rien n'est perdu ni versé
    cleanup();
    origin.restore();
    save.save();
    return 'quit';
  }

  if (def.ephemeral) { // scène revue : rien n'est versé ni enregistré
    st.current = null;
    save.save();
    cleanup();
    origin.restore();
    return 'done';
  }

  // ---- fin : récompense unique, souvenir, succès
  const times = st.done[def.id]?.count ?? 0;
  const scores = Object.entries(run.data).filter(([k]) => k.endsWith('#score')).map(([, v]) => Number(v));
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 100;
  const pick = (run.data.shopTry as { pick?: string } | undefined)?.pick;
  const extra: ClothId[] = pick ? [pick as ClothId] : [];
  const reward: RewardOutcome = grantReward(def, run.runId, times, extra);
  // le bracelet : « Le porter » équipe, « Le garder » le laisse dans le dressing (jamais d'obligation)
  const br = run.data.braceletReveal as { equip?: boolean; replay?: boolean } | undefined;
  if (reward.cloth.includes('br-promise') && br?.equip) { try { const { equip } = await import('../game/world/wardrobe'); equip('br-promise'); } catch { /* ignoré */ } }
  const rec = recordDone(st, def.id, avg, Date.now());
  setInviteState(st, run.runId, 'done');
  st.current = null;
  stat('events.done');
  if (def.category === 'family') stat('events.family');
  if (def.category === 'career') stat('events.career');
  const gm = run.data.guessMenu as { perfect?: boolean } | undefined;
  if (gm) {
    st.counters['restaurant.plays'] = (st.counters['restaurant.plays'] ?? 0) + 1;
    if (gm.perfect) st.counters['restaurant.perfect'] = (st.counters['restaurant.perfect'] ?? 0) + 1;
  }
  save.save();
  const photoId = (run.data.photo as { photoId?: string } | undefined)?.photoId;
  const photo = photoId ? st.photos.find((p) => p.id === photoId) : undefined;
  clearBody();
  await showConclusion(body, { def, reward, first: rec.first, photo, repeat: times });
  checkAchievements();
  cleanup();
  origin.restore();
  return 'done';
}

/** Crée l'identifiant d'une instance d'événement. */
export const newRunId = (): string => nextId('r');

/** Lance une invitation de la boîte de réception. */
export async function startInvite(runId: string): Promise<void> {
  const st = ev();
  const inv = st.inbox.find((i) => i.runId === runId);
  const def = inv ? eventById(inv.eventId) : undefined;
  if (!inv || !def || running) return;
  await startEvent(def, inv.runId);
}

/** Reprend l'activité interrompue, s'il y en a une. */
export async function resumeCurrent(): Promise<void> {
  const st = ev();
  const cur = st.current;
  const def = cur ? eventById(cur.eventId) : undefined;
  if (!cur || !def || running) return;
  await startEvent(def, cur.runId, cur);
}

/** Abandonne l'activité suspendue (le tour peut être rejoué plus tard ; rien n'est versé). */
export function abandonCurrent(): void {
  const st = ev();
  if (st.current) { setInviteState(st, st.current.runId, 'later'); st.current = null; save.save(); }
}
void layer;
