// Echoes of Aether (Max version) — optimisations de rendu pour le web mobile.
//
// Module indépendant du code du jeu : il reçoit l'espace de noms Phaser et corrige, sans toucher
// au gameplay, ce qui coûte cher image par image ou en mémoire graphique.
//
//   installPerf(Phaser)          à appeler une fois, avant `new Phaser.Game(...)`
//     - lazyGpuTextures          une texture n'est envoyée au GPU qu'à son premier affichage
//     - viewportCulling          objets hors caméra, zones et formes invisibles exclus du rendu
//     - graphicsCache            Graphics statiques dessinés une fois dans une texture, puis réutilisés
//   cullRect(obj, x, y, w, h)    rend un objet seulement quand ce rectangle (monde) est à l'écran
//   initialResolution(key)       définition de rendu mémorisée pour cet appareil
//   autoResolution(game, ...)    baisse la définition si le jeu rame, et s'en souvient
//
// Chaque optimisation peut être coupée pour comparer : localStorage.setItem('eoam_perf_off', 'cache,lazy,cull')

const OFF = (() => {
  try {
    return new Set((localStorage.getItem(`eoam_perf_off`) || ``).split(`,`).map((s) => s.trim()));
  } catch {
    return new Set();
  }
})();

export const stats = { lazyPending: 0, lazyUploaded: 0, baked: 0, bakedPx: 0, rebakes: 0 };

export function installPerf(Phaser) {
  if (!OFF.has(`lazy`)) lazyGpuTextures(Phaser);
  if (!OFF.has(`cull`)) viewportCulling(Phaser);
  if (!OFF.has(`cache`)) graphicsCache(Phaser);
  window.__perf = stats;
}

// ---------------------------------------------------------------------------------------------
// 1. Textures GPU à la demande
// Phaser crée la texture WebGL de chaque image dès son chargement : toutes les planches de héros,
// de monstres et les textures générées occupaient ~130 Mo de mémoire graphique et ralentissaient
// le démarrage, même jamais affichées. Ici l'image reste en mémoire normale et n'est envoyée au GPU
// que la première fois qu'elle est dessinée (lecture de `source.glTexture`).
// ---------------------------------------------------------------------------------------------
function lazyGpuTextures(Phaser) {
  const TS = Phaser.Textures.TextureSource.prototype;
  const init = TS.init,
    setFilter = TS.setFilter,
    update = TS.update,
    destroy = TS.destroy;

  Object.defineProperty(TS, `glTexture`, {
    configurable: true,
    get() {
      if (this._gl == null && this._lazy) {
        this._lazy = false;
        stats.lazyPending--;
        stats.lazyUploaded++;
        const r = this.renderer;
        if (r && r.gl) {
          this._gl = this.isCanvas
            ? r.createCanvasTexture(this.image, false, this.flipY)
            : r.createTextureFromSource(this.image, this.width, this.height, this.scaleMode);
          r.setTextureFilter(this._gl, this.scaleMode);
        }
      }
      return this._gl;
    },
    set(v) {
      this._gl = v;
    },
  });

  TS.init = function (game) {
    const r = this.renderer;
    const plain =
      !this.isVideo &&
      !this.isRenderTexture &&
      !this.isGLTexture &&
      !this.compressionAlgorithm &&
      !(this.source instanceof Uint8Array);
    if (r && r.gl && plain && this.image) {
      this._lazy = true;
      stats.lazyPending++;
      this.scaleMode = game.config.antialias ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST;
      return;
    }
    return init.call(this, game);
  };
  TS.setFilter = function (mode) {
    if (this._lazy) {
      this.scaleMode = mode;
      return;
    }
    return setFilter.call(this, mode);
  };
  // Une texture canevas pas encore envoyée n'a rien à mettre à jour : elle partira avec son contenu actuel.
  TS.update = function () {
    if (this._lazy) return;
    return update.call(this);
  };
  TS.destroy = function () {
    if (this._lazy) {
      this._lazy = false;
      stats.lazyPending--;
    }
    return destroy.call(this);
  };
}

// ---------------------------------------------------------------------------------------------
// 2. Rendu limité à ce qui est visible
// Phaser envoie au rendu chaque objet de la scène (≈4 000 dans le monde : décor de toute la carte,
// 1 800 zones de collision) même hors écran. On écarte avant le rendu :
//   - les images, sprites et textes nettement hors de la vue de la caméra,
//   - les zones (jamais dessinées),
//   - les formes entièrement transparentes (ex. un rectangle plein écran qui ne sert qu'aux clics).
// willRender n'est pas modifié : la détection des clics/toucher reste identique.
// ---------------------------------------------------------------------------------------------
const CULL_TYPES = { Image: 1, Sprite: 1, Text: 1, NineSlice: 1, TileSprite: 1 };

function viewportCulling(Phaser) {
  const CM = Phaser.Cameras.Scene2D.CameraManager.prototype;
  CM.getVisibleChildren = function (children, camera) {
    const v = camera.worldView,
      x0 = v.x,
      y0 = v.y,
      x1 = v.right,
      y1 = v.bottom,
      straight = camera.rotation === 0,
      out = [];
    for (let i = 0; i < children.length; i++) {
      const o = children[i];
      if (o.type === `Zone` || !o.willRender(camera)) continue;
      if (straight && o.scrollFactorX === 1 && o.scrollFactorY === 1 && CULL_TYPES[o.type]) {
        // Rayon prudent : quelle que soit l'origine ou la rotation, l'objet tient dans ce carré.
        const r = Math.abs(o.displayWidth) + Math.abs(o.displayHeight) + 64;
        if (o.x + r < x0 || o.x - r > x1 || o.y + r < y0 || o.y - r > y1) continue;
      }
      out.push(o);
    }
    return out;
  };

  // Formes (Rectangle, Ellipse, Arc…) sans remplissage ni contour visibles : rien à dessiner.
  const G = Phaser.GameObjects;
  for (const name of Object.keys(G)) {
    const C = G[name];
    if (typeof C !== `function` || !C.prototype || !(C.prototype instanceof G.Shape)) continue;
    const render = C.prototype.renderWebGL;
    if (!render || render.__perf) continue;
    const wrapped = function (renderer, src, camera, parent) {
      if (!(src.isFilled && src.fillAlpha > 0) && !(src.isStroked && src.strokeAlpha > 0 && src.lineWidth > 0)) return;
      return render.call(this, renderer, src, camera, parent);
    };
    wrapped.__perf = true;
    C.prototype.renderWebGL = wrapped;
  }
}

export function cullRect(obj, x, y, w, h) {
  if (OFF.has(`cull`)) return obj;
  const base = obj.willRender;
  obj.willRender = function (camera) {
    if (!base.call(this, camera)) return false;
    const v = camera.worldView;
    return x < v.right && x + w > v.x && y < v.bottom && y + h > v.y;
  };
  return obj;
}

// ---------------------------------------------------------------------------------------------
// 3. Cache des Graphics statiques
// Phaser retrace chaque Graphics à chaque image : un cercle devient ~100 points puis des triangles
// (earcut), recalculés 60 fois par seconde. Les boutons, anneaux et cadres du HUD ne changent
// presque jamais. Quand un Graphics n'a pas changé depuis quelques images, on le dessine une fois
// dans une texture (avec le même moteur WebGL, donc au pixel près) et on n'affiche plus que ce
// rectangle texturé. Au moindre changement de ses commandes, il redevient un Graphics normal.
// ---------------------------------------------------------------------------------------------
const CACHE = {
  minCommands: 24, // en dessous, dessiner directement coûte moins qu'une texture
  stableFrames: 6, // images sans changement avant de mettre en cache
  maxSide: 2048, // taille max d'une texture de cache (pixels écran)
  maxArea: 1.2e6,
  budgetPx: 6e6, // ~24 Mo de mémoire graphique au total pour le cache
  maxRebakes: 3, // un Graphics qui change sans arrêt n'est plus mis en cache
  perFrame: 4, // mises en cache maximum par image
};

const C = {
  ARC: 0,
  BEGIN_PATH: 1,
  CLOSE_PATH: 2,
  FILL_RECT: 3,
  LINE_TO: 4,
  MOVE_TO: 5,
  LINE_STYLE: 6,
  FILL_STYLE: 7,
  FILL_PATH: 8,
  STROKE_PATH: 9,
  FILL_TRIANGLE: 10,
  STROKE_TRIANGLE: 11,
  GRADIENT_FILL_STYLE: 21,
  GRADIENT_LINE_STYLE: 22,
};

// Rectangle englobant (espace local) des commandes, ou null si on ne sait pas le calculer.
function commandBounds(cb) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity,
    lw = 0;
  const add = (x, y, r = 0) => {
    if (x - r < x0) x0 = x - r;
    if (y - r < y0) y0 = y - r;
    if (x + r > x1) x1 = x + r;
    if (y + r > y1) y1 = y + r;
  };
  for (let i = 0; i < cb.length; i++) {
    switch (cb[i]) {
      case C.ARC:
        add(cb[i + 1], cb[i + 2], Math.abs(cb[i + 3]));
        i += 7;
        break;
      case C.BEGIN_PATH:
      case C.CLOSE_PATH:
      case C.FILL_PATH:
      case C.STROKE_PATH:
        break;
      case C.FILL_RECT:
        add(cb[i + 1], cb[i + 2]);
        add(cb[i + 1] + cb[i + 3], cb[i + 2] + cb[i + 4]);
        i += 4;
        break;
      case C.LINE_TO:
      case C.MOVE_TO:
        add(cb[i + 1], cb[i + 2]);
        i += 2;
        break;
      case C.LINE_STYLE:
        lw = Math.max(lw, cb[i + 1]);
        i += 3;
        break;
      case C.FILL_STYLE:
        i += 2;
        break;
      case C.FILL_TRIANGLE:
      case C.STROKE_TRIANGLE:
        add(cb[i + 1], cb[i + 2]);
        add(cb[i + 3], cb[i + 4]);
        add(cb[i + 5], cb[i + 6]);
        i += 6;
        break;
      case C.GRADIENT_FILL_STYLE:
        i += 8;
        break;
      case C.GRADIENT_LINE_STYLE:
        lw = Math.max(lw, cb[i + 1]);
        i += 6;
        break;
      default:
        return null; // SAVE/RESTORE/TRANSLATE/SCALE/ROTATE ou inconnu : pas de cache
    }
  }
  if (!(x1 >= x0 && y1 >= y0) || !isFinite(x0 + y0 + x1 + y1)) return null;
  const pad = lw / 2 + 2;
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}

const frac = (v) => v - Math.floor(v);

function sameCommands(a, b) {
  if (!b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function graphicsCache(Phaser) {
  const GP = Phaser.GameObjects.Graphics.prototype;
  const render = GP.renderWebGL,
    clear = GP.clear,
    preDestroy = GP.preDestroy;
  const getCalcMatrix = Phaser.GameObjects.GetCalcMatrix;
  const TM = Phaser.GameObjects.Components.TransformMatrix;
  const drawMatrix = new TM();
  const queue = [];
  let usedPx = 0,
    seq = 0,
    hooked = null;

  const release = (g) => {
    const b = g._pc;
    if (!b) return;
    usedPx -= b.px;
    stats.baked--;
    stats.bakedPx = usedPx;
    g._pc = null;
    b.tex.destroy();
  };

  // Les mises en cache se font après le rendu de l'image (jamais au milieu d'un lot WebGL).
  const flushQueue = () => {
    let n = 0;
    while (queue.length && n < CACHE.perFrame) {
      const job = queue.shift();
      const g = job.g;
      g._pq = false;
      if (!g.scene || !g.active || g._pnoCache || g._pc) continue;
      const cb = g.commandBuffer;
      if (!sameCommands(cb, job.snap)) continue;
      const bd = commandBounds(cb);
      if (!bd) {
        g._pnoCache = true;
        continue;
      }
      const sx = job.sx,
        sy = job.sy,
        fx = job.fx,
        fy = job.fy;
      // Origine alignée sur un pixel écran pour que la texture tombe pile sur la même grille.
      const ox = Math.floor(bd.x * sx),
        oy = Math.floor(bd.y * sy);
      const w = Math.ceil((bd.x + bd.w) * sx) - ox + 1,
        h = Math.ceil((bd.y + bd.h) * sy) - oy + 1;
      if (w < 1 || h < 1 || w > CACHE.maxSide || h > CACHE.maxSide || w * h > CACHE.maxArea) {
        g._pnoCache = true;
        continue;
      }
      if (usedPx + w * h > CACHE.budgetPx) continue;
      const key = `__perf_g${++seq}`;
      const tex = g.scene.sys.textures.addDynamicTexture(key, w, h);
      if (!tex) continue;
      const save = [g.x, g.y, g.scaleX, g.scaleY, g.rotation, g.alpha];
      g._pbusy = true;
      try {
        // Même position sous-pixel qu'à l'écran : les traits tombent sur les mêmes pixels.
        g.x = fx - ox;
        g.y = fy - oy;
        g.scaleX = sx;
        g.scaleY = sy;
        g.rotation = 0;
        g.alpha = 1;
        tex.draw(g);
      } finally {
        [g.x, g.y, g.scaleX, g.scaleY, g.rotation, g.alpha] = save;
        g._pbusy = false;
      }
      g._pc = { tex, frame: tex.get(), sx, sy, ox, oy, fx, fy, snap: cb.slice(), px: w * h };
      usedPx += w * h;
      stats.baked++;
      stats.bakedPx = usedPx;
      n++;
    }
  };

  GP.clear = function () {
    this._pdirty = true;
    return clear.call(this);
  };

  GP.preDestroy = function () {
    release(this);
    return preDestroy ? preDestroy.call(this) : undefined;
  };

  GP.renderWebGL = function (renderer, src, camera, parent) {
    const cb = src.commandBuffer;
    if (src._pbusy || src._pnoCache || cb.length < CACHE.minCommands || src.mask || src.blendMode !== 0) {
      if (src._pc && !src._pbusy) release(src);
      return render.call(this, renderer, src, camera, parent);
    }
    if (!hooked) {
      hooked = renderer.game;
      hooked.events.on(`postrender`, flushQueue);
    }

    // Changement de contenu ? (clear() appelé ou commandes ajoutées)
    if (src._pdirty || cb.length !== src._plen) {
      src._pdirty = false;
      src._plen = cb.length;
      const ref = src._pc ? src._pc.snap : src._psnap;
      if (!sameCommands(cb, ref)) {
        if (src._pc) {
          release(src);
          if (++src._prebakes > CACHE.maxRebakes) src._pnoCache = true;
          stats.rebakes++;
        }
        src._psnap = null;
        src._pstable = 0;
      }
    }

    const calc = getCalcMatrix(src, camera, parent).calc;
    const straight = Math.abs(calc.b) < 1e-6 && Math.abs(calc.c) < 1e-6 && calc.a > 0 && calc.d > 0;
    const b = src._pc;
    if (b && straight && Math.abs(calc.a - b.sx) < 1e-3 && Math.abs(calc.d - b.sy) < 1e-3) {
      camera.addToRenderList(src);
      const pipeline = renderer.pipelines.set(src.pipeline, src);
      // calc contient déjà l'échelle (zoom caméra × parents × objet) : on la retire pour dessiner
      // la texture, faite à cette échelle, pixel pour pixel.
      drawMatrix.setTransform(1, 0, 0, 1, calc.tx - b.fx, calc.ty - b.fy);
      pipeline.batchTextureFrame(b.frame, b.ox, b.oy, 0xffffff, camera.alpha * src.alpha, drawMatrix, null);
      return;
    }

    if (straight && !src._pq) {
      if (!src._psnap) {
        src._psnap = cb.slice();
        src._pstable = 0;
        src._prebakes = src._prebakes || 0;
      } else if (++src._pstable >= CACHE.stableFrames) {
        src._pq = true;
        queue.push({ g: src, snap: src._psnap, sx: calc.a, sy: calc.d, fx: frac(calc.tx), fy: frac(calc.ty) });
      }
    }
    return render.call(this, renderer, src, camera, parent);
  };
}

// ---------------------------------------------------------------------------------------------
// 4. Définition de rendu adaptative
// Le canevas suit la densité de l'écran (jusqu'à ×2,5) : sur téléphone, ~2 millions de pixels à
// remplir à chaque image. Sous 45 FPS en jeu, on baisse d'un cran (2,5 → 2 → 1,5 → 1) et on le
// mémorise ; à 58+ FPS pendant ~15 s, la partie suivante repart un cran plus haut.
// ---------------------------------------------------------------------------------------------
export const RES_MAX = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));

export function initialResolution(key) {
  let v = NaN;
  try {
    v = parseFloat(localStorage.getItem(key));
  } catch {}
  return v >= 1 && v <= RES_MAX ? v : RES_MAX;
}

// getRes/setRes : lecture/écriture de la définition courante ; apply : redimensionne le jeu.
// isActive : la mesure ne compte que pendant le jeu ; canChange : pas de changement si une fenêtre est ouverte.
export function autoResolution(game, { key, getRes, setRes, apply, isActive, canChange }) {
  let acc = 0,
    frames = 0,
    last = 0,
    good = 0,
    skip = 1;
  const save = (v) => {
    try {
      localStorage.setItem(key, String(v));
    } catch {}
  };
  game.events.on(`postrender`, () => {
    const now = performance.now(),
      dt = now - last;
    last = now;
    if (document.hidden || !isActive() || dt > 250) {
      acc = frames = 0;
      skip = Math.max(skip, 1);
      return;
    }
    acc += dt;
    frames++;
    if (acc < 3000) return;
    const fps = (frames * 1000) / acc;
    acc = frames = 0;
    if (skip > 0) {
      skip--;
      return;
    }
    const res = getRes();
    if (fps < 45) {
      good = 0;
      if (res <= 1 || !canChange()) return;
      const next = Math.max(1, Math.ceil(res * 2 - 1) / 2);
      setRes(next);
      save(next);
      skip = 1;
      apply();
    } else if (fps >= 58 && res < RES_MAX && ++good === 5) save(Math.min(RES_MAX, res + 0.5));
  });
}
