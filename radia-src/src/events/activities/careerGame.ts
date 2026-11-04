/**
 * Événements de carrière : réutilise les vrais mini-jeux de carrière (photo, défilé, casting, chant).
 * La séance compte comme une séance normale (expérience, fans, paliers) ; la récompense de
 * l'événement est versée à part par le lanceur d'événements.
 */
import { ui } from '../../ui/ui';
import { save, audio, events } from '../../core/app';
import { world } from '../../core/world';
import { stat } from '../../core/progress';
import { wallet } from '../../core/wallet';
import { currentLook } from '../../game/world/look';
import { difficultyFor, levelOf, recordSession, wantedTag } from '../../game/world/careers';
import { lookIsOwned } from '../../game/world/careerGames/model';
import { grantFans } from '../../ui/screens/world/fans';
import { announceMoment } from '../../ui/screens/world/career/session';
import { playPhoto } from '../../ui/screens/world/careerGames/photo';
import { playModel } from '../../ui/screens/world/careerGames/model';
import { playActress } from '../../ui/screens/world/careerGames/actress';
import { playSinger } from '../../ui/screens/world/careerGames/singer';
import type { GameCtx, GameResult } from '../../ui/screens/world/careerGames/shared';
import type { CareerId } from '../../data/world/ids';
import type { Activity } from '../types';

const PLAY: Record<CareerId, (g: GameCtx) => Promise<GameResult | null>> = { photo: playPhoto, model: playModel, actress: playActress, singer: playSinger };

const activity: Activity = async (ctx) => {
  const id = (['photo', 'model', 'actress', 'singer'].includes(String(ctx.params.career)) ? ctx.params.career : 'photo') as CareerId;
  const w = world();
  const owned = w.wardrobe.owned.slice();
  let look = currentLook();
  if (!lookIsOwned(look, owned)) look = { ...look, top: null, bottom: null, dress: null, jacket: null, shoes: null, bag: null, acc: [], crown: null };
  const gctx: GameCtx = { career: id, difficulty: difficultyFor(levelOf(w, id)), look, owned, wanted: wantedTag(w, id) };
  const res = await PLAY[id](gctx);
  ui.closeScreen(); // le mini-jeu est un écran à part : on rend la main à l'événement
  if (!res) return { score: 0, ok: false };
  const out = recordSession(w, id, { score: res.score, tags: res.tags, combo: res.combo });
  if (out.outside.diamonds) wallet.giveDiamonds(out.outside.diamonds);
  if (out.outside.energy) wallet.giveEnergy(out.outside.energy);
  stat('world.career.session');
  if (out.levelUp) stat('world.career.levelUp');
  grantFans(out.outside.fans);
  announceMoment(id, out.score, out.outside.fans);
  save.save();
  events.emit('economy', undefined);
  audio.play('reward');
  return { score: res.score, ok: res.score >= 40, data: { career: id }, tags: res.tags };
};
export default activity;
