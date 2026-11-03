/**
 * La séquence finale, en cinq étapes (cahier des charges §19) :
 *  1. le dernier cœur (dans la scène de fusion, niveau 30) ;
 *  2. Auguste apparaît et parle ;
 *  3. le miroir (« Oui ♡ ») révèle Radia ;
 *  4. la déclaration ;
 *  5. « Merci d'être entrée dans mon monde » → retour au jeu.
 * La sauvegarde n'est jamais effacée ; la fin est rejouable depuis l'album.
 */
import { game, save, audio } from '../../core/app';
import { checkAchievements, unlockMemory } from '../../core/progress';
import { FinalScene } from '../scenes/FinalScene';
import { setBackdrop, setDim } from '../scenes/backdrop';
import { playLines, currentOutfit } from '../../ui/components/Dialogue';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { wait } from '../../utils/math';

const ARABIC = 'اللهم اشهد أنني أعاهدك أن أبذل كل ما بوسعي لأسعد هذه المرأة، وأن أكون لها سندًا وأمانًا ما حييت.';

/** Affiche un ou plusieurs paragraphes ; attend un toucher (aucune vitesse imposée). */
function page(parts: { text: string; cls?: string; lang?: string; dir?: string }[], opts: { dark?: boolean; button?: string; bottom?: boolean } = {}): Promise<void> {
  return new Promise((resolve) => {
    const layer = h(`div.finale-layer${opts.dark ? '.dark' : ''}${opts.bottom ? '.finale-bottom' : ''}`);
    parts.forEach((p, i) => {
      const el = h(`p.finale-text${p.cls ? '.' + p.cls : ''}`, { style: `animation-delay:${0.2 + i * 1.1}s` }, p.text);
      if (p.lang) el.setAttribute('lang', p.lang);
      if (p.dir) el.setAttribute('dir', p.dir);
      layer.append(el);
    });
    const minDelay = 900 + parts.length * 900;
    let ready = false;
    window.setTimeout(() => { ready = true; }, minDelay);
    const done = () => {
      layer.classList.add('leaving');
      window.setTimeout(() => layer.remove(), 800);
      resolve();
    };
    if (opts.button) {
      const b = h('button.btn', { style: `margin-top:26px;animation-delay:${minDelay / 1000}s` }, opts.button);
      b.addEventListener('click', tap(() => done()));
      layer.append(b);
    } else {
      layer.append(h('div.finale-hint', 'Touche pour continuer'));
      layer.addEventListener('click', () => { if (ready) done(); });
    }
    ui.root.append(layer);
  });
}

export async function runFinale(replay: boolean): Promise<void> {
  const g = game();
  ui.closeScreen();
  setBackdrop('monde');
  setDim(0.15, 1200);
  audio.playMusic();
  if (!g.scene.getScene(FinalScene.KEY)) g.scene.add(FinalScene.KEY, FinalScene, false);
  g.scene.start(FinalScene.KEY, { outfit: currentOutfit() === 'royal' || !replay ? 'royal' : currentOutfit() });
  await wait(60);
  const scene = g.scene.getScene(FinalScene.KEY) as FinalScene;

  let skipped = false;
  const skip = replay ? h('button.btn.small.secondary.finale-skip', 'Passer ⏭') : null;
  if (skip) {
    skip.addEventListener('click', tap(() => { skipped = true; skip.remove(); }));
    ui.root.append(skip);
  }
  const go = async (fn: () => Promise<unknown>) => { if (!skipped) await fn(); };

  await wait(1200);
  // Étape 2 — Auguste apparaît
  await go(() => scene.augusteEnters());
  await go(() => playLines([
    { who: 'auguste', expr: 'love', text: 'J\'ai créé tout un monde pour toi. Mais mon endroit préféré, ça reste celui où tu es.' },
    { who: 'auguste', expr: 'shy', text: 'Ce jeu, je l\'ai fait pour toi. Pas parce que je voulais t\'impressionner, mais parce que ton sourire mérite qu\'on lui consacre du temps, de l\'attention et même tout un petit univers.' },
  ], undefined, { skippable: false }));

  // Étape 3 — Le miroir
  await go(() => scene.showMirror());
  await go(() => new Promise<void>((resolve) => {
    const layer = h('div.finale-layer.finale-bottom',
      h('p.finale-question', 'Tu veux savoir quel est mon plus beau trésor dans ce jeu ?'));
    const yes = h('button.btn', 'Oui ♡');
    yes.addEventListener('click', tap(() => { layer.classList.add('leaving'); window.setTimeout(() => layer.remove(), 800); resolve(); }));
    layer.append(yes);
    ui.root.append(layer);
  }));
  await go(async () => {
    audio.duck(0.55, 6);
    await scene.revealMirror();
    await page([{ text: 'C\'était toi, depuis le début.', cls: 'script' }], { bottom: true });
  });

  // Étape 4 — La déclaration
  await go(async () => {
    setDim(0.55, 1500);
    await page([{ text: 'Et si un jour tu oublies à quel point tu es précieuse, j\'espère que tu reviendras ici. Pour te rappeler qu\'un jour, quelqu\'un a pris le temps de créer tout un monde, juste pour te voir sourire.' }], { dark: true });
    await page([
      { text: 'Ô Allah, sois témoin : je prends devant Toi l\'engagement de faire tout ce qui est en mon pouvoir pour rendre cette femme heureuse, d\'être son soutien et de lui apporter de la sécurité aussi longtemps que je vivrai.' },
      { text: ARABIC, cls: 'ar', lang: 'ar', dir: 'rtl' },
    ], { dark: true });
  });

  // Étape 5 — Conclusion
  setDim(0.2, 1500);
  scene.finaleGlow();
  await wait(skipped ? 300 : 1600);
  await page([{ text: 'Merci d\'être entrée dans mon monde.', cls: 'script' }], { bottom: true });
  await page([{ text: 'Notre histoire continue ♡', cls: 'script' }], { bottom: true, button: replay ? 'Retour à l\'album' : 'Retourner au jeu' });

  skip?.remove();
  if (!save.data.story.endingSeen) {
    save.data.story.endingSeen = true;
    save.save();
  }
  unlockMemory('monde');
  checkAchievements();
  setDim(0, 800);
  g.scene.stop(FinalScene.KEY);
}
