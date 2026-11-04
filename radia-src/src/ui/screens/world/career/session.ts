/**
 * Une séance de carrière de bout en bout : jeu, enregistrement (XP, paliers,
 * récompenses), bonus (pièces, tenue), fans, « moment » annoncé au téléphone.
 * Utilisé par la page Carrière ; les invitations (events/activities/careerGame)
 * réutilisent `announceMoment`.
 */
import { save, events } from '../../../../core/app';
import { stat } from '../../../../core/progress';
import { wallet } from '../../../../core/wallet';
import { world } from '../../../../core/world';
import { currentLook } from '../../../../game/world/look';
import { difficultyFor, levelOf, objectiveProgress, recordSession, wantedTag, type SessionOutcome } from '../../../../game/world/careers';
import { lookIsOwned } from '../../../../game/world/careerGames/model';
import { mulberry32 } from '../../../../game/world/careerGames/rng';
import { emitMoment } from '../../../../apps/moments';
import type { CareerId } from '../../../../data/world/ids';
import { grantFans } from '../fans';
import { playPhoto } from '../careerGames/photo';
import { playModel } from '../careerGames/model';
import { playActress } from '../careerGames/actress';
import { playSinger } from '../careerGames/singer';
import type { GameCtx, GameResult } from '../careerGames/shared';
import { momentFor, sessionBonus, stepFatigue, type Bonus } from './logic';

const PLAY: Record<CareerId, (g: GameCtx) => Promise<GameResult | null>> = { photo: playPhoto, model: playModel, actress: playActress, singer: playSinger };

export interface SessionDone {
  id: CareerId; res: GameResult; out: SessionOutcome; bonus: Bonus;
  fanRes: ReturnType<typeof grantFans>;
  /** Avancement de l'objectif avant la séance (pour animer la barre). */
  before: { have: number; need: number; xp: number; xpNeed: number; level: number };
}

/** Contexte de jeu : la tenue non possédée est retirée (jamais d'objet fantôme). */
export function gameContext(id: CareerId): GameCtx {
  const w = world();
  const owned = w.wardrobe.owned.slice();
  let look = currentLook();
  if (!lookIsOwned(look, owned)) look = { ...look, top: null, bottom: null, dress: null, jacket: null, shoes: null, bag: null, acc: [], crown: null };
  return { career: id, difficulty: difficultyFor(levelOf(w, id)), look, owned, wanted: wantedTag(w, id) };
}

/** Annonce le souvenir à RADIA Snap / Clips (rien n'est publié sans la joueuse). */
export function announceMoment(id: CareerId, score: number, fans: number): void {
  try {
    emitMoment(momentFor(id, score, fans));
    const c = save.data.fun.apps.career;
    c.moments = (c.moments ?? 0) + 1; // compteur libre (utile aux tests et aux statistiques)
  } catch { /* jamais bloquant */ }
}

/** Lance le mini-jeu ; renvoie null si la joueuse quitte. */
export async function runSession(id: CareerId): Promise<SessionDone | null> {
  const res = await PLAY[id](gameContext(id));
  if (!res) return null;
  const w = world();
  const pv = objectiveProgress(w, id);
  const before = { have: pv.have, need: pv.need, xp: pv.xpHave, xpNeed: pv.xpNeed, level: pv.level };
  const out = recordSession(w, id, { score: res.score, tags: res.tags, combo: res.combo });
  if (out.outside.diamonds) wallet.giveDiamonds(out.outside.diamonds);
  if (out.outside.energy) wallet.giveEnergy(out.outside.energy);
  const fatigue = stepFatigue(save.data.fun.apps.career, Date.now());
  const bonus = sessionBonus(w, id, { score: out.score, level: out.level }, mulberry32((Date.now() ^ (out.xpTotal * 7919)) >>> 0), fatigue);
  stat('world.career.session');
  if (out.levelUp) stat('world.career.levelUp');
  for (let i = 0; i < out.newMagazines.length; i++) stat('world.career.magazine');
  const fanRes = grantFans(out.outside.fans + bonus.fans);
  const c = save.data.fun.apps.career;
  c[`done.${id}`] = (c[`done.${id}`] ?? 0) + 1;
  save.save();
  events.emit('economy', undefined);
  announceMoment(id, out.score, out.outside.fans + bonus.fans);
  return { id, res, out, bonus, fanRes, before };
}
