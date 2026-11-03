/**
 * Éléments communs des mini-jeux familiaux : écran de jeu, fin de partie
 * (étoiles, récompenses réelles, record), scène « Auguste » éventuelle.
 */
import { h } from '../../../dom';
import { ui } from '../../../ui';
import { icon } from '../../../icons';
import { save, audio, events, reducedFx } from '../../../../core/app';
import { addHearts, stat } from '../../../../core/progress';
import { wallet } from '../../../../core/wallet';
import { world, firstTime } from '../../../../core/world';
import { applyReward, allKidsBondAtLeast, recordGame, rewardFor, type Reward } from '../../../../game/world/family';
import { reactAuguste } from '../../../../game/world/auguste';
import { FURNITURE_LABEL, GAME_INFO, MOTHER_SCENE_LINES, type FamilyGameId } from '../../../../data/world/family';
import { CHOC_NAMES, type ChocId, type KidId } from '../../../../data/world/ids';
import { kidName } from '../../../../core/family';
import { playLines } from '../../../components/Dialogue';

export interface Outcome { game: FamilyGameId; who: KidId | 'all'; score: number; stars: 1 | 2 | 3; made?: ChocId[] }

/** Écran d'un mini-jeu : en-tête, consigne d'une phrase, zone de jeu. */
export function gameShell(game: FamilyGameId, who: KidId | 'all', onBack: () => void): { scr: HTMLElement; info: HTMLElement; stage: HTMLElement } {
  const info = h('div.fg-info');
  const stage = h('div.fg-stage');
  const sub = who === 'all' ? 'En famille' : kidName(who);
  const scr = h(`div.bg-soft.fg-screen.fg-${game}`,
    ui.header(GAME_INFO[game].title, onBack),
    h('div.fg-rule', h('b', sub), ' · ', GAME_INFO[game].rule),
    info, stage);
  ui.showScreen(scr);
  return { scr, info, stage };
}

/** Texte flottant (score, bravo…) dans un conteneur positionné. */
export function floatFx(parent: HTMLElement, text: string, cls: string, x: number, y: number): void {
  const el = h('span', { class: `fg-fx ${cls}`, style: `left:${x}px;top:${y}px` }, text);
  parent.append(el);
  window.setTimeout(() => el.remove(), 1300);
}

const rewardLines = (r: Reward): string[] => {
  const l: string[] = [];
  if (r.coins) l.push(`+${r.coins} pièces`);
  if (r.hearts) l.push(`+${r.hearts} cœur${r.hearts > 1 ? 's' : ''}`);
  if (r.flowers) l.push(`+${r.flowers} fleurs`);
  if (r.cocoa) l.push(`+${r.cocoa} cacao`);
  if (r.diamonds) l.push(`+${r.diamonds} diamant${r.diamonds > 1 ? 's' : ''}`);
  if (r.furniture) l.push(`Déco : ${FURNITURE_LABEL[r.furniture] ?? r.furniture}`);
  if (r.box) l.push('+1 coffret de chocolats');
  for (const c of r.newChocs) l.push(`Nouveau : ${CHOC_NAMES[c]}`);
  return l;
};

/**
 * Fin de partie : enregistre le score, crédite RÉELLEMENT les récompenses
 * (pièces/fleurs/cacao/meubles/coffrets via le monde, cœurs et diamants via leurs
 * modules), puis propose de rejouer. Renvoie le choix de la joueuse.
 */
export async function finishGame(o: Outcome): Promise<'again' | 'back'> {
  const w = world();
  const reward = rewardFor(o.game, o.stars, Math.random);
  const rec = recordGame(w, o.who, o.game, o.score, o.stars);
  applyReward(w, reward, o.made ?? []);
  if (reward.hearts) addHearts(reward.hearts);
  if (reward.diamonds) wallet.giveDiamonds(reward.diamonds);
  save.save();
  events.emit('economy', undefined);
  stat('world.family.game');
  audio.play(o.stars >= 3 ? 'victory' : 'reward');

  const stars = h('div.fg-stars', ...[1, 2, 3].map((i) => h(`span.fg-star${i <= o.stars ? '.on' : ''}`, { style: `animation-delay:${0.25 * i}s` }, icon('star', 44))));
  const lines = rewardLines(reward);
  const body = h('div.fg-result',
    stars,
    h('div.fg-score', `Score : ${o.score}`),
    rec.newBest ? h('div.fg-best', 'Nouveau meilleur score !') : null,
    h('div.fg-rewards', ...lines.map((t, i) => h('span.chip.fg-reward', { style: `animation-delay:${0.5 + i * 0.12}s` }, t))),
    rec.levelUp ? h('div.fg-bond', 'Votre complicité grandit ♡') : null,
  );
  const v = await ui.modal({ title: o.stars >= 3 ? 'Magnifique !' : o.stars === 2 ? 'Bravo !' : 'Joli travail !', body, actions: [{ label: 'Rejouer', value: 'again', style: 'lavande' }, { label: 'Retour', value: 'back' }], dismissible: false, row: true });
  if (!reducedFx()) audio.play('sparkle');
  reactAuguste('kidGame', 0.45);
  await maybeMotherScene();
  return v === 'again' ? 'again' : 'back';
}

/** Une seule fois : quand les trois enfants ont une complicité ≥ 3. */
export async function maybeMotherScene(): Promise<void> {
  if (!allKidsBondAtLeast(world(), 3)) return;
  if (!firstTime('scene.family.mother')) return;
  await playLines(MOTHER_SCENE_LINES.map((l) => ({ who: 'auguste' as const, expr: 'love' as const, text: l.text })), undefined, { skippable: false });
}
