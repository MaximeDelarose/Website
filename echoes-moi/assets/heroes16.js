// Echoes of Aether (Max version) — héros 16×32 dans le style Pixel Crawler, en jeu.
//
// Planches générées par tools/art16/pc_heroes.py : pc/heroes/<héros>_game.png, cases de 80×96
// (images du pack agrandies ×2, une case du jeu = 32 unités), 8 images max par ligne ;
// lignes = animation × 4 directions (sud, est, nord, ouest).
// Les animations sont créées sous les noms qu'utilise déjà le jeu (idle_south, axe_throw_east…),
// avec la même durée qu'avant : le combat garde exactement son rythme.
// Pour comparer avec les anciens sprites : localStorage.setItem('eoam_perf_off', 'pcheroes').

export const HERO_KEYS = ['augh', 'aka', 'gorak', 'nyra', 'ralya'];
export const PCH = { w: 80, h: 96, feet: 94, cx: 40 };
const ROWS = ['idle', 'walk', 'run', 'hit', 'slice', 'pierce', 'crush', 'collect', 'death'];
const DIRS = ['south', 'east', 'north', 'west'];
const PER_ROW = 8;

// nom dans le jeu -> [animation du pack, images/s d'origine pour 6 images, boucle]
const COMMON = {
  idle: ['idle', 7.1, true],
  walk: ['walk', 9.5, true],
  run: ['run', 12.5, true],
  dash: ['run', 15.4, false],
  hurt: ['hit', 10.5, false],
  death: ['death', 8.7, false],
  victory: ['collect', 9.1, false],
  equip_switch: ['collect', 11.1, false],
};
const BY_HERO = {
  default: { axe_throw: ['slice', 10.5], axe_fire: ['crush', 9.1], axe_ice: ['pierce', 9.1], axe_catch: ['collect', 11.8] },
  // Aka, archer : tous les tirs en « pierce » (bras tendu, l'arc est dessiné par le jeu), invocations en « collect »
  aka: { orb_attack: ['pierce', 10], summon_wolf: ['collect', 9.1], place_trap: ['pierce', 9.5], raise_wall: ['pierce', 9.1], area_burst: ['pierce', 8.3] },
};

export const pcHeroesOn = () => {
  try {
    return !(localStorage.getItem('eoam_perf_off') || '').split(',').includes('pcheroes');
  } catch {
    return true;
  }
};

export function preloadHeroes16(scene, base = 'assets/') {
  if (!pcHeroesOn()) return;
  for (const h of HERO_KEYS)
    scene.textures.exists('pcx_' + h) ||
      scene.load.spritesheet('pcx_' + h, `${base}pc/heroes/${h}_game.png`, { frameWidth: PCH.w, frameHeight: PCH.h });
}

const counted = {};
function frameCounts(scene, key) {
  if (counted[key]) return counted[key];
  const img = scene.textures.get(key).getSourceImage();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const rows = Math.floor(img.height / PCH.h);
  const counts = [];
  for (let r = 0; r < rows; r++) {
    let n = 0;
    for (let k = 0; k < PER_ROW; k++) {
      const d = ctx.getImageData(k * PCH.w, r * PCH.h, PCH.w, PCH.h).data;
      let any = false;
      for (let i = 3; i < d.length; i += 16) if (d[i]) { any = true; break; }
      if (any) n = k + 1;
    }
    counts.push(n);
  }
  return (counted[key] = counts);
}

/** Clé de la planche du héros, animations créées au besoin ; null si indisponible. */
export function heroSheet(scene, hero) {
  if (!pcHeroesOn()) return null;
  const h = HERO_KEYS.includes(hero) ? hero : 'augh';
  const key = 'pcx_' + h;
  if (!scene.textures.exists(key)) return null;
  if (scene.anims.exists(`${key}_idle_south`)) return key;
  const counts = frameCounts(scene, key);
  const map = { ...COMMON, ...(BY_HERO[h] || BY_HERO.default) };
  for (const [name, [src, fps, loop]] of Object.entries(map))
    DIRS.forEach((dir, d) => {
      const row = ROWS.indexOf(src) * 4 + d;
      const n = counts[row] || 1;
      scene.anims.create({
        key: `${key}_${name}_${dir}`,
        frames: scene.anims.generateFrameNumbers(key, { start: row * PER_ROW, end: row * PER_ROW + n - 1 }),
        // même durée qu'une animation de 6 images à l'ancienne cadence
        frameRate: (fps * n) / 6,
        repeat: loop ? -1 : 0,
      });
    });
  return key;
}

// --- PNJ du village (pc/heroes/npcs_game.png : une ligne par PNJ, repos de face, 4 images) ---
const NPC_ROWS = ['elder', 'merchant', 'villager', 'guard'];

export function preloadNpcs16(scene, base = 'assets/') {
  if (!pcHeroesOn() || scene.textures.exists('pcx_npcs')) return;
  scene.load.spritesheet('pcx_npcs', `${base}pc/heroes/npcs_game.png`, { frameWidth: PCH.w, frameHeight: PCH.h });
}

/** Clé de l'animation de repos du PNJ dans le nouveau style, ou null (garder l'ancien sprite). */
export function npcAnim(scene, kind) {
  const row = NPC_ROWS.indexOf(kind);
  if (!pcHeroesOn() || row < 0 || !scene.textures.exists('pcx_npcs')) return null;
  const key = `pcx_npc_${kind}`;
  if (!scene.anims.exists(key))
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers('pcx_npcs', { start: row * 4, end: row * 4 + 3 }), frameRate: 4, repeat: -1 });
  return key;
}
