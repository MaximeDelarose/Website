/**
 * Moteur de l'histoire : joue les étapes de data/story.ts dans l'ordre et
 * mémorise la progression après chaque étape terminée.
 */
import { STORY, CHAPTERS, chapterAt, stepKey, reconcileStep, type StoryStep } from '../../data/story';
import { levelById } from '../../data/levels';
import { memoryById } from '../../data/memories';
import { save, audio } from '../../core/app';
import { checkAchievements, unlockMemory, stat, markMinigame } from '../../core/progress';
import { playDialogue } from '../../ui/components/Dialogue';
import { playLevel, objectiveText } from '../merge/playLevel';
import { setBackdrop, themeForChapter } from '../scenes/backdrop';
import { ui } from '../../ui/ui';
import { h, tap } from '../../ui/dom';
import { memoryImageUrl } from '../../ui/screens/album';
import { itemImageUrl } from '../merge/textures';
import { runTutorial } from './tutorial';
import type { LevelDef } from '../merge/types';
import { icon } from '../../ui/icons';

type StepResult = 'ok' | 'quit';

/** Tests automatiques de bout en bout uniquement (posé par le script de test). */
const autoTest = () => (window as unknown as { __RADIA_AUTO?: boolean }).__RADIA_AUTO === true;

export const storyFinished = () => save.data.story.step >= STORY.length;
export const chessUnlocked = () => save.data.memories.includes('royaume') || STORY.slice(0, save.data.story.step).some((s) => s.t === 'unlockChess');

let running = false;

/** Joue l'histoire depuis l'étape sauvegardée. Résout quand on revient au menu. */
export async function runStory(): Promise<void> {
  if (running) return;
  running = true;
  try {
    audio.playMusic();
    save.data.story.step = reconcileStep(save.data.story.step, save.data.story.stepKey);
    while (save.data.story.step < STORY.length) {
      const idx = save.data.story.step;
      const step = STORY[idx];
      setBackdrop(themeForChapter(chapterAt(idx)));
      const r = await runStep(step);
      if (r === 'quit') return;
      // garde : n'avance que si l'étape n'a pas déjà été franchie entre-temps
      if (save.data.story.step === idx) {
        save.data.story.step = idx + 1;
        save.data.story.stepKey = idx + 1 < STORY.length ? stepKey(STORY[idx + 1]) : 'end';
        save.save();
      }
      checkAchievements();
    }
  } finally {
    running = false;
  }
}

async function runStep(step: StoryStep): Promise<StepResult> {
  switch (step.t) {
    case 'dialogue':
      await playDialogue(step.id);
      return 'ok';
    case 'chapter':
      await chapterCard(step.ch);
      return 'ok';
    case 'level': {
      const def = levelById(step.id);
      if (!def) return 'ok';
      const resumed = !!save.data.run && save.data.run.levelId === def.id;
      if (!resumed) await levelIntro(def);
      const tuto = def.tutorial && !resumed ? runTutorial(def) : null;
      const r = await playLevel(def, 'story');
      tuto?.stop();
      return r === 'won' ? 'ok' : 'quit';
    }
    case 'minigame': {
      if (autoTest()) { markMinigame(step.id, 1); return 'ok'; }
      const m = await import('../minigames/index');
      const r = await m.runMinigame(step.id);
      return r === 'done' ? 'ok' : 'quit';
    }
    case 'memory':
      if (unlockMemory(step.id)) await revealMemory(step.id);
      return 'ok';
    case 'queen': {
      if (autoTest()) return 'ok';
      const c = await import('../chess/index');
      const r = await c.runQueenTutorial();
      return r === 'done' ? 'ok' : 'quit';
    }
    case 'unlockChess':
      stat('chessUnlocked');
      audio.play('achievement');
      await ui.modal({
        title: 'Mode Échecs débloqué !',
        body: h('div', h('p', 'Le royaume t\'appartient : joue contre l\'IA (trois niveaux), résous des problèmes et les puzzles du Mode Reine.'), h('p.muted', { style: 'font-size:14px' }, 'Accessible à tout moment depuis le menu principal.')),
        actions: [{ label: 'Continuer l\'histoire', value: 'ok' }],
        dismissible: false,
      });
      return 'ok';
    case 'final': {
      const f = await import('./finale');
      await f.runFinale(false);
      return 'ok';
    }
  }
}

export function chapterCard(ch: number): Promise<void> {
  const def = CHAPTERS.find((c) => c.n === ch);
  setBackdrop(themeForChapter(ch));
  audio.play('whoosh');
  return new Promise((resolve) => {
    const el = h('div.chapter-card', { role: 'dialog' },
      h('div.n', `Chapitre ${ch}`),
      h('h1', def?.title ?? ''),
      h('div.sub', def?.subtitle ?? ''),
      h('div.tap', 'Touche pour continuer'));
    let ready = false;
    window.setTimeout(() => { ready = true; }, 900);
    el.addEventListener('click', () => {
      if (!ready) return;
      el.classList.add('leaving');
      window.setTimeout(() => el.remove(), 480);
      resolve();
    });
    ui.root.append(el);
  });
}

async function levelIntro(def: LevelDef): Promise<void> {
  const body = h('div.level-intro',
    h('div.chapter', `Chapitre ${def.chapter} · Niveau ${def.id}`),
    h('div.objs', ...def.objectives.map((o) => h('div',
      o.t === 'create' ? h('img', { src: itemImageUrl({ c: o.item[0], l: o.item[1] }, 80), alt: '' }) : h('span', { style: 'width:40px;display:grid;place-items:center;color:#E8558F' }, icon({ orders: 'basket', gifts: 'gift', score: 'star', merges: 'sparkle', combo: 'bolt', create: 'star' }[o.t], 26)),
      objectiveText(o)))),
    h('p.tip', `💡 ${def.hint}`),
  );
  await ui.modal({ title: def.title, body, actions: [{ label: 'C\'est parti !', value: 'go' }], dismissible: false, className: 'level-intro-modal' });
}

export async function revealMemory(id: string): Promise<void> {
  const m = memoryById(id);
  if (!m) return;
  audio.play('chest');
  audio.duck(0.6, 2.5);
  const body = h('div.memory-view',
    h('img', { src: memoryImageUrl(id), alt: m.title }),
    h('p', { style: 'margin:4px 0 0' }, m.desc),
    h('p.muted', { style: 'font-size:14px;margin:0' }, `Souvenir ${save.data.memories.length}/8 ajouté à l'album ♡`));
  await ui.modal({ title: m.title, body, actions: [{ label: 'Garder ce souvenir ♡', value: 'ok' }], dismissible: false });
  checkAchievements();
}

/** Bouton de retour rapide utilisé par certains écrans. */
export const backButton = (fn: () => void) => h('button.icon-btn', { 'aria-label': 'Retour', on: { click: tap(fn) } }, icon('back'));
