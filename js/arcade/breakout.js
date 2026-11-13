// src/shared/engines.ts
var Phaser = globalThis.Phaser;
var Matter = globalThis.Matter;

// src/shared/fullscreen.ts
function bindFullscreen(stageId, onChange) {
  const stage = document.getElementById(stageId);
  const btn = document.querySelector("[data-game-fullscreen]");
  if (!stage || !btn) return;
  const gk = window.GameKit;
  const isFull = () => gk?.fullscreen ? gk.fullscreen.is(stage) : document.fullscreenElement === stage;
  const sync = () => {
    btn.textContent = isFull() ? "\u2715 Quitter le plein \xE9cran" : "\u26F6 Plein \xE9cran";
    onChange();
    setTimeout(onChange, 120);
    setTimeout(onChange, 400);
  };
  btn.addEventListener("click", () => {
    if (gk?.fullscreen) {
      gk.fullscreen.toggle(stage);
      return;
    }
    if (isFull()) void document.exitFullscreen?.();
    else void stage.requestFullscreen?.();
  });
  document.addEventListener("fullscreenchange", sync);
  document.addEventListener("webkitfullscreenchange", sync);
  window.addEventListener("resize", onChange);
}

// src/shared/version.ts
var VERSION_QUERY = (() => {
  try {
    return new URL(import.meta.url).search;
  } catch {
    return "";
  }
})();

// src/shared/gamepad.ts
var DEADZONE = 0.5;
function readPad() {
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads).find((p) => !!p && p.connected);
    if (!pad) return null;
    const b = (i) => !!pad.buttons[i]?.pressed;
    const axisX = pad.axes[0] ?? 0;
    const axisY = pad.axes[1] ?? 0;
    return {
      x: (b(15) ? 1 : 0) - (b(14) ? 1 : 0) || (axisX > DEADZONE ? 1 : axisX < -DEADZONE ? -1 : 0),
      y: (b(13) ? 1 : 0) - (b(12) ? 1 : 0) || (axisY > DEADZONE ? 1 : axisY < -DEADZONE ? -1 : 0),
      buttons: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(b)
    };
  } catch {
    return null;
  }
}

// src/shared/storage.ts
function loadBest(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}
function saveBest(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
  }
}

// src/shared/audio.ts
var ctx = null;
var muted = loadBest("arcade.muted") === 1;
function context() {
  try {
    if (!ctx) {
      const AC = window;
      const Klass = AC.AudioContext ?? AC.webkitAudioContext;
      if (!Klass) return null;
      ctx = new Klass();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}
function isMuted() {
  return muted;
}
function setMuted(value) {
  muted = value;
  saveBest("arcade.muted", value ? 1 : 0);
}
function toggleMute() {
  setMuted(!muted);
  return muted;
}
function tone(freq, dur, opts = {}) {
  if (muted) return;
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + dur);
  gain.gain.setValueAtTime(opts.vol ?? 0.04, t0);
  gain.gain.exponentialRampToValueAtTime(1e-4, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}
function noise(dur, opts = {}) {
  if (muted) return;
  const c = context();
  if (!c) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const length = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = opts.freq ?? 1800;
  const gain = c.createGain();
  gain.gain.value = opts.vol ?? 0.05;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}
function arp(freqs, step, opts = {}) {
  freqs.forEach((f, i) => tone(f, opts.dur ?? step * 1.6, { ...opts, delay: (opts.delay ?? 0) + i * step }));
}

// src/shared/seed.ts
function readSeed() {
  try {
    const raw = new URLSearchParams(location.search).get("seed");
    if (raw !== null && /^\d+$/.test(raw)) return Number(raw) >>> 0;
  } catch {
  }
  return Math.floor(Math.random() * 4294967295) >>> 0;
}

// src/shared/theme.ts
var PAL = {
  bg: 2046507,
  // --forest : fond du cadre de jeu
  field: 2641207,
  // zone de jeu, un ton au-dessus du fond
  cream: 16643038,
  // --panel : texte, billes
  dim: 13212266,
  // --depth : texte secondaire
  line: 4861468,
  // --line : contours
  cap: 9067067,
  // --cap : murs, briques indestructibles
  orange: 15238970,
  // --orange
  orangeLight: 15904862,
  // --orange-2
  leaf: 10274155,
  // --leaf
  moss2: 8040538,
  // --moss-2 éclairci pour rester lisible sur le fond
  berry: 13129021,
  // --berry
  tan: 13212266,
  ink0: 2823945,
  // brun très foncé : ombres et contours épais
  panel2: 16312002,
  // --panel-2
  red: 14704714
};
var FONT = '"Londrina", "Nunito", system-ui, sans-serif';
var FONT_BODY = '"Nunito", system-ui, sans-serif';
var hex = (n) => `#${n.toString(16).padStart(6, "0")}`;
function mix(a, b, t) {
  const ar = a >> 16 & 255, ag = a >> 8 & 255, ab = a & 255;
  const br = b >> 16 & 255, bg = b >> 8 & 255, bb = b & 255;
  return Math.round(ar + (br - ar) * t) << 16 | Math.round(ag + (bg - ag) * t) << 8 | Math.round(ab + (bb - ab) * t);
}

// src/shared/art.ts
var OUT = "#2b1709";
function defs() {
  const d = window.ES_DATA;
  return d?.SPRITES ?? null;
}
function build(scene, key, rows, pal, k) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const W = w + 2;
  const H = h + 2;
  const filled = new Uint8Array(W * H);
  const tex = scene.textures.createCanvas(key, W * k, H * k);
  if (!tex) return;
  const g = tex.getContext();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch && pal[ch]) {
        g.fillStyle = pal[ch];
        g.fillRect((x + 1) * k, (y + 1) * k, k, k);
        filled[(y + 1) * W + x + 1] = 1;
      }
    }
  }
  g.fillStyle = OUT;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (filled[y * W + x]) continue;
      const near = x > 0 && filled[y * W + x - 1] || x < W - 1 && filled[y * W + x + 1] || y > 0 && filled[(y - 1) * W + x] || y < H - 1 && filled[(y + 1) * W + x];
      if (near) g.fillRect(x * k, y * k, k, k);
    }
  }
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}
function spriteKeys(scene, name, k = 3) {
  const def = defs()?.[name];
  if (!def) return [];
  return def.frames.map((rows, i) => {
    const key = `es:${name}:${k}:${i}`;
    if (!scene.textures.exists(key)) build(scene, key, rows, def.pal, k);
    return key;
  });
}
function spriteKey(scene, name, k = 3, frame = 0) {
  return spriteKeys(scene, name, k)[frame] ?? null;
}
var SpritePool = class {
  constructor(scene, depth, ox = 0, oy = 0) {
    this.scene = scene;
    this.depth = depth;
    this.ox = ox;
    this.oy = oy;
    this.list = [];
    this.used = 0;
  }
  begin() {
    this.used = 0;
  }
  draw(key, x, y, o = {}) {
    if (!key) return;
    let img = this.list[this.used];
    if (!img) {
      img = this.scene.add.image(0, 0, key).setDepth(this.depth);
      this.list.push(img);
    }
    this.used++;
    const s = o.scale ?? 1;
    img.setTexture(key).setPosition(x + this.ox, y + this.oy).setRotation(o.rotation ?? 0).setScale(o.flip ? -s : s, s).setAlpha(o.alpha ?? 1).setVisible(true);
    if (o.tint !== void 0) img.setTint(o.tint);
    else img.clearTint();
  }
  end() {
    for (let i = this.used; i < this.list.length; i++) this.list[i].setVisible(false);
  }
};
var Mascot = class {
  constructor(scene, name, x, y, k = 4, depth = 6) {
    this.scene = scene;
    this.name = name;
    this.x = x;
    this.y = y;
    this.k = k;
    this.depth = depth;
    this.img = null;
    this.frames = [];
    this.t = 0;
    this.frame = 0;
    this.set(name);
  }
  /** Change d'écureuil (le site en a une quinzaine). */
  set(name) {
    this.name = name;
    this.frames = spriteKeys(this.scene, name, this.k);
    if (this.frames.length === 0) return;
    if (!this.img) this.img = this.scene.add.image(this.x, this.y, this.frames[0]).setDepth(this.depth).setOrigin(0.5, 1);
    else this.img.setTexture(this.frames[0]);
    this.frame = 0;
  }
  update(dtMs) {
    if (!this.img || this.frames.length < 2) return;
    this.t += dtMs;
    if (this.t > 520) {
      this.t = 0;
      this.frame = (this.frame + 1) % this.frames.length;
      this.img.setTexture(this.frames[this.frame]);
    }
  }
  /** Petit saut de joie. */
  cheer() {
    if (!this.img) return;
    this.scene.tweens.killTweensOf(this.img);
    this.img.setY(this.y).setAngle(0);
    this.scene.tweens.add({ targets: this.img, y: this.y - 26, duration: 130, yoyo: true, repeat: 1, ease: "Quad.Out", onComplete: () => this.img?.setY(this.y) });
  }
  /** Penché, dépité. */
  sad() {
    if (!this.img) return;
    this.scene.tweens.killTweensOf(this.img);
    this.scene.tweens.add({ targets: this.img, angle: 18, y: this.y + 6, duration: 300, ease: "Sine.Out" });
  }
  /** Remet l'écureuil droit (nouvelle partie). */
  reset() {
    if (!this.img) return;
    this.scene.tweens.killTweensOf(this.img);
    this.img.setAngle(0).setY(this.y);
  }
};

// src/shared/kit.ts
function drawPanel(g, x, y, w, h, o = {}) {
  const depth = o.depth ?? 6;
  const bw = o.bw ?? 4;
  g.fillStyle(PAL.ink0, 1);
  g.fillRect(x, y + depth, w, h);
  g.fillStyle(o.border ?? PAL.ink0, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(o.fill ?? PAL.field, o.alpha ?? 1);
  g.fillRect(x + bw, y + bw, w - bw * 2, h - bw * 2);
}
function drawBevel(g, x, y, w, h, color, alpha = 1) {
  const m = Math.min(w, h);
  const b = Math.max(2, Math.round(m * 0.08));
  const hl = Math.max(2, Math.round(m * 0.14));
  g.fillStyle(PAL.ink0, alpha);
  g.fillRect(x, y, w, h);
  g.fillStyle(color, alpha);
  g.fillRect(x + b, y + b, w - b * 2, h - b * 2);
  g.fillStyle(16777215, 0.38 * alpha);
  g.fillRect(x + b, y + b, w - b * 2, hl);
  g.fillRect(x + b, y + b, hl, h - b * 2);
  g.fillStyle(PAL.ink0, 0.28 * alpha);
  g.fillRect(x + b, y + h - b - hl, w - b * 2, hl);
  g.fillRect(x + w - b - hl, y + b, hl, h - b * 2);
}
function makeText(scene, x, y, text, size, color = PAL.cream, o = {}) {
  const t = scene.add.text(x, y, text, {
    fontFamily: o.font ?? FONT,
    fontSize: `${size}px`,
    color: hex(color),
    stroke: hex(o.stroke ?? PAL.ink0),
    strokeThickness: o.strokeW ?? Math.max(2, Math.round(size * 0.14)),
    align: o.align ?? "left"
  });
  if (o.shadow !== false) t.setShadow(0, Math.max(2, Math.round(size * 0.08)), hex(PAL.ink0), 0, true, true);
  const [ox, oy] = o.origin ?? [0, 0];
  t.setOrigin(ox, oy);
  return t;
}
function popText(scene, x, y, text, size, color, o = {}) {
  const ms = o.ms ?? 800;
  const t = makeText(scene, x, y, text, size, color, { origin: [0.5, 0.5] }).setDepth(o.depth ?? 90).setScale(0.3);
  scene.tweens.add({ targets: t, scale: 1, duration: 160, ease: "Back.Out" });
  scene.tweens.add({ targets: t, y: y - (o.rise ?? 56), alpha: 0, delay: ms * 0.4, duration: ms * 0.6, ease: "Sine.In", onComplete: () => t.destroy() });
}
var Counter = class {
  constructor() {
    this.shown = 0;
  }
  update(target, dtMs) {
    const diff = target - this.shown;
    if (Math.abs(diff) < 0.5) this.shown = target;
    else this.shown += diff * Math.min(1, dtMs / 110);
    return Math.round(this.shown);
  }
  reset(value = 0) {
    this.shown = value;
  }
};
var Particles = class {
  constructor() {
    this.list = [];
  }
  burst(x, y, o) {
    const colors = Array.isArray(o.color) ? o.color : [o.color];
    for (let i = 0; i < o.n; i++) {
      const spread = o.spread ?? Math.PI * 2;
      const base = o.angle ?? 0;
      const a = o.angle === void 0 ? Math.random() * Math.PI * 2 : base + (Math.random() - 0.5) * spread;
      const sp = (o.speed ?? 240) * (0.35 + Math.random() * 0.65);
      const life = (o.life ?? 600) * (0.6 + Math.random() * 0.4);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        max: life,
        size: (o.size ?? 7) * (0.6 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity: o.gravity ?? 600
      });
    }
    if (this.list.length > 500) this.list.splice(0, this.list.length - 500);
  }
  update(dtMs) {
    const dt = dtMs / 1e3;
    for (const p of this.list) {
      p.life -= dtMs;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }
  draw(g) {
    for (const p of this.list) {
      const k = p.life / p.max;
      const s = Math.max(1, p.size * (0.4 + 0.6 * k));
      g.fillStyle(PAL.ink0, 0.9 * Math.min(1, k * 2));
      g.fillRect(p.x - s / 2 - 1, p.y - s / 2 - 1, s + 2, s + 2);
      g.fillStyle(p.color, Math.min(1, k * 2));
      g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }
  clear() {
    this.list = [];
  }
};
var Overlay = class {
  constructor(scene, w, h) {
    this.scene = scene;
    this.w = w;
    this.h = h;
    this.onPress = () => void 0;
    this.visible = false;
    this.root = scene.add.container(0, 0).setDepth(300).setVisible(false);
  }
  show(o, onPress) {
    const s = this.scene;
    this.onPress = onPress;
    this.root.removeAll(true);
    this.visible = true;
    this.root.setVisible(true).setAlpha(0);
    const lines = o.lines ?? [];
    const pw = Math.min(this.w * 0.82, 560);
    const ph = 56 + 78 + (o.subtitle ? 40 : 0) + lines.length * 32 + (o.button ? 100 : 0) + (o.hint ? 44 : 0) + 20;
    const px = (this.w - pw) / 2;
    const py = (this.h - ph) / 2;
    const shade = s.add.rectangle(this.w / 2, this.h / 2, this.w, this.h, PAL.bg, 0.74).setInteractive();
    const g = s.add.graphics();
    drawPanel(g, px, py, pw, ph, { fill: PAL.field, border: PAL.ink0, depth: 10, bw: 6 });
    g.fillStyle(PAL.orange, 1);
    g.fillRect(px + 6, py + 6, pw - 12, 10);
    this.root.add([shade, g]);
    let y = py + 40;
    this.root.add(makeText(s, this.w / 2, y, o.title, 64, PAL.orangeLight, { origin: [0.5, 0], strokeW: 8 }));
    y += 82;
    if (o.subtitle) {
      this.root.add(makeText(s, this.w / 2, y, o.subtitle, 24, PAL.cream, { font: FONT_BODY, origin: [0.5, 0], strokeW: 4 }));
      y += 40;
    }
    for (const line of lines) {
      this.root.add(makeText(s, this.w / 2, y, line, 22, PAL.panel2, { font: FONT_BODY, origin: [0.5, 0], strokeW: 4, shadow: false }));
      y += 32;
    }
    if (o.button) {
      y += 18;
      const bw = Math.min(pw - 80, 320);
      const bh = 64;
      const bx = this.w / 2 - bw / 2;
      const btn = s.add.container(this.w / 2, y + bh / 2);
      const bg = s.add.graphics();
      drawPanel(bg, -bw / 2, -bh / 2, bw, bh, { fill: PAL.orange, border: PAL.ink0, depth: 8, bw: 4 });
      bg.fillStyle(16777215, 0.3);
      bg.fillRect(-bw / 2 + 4, -bh / 2 + 4, bw - 8, 8);
      const label = makeText(s, 0, -2, o.button, 34, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 });
      btn.add([bg, label]);
      const zone = s.add.zone(bx + bw / 2, y + bh / 2, bw, bh).setInteractive({ useHandCursor: true });
      zone.on("pointerdown", () => {
        s.tweens.add({ targets: btn, scale: 0.94, duration: 70, yoyo: true });
        tone(520, 0.07, { vol: 0.04, type: "square" });
        this.onPress();
      });
      this.root.add([btn, zone]);
      s.tweens.add({ targets: btn, scale: 1.05, duration: 620, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      y += bh + 24;
    }
    if (o.hint) {
      this.root.add(makeText(s, this.w / 2, y, o.hint, 18, PAL.dim, { font: FONT_BODY, origin: [0.5, 0], strokeW: 3, shadow: false }));
    }
    s.tweens.add({ targets: this.root, alpha: 1, duration: 180, ease: "Sine.Out" });
  }
  hide() {
    this.visible = false;
    this.root.setVisible(false);
    this.root.removeAll(true);
  }
  /** Espace/Entrée : même effet que le bouton. */
  activate() {
    if (this.visible) this.onPress();
  }
};
var MuteButton = class {
  constructor(scene, x, y, size = 48) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.g = scene.add.graphics().setDepth(80);
    const zone = scene.add.zone(x + size / 2, y + size / 2, size, size).setInteractive({ useHandCursor: true });
    zone.on("pointerdown", () => this.toggle());
    scene.input.keyboard?.on("keydown-M", () => this.toggle());
    this.draw();
  }
  toggle() {
    const muted2 = toggleMute();
    if (!muted2) tone(660, 0.08, { vol: 0.04 });
    this.draw();
  }
  draw() {
    const g = this.g;
    const { x, y, size: s } = this;
    g.clear();
    drawPanel(g, x, y, s, s, { fill: PAL.field, depth: 4, bw: 3 });
    const c = isMuted() ? PAL.dim : PAL.cream;
    const cx = x + s / 2;
    const cy = y + s / 2;
    g.fillStyle(c, 1);
    g.fillRect(cx - 12, cy - 5, 7, 10);
    g.fillTriangle(cx - 5, cy - 5, cx + 5, cy - 13, cx + 5, cy + 13);
    g.fillTriangle(cx - 5, cy - 5, cx + 5, cy + 13, cx - 5, cy + 5);
    if (isMuted()) {
      g.lineStyle(4, PAL.red, 1);
      g.beginPath();
      g.moveTo(cx + 9, cy - 9);
      g.lineTo(cx + 19, cy + 9);
      g.moveTo(cx + 19, cy - 9);
      g.lineTo(cx + 9, cy + 9);
      g.strokePath();
    } else {
      g.lineStyle(3, c, 1);
      g.beginPath();
      g.arc(cx + 5, cy, 9, -0.9, 0.9, false);
      g.strokePath();
      g.beginPath();
      g.arc(cx + 5, cy, 15, -0.9, 0.9, false);
      g.strokePath();
    }
  }
};
function onBlur(scene, fn) {
  scene.game.events.on(Phaser.Core.Events.BLUR, fn);
}

// src/shared/rng.ts
var Rng = class {
  constructor(seed) {
    this.state = seed >>> 0;
  }
  /** Nombre dans [0, 1). */
  next() {
    this.state = this.state + 1831565813 >>> 0;
    let t = this.state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  /** Entier dans [0, n). */
  int(n) {
    return Math.floor(this.next() * n);
  }
  /** Mélange en place (Fisher-Yates) et renvoie le même tableau. */
  shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const tmp = items[i];
      items[i] = items[j];
      items[j] = tmp;
    }
    return items;
  }
};

// src/breakout/core/rules.ts
var COLS = 10;
var MAX_LEVELS = 10;
var START_LIVES = 3;
var POWERUPS = ["wide", "multi", "laser", "sticky"];
function parseLevel(level) {
  const bricks = [];
  level.rows.forEach((line, row) => {
    for (let col = 0; col < Math.min(COLS, line.length); col++) {
      const ch = line[col];
      if (ch === ".") continue;
      if (ch === "X") {
        bricks.push({ row, col, hits: 1, maxHits: 1, indestructible: true });
      } else if (ch >= "1" && ch <= "3") {
        const n = Number(ch);
        bricks.push({ row, col, hits: n, maxHits: n, indestructible: false });
      }
    }
  });
  return bricks;
}
var BreakoutRules = class {
  constructor(levels, rng, dropChance = 0.12) {
    this.levels = levels;
    this.rng = rng;
    this.dropChance = dropChance;
    this.score = 0;
    this.lives = START_LIVES;
    this.level = 1;
    this.events = [];
    this.bricks = parseLevel(levels[0]);
  }
  get won() {
    return this.level > MAX_LEVELS;
  }
  get over() {
    return this.lives <= 0 || this.won;
  }
  /** Briques à détruire pour finir le niveau (les indestructibles ne comptent pas). */
  get remaining() {
    return this.bricks.filter((b) => !b.indestructible).length;
  }
  /** Coup sur la brique (row, col). Renvoie vrai si la brique a été détruite. */
  hit(row, col) {
    const brick = this.bricks.find((b) => b.row === row && b.col === col);
    if (!brick || brick.indestructible) return false;
    brick.hits--;
    const destroyed = brick.hits <= 0;
    const points = destroyed ? 10 * brick.maxHits : 0;
    this.score += points;
    this.events.push({ type: "hit", row, col, points, destroyed });
    if (destroyed) {
      this.bricks = this.bricks.filter((b) => b !== brick);
      if (this.rng.next() < this.dropChance) {
        const power = POWERUPS[this.rng.int(POWERUPS.length)];
        this.events.push({ type: "drop", power, row, col });
      }
      if (this.remaining === 0) this.clearLevel();
    }
    return destroyed;
  }
  /** La balle est tombée sous la raquette. */
  loseLife() {
    this.lives--;
    this.events.push({ type: "lifeLost", lives: this.lives });
    if (this.lives <= 0) this.events.push({ type: "gameover", score: this.score });
  }
  clearLevel() {
    const bonus = 100 * this.level;
    this.score += bonus;
    this.events.push({ type: "levelClear", level: this.level, bonus });
    this.level++;
    if (this.won) {
      this.events.push({ type: "win", score: this.score });
      this.bricks = [];
      return;
    }
    this.bricks = parseLevel(this.levels[this.level - 1]);
  }
  flush() {
    const out = this.events;
    this.events = [];
    return out;
  }
};

// src/breakout/core/world.ts
var FIELD_W = 460;
var FIELD_H = 700;
var CELL_W = 46;
var CELL_H = 24;
var BRICK_TOP = 96;
var PADDLE_Y = 656;
var PADDLE_H = 14;
var BASE_PADDLE_W = 92;
var BALL_R = 8;
var WIDE_TICKS = 720;
var LASER_TICKS = 600;
var STICKY_TICKS = 900;
var LASER_COOLDOWN = 16;
function speedFor(level) {
  return Math.min(10, 7 + (level - 1) * 0.3);
}
function brickRect(row, col) {
  return { x: col * CELL_W + CELL_W / 2, y: BRICK_TOP + row * CELL_H + CELL_H / 2, w: CELL_W, h: CELL_H };
}
var BreakoutWorld = class {
  constructor(levels, seed, dropChance) {
    this.paddleX = FIELD_W / 2;
    this.paddleW = BASE_PADDLE_W;
    this.balls = [];
    this.drops = [];
    this.lasers = [];
    this.timers = { wide: 0, laser: 0, sticky: 0, cool: 0 };
    /** Ticks restants de l'introduction d'un niveau (pour l'affichage). */
    this.intro = 0;
    /** Ticks écoulés depuis le début de la partie. */
    this.tick = 0;
    this.targetX = FIELD_W / 2;
    this.events = [];
    this.rng = new Rng(seed);
    this.rules = new BreakoutRules(levels, this.rng, dropChance);
    this.serve();
    this.events.push({ type: "levelStart", level: 1 });
    this.intro = 90;
  }
  get over() {
    return this.rules.over;
  }
  get won() {
    return this.rules.won;
  }
  get speed() {
    return speedFor(Math.min(this.rules.level, 10));
  }
  get paddleTargetW() {
    return this.timers.wide > 0 ? BASE_PADDLE_W * 1.5 : BASE_PADDLE_W;
  }
  /** Raquette vers x (souris, doigt) : elle y glisse en quelques ticks. */
  moveTo(x) {
    this.targetX = x;
  }
  /** Raquette au clavier ou à la manette : décalage par tick. */
  nudge(dir) {
    this.targetX += dir * 10;
  }
  /** Lance les balles collées, sinon tire si le laser est actif. */
  fire() {
    const stuck = this.balls.filter((b) => b.stuck);
    if (stuck.length > 0) {
      for (const b of stuck) this.release(b);
      this.events.push({ type: "launch" });
      return;
    }
    if (this.timers.laser > 0 && this.timers.cool <= 0) {
      const half = this.paddleW / 2 - 8;
      this.lasers.push({ x: this.paddleX - half, y: PADDLE_Y - 10 }, { x: this.paddleX + half, y: PADDLE_Y - 10 });
      this.timers.cool = LASER_COOLDOWN;
      this.events.push({ type: "laser" });
    }
  }
  /** Un tick (60 Hz). */
  step() {
    if (this.over) return this.flush();
    this.tick++;
    if (this.intro > 0) this.intro--;
    for (const key of ["wide", "laser", "sticky", "cool"]) {
      if (this.timers[key] > 0) this.timers[key]--;
    }
    this.movePaddle();
    this.moveBalls();
    this.moveLasers();
    this.moveDrops();
    this.collect();
    return this.flush();
  }
  // ---------- raquette ----------
  movePaddle() {
    const targetW = this.paddleTargetW;
    this.paddleW += (targetW - this.paddleW) * 0.25;
    if (Math.abs(targetW - this.paddleW) < 0.3) this.paddleW = targetW;
    const half = this.paddleW / 2;
    this.targetX = Math.max(half, Math.min(FIELD_W - half, this.targetX));
    const dx = (this.targetX - this.paddleX) * 0.6;
    this.paddleX += Math.max(-30, Math.min(30, dx));
    this.paddleX = Math.max(half, Math.min(FIELD_W - half, this.paddleX));
  }
  // ---------- balles ----------
  serve() {
    const ball = { x: this.paddleX, y: PADDLE_Y - PADDLE_H / 2 - BALL_R, vx: 0, vy: 0, stuck: true, stuckDx: 0 };
    this.balls = [ball];
  }
  release(ball) {
    const rel = Math.max(-1, Math.min(1, ball.stuckDx / (this.paddleW / 2)));
    let angle = rel * (Math.PI / 3.2);
    if (Math.abs(angle) < 0.12) angle += (this.rng.next() < 0.5 ? -1 : 1) * 0.16;
    const s = this.speed;
    ball.stuck = false;
    ball.vx = Math.sin(angle) * s;
    ball.vy = -Math.cos(angle) * s;
  }
  moveBalls() {
    const keep = [];
    for (const ball of this.balls) {
      if (ball.stuck) {
        ball.x = this.paddleX + ball.stuckDx;
        ball.y = PADDLE_Y - PADDLE_H / 2 - BALL_R;
        keep.push(ball);
        continue;
      }
      if (this.advance(ball)) keep.push(ball);
    }
    this.balls = keep;
    if (this.balls.length === 0) {
      this.rules.loseLife();
      this.clearPowers();
      if (!this.rules.over) this.serve();
    }
  }
  /** Avance la balle par petits pas ; renvoie faux si elle est tombée. */
  advance(ball) {
    const s = Math.hypot(ball.vx, ball.vy);
    const n = Math.max(1, Math.ceil(s / 3));
    for (let i = 0; i < n; i++) {
      ball.x += ball.vx / n;
      ball.y += ball.vy / n;
      this.wallBounce(ball);
      if (ball.vy > 0) this.paddleBounce(ball);
      if (ball.stuck) return true;
      this.brickBounce(ball);
      if (ball.y - BALL_R > FIELD_H + 24) return false;
    }
    return true;
  }
  wallBounce(ball) {
    if (ball.x < BALL_R) {
      ball.x = BALL_R;
      ball.vx = Math.abs(ball.vx);
      this.events.push({ type: "wall", x: 0, y: ball.y });
    } else if (ball.x > FIELD_W - BALL_R) {
      ball.x = FIELD_W - BALL_R;
      ball.vx = -Math.abs(ball.vx);
      this.events.push({ type: "wall", x: FIELD_W, y: ball.y });
    }
    if (ball.y < BALL_R) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy);
      this.events.push({ type: "wall", x: ball.x, y: 0 });
    }
  }
  paddleBounce(ball) {
    const top = PADDLE_Y - PADDLE_H / 2;
    if (ball.y + BALL_R < top || ball.y - BALL_R > PADDLE_Y + PADDLE_H) return;
    const half = this.paddleW / 2;
    if (ball.x < this.paddleX - half - BALL_R * 0.6 || ball.x > this.paddleX + half + BALL_R * 0.6) return;
    const rel = Math.max(-1, Math.min(1, (ball.x - this.paddleX) / half));
    ball.y = top - BALL_R;
    if (this.timers.sticky > 0) {
      ball.stuck = true;
      ball.stuckDx = ball.x - this.paddleX;
      ball.vx = 0;
      ball.vy = 0;
      this.events.push({ type: "paddle", x: ball.x, y: top, stuck: true });
      return;
    }
    const angle = rel * (Math.PI / 3.1);
    const s = this.speed;
    ball.vx = Math.sin(angle) * s;
    ball.vy = -Math.cos(angle) * s;
    this.events.push({ type: "paddle", x: ball.x, y: top, stuck: false });
  }
  /** Cercle contre cases de briques : on traite la plus enfoncée, on renvoie la balle à vitesse constante. */
  brickBounce(ball) {
    let best = null;
    for (const b of this.rules.bricks) {
      const r = brickRect(b.row, b.col);
      const cx = Math.max(r.x - r.w / 2, Math.min(ball.x, r.x + r.w / 2));
      const cy = Math.max(r.y - r.h / 2, Math.min(ball.y, r.y + r.h / 2));
      let dx = ball.x - cx;
      let dy = ball.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= BALL_R * BALL_R) continue;
      let pen;
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        pen = BALL_R - d;
        dx /= d;
        dy /= d;
      } else {
        const left = ball.x - (r.x - r.w / 2);
        const right = r.x + r.w / 2 - ball.x;
        const topD = ball.y - (r.y - r.h / 2);
        const bottom = r.y + r.h / 2 - ball.y;
        const m = Math.min(left, right, topD, bottom);
        dx = m === left ? -1 : m === right ? 1 : 0;
        dy = m === topD ? -1 : m === bottom ? 1 : 0;
        pen = BALL_R + m;
      }
      if (!best || pen > best.pen) best = { row: b.row, col: b.col, nx: dx, ny: dy, pen };
    }
    if (!best) return;
    ball.x += best.nx * best.pen;
    ball.y += best.ny * best.pen;
    const dot = ball.vx * best.nx + ball.vy * best.ny;
    if (dot < 0) {
      ball.vx -= 2 * dot * best.nx;
      ball.vy -= 2 * dot * best.ny;
    }
    this.normalize(ball);
    const brick = this.rules.bricks.find((b) => b.row === best.row && b.col === best.col);
    const rect = brickRect(best.row, best.col);
    if (brick && brick.indestructible) {
      this.events.push({ type: "brick", row: best.row, col: best.col, x: rect.x, y: rect.y, points: 0, destroyed: false, hitsLeft: 1, maxHits: 1, indestructible: true });
    } else {
      this.rules.hit(best.row, best.col);
    }
  }
  /** Remet la vitesse au niveau voulu et empêche les trajectoires quasi horizontales. */
  normalize(ball) {
    const s = this.speed;
    let len = Math.hypot(ball.vx, ball.vy) || 1;
    ball.vx = ball.vx / len * s;
    ball.vy = ball.vy / len * s;
    const minVy = s * 0.22;
    if (Math.abs(ball.vy) < minVy) {
      ball.vy = (ball.vy < 0 ? -1 : 1) * minVy;
      len = Math.hypot(ball.vx, ball.vy);
      ball.vx = ball.vx / len * s;
      ball.vy = ball.vy / len * s;
    }
  }
  // ---------- lasers, bonus ----------
  moveLasers() {
    this.lasers = this.lasers.filter((l) => {
      l.y -= 12;
      if (l.y < 0) return false;
      for (const b of this.rules.bricks) {
        const r = brickRect(b.row, b.col);
        if (Math.abs(l.x - r.x) <= r.w / 2 && Math.abs(l.y - r.y) <= r.h / 2) {
          if (b.indestructible) this.events.push({ type: "brick", row: b.row, col: b.col, x: r.x, y: r.y, points: 0, destroyed: false, hitsLeft: 1, maxHits: 1, indestructible: true });
          else this.rules.hit(b.row, b.col);
          return false;
        }
      }
      return true;
    });
  }
  moveDrops() {
    this.drops = this.drops.filter((d) => {
      d.y += 2.6;
      const caught = d.y >= PADDLE_Y - PADDLE_H && d.y <= PADDLE_Y + PADDLE_H && Math.abs(d.x - this.paddleX) < this.paddleW / 2 + 12;
      if (caught) {
        this.applyPower(d.power);
        return false;
      }
      return d.y < FIELD_H + 30;
    });
  }
  applyPower(power) {
    this.events.push({ type: "power", power });
    if (power === "wide") this.timers.wide = WIDE_TICKS;
    else if (power === "laser") this.timers.laser = LASER_TICKS;
    else if (power === "sticky") this.timers.sticky = STICKY_TICKS;
    else {
      for (const b of this.balls.filter((x) => x.stuck)) this.release(b);
      for (const b of [...this.balls]) {
        const angle = Math.atan2(b.vy, b.vx);
        for (const dir of [-1, 1]) {
          const nb = { x: b.x, y: b.y, vx: 0, vy: 0, stuck: false, stuckDx: 0 };
          nb.vx = Math.cos(angle + dir * 0.4) * this.speed;
          nb.vy = Math.sin(angle + dir * 0.4) * this.speed;
          this.balls.push(nb);
        }
      }
    }
  }
  clearPowers() {
    this.drops = [];
    this.lasers = [];
    this.timers = { wide: 0, laser: 0, sticky: 0, cool: 0 };
  }
  // ---------- règles ----------
  /** Traduit les événements des règles (briques, bonus, vies, niveaux) en événements du monde. */
  collect() {
    for (const e of this.rules.flush()) {
      if (e.type === "hit") {
        const r = brickRect(e.row, e.col);
        const brick = this.rules.bricks.find((b) => b.row === e.row && b.col === e.col);
        this.events.push({ type: "brick", row: e.row, col: e.col, x: r.x, y: r.y, points: e.points, destroyed: e.destroyed, hitsLeft: brick ? brick.hits : 0, maxHits: brick ? brick.maxHits : 1, indestructible: false });
      } else if (e.type === "drop") {
        const r = brickRect(e.row, e.col);
        this.drops.push({ power: e.power, x: r.x, y: r.y });
        this.events.push({ type: "drop", power: e.power, x: r.x, y: r.y });
      } else if (e.type === "lifeLost") {
        this.events.push({ type: "lifeLost", lives: e.lives });
      } else if (e.type === "levelClear") {
        this.events.push({ type: "levelClear", level: e.level, bonus: e.bonus });
        this.clearPowers();
        this.serve();
        if (!this.rules.won) {
          this.intro = 90;
          this.events.push({ type: "levelStart", level: this.rules.level });
        }
      } else if (e.type === "win") {
        this.events.push({ type: "win", score: e.score });
      } else if (e.type === "gameover") {
        this.events.push({ type: "gameover", score: e.score });
      }
    }
  }
  flush() {
    const out = this.events;
    this.events = [];
    return out;
  }
};

// src/breakout/render/scene.ts
var TICK_MS = 1e3 / 60;
var GAME_W = 800;
var GAME_H = 820;
var FX = 170;
var FY = 70;
var LX = 20;
var RX = 640;
var COL_W = 140;
var BEST_KEY = "arcade.breakout.best";
var BRICK_COLORS = { 1: PAL.leaf, 2: PAL.orangeLight, 3: PAL.berry };
var POWER_COLORS = { wide: PAL.leaf, multi: PAL.orangeLight, laser: PAL.berry, sticky: PAL.tan };
var POWER_NAMES = { wide: "RAQUETTE LARGE", multi: "MULTIBALLE", laser: "LASER", sticky: "RAQUETTE COLLANTE" };
var BreakoutScene = class extends Phaser.Scene {
  constructor() {
    super("breakout");
    this.levels = [];
    this.state = "loading";
    this.acc = 0;
    this.best = 0;
    this.newRecord = false;
    this.fx = new Particles();
    this.mascot = null;
    this.lastPaddleX = FIELD_W / 2;
    this.facing = 1;
    this.art = {
      ball: null,
      rock: null,
      brick: {},
      squirrel: [],
      power: {}
    };
    this.score = new Counter();
    this.wobble = /* @__PURE__ */ new Map();
    this.trail = /* @__PURE__ */ new Map();
    this.prevPad = [];
    this.shown = { score: -1, level: -1, best: -1 };
  }
  create() {
    this.gfx = this.add.graphics().setDepth(10).setPosition(FX, FY);
    this.fxg = this.add.graphics().setDepth(40).setPosition(FX, FY);
    this.ug = this.add.graphics().setDepth(60);
    this.sprites = new SpritePool(this, 12, FX, FY);
    this.uiSprites = new SpritePool(this, 62);
    this.art = {
      ball: spriteKey(this, "goldacorn", 3),
      rock: spriteKey(this, "stump", 2),
      brick: { 1: spriteKey(this, "clover", 2), 2: spriteKey(this, "acorn", 2), 3: spriteKey(this, "berry", 2) },
      squirrel: spriteKeys(this, "sq_noisette", 2),
      power: { wide: spriteKey(this, "log", 2), multi: spriteKey(this, "swarm", 2), laser: spriteKey(this, "bolt", 2), sticky: spriteKey(this, "drop", 2) }
    };
    this.mascot = new Mascot(this, "sq_pip", LX + COL_W / 2, GAME_H - 14, 5);
    this.overlay = new Overlay(this, GAME_W, GAME_H);
    new MuteButton(this, GAME_W - 68, 8, 48);
    makeText(this, 20, 6, "BREAKOUT", 46, PAL.orangeLight, { strokeW: 8 }).setDepth(5);
    this.add.text(GAME_W / 2, GAME_H / 2, "chargement\u2026", { fontFamily: FONT_BODY, fontSize: "24px", color: "#fdf3de" }).setOrigin(0.5).setName("loading");
    this.keys = this.input.keyboard.addKeys({
      left: "LEFT",
      right: "RIGHT",
      a: "A",
      d: "D",
      space: "SPACE",
      up: "UP",
      p: "P",
      esc: "ESC",
      r: "R",
      enter: "ENTER"
    });
    this.input.on("pointermove", (p) => {
      if (this.state === "playing") this.world.moveTo(p.x - FX);
    });
    this.input.on("pointerdown", (p) => {
      if (this.state !== "playing") return;
      this.world.moveTo(p.x - FX);
      this.world.fire();
    });
    onBlur(this, () => {
      if (this.state === "playing") this.pause();
    });
    void fetch(`data/arcade/levels.json${VERSION_QUERY}`).then((r) => r.json()).then((json) => {
      this.levels = json.levels;
      this.children.getByName("loading")?.destroy();
      this.best = loadBest(BEST_KEY);
      this.buildStatic();
      this.resetGame();
      this.showStart();
    });
  }
  // ---------- décor fixe ----------
  buildStatic() {
    const bg = this.add.graphics().setDepth(0);
    drawPanel(bg, FX - 14, FY - 14, FIELD_W + 28, FIELD_H + 28, { fill: 1782308, depth: 8, bw: 8 });
    for (let r = 0; r < FIELD_H / CELL_H; r++) {
      for (let c = 0; c < FIELD_W / CELL_W; c++) {
        bg.fillStyle((r + c) % 2 === 0 ? 2178861 : 2508851, 1);
        bg.fillRect(FX + c * CELL_W, FY + r * CELL_H, CELL_W, CELL_H);
      }
    }
    bg.fillStyle(1452319, 0.8);
    bg.fillRect(FX, FY + PADDLE_Y - 34, FIELD_W, FIELD_H - PADDLE_Y + 34);
    const panel = (x, y, h, title) => {
      drawPanel(bg, x, y, COL_W, h, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(x + 4, y + 4, COL_W - 8, 30);
      makeText(this, x + COL_W / 2, y + 19, title, 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
    };
    panel(LX, FY, 120, "SCORE");
    panel(LX, FY + 142, 96, "VIES");
    panel(LX, FY + 260, 120, "NIVEAU");
    panel(LX, FY + 402, 96, "MEILLEUR");
    panel(RX, FY, 250, "BONUS");
    this.texts = {
      score: makeText(this, LX + COL_W / 2, FY + 82, "0", 36, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 }).setDepth(5),
      level: makeText(this, LX + COL_W / 2, FY + 260 + 66, "1/10", 34, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 }).setDepth(5),
      levelName: makeText(this, LX + COL_W / 2, FY + 260 + 100, "", 15, PAL.dim, { font: FONT_BODY, origin: [0.5, 0.5], strokeW: 3, shadow: false }).setDepth(5),
      best: makeText(this, LX + COL_W / 2, FY + 402 + 64, "0", 32, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 5 }).setDepth(5)
    };
    drawPanel(bg, RX, FY + 272, COL_W, 250, { fill: PAL.field, depth: 6, bw: 4 });
    bg.fillStyle(PAL.ink0, 1);
    bg.fillRect(RX + 4, FY + 276, COL_W - 8, 30);
    makeText(this, RX + COL_W / 2, FY + 291, "COMMANDES", 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
    const rows = [["\u2190 \u2192", "bouger"], ["souris", "bouger"], ["ESPACE", "lancer"], ["clic", "lancer"], ["P", "pause"], ["M", "son"]];
    rows.forEach(([k, label], i) => {
      const y = FY + 318 + i * 32;
      makeText(this, RX + 12, y, k, 16, PAL.leaf, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5).setFontStyle("800");
      makeText(this, RX + COL_W - 12, y + 2, label, 14, PAL.panel2, { font: FONT_BODY, origin: [1, 0], strokeW: 3, shadow: false }).setDepth(5);
    });
  }
  // ---------- états ----------
  resetGame() {
    this.world = new BreakoutWorld(this.levels, readSeed());
    this.acc = 0;
    this.newRecord = false;
    this.fx.clear();
    this.wobble.clear();
    this.trail.clear();
    this.score.reset(0);
    this.shown = { score: -1, level: -1, best: -1 };
  }
  showStart() {
    this.state = "ready";
    this.overlay.show(
      { title: "BREAKOUT", subtitle: this.best > 0 ? `Meilleur score : ${this.best}` : "Dix niveaux de briques", lines: ["Casse tout, attrape les bonus", "L'impact sur la raquette oriente la balle"], button: "Jouer", hint: "ESPACE ou clic" },
      () => this.startGame()
    );
  }
  startGame() {
    this.overlay.hide();
    if (this.state !== "ready") this.resetGame();
    this.mascot?.reset();
    this.state = "playing";
    arp([392, 523, 659], 0.07, { vol: 0.04 });
  }
  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.overlay.show({ title: "PAUSE", lines: ["Ta partie est en attente"], button: "Reprendre", hint: "P ou ESPACE" }, () => this.resume());
  }
  resume() {
    if (this.state !== "paused") return;
    this.overlay.hide();
    this.state = "playing";
  }
  finish(won, score) {
    this.state = won ? "won" : "over";
    if (score > this.best) {
      this.best = score;
      this.newRecord = true;
      saveBest(BEST_KEY, this.best);
    }
    if (won) arp([523, 659, 784, 1047, 784, 1047, 1319], 0.1, { vol: 0.05 });
    else [0, 1, 2, 3].forEach((i) => tone(330 - i * 60, 0.22, { vol: 0.05, type: "sawtooth", delay: i * 0.12, freqEnd: 200 - i * 40 }));
    this.time.delayedCall(won ? 900 : 700, () => {
      if (this.state !== "over" && this.state !== "won") return;
      this.overlay.show(
        {
          title: won ? "VICTOIRE !" : "PARTIE FINIE",
          subtitle: `Score ${score}`,
          lines: [won ? "Les dix niveaux sont \xE0 toi" : `Niveau ${Math.min(this.world.rules.level, 10)} atteint`, this.newRecord ? "\u2605 Nouveau record ! \u2605" : `Meilleur : ${this.best}`],
          button: "Rejouer",
          hint: "ESPACE ou R"
        },
        () => this.startGame()
      );
    });
  }
  // ---------- boucle ----------
  update(_time, delta) {
    if (this.state === "loading") return;
    this.fx.update(delta);
    this.mascot?.update(delta);
    const j = {};
    for (const name of Object.keys(this.keys)) j[name] = Phaser.Input.Keyboard.JustDown(this.keys[name]);
    if (j.r && this.state !== "ready") this.startGame();
    if ((j.space || j.enter) && this.overlay.visible) {
      this.overlay.activate();
      j.space = false;
      j.enter = false;
    }
    if (j.p || j.esc) {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
    }
    const pad = readPad();
    if (pad && pad.buttons[9] && !this.prevPad[9]) {
      if (this.state === "playing") this.pause();
      else if (this.overlay.visible) this.overlay.activate();
    }
    if (this.state === "playing") {
      const k = this.keys;
      const dir = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0) + (pad ? pad.x : 0);
      if (j.space || j.up || pad && pad.buttons[0] && !this.prevPad[0]) this.world.fire();
      this.acc += delta;
      while (this.acc >= TICK_MS) {
        this.acc -= TICK_MS;
        if (dir !== 0) this.world.nudge(dir);
        this.onEvents(this.world.step());
        if (this.state !== "playing") break;
      }
    }
    this.prevPad = pad ? pad.buttons.slice() : [];
    this.render(delta);
  }
  onEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case "wall":
          tone(210, 0.03, { vol: 0.02, type: "triangle" });
          break;
        case "paddle":
          tone(e.stuck ? 260 : 340, 0.05, { vol: 0.035, type: "triangle", freqEnd: 260 });
          this.fx.burst(e.x, e.y, { n: 3, color: [PAL.cream], speed: 120, life: 220, size: 4, gravity: 300, angle: -Math.PI / 2, spread: Math.PI });
          break;
        case "brick":
          this.onBrick(e);
          break;
        case "drop":
          break;
        case "power":
          this.onPower(e.power);
          break;
        case "launch":
          noise(0.1, { vol: 0.04, freq: 1400 });
          tone(300, 0.1, { vol: 0.04, type: "sawtooth", freqEnd: 600 });
          break;
        case "laser":
          tone(1200, 0.04, { vol: 0.02, type: "square", freqEnd: 500 });
          break;
        case "lifeLost":
          tone(220, 0.4, { vol: 0.05, type: "sawtooth", freqEnd: 70 });
          this.cameras.main.shake(260, 0.01);
          this.mascot?.sad();
          popText(this, FX + FIELD_W / 2, FY + 440, e.lives > 0 ? `PLUS QUE ${e.lives} ${e.lives > 1 ? "VIES" : "VIE"}` : "DERNI\xC8RE BALLE PERDUE", 38, PAL.red, { ms: 1100 });
          break;
        case "levelClear":
          arp([523, 659, 784, 1047], 0.07, { vol: 0.05 });
          this.cameras.main.shake(200, 6e-3);
          this.mascot?.cheer();
          popText(this, FX + FIELD_W / 2, FY + 330, `NIVEAU ${e.level} TERMIN\xC9`, 40, PAL.leaf, { ms: 1100 });
          popText(this, FX + FIELD_W / 2, FY + 380, `BONUS +${e.bonus}`, 28, PAL.orangeLight, { ms: 1100, rise: 30 });
          break;
        case "levelStart": {
          const name = this.levels[Math.min(e.level, 10) - 1]?.name ?? "";
          popText(this, FX + FIELD_W / 2, FY + 440, `NIVEAU ${e.level}`, 54, PAL.orangeLight, { ms: 1500, rise: 30 });
          popText(this, FX + FIELD_W / 2, FY + 492, name, 26, PAL.cream, { ms: 1500, rise: 20 });
          break;
        }
        case "win":
          this.finish(true, e.score);
          break;
        case "gameover":
          this.finish(false, e.score);
          break;
      }
    }
  }
  onBrick(e) {
    if (e.indestructible) {
      tone(130, 0.06, { vol: 0.04, type: "square", freqEnd: 90 });
      this.wobble.set(`${e.row}:${e.col}`, 120);
      return;
    }
    const color = BRICK_COLORS[e.maxHits] ?? PAL.leaf;
    const pitch = 360 + Math.max(0, 8 - e.row) * 55;
    this.wobble.set(`${e.row}:${e.col}`, 140);
    if (e.destroyed) {
      tone(pitch, 0.07, { vol: 0.045, type: "square", freqEnd: pitch * 1.4 });
      noise(0.06, { vol: 0.04, freq: 2600 });
      this.fx.burst(e.x, e.y, { n: 12, color: [color, PAL.cream, mix(color, 16777215, 0.5)], speed: 300, life: 560, size: 8, gravity: 800 });
      this.cameras.main.shake(70, 14e-4);
      popText(this, FX + e.x, FY + e.y, `+${e.points}`, 20, PAL.cream, { ms: 600, rise: 30 });
    } else {
      tone(pitch * 0.7, 0.05, { vol: 0.04, type: "square", freqEnd: pitch * 0.6 });
      this.fx.burst(e.x, e.y, { n: 4, color: [color, PAL.cream], speed: 180, life: 320, size: 5, gravity: 600 });
    }
  }
  onPower(power) {
    arp([660, 880, 1100], 0.05, { vol: 0.045, type: "triangle" });
    this.mascot?.cheer();
    popText(this, FX + this.world.paddleX, FY + PADDLE_Y - 50, POWER_NAMES[power], 26, POWER_COLORS[power], { ms: 1e3, rise: 40 });
    this.fx.burst(this.world.paddleX, PADDLE_Y, { n: 14, color: [POWER_COLORS[power], PAL.cream], speed: 260, life: 520, size: 7, gravity: 300 });
  }
  // ---------- rendu ----------
  render(delta) {
    const g = this.gfx;
    g.clear();
    this.fxg.clear();
    const ug = this.ug;
    ug.clear();
    const w = this.world;
    this.sprites.begin();
    this.uiSprites.begin();
    const introP = (r, c) => {
      if (w.intro <= 0) return 1;
      const t = (90 - w.intro) / 40 - (r * 0.09 + c * 0.015);
      const p = Math.max(0, Math.min(1, t));
      return 1 - Math.pow(1 - p, 3);
    };
    for (const b of w.rules.bricks) {
      const rect = brickRect(b.row, b.col);
      const key = `${b.row}:${b.col}`;
      const wob = this.wobble.get(key) ?? 0;
      const p = introP(b.row, b.col);
      if (p <= 0) continue;
      const jitter = wob > 0 ? Math.sin(wob * 0.6) * 2.5 * (wob / 140) : 0;
      const bw = rect.w - 4;
      const bh = rect.h - 4;
      const x = rect.x - bw / 2 + jitter;
      const y = rect.y - bh / 2 - (1 - p) * 320;
      const base = b.indestructible ? PAL.cap : BRICK_COLORS[b.maxHits] ?? PAL.leaf;
      const damaged = !b.indestructible && b.hits < b.maxHits;
      drawBevel(g, x, y, bw, bh, wob > 100 ? mix(base, 16777215, 0.6) : base, p);
      this.sprites.draw(b.indestructible ? this.art.rock : this.art.brick[b.maxHits] ?? null, x + bw / 2, y + bh / 2, { alpha: p });
      if (damaged) {
        g.lineStyle(2, PAL.ink0, 0.75 * p);
        g.beginPath();
        g.moveTo(x + bw * 0.3, y + 3);
        g.lineTo(x + bw * 0.42, y + bh * 0.5);
        g.lineTo(x + bw * 0.34, y + bh - 3);
        g.moveTo(x + bw * 0.42, y + bh * 0.5);
        g.lineTo(x + bw * 0.62, y + bh * 0.62);
        g.strokePath();
      }
    }
    for (const [k, v] of [...this.wobble]) {
      if (v - delta <= 0) this.wobble.delete(k);
      else this.wobble.set(k, v - delta);
    }
    for (const l of w.lasers) {
      g.fillStyle(PAL.ink0, 1);
      g.fillRect(l.x - 3, l.y - 2, 6, 16);
      g.fillStyle(PAL.orangeLight, 1);
      g.fillRect(l.x - 1.5, l.y, 3, 12);
    }
    for (const d of w.drops) this.drawCapsule(g, this.sprites, d.power, d.x, d.y);
    const pw = w.paddleW;
    const px = w.paddleX - pw / 2;
    const py = PADDLE_Y - PADDLE_H / 2;
    if (w.timers.sticky > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 120);
      g.fillStyle(PAL.cream, 0.15 + 0.2 * pulse);
      g.fillRect(px - 6, py - 6, pw + 12, PADDLE_H + 12);
    }
    drawBevel(g, px, py, pw, PADDLE_H, PAL.orange);
    g.fillStyle(PAL.ink0, 1);
    g.fillRect(px - 3, py + 2, 6, PADDLE_H - 4);
    g.fillRect(px + pw - 3, py + 2, 6, PADDLE_H - 4);
    if (w.timers.laser > 0) {
      g.fillStyle(PAL.ink0, 1);
      g.fillRect(px + 4, py - 10, 10, 12);
      g.fillRect(px + pw - 14, py - 10, 10, 12);
      g.fillStyle(PAL.berry, 1);
      g.fillRect(px + 6, py - 8, 6, 8);
      g.fillRect(px + pw - 12, py - 8, 6, 8);
    }
    const moving = Math.abs(w.paddleX - this.lastPaddleX) > 0.6;
    if (moving) this.facing = w.paddleX > this.lastPaddleX ? 1 : -1;
    this.lastPaddleX = w.paddleX;
    const sq = this.art.squirrel;
    if (sq.length > 0) {
      const f = moving ? Math.floor(this.time.now / 110) % sq.length : 0;
      this.sprites.draw(sq[f], w.paddleX, py - 21, { flip: this.facing < 0, scale: 1.25 });
    }
    const alive = /* @__PURE__ */ new Set();
    w.balls.forEach((b, i) => {
      alive.add(i);
      let tr = this.trail.get(i);
      if (!tr) {
        tr = [];
        this.trail.set(i, tr);
      }
      if (!b.stuck) {
        tr.push({ x: b.x, y: b.y });
        if (tr.length > 12) tr.shift();
      } else tr.length = 0;
      tr.forEach((p, idx) => {
        const k = idx / Math.max(1, tr.length);
        g.fillStyle(PAL.orangeLight, 0.3 * k);
        g.fillCircle(p.x, p.y, BALL_R * (0.35 + 0.55 * k));
      });
      this.sprites.draw(this.art.ball, b.x, b.y, { rotation: this.time.now / 150 * (b.vx >= 0 ? 1 : -1), scale: 1.2 });
    });
    for (const k of [...this.trail.keys()]) if (!alive.has(k)) this.trail.delete(k);
    const stuck = w.balls.find((b) => b.stuck);
    if (stuck && this.state === "playing") {
      const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 180);
      g.lineStyle(3, PAL.cream, 0.35 + 0.35 * pulse);
      g.beginPath();
      g.moveTo(stuck.x, stuck.y - 18);
      g.lineTo(stuck.x, stuck.y - 52 - pulse * 6);
      g.strokePath();
      g.fillStyle(PAL.cream, 0.5 + 0.4 * pulse);
      g.fillTriangle(stuck.x - 7, stuck.y - 52 - pulse * 6, stuck.x + 7, stuck.y - 52 - pulse * 6, stuck.x, stuck.y - 64 - pulse * 6);
    }
    this.fx.draw(this.fxg);
    for (let i = 0; i < 3; i++) {
      const x = LX + 30 + i * 40;
      const y = FY + 142 + 66;
      this.drawHeart(ug, x, y, i < w.rules.lives);
    }
    const power = [["wide", w.timers.wide, 720], ["laser", w.timers.laser, 600], ["sticky", w.timers.sticky, 900]];
    power.forEach(([p, left, max], i) => {
      const y = FY + 56 + i * 58;
      const on = left > 0;
      this.drawCapsule(ug, this.uiSprites, p, RX + 34, y + 12, on ? 1 : 0.35);
      ug.fillStyle(PAL.ink0, 1);
      ug.fillRect(RX + 62, y + 6, 66, 14);
      ug.fillStyle(on ? POWER_COLORS[p] : 2969402, 1);
      ug.fillRect(RX + 64, y + 8, 62 * (left / max), 10);
    });
    ug.fillStyle(PAL.dim, 0.7);
    ug.fillRect(RX + 14, FY + 56 + 3 * 58 - 6, COL_W - 28, 2);
    this.drawCapsule(ug, this.uiSprites, "multi", RX + 34, FY + 56 + 3 * 58 + 20, 0.9);
    this.sprites.end();
    this.uiSprites.end();
    const sc = this.score.update(w.rules.score, delta);
    if (sc !== this.shown.score) {
      this.texts.score.setText(String(sc));
      this.shown.score = sc;
    }
    const lvl = Math.min(w.rules.level, 10);
    if (lvl !== this.shown.level) {
      this.texts.level.setText(`${lvl}/10`);
      this.texts.levelName.setText(this.levels[lvl - 1]?.name ?? "");
      this.shown.level = lvl;
    }
    const best = Math.max(this.best, w.rules.score);
    if (best !== this.shown.best) {
      this.texts.best.setText(String(best));
      this.shown.best = best;
    }
  }
  /** Capsule de bonus : fond coloré, contour sombre, icône du site. */
  drawCapsule(g, pool, power, x, y, alpha = 1) {
    drawBevel(g, x - 18, y - 11, 36, 22, POWER_COLORS[power], alpha);
    pool.draw(this.art.power[power], x, y, { alpha });
  }
  drawHeart(g, x, y, full) {
    const c = full ? PAL.berry : 2969402;
    g.fillStyle(PAL.ink0, 1);
    g.fillCircle(x - 7, y - 3, 11);
    g.fillCircle(x + 7, y - 3, 11);
    g.fillTriangle(x - 17, y, x + 17, y, x, y + 18);
    g.fillStyle(c, 1);
    g.fillCircle(x - 7, y - 3, 8);
    g.fillCircle(x + 7, y - 3, 8);
    g.fillTriangle(x - 14, y, x + 14, y, x, y + 14);
    if (full) {
      g.fillStyle(16777215, 0.6);
      g.fillCircle(x - 9, y - 6, 2.5);
    }
  }
};

// src/breakout/main.ts
var fontReady = document.fonts ? document.fonts.load('40px "Londrina"').catch(() => void 0) : Promise.resolve();
void fontReady.then(() => {
  const config = {
    type: Phaser.AUTO,
    parent: "game-stage",
    backgroundColor: "#1f3a2b",
    width: GAME_W,
    height: GAME_H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new BreakoutScene()
  };
  const game = new Phaser.Game(config);
  window.breakoutGame = game;
  bindFullscreen("game-stage", () => game.scale.refresh());
});
