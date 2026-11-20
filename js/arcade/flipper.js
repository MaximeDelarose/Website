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
  const filter2 = c.createBiquadFilter();
  filter2.type = "lowpass";
  filter2.frequency.value = opts.freq ?? 1800;
  const gain = c.createGain();
  gain.gain.value = opts.vol ?? 0.05;
  src.connect(filter2).connect(gain).connect(c.destination);
  src.start(t0);
}
function arp(freqs, step, opts = {}) {
  freqs.forEach((f, i) => tone(f, opts.dur ?? step * 1.6, { ...opts, delay: (opts.delay ?? 0) + i * step }));
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

// src/shared/kit.ts
function isTouch() {
  try {
    return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  } catch {
    return false;
  }
}
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
var TouchPad = class {
  constructor(scene, buttons) {
    this.scene = scene;
    this.buttons = buttons;
    this.down = /* @__PURE__ */ new Set();
    this.prev = /* @__PURE__ */ new Set();
    this.labels = /* @__PURE__ */ new Map();
    scene.input.addPointer(3);
    for (const b of buttons) {
      const t = makeText(scene, b.x + b.w / 2, b.y + b.h / 2 - 2, b.label, Math.min(44, b.h * 0.45), PAL.cream, { origin: [0.5, 0.5], strokeW: 5 }).setDepth(70);
      this.labels.set(b.id, t);
    }
  }
  poll() {
    this.prev = new Set(this.down);
    this.down.clear();
    for (const p of this.scene.input.manager.pointers) {
      if (!p.isDown) continue;
      for (const b of this.buttons) {
        if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) this.down.add(b.id);
      }
    }
  }
  isDown(id) {
    return this.down.has(id);
  }
  pressed(id) {
    return this.down.has(id) && !this.prev.has(id);
  }
  draw(g) {
    for (const b of this.buttons) {
      const on = this.down.has(b.id);
      const base = b.color ?? PAL.cap;
      drawPanel(g, b.x, b.y + (on ? 5 : 0), b.w, b.h, { fill: on ? mix(base, 16777215, 0.2) : base, depth: on ? 1 : 6, bw: 4 });
      const t = this.labels.get(b.id);
      if (t) t.setY(b.y + b.h / 2 - 2 + (on ? 5 : 0));
    }
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

// src/flipper/core/rules.ts
var BALLS_PER_GAME = 3;
var MAX_MULT = 5;
var BANK_BONUS = 1e3;
var LIGHT_ALL_BONUS = 1e3;
var RAMP_POINTS = 1e3;
var JACKPOT = 5e3;
var ROULETTE = [
  { id: "p500", label: "500", points: 500 },
  { id: "p2500", label: "2500", points: 2500 },
  { id: "mult", label: "X+1" },
  { id: "p1000", label: "1000", points: 1e3 },
  { id: "extra", label: "BILLE" },
  { id: "p5000", label: "5000", points: 5e3 },
  { id: "save", label: "SAUV\xC9E" },
  { id: "p250", label: "250", points: 250 }
];
var FlipperRules = class {
  constructor(targetIds, rolloverIds, rng) {
    this.targetIds = targetIds;
    this.rolloverIds = rolloverIds;
    this.rng = rng;
    this.score = 0;
    this.ballsLeft = BALLS_PER_GAME;
    this.ballInPlay = false;
    /** Multiplicateur de bonus (1 à 5), remis à 1 à chaque bille perdue. */
    this.mult = 1;
    this.rampCount = 0;
    this.lastRoulette = "";
    this.bankHits = /* @__PURE__ */ new Set();
    this.litRollovers = /* @__PURE__ */ new Set();
    this.bumpersThisBall = 0;
    this.events = [];
  }
  get over() {
    return this.ballsLeft === 0 && !this.ballInPlay;
  }
  /** Une bille est lancée : le décompte de fin de bille repart à zéro (sans effet si une bille est déjà en jeu). */
  launch() {
    if (this.ballInPlay) return;
    this.ballInPlay = true;
    this.bumpersThisBall = 0;
  }
  bumper(points = 100) {
    this.bumpersThisBall++;
    this.add(points * this.mult, "bumper");
  }
  slingshot(points = 10) {
    this.add(points * this.mult, "slingshot");
  }
  /** Spinner : un petit gain à chaque demi-tour. */
  spinner(points = 50) {
    this.add(points * this.mult, "spinner");
  }
  /** Voie d'entrée ou de sortie de côté. */
  lane(kind) {
    this.add(kind === "outlane" ? 500 : 100, kind);
  }
  /** Cible de la banque : chaque cible compte une fois. Renvoie vrai si la banque est complète (bille bonus). */
  target(id, points = 50) {
    if (!this.targetIds.includes(id) || this.bankHits.has(id)) return false;
    this.bankHits.add(id);
    this.add(points * this.mult, "target");
    if (this.bankHits.size === this.targetIds.length) {
      this.bankHits.clear();
      this.score += BANK_BONUS;
      this.events.push({ type: "bank", points: BANK_BONUS });
      return true;
    }
    return false;
  }
  /** Passage sur un rollover : chaque lettre s'allume une fois ; les allumer toutes donne un bonus et monte le multiplicateur. */
  rollover(id, points = 200) {
    if (!this.rolloverIds.includes(id) || this.litRollovers.has(id)) return;
    this.litRollovers.add(id);
    this.add(points, "rollover");
    if (this.litRollovers.size === this.rolloverIds.length) {
      this.litRollovers.clear();
      this.score += LIGHT_ALL_BONUS;
      this.events.push({ type: "lightAll", points: LIGHT_ALL_BONUS });
      this.raiseMult();
    }
  }
  /** Rampe menée à son terme. Renvoie vrai au troisième passage : jackpot. */
  ramp() {
    this.rampCount++;
    const points = RAMP_POINTS * this.mult;
    this.score += points;
    this.events.push({ type: "ramp", count: this.rampCount, points });
    if (this.rampCount % 3 === 0) {
      this.score += JACKPOT;
      this.events.push({ type: "jackpot", points: JACKPOT });
      return true;
    }
    return false;
  }
  /** La bille tombe dans la roulette : tirage d'une case. Renvoie son index. */
  roulette() {
    const index = this.rng ? this.rng.int(ROULETTE.length) : 0;
    const prize = ROULETTE[index];
    this.lastRoulette = prize.label;
    this.events.push({ type: "roulette", index, label: prize.label });
    if (prize.points) this.score += prize.points;
    else if (prize.id === "mult") this.raiseMult();
    else if (prize.id === "extra") {
      this.ballsLeft = Math.min(BALLS_PER_GAME + 2, this.ballsLeft + 1);
      this.events.push({ type: "extraBall", ballsLeft: this.ballsLeft });
    } else if (prize.id === "save") this.events.push({ type: "save" });
    return index;
  }
  raiseMult() {
    if (this.mult >= MAX_MULT) return;
    this.mult++;
    this.events.push({ type: "mult", mult: this.mult });
  }
  /** La bille est sortie. Renvoie le bonus de fin de bille (50 par bumper touché, multiplié). */
  drain() {
    if (!this.ballInPlay) return 0;
    this.ballInPlay = false;
    this.ballsLeft--;
    const bonus = this.bumpersThisBall * 50 * this.mult;
    this.score += bonus;
    this.mult = 1;
    this.events.push({ type: "ballLost", ballsLeft: this.ballsLeft, bonus });
    if (this.over) this.events.push({ type: "gameover", score: this.score });
    return bonus;
  }
  /** Cible déjà touchée dans la banque en cours. */
  targetDown(id) {
    return this.bankHits.has(id);
  }
  /** Lettre de rollover allumée. */
  lit(id) {
    return this.litRollovers.has(id);
  }
  /** Événements accumulés depuis le dernier appel. */
  flush() {
    const out = this.events;
    this.events = [];
    return out;
  }
  add(points, reason) {
    this.score += points;
    this.events.push({ type: "score", points, reason });
  }
};

// src/flipper/render/table.ts
var CAT = { L1: 1, L2: 2, BALL: 4, COMMON: 8 };
function ballMask(level) {
  return (level === 1 ? CAT.L1 : CAT.L2) | CAT.COMMON;
}
function catOf(level) {
  return level === 0 ? CAT.COMMON : level === 1 ? CAT.L1 : CAT.L2;
}
var WALL_THICKNESS = 10;
function filter(level) {
  return { category: catOf(level), mask: CAT.BALL };
}
function buildStatics(data) {
  const bodies = [];
  for (const wall of data.walls) {
    for (let i = 0; i < wall.pts.length - 1; i++) {
      const [ax, ay] = wall.pts[i];
      const [bx, by] = wall.pts[i + 1];
      const len = Math.hypot(bx - ax, by - ay);
      bodies.push(
        Matter.Bodies.rectangle((ax + bx) / 2, (ay + by) / 2, len + WALL_THICKNESS, WALL_THICKNESS, {
          isStatic: true,
          angle: Math.atan2(by - ay, bx - ax),
          frictionStatic: 0,
          restitution: 0.3,
          friction: 0.02,
          label: "wall",
          collisionFilter: filter(wall.level)
        })
      );
    }
  }
  for (const b of data.bumpers) {
    bodies.push(Matter.Bodies.circle(b.x, b.y, b.r, { isStatic: true, frictionStatic: 0, restitution: 0.6, label: `bumper:${b.id}`, collisionFilter: filter(b.level) }));
  }
  for (const t of data.targets) {
    bodies.push(Matter.Bodies.rectangle(t.x, t.y, t.w, t.h, { isStatic: true, frictionStatic: 0, restitution: 0.6, label: `target:${t.id}`, collisionFilter: filter(1) }));
  }
  for (const r of data.rollovers) {
    bodies.push(Matter.Bodies.rectangle(r.x, r.y, r.w, r.h, { isStatic: true, isSensor: true, label: `rollover:${r.id}`, collisionFilter: filter(1) }));
  }
  for (const s of data.spinners) {
    bodies.push(Matter.Bodies.rectangle(s.x, s.y, s.w, 14, { isStatic: true, isSensor: true, angle: s.angle, label: `spinner:${s.id}`, collisionFilter: filter(s.level) }));
  }
  for (const g of data.levelGates) {
    bodies.push(Matter.Bodies.rectangle(g.x, g.y, g.w, g.h, { isStatic: true, isSensor: true, angle: g.angle ?? 0, label: `gate:${g.id}`, collisionFilter: filter(g.level) }));
  }
  for (const s of data.slingshots) {
    const verts = s.points.map(([x, y]) => ({ x, y }));
    const center = { x: verts.reduce((a, v) => a + v.x, 0) / verts.length, y: verts.reduce((a, v) => a + v.y, 0) / verts.length };
    bodies.push(Matter.Bodies.fromVertices(center.x, center.y, [verts], { isStatic: true, frictionStatic: 0, restitution: 0.6, label: "slingshot", collisionFilter: filter(1) }));
  }
  const rl = data.roulette;
  bodies.push(Matter.Bodies.circle(rl.x, rl.y, rl.r, { isStatic: true, isSensor: true, label: "roulette", collisionFilter: filter(1) }));
  bodies.push(Matter.Bodies.rectangle(data.width / 2, data.drain.y + data.drain.h / 2, data.width, data.drain.h, { isStatic: true, isSensor: true, label: "drain", collisionFilter: filter(0) }));
  const [fx, fy] = data.laneGate.from;
  const [tx, ty] = data.laneGate.to;
  const laneGate = Matter.Bodies.rectangle((fx + tx) / 2, (fy + ty) / 2, Math.hypot(tx - fx, ty - fy) + 6, WALL_THICKNESS, {
    isStatic: true,
    angle: Math.atan2(ty - fy, tx - fx),
    frictionStatic: 0,
    restitution: 0.2,
    friction: 0.02,
    label: "lanegate",
    collisionFilter: filter(0)
  });
  bodies.push(laneGate);
  return { bodies, laneGate };
}
function buildFlipper(data, side) {
  const sign = side === "left" ? 1 : -1;
  const f = data.flipper;
  const pivot = f.pivots[side];
  const rest = sign * f.restAngle;
  const center = { x: pivot[0] + sign * (f.length / 2) * Math.cos(rest), y: pivot[1] + sign * (f.length / 2) * Math.sin(rest) };
  const body = Matter.Bodies.rectangle(center.x, center.y, f.length, f.thickness, {
    angle: rest,
    chamfer: { radius: f.thickness / 2 },
    isStatic: true,
    frictionStatic: 0,
    restitution: f.restitution,
    friction: 0.05,
    label: `flipper:${side}`,
    collisionFilter: filter(1)
  });
  return { body, sign };
}
function insidePolygon(poly, x, y, margin = 0) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  if (inside) return true;
  if (margin <= 0) return false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    if (Math.hypot(x - (ax + t * dx), y - (ay + t * dy)) <= margin) return true;
  }
  return false;
}

// src/flipper/render/paint.ts
function strokeLine(g, pts, width, color, alpha = 1, dx = 0, dy = 0) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(pts[0][0] + dx, pts[0][1] + dy);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] + dx, pts[i][1] + dy);
  g.strokePath();
}
function rail(g, pts) {
  strokeLine(g, pts, 18, PAL.ink0);
  strokeLine(g, pts, 10, PAL.cap);
  strokeLine(g, pts, 3, PAL.tan, 0.7);
}
function paintTable(scene, d, tx, ty) {
  const frame = scene.add.graphics().setDepth(0);
  drawPanel(frame, tx - 14, ty - 14, d.width + 28, d.height + 28, { fill: 1782308, depth: 8, bw: 8 });
  const floor = scene.add.graphics().setDepth(1).setPosition(tx, ty);
  floor.fillStyle(1915434, 1);
  floor.fillRect(0, 0, d.width, d.height);
  floor.lineStyle(10, 2245679, 1);
  floor.strokeCircle(220, 220, 170);
  floor.strokeCircle(220, 220, 105);
  floor.fillStyle(1452319, 1);
  floor.fillRect(400, 0, 40, d.height);
  floor.fillStyle(2245679, 1);
  for (let i = 0; i < 7; i++) floor.fillCircle(70 + i * 50, 560, 5);
  for (let i = 0; i < 5; i++) floor.fillCircle(130 + i * 45, 120 - i % 2 * 10, 4);
  const decor = [["clover", 70, 560], ["clover", 332, 600], ["moss", 210, 530], ["ladybug", 110, 520], ["clover", 330, 120], ["moss", 250, 240], ["ladybug", 160, 470], ["clover", 190, 700], ["moss", 80, 700], ["clover", 330, 700]];
  for (const [name, x, y] of decor) {
    const key = spriteKey(scene, name, 3);
    if (key) scene.add.image(tx + x, ty + y, key).setDepth(1.5).setAlpha(0.45);
  }
  const walls = scene.add.graphics().setDepth(2).setPosition(tx, ty);
  for (const w of d.walls) if (w.level !== 2) rail(walls, w.pts);
  const [gf, gt] = [d.laneGate.from, d.laneGate.to];
  strokeLine(walls, [gf, gt], 14, PAL.ink0);
  strokeLine(walls, [gf, gt], 7, PAL.leaf);
  const upper = scene.add.graphics().setDepth(12).setPosition(tx, ty);
  for (const o of d.orbits) {
    upper.fillStyle(PAL.orangeLight, 0.1);
    upper.fillPoints(o.zone.map(([x, y]) => ({ x, y })), true);
  }
  for (const w of d.walls) if (w.level === 2) tube(upper, w.pts);
}
function tube(g, pts) {
  strokeLine(g, pts, 9, PAL.ink0, 0.28, 6, 9);
  strokeLine(g, pts, 13, PAL.ink0, 0.9);
  strokeLine(g, pts, 7, 13621468, 0.95);
  strokeLine(g, pts, 2, 16777215, 0.85, -1, -1);
}

// src/flipper/render/scene.ts
var TICK_MS = 1e3 / 60;
function pathLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}
function pointAlong(pts, dist) {
  let rest = dist;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    const seg = Math.hypot(dx, dy) || 1;
    if (rest <= seg || i === pts.length - 1) {
      const k = Math.min(1, rest / seg);
      return { x: pts[i - 1][0] + dx * k, y: pts[i - 1][1] + dy * k, a: Math.atan2(dy, dx) };
    }
    rest -= seg;
  }
  return { x: pts[0][0], y: pts[0][1], a: 0 };
}
var TOUCH = isTouch();
var GAME_W = 800;
var GAME_H = TOUCH ? 1130 : 960;
var TX = 190;
var TY = 60;
var LX = 20;
var RX = 654;
var COL_W = 140;
var BEST_KEY = "arcade.flipper.best";
var SAVE_MS = 15e3;
var ROULETTE_MS = 2200;
var FlipperScene = class extends Phaser.Scene {
  constructor() {
    super("flipper");
    this.state = "loading";
    this.targetBodies = /* @__PURE__ */ new Map();
    this.flips = [];
    this.balls = [];
    this.level = /* @__PURE__ */ new Map();
    this.trails = /* @__PURE__ */ new Map();
    this.readyBall = null;
    this.charge = 0;
    this.plungerWasDown = false;
    /** Vrai tant que la touche qui a démarré ou repris la partie n'est pas relâchée (sinon elle lancerait la bille). */
    this.plungerIgnore = false;
    this.saveUntil = 0;
    this.acc = 0;
    this.best = 0;
    this.newRecord = false;
    this.pending = [];
    this.hitFlash = /* @__PURE__ */ new Map();
    this.spin = /* @__PURE__ */ new Map();
    this.roul = null;
    this.wheelAngle = 0;
    this.rouletteCooldown = 0;
    this.fx = new Particles();
    this.score = new Counter();
    this.pad = null;
    this.mascot = null;
    this.lastCheer = 0;
    this.art = { ball: null, mushBig: null, mushSmall: null, firefly: null, leaf: null };
    this.prevPad = [];
    this.lastFlip = { left: false, right: false };
  }
  create() {
    this.tg = this.add.graphics().setDepth(10).setPosition(TX, TY);
    this.ud = this.add.graphics().setDepth(13).setPosition(TX, TY);
    this.fxg = this.add.graphics().setDepth(40).setPosition(TX, TY);
    this.ug = this.add.graphics().setDepth(60);
    this.p1 = new SpritePool(this, 11, TX, TY);
    this.pU = new SpritePool(this, 13.2, TX, TY);
    this.pB2 = new SpritePool(this, 14, TX, TY);
    this.art = {
      ball: spriteKey(this, "bignut", 3),
      mushBig: spriteKey(this, "mushroom", 6),
      mushSmall: spriteKey(this, "mushroom", 5),
      firefly: spriteKey(this, "firefly", 3),
      leaf: spriteKey(this, "leaf", 3)
    };
    if (!TOUCH) this.mascot = new Mascot(this, "sq_noisette", LX + COL_W / 2, GAME_H - 14, 5);
    this.overlay = new Overlay(this, GAME_W, GAME_H);
    new MuteButton(this, GAME_W - 68, 8, 48);
    this.keys = this.input.keyboard.addKeys({
      left: "LEFT",
      a: "A",
      z: "Z",
      lshift: "SHIFT",
      right: "RIGHT",
      d: "D",
      m: "M",
      x: "X",
      space: "SPACE",
      down: "DOWN",
      p: "P",
      esc: "ESC",
      r: "R",
      enter: "ENTER"
    });
    onBlur(this, () => {
      if (this.state === "playing") this.pause();
    });
    makeText(this, 20, 6, "FLIPPER", 46, PAL.orangeLight, { strokeW: 8 }).setDepth(5);
    this.add.text(GAME_W / 2, GAME_H / 2, "chargement\u2026", { fontFamily: FONT_BODY, fontSize: "24px", color: "#fdf3de" }).setOrigin(0.5).setName("loading");
    void fetch(`data/arcade/table.json${VERSION_QUERY}`).then((r) => r.json()).then((data) => {
      this.table = data;
      this.children.getByName("loading")?.destroy();
      this.best = loadBest(BEST_KEY);
      this.buildStatic();
      if (TOUCH) {
        const y = 960;
        this.pad = new TouchPad(this, [
          { id: "left", x: 20, y, w: 225, h: 150, label: "\u25C0" },
          { id: "launch", x: 265, y, w: 230, h: 150, label: "LANCER", color: PAL.orange },
          { id: "right", x: 515, y, w: 225, h: 150, label: "\u25B6" }
        ]);
      }
      this.resetGame();
      this.showStart();
    });
  }
  // ---------- décor fixe et panneaux ----------
  buildStatic() {
    const d = this.table;
    paintTable(this, d, TX, TY);
    const bg = this.add.graphics().setDepth(0);
    const panel = (x, y, h, title) => {
      drawPanel(bg, x, y, COL_W, h, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(x + 4, y + 4, COL_W - 8, 30);
      makeText(this, x + COL_W / 2, y + 19, title, 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
    };
    const small = (x, y, text, size = 14) => {
      makeText(this, x, y, text, size, PAL.panel2, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5);
    };
    panel(LX, TY, 130, "SCORE");
    panel(LX, TY + 152, 110, "BILLES");
    panel(LX, TY + 284, 200, "BONUS");
    panel(LX, TY + 506, 100, "MEILLEUR");
    panel(RX, TY, 300, "MISSIONS");
    small(RX + 12, TY + 44, "3 cibles = bille");
    small(RX + 12, TY + 114, "3 lettres = bonus");
    small(RX + 12, TY + 184, "3 orbites = jackpot");
    small(RX + 12, TY + 254, "Roulette :");
    for (let i = 0; i < 5; i++) {
      makeText(this, LX + 70, TY + 330 + (4 - i) * 30, `\xD7${i + 1}`, 18, PAL.panel2, { font: FONT_BODY, origin: [0, 0.5], strokeW: 3, shadow: false }).setDepth(5);
    }
    this.texts = {
      score: makeText(this, LX + COL_W / 2, TY + 88, "0", 38, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 }).setDepth(5),
      best: makeText(this, LX + COL_W / 2, TY + 506 + 66, "0", 32, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 5 }).setDepth(5),
      roulette: makeText(this, RX + 100, TY + 268, "\u2014", 22, PAL.orangeLight, { origin: [0.5, 0], strokeW: 4 }).setDepth(5)
    };
    if (!TOUCH) {
      drawPanel(bg, RX, TY + 322, COL_W, 300, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(RX + 4, TY + 326, COL_W - 8, 30);
      makeText(this, RX + COL_W / 2, TY + 341, "COMMANDES", 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
      const rows = [["\u2190 Z", "gauche"], ["\u2192 M", "droit"], ["ESPACE", "lancer"], ["P", "pause"], ["M", "son"]];
      rows.forEach(([k, label], i) => {
        const y = TY + 372 + i * 40;
        makeText(this, RX + 12, y, k, 16, PAL.leaf, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5).setFontStyle("800");
        makeText(this, RX + COL_W - 12, y + 2, label, 14, PAL.panel2, { font: FONT_BODY, origin: [1, 0], strokeW: 3, shadow: false }).setDepth(5);
      });
    }
  }
  // ---------- états ----------
  resetGame() {
    const d = this.table;
    this.engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: d.gravityScale } });
    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 10;
    const statics = buildStatics(d);
    this.laneGate = statics.laneGate;
    this.targetBodies.clear();
    for (const b of statics.bodies) if (b.label.startsWith("target:")) this.targetBodies.set(b.label.slice(7), b);
    this.flips = ["left", "right"].map((side) => {
      const f = buildFlipper(d, side);
      return { body: f.body, sign: f.sign, side, ang: f.sign * d.flipper.restAngle };
    });
    Matter.Composite.add(this.engine.world, [...statics.bodies, ...this.flips.map((f) => f.body)]);
    Matter.Events.on(this.engine, "collisionStart", (event) => {
      for (const pair of event.pairs) this.onPair(pair.bodyA, pair.bodyB);
    });
    this.rules = new FlipperRules(d.targets.map((t) => t.id), d.rollovers.filter((r) => r.kind === "letter").map((r) => r.id), new Rng(readSeed()));
    this.balls = [];
    this.level.clear();
    this.trails.clear();
    this.pending = [];
    this.charge = 0;
    this.saveUntil = 0;
    this.newRecord = false;
    this.roul = null;
    this.spin.clear();
    for (const s of d.spinners) this.spin.set(s.id, { angle: s.angle, vel: 0, acc: 0 });
    this.fx.clear();
    this.score.reset(0);
    this.texts.roulette.setText("\u2014");
    this.spawnReady();
  }
  showStart() {
    this.state = "ready";
    this.overlay.show(
      {
        title: "FLIPPER",
        subtitle: this.best > 0 ? `Meilleur score : ${this.best}` : "Un vrai flipper de bar",
        lines: TOUCH ? ["Touche LANCER, puis \u25C0 \u25B6 pour les flippers"] : ["Tiens ESPACE pour charger le plongeur", "\u2190 \u2192 pour les flippers"],
        button: "Jouer",
        hint: TOUCH ? "Touche pour jouer" : "ESPACE ou clic"
      },
      () => this.startGame()
    );
  }
  startGame() {
    this.overlay.hide();
    if (this.state === "over" || this.rules.ballsLeft < BALLS_PER_GAME || this.rules.score > 0) this.resetGame();
    this.state = "playing";
    this.mascot?.reset();
    this.plungerIgnore = true;
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
    this.plungerIgnore = true;
  }
  gameOver(score) {
    this.state = "over";
    if (score > this.best) {
      this.best = score;
      this.newRecord = true;
      saveBest(BEST_KEY, this.best);
    }
    [0, 1, 2, 3].forEach((i) => tone(330 - i * 60, 0.22, { vol: 0.05, type: "sawtooth", delay: i * 0.12, freqEnd: 200 - i * 40 }));
    this.time.delayedCall(800, () => {
      if (this.state !== "over") return;
      this.overlay.show(
        { title: "PARTIE FINIE", subtitle: `Score ${score}`, lines: [this.newRecord ? "\u2605 Nouveau record ! \u2605" : `Meilleur : ${this.best}`], button: "Rejouer", hint: "ESPACE ou R" },
        () => this.startGame()
      );
    });
  }
  // ---------- billes ----------
  makeBall(x, y, level = 1) {
    const b = this.table.ball;
    const ball = Matter.Bodies.circle(x, y, b.radius, {
      frictionStatic: 0,
      restitution: b.restitution,
      friction: b.friction,
      frictionAir: b.frictionAir,
      density: b.density,
      label: "ball",
      collisionFilter: { category: CAT.BALL, mask: ballMask(level) }
    });
    this.balls.push(ball);
    this.level.set(ball, level);
    this.trails.set(ball, []);
    Matter.Composite.add(this.engine.world, ball);
    return ball;
  }
  setLevel(ball, level) {
    if (this.level.get(ball) === level) return;
    this.level.set(ball, level);
    ball.collisionFilter.mask = ballMask(level);
    this.fx.burst(ball.position.x, ball.position.y, { n: 8, color: [PAL.cream, PAL.orangeLight], speed: 160, life: 360, size: 6, gravity: 200 });
    tone(level === 2 ? 420 : 300, 0.12, { vol: 0.035, type: "triangle", freqEnd: level === 2 ? 760 : 200 });
  }
  spawnReady() {
    const l = this.table.launch;
    this.readyBall = this.makeBall(l.x, l.y);
  }
  removeBall(ball) {
    Matter.Composite.remove(this.engine.world, ball);
    this.balls = this.balls.filter((b) => b !== ball);
    this.trails.delete(ball);
    this.level.delete(ball);
    if (this.readyBall === ball) this.readyBall = null;
  }
  launchReady(power) {
    const ball = this.readyBall;
    if (!ball) return;
    Matter.Body.setVelocity(ball, { x: 0, y: -power });
    this.readyBall = null;
    this.mascot?.reset();
    this.rules.launch();
    if (this.saveUntil === 0) this.saveUntil = this.time.now + SAVE_MS;
    noise(0.18, { vol: 0.06, freq: 1400 });
    tone(180, 0.2, { vol: 0.05, type: "sawtooth", freqEnd: 520 });
  }
  // ---------- boucle ----------
  update(_time, delta) {
    if (this.state === "loading") return;
    this.fx.update(delta);
    this.mascot?.update(delta);
    this.pad?.poll();
    const j = {};
    for (const name of Object.keys(this.keys)) j[name] = Phaser.Input.Keyboard.JustDown(this.keys[name]);
    if (j.r && this.state !== "ready") this.startGame();
    if ((j.space || j.enter) && this.overlay.visible) this.overlay.activate();
    if (j.p || j.esc) {
      if (this.state === "playing") this.pause();
      else if (this.state === "paused") this.resume();
    }
    const pad = readPad();
    if (pad && pad.buttons[9] && !this.prevPad[9]) {
      if (this.state === "playing") this.pause();
      else if (this.overlay.visible) this.overlay.activate();
    }
    this.prevPad = pad ? pad.buttons.slice() : [];
    if (this.state === "playing") {
      this.acc += delta;
      const k = this.keys;
      const left = k.left.isDown || k.a.isDown || k.z.isDown || k.lshift.isDown || !!pad?.buttons[4] || !!pad?.buttons[6] || (pad?.x ?? 0) < 0 || !!this.pad?.isDown("left");
      const right = k.right.isDown || k.d.isDown || k.m.isDown || k.x.isDown || !!pad?.buttons[5] || !!pad?.buttons[7] || (pad?.x ?? 0) > 0 || !!this.pad?.isDown("right");
      const plunger = k.space.isDown || k.down.isDown || !!pad?.buttons[0] || !!this.pad?.isDown("launch");
      this.handlePlunger(plunger, delta);
      if (this.flipEdge(left, right)) tone(150, 0.04, { vol: 0.04, type: "square", freqEnd: 90 });
      while (this.acc >= TICK_MS) {
        this.acc -= TICK_MS;
        this.physicsTick(left, right);
      }
      this.afterTick(delta);
    }
    this.render(delta);
  }
  flipEdge(left, right) {
    const edge = left && !this.lastFlip.left || right && !this.lastFlip.right;
    this.lastFlip = { left, right };
    return edge;
  }
  handlePlunger(down, delta) {
    const l = this.table.launch;
    if (this.plungerIgnore) {
      if (!down) this.plungerIgnore = false;
      this.plungerWasDown = false;
      return;
    }
    if (this.readyBall) {
      if (down) this.charge = Math.min(1, this.charge + delta / (l.chargeFrames * TICK_MS));
      if (!down && this.plungerWasDown) {
        const c = Math.max(this.charge, 0.3);
        this.launchReady(l.powerMin + c * (l.powerMax - l.powerMin));
        this.charge = 0;
      }
    } else if (!down) {
      this.charge = 0;
    }
    this.plungerWasDown = down;
  }
  /** Place le flipper autour de son pivot ; la vitesse est mise à jour pour transmettre le coup à la bille. */
  poseFlipper(f) {
    const fl = this.table.flipper;
    const [px, py] = fl.pivots[f.side];
    const half = fl.length / 2;
    const api = Matter.Body;
    api.setAngle(f.body, f.ang, true);
    api.setPosition(f.body, { x: px + f.sign * half * Math.cos(f.ang), y: py + f.sign * half * Math.sin(f.ang) }, true);
  }
  /** Porte du couloir : traversable tant qu'une bille monte dans le couloir, fermée sinon (la bille ne peut pas revenir au plongeur). */
  updateGate() {
    const d = this.table;
    let open = false;
    for (const b of this.balls) {
      if (b === this.readyBall) continue;
      if (b.position.x > d.laneGate.to[0] && b.position.y > d.laneGate.openBelowY && b.velocity.y < -2) open = true;
    }
    this.laneGate.isSensor = open;
  }
  physicsTick(left, right) {
    const d = this.table;
    const sub = d.substeps;
    const dt = TICK_MS / sub;
    for (let s = 0; s < sub; s++) {
      for (const f of this.flips) {
        const pressed = f.side === "left" ? left : right;
        const fl = d.flipper;
        const target = pressed ? -f.sign * fl.upAngle : f.sign * fl.restAngle;
        const step = fl.speed / sub;
        f.ang += Math.max(-step, Math.min(step, target - f.ang));
        this.poseFlipper(f);
      }
      this.updateGate();
      Matter.Engine.update(this.engine, dt);
      for (const b of this.balls) {
        const v = b.velocity;
        const speed = Math.hypot(v.x, v.y);
        if (speed > d.ball.maxSpeed) Matter.Body.setVelocity(b, { x: v.x / speed * d.ball.maxSpeed, y: v.y / speed * d.ball.maxSpeed });
      }
      if (this.readyBall) {
        Matter.Body.setPosition(this.readyBall, { x: d.launch.x, y: d.launch.y + this.charge * d.launch.pull });
        Matter.Body.setVelocity(this.readyBall, { x: 0, y: 0 });
      }
      this.flushPending();
    }
  }
  /** Une fois par frame : traînées, spinners, roulette, bille rendue au plongeur, événements de règles. */
  afterTick(delta) {
    const d = this.table;
    for (const b of this.balls) {
      const tr = this.trails.get(b);
      if (tr) {
        tr.push({ x: b.position.x, y: b.position.y });
        if (tr.length > 14) tr.shift();
      }
      if (this.level.get(b) === 2 && !d.orbits.some((o) => insidePolygon(o.zone, b.position.x, b.position.y))) this.setLevel(b, 1);
      const speed = Math.hypot(b.velocity.x, b.velocity.y);
      if (!this.readyBall && this.balls.length === 1 && !this.roul && b.position.x > d.launch.x - 16 && b.position.y > d.launch.y - 60 && speed < 1) {
        Matter.Body.setVelocity(b, { x: 0, y: 0 });
        this.readyBall = b;
      }
    }
    for (const [id, s] of this.spin) {
      if (s.vel === 0) continue;
      s.angle += s.vel;
      s.acc += Math.abs(s.vel);
      while (s.acc >= Math.PI) {
        s.acc -= Math.PI;
        this.rules.spinner();
        tone(1100 + Math.random() * 120, 0.025, { vol: 0.025, type: "square" });
        this.hitFlash.set(`sp:${id}`, 5);
      }
      s.vel *= 0.985;
      if (Math.abs(s.vel) < 0.015) s.vel = 0;
    }
    if (this.roul) this.updateRoulette(delta);
    for (const e of this.rules.flush()) this.onRuleEvent(e);
    for (const [k, v] of [...this.hitFlash]) {
      if (v <= 1) this.hitFlash.delete(k);
      else this.hitFlash.set(k, v - 1);
    }
  }
  // ---------- roulette ----------
  captureRoulette(ball) {
    if (this.roul || this.time.now < this.rouletteCooldown || !this.balls.includes(ball)) return;
    const d = this.table.roulette;
    this.removeBall(ball);
    const index = this.rules.roulette();
    const sector = Math.PI * 2 / ROULETTE.length;
    let to = -(index + 0.5) * sector;
    while (to > this.wheelAngle - 5 * Math.PI * 2) to -= Math.PI * 2;
    this.roul = { t: 0, index, from: this.wheelAngle, to, lastSector: -1 };
    this.fx.burst(d.x, d.y, { n: 14, color: [PAL.orangeLight, PAL.cream], speed: 220, life: 500, size: 7, gravity: 200 });
    tone(260, 0.2, { vol: 0.05, type: "square", freqEnd: 120 });
  }
  updateRoulette(delta) {
    const r = this.roul;
    if (!r) return;
    r.t += delta;
    const k = Math.min(1, r.t / ROULETTE_MS);
    const ease = 1 - Math.pow(1 - k, 3);
    this.wheelAngle = r.from + (r.to - r.from) * ease;
    const sector = Math.floor((-this.wheelAngle % (Math.PI * 2) + Math.PI * 2) / (Math.PI * 2 / ROULETTE.length));
    if (sector !== r.lastSector) {
      r.lastSector = sector;
      tone(700 + sector % 3 * 90, 0.03, { vol: 0.03, type: "square" });
    }
    if (k >= 1) {
      const d = this.table.roulette;
      const prize = ROULETTE[r.index];
      this.texts.roulette.setText(prize.label);
      popText(this, TX + d.x - 40, TY + d.y - 50, prize.label, 36, PAL.orangeLight, { ms: 1200 });
      arp([523, 659, 784], 0.06, { vol: 0.05 });
      const a = Math.PI * (0.62 + Math.random() * 0.2);
      const ball = this.makeBall(d.x + Math.cos(a) * (d.r + 18), d.y + Math.sin(a) * (d.r + 18));
      Matter.Body.setVelocity(ball, { x: Math.cos(a) * 14, y: Math.sin(a) * 14 });
      this.rouletteCooldown = this.time.now + 1500;
      this.roul = null;
    }
  }
  // ---------- collisions ----------
  onPair(a, b) {
    const ball = a.label === "ball" ? a : b.label === "ball" ? b : null;
    if (!ball) return;
    const other = ball === a ? b : a;
    const label = other.label;
    const d = this.table;
    if (label === "drain") {
      this.pending.push(() => this.drainBall(ball));
    } else if (label.startsWith("bumper:")) {
      const id = label.slice(7);
      const bumper = d.bumpers.find((x) => x.id === id);
      this.pending.push(() => {
        if (bumper) this.kick(ball, bumper.x, bumper.y, 12);
        this.rules.bumper(id === "d1" ? 150 : 100);
        this.hitFlash.set(id, 14);
        if (bumper) this.fx.burst(bumper.x, bumper.y, { n: 10, color: [PAL.cream, PAL.orangeLight, PAL.berry], speed: 260, life: 420, size: 7, gravity: 300 });
        this.cameras.main.shake(70, 16e-4);
        this.cheer();
        tone(780 + Math.random() * 260, 0.07, { vol: 0.045, type: "square", freqEnd: 1100 });
        noise(0.05, { vol: 0.03, freq: 3e3 });
      });
    } else if (label === "slingshot") {
      this.pending.push(() => {
        this.kick(ball, other.position.x, other.position.y, 12);
        this.rules.slingshot();
        this.hitFlash.set(`s${other.position.x > d.width / 2 ? 1 : 0}`, 12);
        this.fx.burst(ball.position.x, ball.position.y, { n: 6, color: [PAL.leaf, PAL.cream], speed: 200, life: 320, size: 6, gravity: 300 });
        tone(300, 0.06, { vol: 0.04, type: "square", freqEnd: 520 });
      });
    } else if (label.startsWith("target:")) {
      const id = label.slice(7);
      this.pending.push(() => {
        const body = this.targetBodies.get(id);
        if (!body || !this.engine.world.bodies.includes(body)) return;
        Matter.Composite.remove(this.engine.world, body);
        const bank = this.rules.target(id);
        this.fx.burst(body.position.x, body.position.y, { n: 10, color: [PAL.leaf, PAL.cream], speed: 220, life: 420, size: 6 });
        tone(620, 0.07, { vol: 0.045, type: "square", freqEnd: 860 });
        if (bank) {
          for (const [, tb] of this.targetBodies) if (!this.engine.world.bodies.includes(tb)) Matter.Composite.add(this.engine.world, tb);
          this.spawnExtraBall();
        }
      });
    } else if (label.startsWith("rollover:")) {
      const id = label.slice(9);
      const ro = d.rollovers.find((x) => x.id === id);
      this.pending.push(() => {
        if (!ro) return;
        this.hitFlash.set(`r:${id}`, 16);
        if (ro.kind === "letter") {
          if (this.rules.lit(id)) return;
          this.rules.rollover(id);
          tone(990, 0.06, { vol: 0.04, type: "sine", freqEnd: 1320 });
        } else {
          this.rules.lane(ro.kind);
          tone(ro.kind === "outlane" ? 330 : 660, 0.06, { vol: 0.035, type: "triangle" });
        }
      });
    } else if (label.startsWith("spinner:")) {
      const id = label.slice(8);
      this.pending.push(() => {
        const s = this.spin.get(id);
        if (!s) return;
        const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
        s.vel += Math.min(0.9, 0.2 + speed * 0.03);
      });
    } else if (label.startsWith("gate:")) {
      const id = label.slice(5);
      const g = d.levelGates.find((x) => x.id === id);
      this.pending.push(() => {
        if (!g || !this.balls.includes(ball)) return;
        if (g.role === "orbit") {
          this.orbitDone(ball, g.id === "orbL_end" ? "L" : "R");
          this.setLevel(ball, 1);
        } else if (g.set === 2) {
          if (ball.velocity.y < -1) this.setLevel(ball, 2);
        } else if (ball.velocity.y > 0) {
          this.setLevel(ball, 1);
        }
      });
    } else if (label === "roulette") {
      this.pending.push(() => this.captureRoulette(ball));
    } else if (label.startsWith("flipper:")) {
      const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
      if (speed > 6) this.pending.push(() => tone(210, 0.04, { vol: 0.03, type: "triangle" }));
    }
  }
  /** Bout d'une orbite : points, lettre (gauche) ou multiplicateur (droite), et jackpot au troisième passage. */
  orbitDone(ball, side) {
    const jackpot = this.rules.ramp();
    if (side === "L") {
      const next = this.table.rollovers.find((r) => r.kind === "letter" && !this.rules.lit(r.id));
      if (next) this.rules.rollover(next.id);
    } else {
      this.rules.raiseMult();
    }
    this.hitFlash.set(`orb:${side}`, 40);
    this.fx.burst(ball.position.x, ball.position.y, { n: 14, color: [PAL.orangeLight, PAL.cream, PAL.leaf], speed: 260, life: 560, size: 7, gravity: 200 });
    arp([523, 659, 784], 0.05, { vol: 0.045 });
    popText(this, TX + ball.position.x, TY + ball.position.y + 40, side === "L" ? "ORBITE : LETTRE" : "ORBITE : BONUS", 24, PAL.orangeLight, { ms: 1e3, rise: 30 });
    if (jackpot) this.spawnExtraBall();
  }
  cheer() {
    if (this.time.now - this.lastCheer > 1200) {
      this.lastCheer = this.time.now;
      this.mascot?.cheer();
    }
  }
  /** Coup actif d'un bumper ou d'une élingue : la bille repart à l'opposé du centre, jamais moins vite que `min`. */
  kick(ball, cx, cy, min) {
    const dx = ball.position.x - cx;
    const dy = ball.position.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const speed = Math.min(this.table.ball.maxSpeed, Math.max(Math.hypot(ball.velocity.x, ball.velocity.y) * 0.95, min));
    Matter.Body.setVelocity(ball, { x: dx / len * speed, y: dy / len * speed });
  }
  flushPending() {
    const work = this.pending;
    this.pending = [];
    for (const fn of work) fn();
  }
  drainBall(ball) {
    if (!this.balls.includes(ball)) return;
    const d = this.table;
    this.removeBall(ball);
    if (this.balls.length > 0 || this.roul) return;
    if (this.time.now < this.saveUntil) {
      this.spawnReady();
      popText(this, TX + d.width / 2, TY + d.height / 2, "BILLE SAUV\xC9E", 44, PAL.leaf, { ms: 1100 });
      arp([523, 659, 784], 0.07, { vol: 0.045 });
      return;
    }
    this.rules.drain();
    this.saveUntil = 0;
    this.mascot?.sad();
    if (!this.rules.over) this.spawnReady();
  }
  spawnExtraBall() {
    const ball = this.makeBall(250, 120);
    Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 8, y: 5 });
    popText(this, TX + 250, TY + 200, "MULTIBILLE !", 40, PAL.orangeLight, { ms: 1100 });
    arp([523, 659, 784, 1047], 0.06, { vol: 0.05 });
    this.mascot?.cheer();
  }
  onRuleEvent(e) {
    const cx = TX + this.table.width / 2;
    switch (e.type) {
      case "bank":
        popText(this, cx, TY + 300, `BANQUE +${e.points}`, 40, PAL.leaf, { ms: 1100 });
        this.mascot?.cheer();
        break;
      case "lightAll":
        popText(this, cx, TY + 120, `LETTRES +${e.points}`, 38, PAL.orangeLight, { ms: 1100 });
        arp([659, 784, 988, 1319], 0.06, { vol: 0.05 });
        break;
      case "mult":
        popText(this, cx, TY + 220, `BONUS X${e.mult}`, 46, PAL.orangeLight, { ms: 1200 });
        arp([440, 554, 659], 0.06, { vol: 0.05 });
        break;
      case "ramp":
        popText(this, TX + 120, TY + 300, `RAMPE +${e.points}`, 30, PAL.cream, { ms: 1e3 });
        break;
      case "jackpot":
        popText(this, cx, TY + 380, `JACKPOT +${e.points}`, 52, PAL.orangeLight, { ms: 1500 });
        this.cameras.main.shake(260, 8e-3);
        arp([523, 659, 784, 1047, 1319, 1568], 0.06, { vol: 0.055 });
        break;
      case "extraBall":
        popText(this, cx, TY + 420, "BILLE BONUS !", 40, PAL.leaf, { ms: 1300 });
        arp([784, 988, 1175], 0.07, { vol: 0.05 });
        break;
      case "save":
        this.saveUntil = this.time.now + 1e4;
        popText(this, cx, TY + 420, "BILLE SAUV\xC9E 10 s", 32, PAL.leaf, { ms: 1300 });
        break;
      case "ballLost":
        tone(180, 0.35, { vol: 0.05, type: "sawtooth", freqEnd: 60 });
        if (e.bonus > 0) popText(this, cx, TY + 560, `BONUS BILLE +${e.bonus}`, 30, PAL.cream, { ms: 1300 });
        break;
      case "gameover":
        this.gameOver(e.score);
        break;
      default:
        break;
    }
  }
  // ---------- rendu ----------
  render(delta) {
    const d = this.table;
    const g = this.tg;
    g.clear();
    const ud = this.ud;
    ud.clear();
    const fxg = this.fxg;
    fxg.clear();
    const ug = this.ug;
    ug.clear();
    this.p1.begin();
    this.pU.begin();
    this.pB2.begin();
    const now = this.time.now;
    d.slingshots.forEach((s, i) => {
      const flash = (this.hitFlash.get(`s${i}`) ?? 0) / 12;
      const p = s.points;
      g.fillStyle(PAL.ink0, 1);
      g.fillTriangle(p[0][0] - 3, p[0][1] - 5, p[1][0] + (i ? -6 : 6), p[1][1], p[2][0] - 3, p[2][1] + 5);
      g.fillStyle(mix(PAL.moss2, 16777215, flash * 0.7), 1);
      g.fillTriangle(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]);
      this.p1.draw(this.art.leaf, (p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, { scale: 0.9, flip: i === 1 });
    });
    for (const r of d.rollovers) {
      const flash = (this.hitFlash.get(`r:${r.id}`) ?? 0) / 16;
      if (r.kind === "letter") {
        const lit = this.rules.lit(r.id);
        g.fillStyle(PAL.ink0, 1);
        g.fillCircle(r.x, r.y, 13);
        g.fillStyle(lit ? 7035418 : 1915434, 1);
        g.fillCircle(r.x, r.y, 10);
        if (lit || flash > 0) {
          g.fillStyle(PAL.orangeLight, 0.35 + flash * 0.4);
          g.fillCircle(r.x, r.y, 17);
        }
        this.p1.draw(this.art.firefly, r.x, r.y, lit ? { scale: 0.9 + flash * 0.3 } : { alpha: 0.55, tint: 4876885, scale: 0.85 });
      } else {
        const on = flash > 0;
        g.fillStyle(PAL.ink0, 1);
        g.fillRect(r.x - r.w / 2 - 3, r.y - r.h / 2 - 3, r.w + 6, r.h + 6);
        g.fillStyle(on ? r.kind === "outlane" ? PAL.berry : PAL.orangeLight : 2969402, 1);
        g.fillRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h);
      }
    }
    for (const t of d.targets) {
      const down = this.rules.targetDown(t.id);
      const h = down ? t.h * 0.3 : t.h;
      const y = t.y + t.h / 2 - h;
      g.fillStyle(PAL.ink0, 1);
      g.fillRect(t.x - t.w / 2 - 3, y - 3, t.w + 6, h + 6);
      g.fillStyle(down ? PAL.moss2 : PAL.leaf, 1);
      g.fillRect(t.x - t.w / 2, y, t.w, h);
    }
    for (const s of d.spinners) if (s.level === 1) this.drawSpinner(g, s);
    for (const b of d.bumpers) {
      if (b.level !== 1) continue;
      const pulse = (this.hitFlash.get(b.id) ?? 0) / 14;
      const r = b.r + pulse * 4;
      g.fillStyle(PAL.ink0, 1);
      g.fillCircle(b.x, b.y + 4, r + 5);
      g.fillCircle(b.x, b.y, r + 5);
      g.fillStyle(mix(2902580, PAL.orangeLight, pulse * 0.7), 1);
      g.fillCircle(b.x, b.y, r);
      this.p1.draw(b.r >= 26 ? this.art.mushBig : this.art.mushSmall, b.x, b.y - 2, { scale: 1 + pulse * 0.16 });
    }
    this.drawRoulette(g);
    const l = d.launch;
    const headY = l.y + this.charge * l.pull + d.ball.radius + 3;
    g.fillStyle(PAL.ink0, 1);
    g.fillRect(l.x - 15, headY - 1, 30, 11);
    g.fillStyle(PAL.cream, 1);
    g.fillRect(l.x - 12, headY + 1, 24, 6);
    g.lineStyle(4, PAL.dim, 1);
    g.beginPath();
    g.moveTo(l.x, headY + 8);
    const bottom = d.height - 6;
    const coils = 6;
    for (let i = 1; i <= coils; i++) g.lineTo(l.x + (i % 2 ? 9 : -9), headY + 8 + (bottom - headY - 8) * i / coils);
    g.strokePath();
    for (const f of this.flips) {
      const pressed = f.side === "left" ? this.lastFlip.left : this.lastFlip.right;
      const verts = f.body.vertices.map((v) => new Phaser.Math.Vector2(v.x, v.y));
      g.fillStyle(PAL.ink0, 1);
      g.lineStyle(10, PAL.ink0, 1);
      g.strokePoints(verts, true);
      g.fillStyle(pressed ? PAL.orangeLight : PAL.orange, 1);
      g.fillPoints(verts, true);
      g.lineStyle(3, 16777215, 0.45);
      g.beginPath();
      g.moveTo(verts[0].x, verts[0].y);
      g.lineTo(verts[Math.floor(verts.length / 4)].x, verts[Math.floor(verts.length / 4)].y);
      g.strokePath();
      const [px, py] = d.flipper.pivots[f.side];
      g.fillStyle(PAL.ink0, 1);
      g.fillCircle(px, py, 8);
      g.fillStyle(PAL.cream, 1);
      g.fillCircle(px, py, 4);
    }
    for (const s of d.spinners) if (s.level === 2) this.drawSpinner(ud, s);
    for (const b of d.bumpers) {
      if (b.level !== 2) continue;
      const pulse = (this.hitFlash.get(b.id) ?? 0) / 14;
      const r = b.r + pulse * 4;
      ud.fillStyle(PAL.ink0, 0.35);
      ud.fillCircle(b.x + 6, b.y + 9, r + 5);
      ud.fillStyle(PAL.ink0, 1);
      ud.fillCircle(b.x, b.y, r + 5);
      ud.fillStyle(mix(5913380, PAL.orangeLight, pulse * 0.7), 1);
      ud.fillCircle(b.x, b.y, r);
      this.pU.draw(this.art.mushSmall, b.x, b.y - 2, { scale: 1 + pulse * 0.16 });
    }
    for (const o of d.orbits) {
      const len = pathLength(o.center);
      const step = 46;
      const phase = now / 14 % step;
      for (let dist = phase; dist < len; dist += step) {
        const q = pointAlong(o.center, dist);
        const lit = ((dist - phase) / step + Math.floor(now / 260)) % 3 === 0;
        ud.fillStyle(lit ? PAL.orangeLight : 8022586, lit ? 0.95 : 0.5);
        const c = Math.cos(q.a);
        const sn = Math.sin(q.a);
        const pt = (fx, fy) => ({ x: q.x + fx * c - fy * sn, y: q.y + fx * sn + fy * c });
        const t1 = pt(8, 0);
        const t2 = pt(-6, -7);
        const t3 = pt(-6, 7);
        ud.fillTriangle(t1.x, t1.y, t2.x, t2.y, t3.x, t3.y);
      }
      const end = pointAlong(o.center, len - 2);
      const flash = (this.hitFlash.get(`orb:${o.id}`) ?? 0) / 40;
      ud.fillStyle(PAL.ink0, 1);
      ud.fillCircle(end.x, end.y, 17);
      ud.fillStyle(mix(5917210, PAL.orangeLight, 0.4 + flash * 0.6), 1);
      ud.fillCircle(end.x, end.y, 13);
      if (flash > 0) {
        ud.fillStyle(PAL.orangeLight, 0.4 * flash);
        ud.fillCircle(end.x, end.y, 30 * (1 - flash) + 14);
      }
      this.pU.draw(this.art.firefly, end.x, end.y, { scale: 1 + flash * 0.4 });
    }
    for (const b of this.balls) {
      const lv = this.level.get(b) ?? 1;
      const layer = lv === 1 ? g : ud;
      const tr = this.trails.get(b) ?? [];
      tr.forEach((p, i) => {
        const k = i / Math.max(1, tr.length);
        layer.fillStyle(PAL.orangeLight, 0.28 * k);
        layer.fillCircle(p.x, p.y, d.ball.radius * (0.4 + 0.5 * k));
      });
      if (lv === 2) {
        ud.fillStyle(PAL.ink0, 0.4);
        ud.fillCircle(b.position.x + 6, b.position.y + 9, d.ball.radius);
        this.pB2.draw(this.art.ball, b.position.x, b.position.y, { rotation: b.angle, scale: 1.4 });
      } else {
        this.p1.draw(this.art.ball, b.position.x, b.position.y, { rotation: b.angle, scale: 1.2 });
      }
    }
    this.fx.draw(fxg);
    this.drawPanels(ug, now);
    this.pad?.draw(ug);
    this.p1.end();
    this.pU.end();
    this.pB2.end();
    const shown = this.score.update(this.rules.score, delta);
    if (this.texts.score.text !== String(shown)) this.texts.score.setText(String(shown));
    const best = String(Math.max(this.best, this.rules.score));
    if (this.texts.best.text !== best) this.texts.best.setText(best);
  }
  drawSpinner(g, s) {
    const st = this.spin.get(s.id);
    const a = st ? st.angle : 0;
    const flash = (this.hitFlash.get(`sp:${s.id}`) ?? 0) / 5;
    const dx = Math.cos(a) * (s.w / 2);
    const dy = Math.sin(a) * (s.w / 2);
    g.lineStyle(10, PAL.ink0, 1);
    g.beginPath();
    g.moveTo(s.x - dx, s.y - dy);
    g.lineTo(s.x + dx, s.y + dy);
    g.strokePath();
    g.lineStyle(5, mix(PAL.cream, PAL.orangeLight, flash), 1);
    g.beginPath();
    g.moveTo(s.x - dx, s.y - dy);
    g.lineTo(s.x + dx, s.y + dy);
    g.strokePath();
    g.fillStyle(PAL.ink0, 1);
    g.fillCircle(s.x, s.y, 6);
    g.fillStyle(PAL.orange, 1);
    g.fillCircle(s.x, s.y, 3);
  }
  /** Roulette : disque de huit cases, repère fixe en haut ; la bille y est capturée puis relancée. */
  drawRoulette(g) {
    const r = this.table.roulette;
    const R = r.r + 13;
    const n = ROULETTE.length;
    const colors = [PAL.berry, PAL.cream, PAL.leaf, PAL.orangeLight, PAL.berry, PAL.cream, PAL.leaf, PAL.orangeLight];
    g.fillStyle(PAL.ink0, 1);
    g.fillCircle(r.x, r.y + 3, R + 5);
    g.fillCircle(r.x, r.y, R + 5);
    for (let i = 0; i < n; i++) {
      const a0 = this.wheelAngle + i * Math.PI * 2 / n - Math.PI / 2;
      const a1 = a0 + Math.PI * 2 / n;
      g.fillStyle(colors[i], 1);
      g.beginPath();
      g.moveTo(r.x, r.y);
      g.arc(r.x, r.y, R, a0, a1, false);
      g.closePath();
      g.fillPath();
    }
    g.fillStyle(PAL.ink0, 1);
    g.fillCircle(r.x, r.y, r.r - 2);
    g.fillStyle(this.roul ? PAL.orangeLight : 1915434, 1);
    g.fillCircle(r.x, r.y, r.r - 6);
    g.fillStyle(PAL.ink0, 1);
    g.fillTriangle(r.x - 8, r.y - R - 10, r.x + 8, r.y - R - 10, r.x, r.y - R + 2);
    g.fillStyle(PAL.cream, 1);
    g.fillTriangle(r.x - 5, r.y - R - 8, r.x + 5, r.y - R - 8, r.x, r.y - R - 1);
  }
  drawPanels(ug, now) {
    const d = this.table;
    for (let i = 0; i < BALLS_PER_GAME + 2; i++) {
      if (i >= BALLS_PER_GAME && i >= this.rules.ballsLeft) break;
      const x = LX + 24 + i % 4 * 30;
      const y = TY + 152 + 66 + Math.floor(i / 4) * 28;
      const alive = i < this.rules.ballsLeft;
      ug.fillStyle(PAL.ink0, 1);
      ug.fillCircle(x, y, 12);
      ug.fillStyle(alive ? PAL.cream : 2969402, 1);
      ug.fillCircle(x, y, 9);
      if (alive) {
        ug.fillStyle(16777215, 0.9);
        ug.fillCircle(x - 3, y - 3, 2.5);
      }
    }
    for (let i = 0; i < MAX_MULT; i++) {
      const y = TY + 330 + (MAX_MULT - 1 - i) * 30;
      const on = this.rules.mult > i;
      const blink = on && i === this.rules.mult - 1 ? 0.65 + 0.35 * Math.sin(now / 160) : 1;
      ug.fillStyle(PAL.ink0, 1);
      ug.fillCircle(LX + 44, y, 13);
      ug.fillStyle(on ? mix(PAL.orange, PAL.orangeLight, blink) : 2969402, 1);
      ug.fillCircle(LX + 44, y, 10);
    }
    d.targets.forEach((t, i) => {
      const x = RX + 28 + i * 40;
      const y = TY + 82;
      ug.fillStyle(PAL.ink0, 1);
      ug.fillRect(x - 13, y - 14, 26, 28);
      ug.fillStyle(this.rules.targetDown(t.id) ? PAL.leaf : 2969402, 1);
      ug.fillRect(x - 10, y - 11, 20, 22);
    });
    d.rollovers.filter((r) => r.kind === "letter").forEach((r, i) => {
      const x = RX + 28 + i * 40;
      const y = TY + 152;
      ug.fillStyle(PAL.ink0, 1);
      ug.fillCircle(x, y, 15);
      ug.fillStyle(this.rules.lit(r.id) ? PAL.orangeLight : 2969402, 1);
      ug.fillCircle(x, y, 11);
    });
    for (let i = 0; i < 3; i++) {
      const x = RX + 28 + i * 40;
      const y = TY + 222;
      const on = i < this.rules.rampCount % 3;
      ug.fillStyle(PAL.ink0, 1);
      ug.fillCircle(x, y, 15);
      ug.fillStyle(on ? PAL.berry : 2969402, 1);
      ug.fillCircle(x, y, 11);
    }
  }
};

// src/flipper/main.ts
var fontReady = document.fonts ? document.fonts.load('40px "Londrina"').catch(() => void 0) : Promise.resolve();
void fontReady.then(() => {
  const config = {
    type: Phaser.AUTO,
    parent: "game-stage",
    backgroundColor: "#1f3a2b",
    width: GAME_W,
    height: GAME_H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new FlipperScene()
  };
  const game = new Phaser.Game(config);
  window.flipperGame = game;
  bindFullscreen("game-stage", () => game.scale.refresh());
});
