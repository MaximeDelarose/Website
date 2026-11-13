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
function drawBlock(g, x, y, s, color, alpha = 1) {
  drawBevel(g, x, y, s, s, color, alpha);
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
var SQUIRREL_NAMES = ["sq_noisette", "sq_pip", "sq_pop", "sq_cendrine", "sq_flocon", "sq_charbon", "sq_planeur", "sq_capitaine"];

// src/tetris/core/pieces.ts
var KINDS = ["I", "O", "T", "S", "Z", "J", "L"];
var SHAPES = {
  I: [
    ["....", "####", "....", "...."],
    ["..#.", "..#.", "..#.", "..#."],
    ["....", "....", "####", "...."],
    [".#..", ".#..", ".#..", ".#.."]
  ],
  O: [["##", "##"], ["##", "##"], ["##", "##"], ["##", "##"]],
  T: [
    [".#.", "###", "..."],
    [".#.", ".##", ".#."],
    ["...", "###", ".#."],
    [".#.", "##.", ".#."]
  ],
  S: [
    [".##", "##.", "..."],
    [".#.", ".##", "..#"],
    ["...", ".##", "##."],
    ["#..", "##.", ".#."]
  ],
  Z: [
    ["##.", ".##", "..."],
    ["..#", ".##", ".#."],
    ["...", "##.", ".##"],
    [".#.", "##.", "#.."]
  ],
  J: [
    ["#..", "###", "..."],
    [".##", ".#.", ".#."],
    ["...", "###", "..#"],
    [".#.", ".#.", "##."]
  ],
  L: [
    ["..#", "###", "..."],
    [".#.", ".#.", ".##"],
    ["...", "###", "#.."],
    ["##.", ".#.", ".#."]
  ]
};
function cellsOf(kind, rot) {
  const rows = SHAPES[kind][(rot % 4 + 4) % 4];
  const out = [];
  rows.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      if (line[c] === "#") out.push([r, c]);
    }
  });
  return out;
}
function boxSize(kind) {
  return SHAPES[kind][0].length;
}
var KICKS_JLSTZ = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};
var KICKS_I = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};
function kicksFor(kind, from, to) {
  if (kind === "O") return [[0, 0]];
  const key = `${from}>${to}`;
  const table = kind === "I" ? KICKS_I : KICKS_JLSTZ;
  return table[key] ?? [[0, 0]];
}

// src/tetris/core/board.ts
var BOARD_W = 10;
var BOARD_H = 22;
var HIDDEN_ROWS = 2;
function cellValue(kind) {
  return KINDS.indexOf(kind) + 1;
}
var Board = class {
  constructor() {
    this.grid = Array.from({ length: BOARD_H }, () => new Array(BOARD_W).fill(0));
  }
  get(row, col) {
    if (col < 0 || col >= BOARD_W || row >= BOARD_H) return -1;
    if (row < 0) return 0;
    return this.grid[row][col];
  }
  /** Vrai si les cases décalées de la pièce sont libres et dans le plateau. */
  fits(cells, originRow, originCol) {
    for (const [dr, dc] of cells) {
      const r = originRow + dr;
      const c = originCol + dc;
      if (c < 0 || c >= BOARD_W || r >= BOARD_H) return false;
      if (r >= 0 && this.grid[r][c] !== 0) return false;
    }
    return true;
  }
  place(cells, originRow, originCol, value) {
    for (const [dr, dc] of cells) {
      const r = originRow + dr;
      const c = originCol + dc;
      if (r >= 0 && r < BOARD_H && c >= 0 && c < BOARD_W) this.grid[r][c] = value;
    }
  }
  /** Indices des lignes pleines, de haut en bas. */
  fullRows() {
    const rows = [];
    for (let r = 0; r < BOARD_H; r++) {
      if (this.grid[r].every((cell) => cell !== 0)) rows.push(r);
    }
    return rows;
  }
  /** Supprime les lignes données ; celles du dessus descendent. */
  removeRows(rows) {
    if (rows.length === 0) return;
    const drop = new Set(rows);
    const kept = this.grid.filter((_, r) => !drop.has(r));
    const empty = Array.from({ length: rows.length }, () => new Array(BOARD_W).fill(0));
    this.grid.splice(0, this.grid.length, ...empty, ...kept);
  }
  /** Supprime les lignes pleines (les lignes au-dessus descendent) et renvoie leur nombre. */
  clearFullRows() {
    const kept = this.grid.filter((row) => !row.every((cell) => cell !== 0));
    const cleared = BOARD_H - kept.length;
    if (cleared === 0) return 0;
    const empty = Array.from({ length: cleared }, () => new Array(BOARD_W).fill(0));
    this.grid.splice(0, this.grid.length, ...empty, ...kept);
    return cleared;
  }
};

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

// src/tetris/core/game.ts
var DEFAULT_CONFIG = { das: 10, arr: 2, lockDelay: 30, lockResets: 15 };
var CLEAR_FRAMES = 24;
var LINE_POINTS = [0, 100, 300, 500, 800];
function framesPerRow(level) {
  const seconds = Math.pow(0.8 - (level - 1) * 7e-3, level - 1);
  return Math.max(1, Math.round(seconds * 60));
}
var TetrisGame = class {
  constructor(seed, config = {}) {
    this.board = new Board();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = -1;
    this.over = false;
    this.active = null;
    this.hold = null;
    this.canHold = true;
    this.queue = [];
    this.bag = [];
    this.gravity = 0;
    this.lockTimer = 0;
    this.lockResetCount = 0;
    this.softDrop = false;
    this.held = { left: false, right: false };
    this.dasLeft = 0;
    this.dasRight = 0;
    this.events = [];
    this.clearTimer = 0;
    this.lastWasTetris = false;
    /** Lignes pleines en cours d'effacement (indices du plateau), vide hors animation. */
    this.clearRows = [];
    this.rng = new Rng(seed);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.fillQueue();
    this.spawn();
  }
  /** Vrai si la pièce en cours peut encore être mise en réserve. */
  get holdAvailable() {
    return this.canHold;
  }
  /** Avancement de l'animation d'effacement, de 0 à 1 (0 si aucune ligne en cours). */
  get clearProgress() {
    return this.clearTimer > 0 ? 1 - this.clearTimer / CLEAR_FRAMES : 0;
  }
  /** Les 3 prochaines pièces, pour l'aperçu. */
  get next() {
    return this.queue.slice(0, 3);
  }
  /** Ligne d'atterrissage de la pièce active (pour la pièce fantôme). */
  ghostRow() {
    if (!this.active) return null;
    let row = this.active.row;
    const cells = cellsOf(this.active.kind, this.active.rot);
    while (this.board.fits(cells, row + 1, this.active.col)) row++;
    return row;
  }
  setSoftDrop(on) {
    this.softDrop = on;
  }
  /** Direction maintenue : appelée à chaque tick par la couche input. */
  setHeld(left, right) {
    if (left && !this.held.left) {
      this.tryShift(-1);
      this.dasLeft = 0;
    }
    if (right && !this.held.right) {
      this.tryShift(1);
      this.dasRight = 0;
    }
    if (!left) this.dasLeft = 0;
    if (!right) this.dasRight = 0;
    this.held = { left, right };
  }
  moveLeft() {
    this.tryShift(-1);
  }
  moveRight() {
    this.tryShift(1);
  }
  rotate(dir) {
    if (!this.active || this.over) return;
    const from = this.active.rot;
    const to = (from + dir + 4) % 4;
    const cells = cellsOf(this.active.kind, to);
    for (const [dx, dy] of kicksFor(this.active.kind, from, to)) {
      const row = this.active.row - dy;
      const col = this.active.col + dx;
      if (this.board.fits(cells, row, col)) {
        this.active = { ...this.active, rot: to, row, col };
        this.touchLock();
        this.events.push({ type: "rotate" });
        return;
      }
    }
  }
  hardDrop() {
    if (!this.active || this.over) return;
    let dropped = 0;
    const cells = cellsOf(this.active.kind, this.active.rot);
    while (this.board.fits(cells, this.active.row + 1, this.active.col)) {
      this.active.row++;
      dropped++;
    }
    this.score += dropped * 2;
    this.lock(true, dropped);
  }
  holdPiece() {
    if (!this.active || this.over || !this.canHold) return;
    const current = this.active.kind;
    if (this.hold === null) {
      this.hold = current;
      this.spawn();
    } else {
      const swapped = this.hold;
      this.hold = current;
      this.spawn(swapped);
    }
    this.canHold = false;
    this.events.push({ type: "hold" });
  }
  /** Une tick : DAS/ARR, gravité ou chute rapide, verrouillage. */
  step() {
    if (this.clearTimer > 0) {
      this.clearTimer--;
      if (this.clearTimer === 0) {
        this.board.removeRows(this.clearRows);
        this.clearRows = [];
        this.spawn();
      }
      return this.flush();
    }
    if (this.over || !this.active) return this.flush();
    this.autoRepeat();
    const perRow = this.softDrop ? 2 : framesPerRow(this.level);
    this.gravity++;
    if (this.gravity >= perRow) {
      this.gravity = 0;
      if (this.board.fits(cellsOf(this.active.kind, this.active.rot), this.active.row + 1, this.active.col)) {
        this.active.row++;
        if (this.softDrop) this.score += 1;
        this.lockTimer = 0;
      }
    }
    if (this.grounded()) {
      this.lockTimer++;
      if (this.lockTimer >= this.config.lockDelay) this.lock(false);
    } else {
      this.lockTimer = 0;
    }
    return this.flush();
  }
  autoRepeat() {
    const dir = this.held.left && !this.held.right ? -1 : this.held.right && !this.held.left ? 1 : 0;
    if (dir === 0) return;
    if (dir === -1) this.dasLeft++;
    else this.dasRight++;
    const counter = dir === -1 ? this.dasLeft : this.dasRight;
    if (counter > this.config.das) {
      const sinceDas = counter - this.config.das;
      if (sinceDas % Math.max(1, this.config.arr) === 0) this.tryShift(dir);
    }
  }
  tryShift(dx) {
    if (!this.active || this.over) return;
    const cells = cellsOf(this.active.kind, this.active.rot);
    if (this.board.fits(cells, this.active.row, this.active.col + dx)) {
      this.active.col += dx;
      this.touchLock();
      this.events.push({ type: "move" });
    }
  }
  grounded() {
    if (!this.active) return false;
    return !this.board.fits(cellsOf(this.active.kind, this.active.rot), this.active.row + 1, this.active.col);
  }
  /** Remise à zéro du verrouillage après un mouvement au sol, dans la limite de `lockResets`. */
  touchLock() {
    if (this.grounded() && this.lockResetCount < this.config.lockResets) {
      this.lockTimer = 0;
      this.lockResetCount++;
    }
  }
  lock(hard, distance = 0) {
    if (!this.active) return;
    const { kind, rot, row, col } = this.active;
    const cells = cellsOf(kind, rot);
    this.board.place(cells, row, col, cellValue(kind));
    this.events.push({ type: "lock", hard, distance, kind, cells: cells.map(([dr, dc]) => [row + dr, col + dc]) });
    const rows = this.board.fullRows();
    this.canHold = true;
    if (rows.length === 0) {
      this.combo = -1;
      this.spawn();
      return;
    }
    const count = rows.length;
    this.combo++;
    this.lines += count;
    let points = LINE_POINTS[count] * this.level;
    const b2b = count === 4 && this.lastWasTetris;
    if (b2b) points = Math.floor(points * 1.5);
    this.lastWasTetris = count === 4;
    this.score += points;
    if (this.combo > 0) this.score += 50 * this.combo * this.level;
    this.events.push({ type: "lines", count, rows: [...rows], combo: this.combo, b2b });
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.events.push({ type: "level", level: newLevel });
    }
    this.clearRows = rows;
    this.clearTimer = CLEAR_FRAMES;
    this.active = null;
  }
  spawn(kind) {
    const k = kind ?? this.takeFromQueue();
    const origin = { kind: k, rot: 0, row: 1, col: Math.floor((10 - boxSize(k)) / 2) };
    this.active = origin;
    this.gravity = 0;
    this.lockTimer = 0;
    this.lockResetCount = 0;
    if (!this.board.fits(cellsOf(k, 0), origin.row, origin.col)) {
      this.over = true;
      this.active = null;
      this.events.push({ type: "gameover", score: this.score });
    }
  }
  takeFromQueue() {
    this.fillQueue();
    return this.queue.shift();
  }
  /** Sac de 7 : chaque pièce apparaît une fois par sac, ordre mélangé. */
  fillQueue() {
    while (this.queue.length < 4) {
      if (this.bag.length === 0) this.bag = this.rng.shuffle([...KINDS]);
      this.queue.push(this.bag.pop());
    }
  }
  flush() {
    const out = this.events;
    this.events = [];
    return out;
  }
  /** Vue pour le rendu : plateau (lignes cachées incluses, à ignorer à l'affichage). */
  get rows() {
    return BOARD_H - HIDDEN_ROWS;
  }
};

// src/tetris/render/scene.ts
var TICK_MS = 1e3 / 60;
var TOUCH = isTouch();
var GAME_W = 760;
var GAME_H = TOUCH ? 1010 : 820;
var C = 36;
var BX = 200;
var BY = 64;
var BW = BOARD_W * C;
var BH = (BOARD_H - HIDDEN_ROWS) * C;
var LX = 20;
var RX = 580;
var COL_W = 160;
var BEST_KEY = "arcade.tetris.best";
var COLORS = {
  I: PAL.leaf,
  O: PAL.orangeLight,
  T: 14262504,
  S: PAL.moss2,
  Z: PAL.berry,
  J: 8369368,
  L: PAL.orange
};
var ICONS = { I: "leaf", O: "acorn", T: "mushroom", S: "clover", Z: "berry", J: "pinecone", L: "nut" };
var TetrisScene = class extends Phaser.Scene {
  constructor() {
    super("tetris");
    this.state = "ready";
    this.seed = 0;
    this.acc = 0;
    this.best = 0;
    this.newRecord = false;
    this.fx = new Particles();
    this.mascot = null;
    this.iconBig = {};
    this.iconSmall = {};
    this.pad = null;
    this.trails = [];
    this.flashes = [];
    this.flashWhite = 0;
    this.scoreCounter = new Counter();
    this.shown = { lines: -1, level: -1, best: -1, score: -1 };
    this.prevPad = [];
    this.just = {};
  }
  create() {
    this.best = loadBest(BEST_KEY);
    this.buildStatic();
    this.gfx = this.add.graphics().setDepth(10);
    this.fxGfx = this.add.graphics().setDepth(40);
    this.sprites = new SpritePool(this, 11);
    for (const kind of KINDS) {
      this.iconBig[kind] = spriteKey(this, ICONS[kind], 3);
      this.iconSmall[kind] = spriteKey(this, ICONS[kind], 2);
    }
    if (!TOUCH) this.mascot = new Mascot(this, SQUIRREL_NAMES[0], LX + COL_W / 2, GAME_H - 14, 5);
    this.overlay = new Overlay(this, GAME_W, GAME_H);
    new MuteButton(this, GAME_W - 68, 8, 48);
    if (TOUCH) {
      const y = 810;
      this.pad = new TouchPad(this, [
        { id: "left", x: 20, y, w: 150, h: 170, label: "\u25C0" },
        { id: "down", x: 186, y, w: 150, h: 170, label: "\u25BC" },
        { id: "right", x: 352, y, w: 150, h: 170, label: "\u25B6" },
        { id: "hold", x: 520, y, w: 100, h: 170, label: "C", color: PAL.moss2 },
        { id: "rot", x: 632, y, w: 108, h: 80, label: "\u27F3", color: PAL.orange },
        { id: "drop", x: 632, y: y + 90, w: 108, h: 80, label: "\u2913", color: PAL.berry }
      ]);
    }
    const kb = this.input.keyboard;
    this.keys = kb.addKeys({
      left: "LEFT",
      right: "RIGHT",
      down: "DOWN",
      up: "UP",
      a: "A",
      d: "D",
      s: "S",
      w: "W",
      x: "X",
      z: "Z",
      space: "SPACE",
      c: "C",
      shift: "SHIFT",
      p: "P",
      esc: "ESC",
      r: "R",
      enter: "ENTER"
    });
    onBlur(this, () => {
      if (this.state === "playing") this.pause();
    });
    this.resetGame();
    this.showStart();
  }
  // ---------- décor fixe ----------
  buildStatic() {
    const bg = this.add.graphics().setDepth(0);
    drawPanel(bg, BX - 14, BY - 14, BW + 28, BH + 28, { fill: 1782308, depth: 8, bw: 8 });
    for (let r = 0; r < BOARD_H - HIDDEN_ROWS; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        bg.fillStyle((r + c) % 2 === 0 ? 2178861 : 2508851, 1);
        bg.fillRect(BX + c * C, BY + r * C, C, C);
      }
    }
    makeText(this, LX, 6, "TETRIS", 46, PAL.orangeLight, { strokeW: 8 }).setDepth(5);
    const panel = (x, y, h, title) => {
      drawPanel(bg, x, y, COL_W, h, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(x + 4, y + 4, COL_W - 8, 30);
      makeText(this, x + COL_W / 2, y + 19, title, 22, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
    };
    panel(LX, BY, 170, "GARDER");
    panel(LX, 252, 120, "SCORE");
    panel(LX, 394, 84, "LIGNES");
    panel(LX, 500, 84, "NIVEAU");
    panel(LX, 606, 84, "MEILLEUR");
    panel(RX, BY, 330, "SUIVANTES");
    const value = (x, y, size = 40) => makeText(this, x + COL_W / 2, y, "0", size, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 }).setDepth(5);
    this.texts = {
      score: value(LX, 252 + 80, 44),
      lines: value(LX, 394 + 58),
      level: value(LX, 500 + 58),
      best: value(LX, 606 + 58, 34).setColor("#f2b05e")
    };
    if (!TOUCH) {
      drawPanel(bg, RX, 416, COL_W, 368, { fill: PAL.field, depth: 6, bw: 4 });
      bg.fillStyle(PAL.ink0, 1);
      bg.fillRect(RX + 4, 420, COL_W - 8, 30);
      makeText(this, RX + COL_W / 2, 435, "COMMANDES", 22, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
      const rows = [
        ["\u2190 \u2192", "bouger"],
        ["\u2191  X", "tourner"],
        ["Z", "tourner \u21BA"],
        ["\u2193", "descendre"],
        ["ESPACE", "chute"],
        ["C", "garder"],
        ["P", "pause"],
        ["M", "son"]
      ];
      rows.forEach(([k, label], i) => {
        const y = 468 + i * 38;
        makeText(this, RX + 14, y, k, 20, PAL.leaf, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5).setFontStyle("800");
        makeText(this, RX + COL_W - 14, y, label, 18, PAL.panel2, { font: FONT_BODY, origin: [1, 0], strokeW: 3, shadow: false }).setDepth(5);
      });
    }
  }
  // ---------- états ----------
  resetGame() {
    this.seed = readSeed();
    this.tetris = new TetrisGame(this.seed);
    this.acc = 0;
    this.newRecord = false;
    this.trails = [];
    this.flashes = [];
    this.fx.clear();
    this.scoreCounter.reset(0);
    this.shown = { lines: -1, level: -1, best: -1, score: -1 };
  }
  showStart() {
    this.state = "ready";
    this.overlay.show(
      { title: "TETRIS", subtitle: this.best > 0 ? `Meilleur score : ${this.best}` : "Empile, compl\xE8te des lignes", lines: TOUCH ? ["Boutons en bas de l'\xE9cran"] : ["\u2190 \u2192 bouger \xB7 \u2191 tourner \xB7 ESPACE chute"], button: "Jouer", hint: TOUCH ? "Touche pour jouer" : "ESPACE ou clic" },
      () => this.startGame()
    );
  }
  startGame() {
    this.overlay.hide();
    this.resetGame();
    this.mascot?.reset();
    this.state = "playing";
    arp([392, 523, 659], 0.07, { vol: 0.04, type: "square" });
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
  gameOver() {
    this.state = "over";
    const score = this.tetris.score;
    if (score > this.best) {
      this.best = score;
      this.newRecord = true;
      saveBest(BEST_KEY, this.best);
    }
    this.cameras.main.shake(260, 0.012);
    this.mascot?.sad();
    [0, 1, 2, 3].forEach((i) => tone(330 - i * 60, 0.22, { vol: 0.05, type: "sawtooth", delay: i * 0.12, freqEnd: 200 - i * 40 }));
    this.time.delayedCall(700, () => {
      if (this.state !== "over") return;
      this.overlay.show(
        {
          title: "PARTIE FINIE",
          subtitle: `Score ${score}`,
          lines: [`${this.tetris.lines} lignes \xB7 niveau ${this.tetris.level}`, this.newRecord ? "\u2605 Nouveau record ! \u2605" : `Meilleur : ${this.best}`],
          button: "Rejouer",
          hint: "ESPACE ou R"
        },
        () => this.startGame()
      );
    });
  }
  // ---------- boucle ----------
  update(_time, delta) {
    this.fx.update(delta);
    this.mascot?.update(delta);
    this.trails = this.trails.filter((t) => (t.life -= delta) > 0);
    this.flashes = this.flashes.filter((f) => (f.life -= delta) > 0);
    if (this.flashWhite > 0) this.flashWhite = Math.max(0, this.flashWhite - delta);
    this.pad?.poll();
    const j = {};
    for (const name of Object.keys(this.keys)) j[name] = Phaser.Input.Keyboard.JustDown(this.keys[name]);
    this.just = j;
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
    if (this.state === "playing") this.playFrame(delta, pad);
    if (pad) this.prevPad = pad.buttons.slice();
    else this.prevPad = [];
    this.render(delta);
  }
  playFrame(delta, pad) {
    const j = this.just;
    const k = this.keys;
    const g = this.tetris;
    const edge = (i) => !!pad && !!pad.buttons[i] && !this.prevPad[i];
    if (j.up || j.w || j.x || edge(0) || this.pad?.pressed("rot")) g.rotate(1);
    if (j.z || edge(1)) g.rotate(-1);
    if (j.shift || j.c || edge(3) || this.pad?.pressed("hold")) g.holdPiece();
    if (j.space || edge(2) || this.pad?.pressed("drop")) g.hardDrop();
    const left = k.left.isDown || k.a.isDown || (pad?.x ?? 0) < 0 || !!this.pad?.isDown("left");
    const right = k.right.isDown || k.d.isDown || (pad?.x ?? 0) > 0 || !!this.pad?.isDown("right");
    const down = k.down.isDown || k.s.isDown || (pad?.y ?? 0) > 0 || !!this.pad?.isDown("down");
    this.acc += delta;
    while (this.acc >= TICK_MS) {
      this.acc -= TICK_MS;
      g.setHeld(left, right);
      g.setSoftDrop(down);
      this.onEvents(g.step());
      if (g.over) break;
    }
  }
  onEvents(events) {
    for (const e of events) {
      switch (e.type) {
        case "move":
          tone(250, 0.025, { vol: 0.018, type: "triangle" });
          break;
        case "rotate":
          tone(430, 0.05, { vol: 0.025, type: "triangle", freqEnd: 520 });
          break;
        case "hold":
          tone(380, 0.06, { vol: 0.03, type: "sine" });
          tone(560, 0.07, { vol: 0.03, type: "sine", delay: 0.05 });
          break;
        case "lock":
          this.onLock(e);
          break;
        case "lines":
          this.onLines(e);
          break;
        case "level":
          arp([523, 659, 784, 1047, 1319], 0.06, { vol: 0.05, type: "square" });
          this.flashWhite = 220;
          this.mascot?.set(SQUIRREL_NAMES[(e.level - 1) % SQUIRREL_NAMES.length]);
          this.mascot?.cheer();
          popText(this, BX + BW / 2, BY + BH / 2 - 90, `NIVEAU ${e.level}`, 54, PAL.leaf, { ms: 1100 });
          break;
        case "gameover":
          this.gameOver();
          break;
      }
    }
  }
  cellPos(row, col) {
    return { x: BX + col * C, y: BY + (row - HIDDEN_ROWS) * C };
  }
  onLock(e) {
    const color = COLORS[e.kind];
    noise(0.06, { vol: 0.05, freq: 900 });
    tone(110, 0.08, { vol: 0.05, type: "square", freqEnd: 70 });
    for (const [r, c] of e.cells) {
      const p = this.cellPos(r, c);
      this.flashes.push({ x: p.x, y: p.y, life: 110 });
    }
    if (e.hard && e.distance > 0) {
      noise(0.12, { vol: 0.07, freq: 650 });
      this.cameras.main.shake(90, Math.min(0.012, 3e-3 + e.distance * 4e-4));
      const cols = /* @__PURE__ */ new Map();
      for (const [r, c] of e.cells) cols.set(c, Math.min(cols.get(c) ?? 99, r));
      for (const [c, top] of cols) {
        const x = BX + c * C;
        const yEnd = this.cellPos(top, c).y;
        this.trails.push({ x, y0: yEnd - e.distance * C, y1: yEnd, color, life: 200 });
        this.fx.burst(x + C / 2, this.cellPos(Math.max(...e.cells.filter(([, cc]) => cc === c).map(([r]) => r)), c).y + C, { n: 4, color: [color, PAL.cream], speed: 160, life: 380, size: 6, gravity: 500, angle: -Math.PI / 2, spread: Math.PI * 0.9 });
      }
    }
  }
  onLines(e) {
    const names = ["", "SIMPLE", "DOUBLE", "TRIPLE", "TETRIS !"];
    const notes = e.count >= 4 ? [523, 659, 784, 1047, 1319] : e.count === 3 ? [523, 659, 784, 988] : e.count === 2 ? [523, 659, 784] : [523, 659];
    arp(notes, 0.055, { vol: 0.055, type: "square" });
    noise(0.18, { vol: 0.06, freq: 3200 });
    this.cameras.main.shake(140 + e.count * 40, 3e-3 + e.count * 28e-4);
    this.flashWhite = e.count >= 4 ? 260 : 120;
    this.mascot?.cheer();
    for (const r of e.rows) {
      for (let c = 0; c < BOARD_W; c++) {
        const v = this.tetris.board.grid[r][c];
        const color = v > 0 ? COLORS[KINDS[v - 1]] : PAL.cream;
        const p = this.cellPos(r, c);
        this.fx.burst(p.x + C / 2, p.y + C / 2, { n: e.count >= 4 ? 4 : 2, color: [color, PAL.cream], speed: 280 + e.count * 50, life: 700, size: 8, gravity: 700 });
      }
    }
    const midY = this.cellPos(e.rows[Math.floor(e.rows.length / 2)], 0).y;
    popText(this, BX + BW / 2, midY, names[e.count] ?? "", e.count >= 4 ? 64 : 48, e.count >= 4 ? PAL.orangeLight : PAL.cream, { ms: 900, rise: 70 });
    if (e.b2b) popText(this, BX + BW / 2, midY + 54, "BACK-TO-BACK \xD71,5", 26, PAL.leaf, { ms: 1e3, rise: 40 });
    if (e.combo > 0) popText(this, BX + BW / 2, midY - 52, `COMBO \xD7${e.combo + 1}`, 28, PAL.leaf, { ms: 900, rise: 30 });
  }
  // ---------- rendu ----------
  render(delta) {
    const g = this.gfx;
    g.clear();
    const fxg = this.fxGfx;
    fxg.clear();
    const game = this.tetris;
    this.sprites.begin();
    const clearing = new Set(game.clearRows);
    const p = game.clearProgress;
    let topRow = BOARD_H;
    for (let r = HIDDEN_ROWS; r < BOARD_H; r++) {
      for (let c = 0; c < BOARD_W; c++) {
        const v = game.board.grid[r][c];
        if (!v) continue;
        topRow = Math.min(topRow, r);
        const { x, y } = this.cellPos(r, c);
        if (clearing.has(r)) {
          if (p < 0.4) {
            const blink = Math.floor(p * 24) % 2 === 0;
            drawBlock(g, x, y, C, blink ? 16777215 : COLORS[KINDS[v - 1]]);
          } else {
            const k = 1 - (p - 0.4) / 0.6;
            const s = Math.max(2, C * k);
            drawBlock(g, x + (C - s) / 2, y + (C - s) / 2, s, mix(COLORS[KINDS[v - 1]], 16777215, 0.7));
          }
        } else {
          drawBlock(g, x, y, C, COLORS[KINDS[v - 1]]);
          this.sprites.draw(this.iconBig[KINDS[v - 1]] ?? null, x + C / 2, y + C / 2 + 1);
        }
      }
    }
    const active = game.active;
    if (active && this.state !== "ready") {
      const color = COLORS[active.kind];
      const ghost = game.ghostRow() ?? active.row;
      if (ghost !== active.row) {
        for (const [dr, dc] of cellsOf(active.kind, active.rot)) {
          const r = ghost + dr;
          if (r < HIDDEN_ROWS) continue;
          const { x, y } = this.cellPos(r, active.col + dc);
          g.fillStyle(color, 0.16);
          g.fillRect(x + 2, y + 2, C - 4, C - 4);
          g.lineStyle(3, color, 0.7);
          g.strokeRect(x + 3, y + 3, C - 6, C - 6);
        }
      }
      for (const [dr, dc] of cellsOf(active.kind, active.rot)) {
        const r = active.row + dr;
        if (r < HIDDEN_ROWS) continue;
        const { x, y } = this.cellPos(r, active.col + dc);
        drawBlock(g, x, y, C, color);
        this.sprites.draw(this.iconBig[active.kind] ?? null, x + C / 2, y + C / 2 + 1);
      }
    }
    for (const f of this.flashes) {
      fxg.fillStyle(16777215, 0.75 * (f.life / 110));
      fxg.fillRect(f.x, f.y, C, C);
    }
    for (const t of this.trails) {
      const a = 0.35 * (t.life / 200);
      fxg.fillStyle(t.color, a);
      fxg.fillRect(t.x + 4, t.y0, C - 8, t.y1 - t.y0);
    }
    this.fx.draw(fxg);
    const danger = topRow <= HIDDEN_ROWS + 5 && this.state === "playing";
    const pulse = danger ? 0.5 + 0.5 * Math.sin(this.time.now / 110) : 0;
    g.lineStyle(8, mix(PAL.ink0, PAL.red, pulse), 1);
    g.strokeRect(BX - 4, BY - 4, BW + 8, BH + 8);
    if (this.flashWhite > 0) {
      g.fillStyle(16777215, 0.22 * (this.flashWhite / 260));
      g.fillRect(BX, BY, BW, BH);
    }
    this.drawPreview(g, game.hold, LX + COL_W / 2, BY + 105, 28, game.holdAvailable ? 1 : 0.4);
    game.next.forEach((kind, i) => {
      const size = i === 0 ? 30 : 22;
      const cy = i === 0 ? BY + 100 : i === 1 ? BY + 200 : BY + 270;
      this.drawPreview(g, kind, RX + COL_W / 2, cy, size, i === 0 ? 1 : 0.85);
    });
    this.pad?.draw(g);
    this.sprites.end();
    const score = this.scoreCounter.update(game.score, delta);
    if (score !== this.shown.score) {
      this.texts.score.setText(String(score));
      this.shown.score = score;
    }
    if (game.lines !== this.shown.lines) {
      this.texts.lines.setText(String(game.lines));
      this.shown.lines = game.lines;
      this.bump(this.texts.lines);
    }
    if (game.level !== this.shown.level) {
      this.texts.level.setText(String(game.level));
      this.shown.level = game.level;
      this.bump(this.texts.level);
    }
    const best = Math.max(this.best, game.score);
    if (best !== this.shown.best) {
      this.texts.best.setText(String(best));
      this.shown.best = best;
    }
  }
  bump(t) {
    this.tweens.add({ targets: t, scale: 1.25, duration: 90, yoyo: true, ease: "Sine.Out" });
  }
  /** Pièce centrée dans un cadre (aperçu). */
  drawPreview(g, kind, cx, cy, size, alpha) {
    if (!kind) return;
    const cells = cellsOf(kind, 0);
    const rows = cells.map(([r]) => r);
    const cols = cells.map(([, c]) => c);
    const minR = Math.min(...rows), maxR = Math.max(...rows), minC = Math.min(...cols), maxC = Math.max(...cols);
    const w = (maxC - minC + 1) * size;
    const h = (maxR - minR + 1) * size;
    for (const [r, c] of cells) {
      const px = cx - w / 2 + (c - minC) * size;
      const py = cy - h / 2 + (r - minR) * size;
      drawBlock(g, px, py, size, COLORS[kind], alpha);
      this.sprites.draw(this.iconSmall[kind] ?? null, px + size / 2, py + size / 2 + 0.5, { scale: size / 26, alpha });
    }
  }
};

// src/tetris/main.ts
var fontReady = document.fonts ? document.fonts.load('40px "Londrina"').catch(() => void 0) : Promise.resolve();
void fontReady.then(() => {
  const config = {
    type: Phaser.AUTO,
    parent: "game-stage",
    backgroundColor: "#1f3a2b",
    width: GAME_W,
    height: GAME_H,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new TetrisScene()
  };
  const game = new Phaser.Game(config);
  window.tetrisGame = game;
  bindFullscreen("game-stage", () => game.scale.refresh());
});
