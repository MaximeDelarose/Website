// Echoes of Aether (Max version) — textures pré-rendues.
//
// Le jeu dessine au démarrage beaucoup de textures pixel par pixel (sols des zones et des royaumes,
// variantes de monstres, icônes d'équipement, massues, décor). Ce travail, identique à chaque
// partie, est fait une fois pour toutes par `tools/echoes-bake.js`, qui enregistre le résultat en
// PNG dans `assets/baked/` avec `manifest.js` (taille et découpage de chaque texture).
//
// Ici on charge ces PNG sous les mêmes noms : comme chaque générateur du jeu vérifie d'abord
// si sa texture existe, il est simplement sauté. Si un PNG manque, le jeu la génère comme avant.
// Après une modification d'un générateur : `node tools/echoes-bake.js` pour refaire les PNG.
// Pour désactiver (comparaison, débogage) : localStorage.setItem('eoam_perf_off', 'baked')

import manifest from './baked/manifest.js';
// Images faites à la main / par tools/art16 (style 16 px) : prioritaires sur le pré-rendu
import overrides from './pc/override/manifest.js';

const off = () => {
  try {
    return (localStorage.getItem(`eoam_perf_off`) || ``).split(`,`).includes(`baked`);
  } catch {
    return false;
  }
};

// À appeler dans le preload de la scène de démarrage, avant que les générateurs ne tournent.
export function preloadBaked(scene, base = `assets/baked/`) {
  if (off()) return;
  const over = overrides.textures || {};
  const keys = [...new Set([...Object.keys(manifest.textures || {}), ...Object.keys(over)])].filter((k) => !scene.textures.exists(k));
  if (!keys.length) return;
  for (const k of keys)
    scene.load.image(`__baked_` + k, over[k] ? `${base}../pc/override/${k}.png?v=${overrides.version}` : `${base}${k}.png?v=${manifest.version}`);
  scene.load.once(`complete`, () => {
    for (const k of keys) {
      const tmp = `__baked_` + k;
      if (!scene.textures.exists(tmp) || scene.textures.exists(k)) continue;
      const info = over[k] || manifest.textures[k];
      const img = scene.textures.get(tmp).getSourceImage();
      // On recrée une texture canevas : le jeu peut la traiter exactement comme celle qu'il aurait générée.
      const tex = scene.textures.createCanvas(k, info.w, info.h);
      tex.getContext().drawImage(img, 0, 0);
      for (const [name, x, y, w, h] of info.frames || []) tex.add(name, 0, x, y, w, h);
      tex.refresh();
      scene.textures.remove(tmp);
    }
  });
}
