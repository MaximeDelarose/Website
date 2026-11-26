#!/usr/bin/env node
// Pré-rend en PNG les textures qu'Echoes of Aether (Max version) dessine au démarrage.
//
//   node tools/echoes-bake.js            (Playwright + Chromium nécessaires)
//
// Lance le jeu deux fois dans un navigateur sans écran (avec deux héros différents), récupère
// les textures générées, ne garde que celles identiques d'une partie à l'autre, puis écrit
// echoes-moi/assets/baked/<clé>.png et echoes-moi/assets/baked/manifest.js.
// À relancer après toute modification d'un générateur de texture dans game.js.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const GAME = 'echoes-moi';
const OUT = path.join(ROOT, GAME, 'assets', 'baked');
// Textures générées connues pour être sautées quand elles existent déjà (générateur gardé).
const PREFIXES = ['club_', 'i_', 'mon_', 'realm_', 'zd_', 'zg_', 'tcloud'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/json' };

// --- Encodeur PNG sans perte : palette indexée (+ transparence) si ≤ 256 couleurs, sinon RGBA. ---
const zlib = require('zlib');
const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// Filtre PNG choisi ligne par ligne (heuristique de la somme minimale des écarts).
function filterRows(raw, rowBytes, h, bpp) {
  const out = Buffer.alloc((rowBytes + 1) * h);
  const cand = [0, 1, 2, 3, 4].map(() => Buffer.alloc(rowBytes));
  for (let y = 0; y < h; y++) {
    const row = raw.subarray(y * rowBytes, (y + 1) * rowBytes);
    const up = y ? raw.subarray((y - 1) * rowBytes, y * rowBytes) : null;
    let best = 0,
      bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const o = cand[f];
      let sum = 0;
      for (let i = 0; i < rowBytes; i++) {
        const a = i >= bpp ? row[i - bpp] : 0,
          b = up ? up[i] : 0,
          c = up && i >= bpp ? up[i - bpp] : 0;
        let p;
        if (f === 0) p = 0;
        else if (f === 1) p = a;
        else if (f === 2) p = b;
        else if (f === 3) p = (a + b) >> 1;
        else {
          const pa = Math.abs(b - c),
            pb = Math.abs(a - c),
            pc = Math.abs(a + b - 2 * c);
          p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const v = (row[i] - p) & 0xff;
        o[i] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) {
        bestSum = sum;
        best = f;
      }
    }
    out[y * (rowBytes + 1)] = best;
    cand[best].copy(out, y * (rowBytes + 1) + 1);
  }
  return out;
}
function encodePng(w, h, rgba) {
  const colors = new Map();
  for (let i = 0; i < rgba.length && colors.size <= 256; i += 4) {
    const a = rgba[i + 3];
    const key = a === 0 ? 0 : (rgba.readUInt32BE(i) >>> 0) || 1;
    if (!colors.has(key)) colors.set(key, colors.size);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  const parts = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])];
  let raw, rowBytes, bpp;
  if (colors.size <= 256) {
    ihdr[9] = 3;
    const plte = Buffer.alloc(colors.size * 3),
      trns = Buffer.alloc(colors.size);
    for (const [key, idx] of colors) {
      const v = key === 0 ? 0 : key === 1 ? 0x000000ff : key;
      plte[idx * 3] = (v >>> 24) & 0xff;
      plte[idx * 3 + 1] = (v >>> 16) & 0xff;
      plte[idx * 3 + 2] = (v >>> 8) & 0xff;
      trns[idx] = key === 0 ? 0 : v & 0xff;
    }
    raw = Buffer.alloc(w * h);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
      const key = rgba[i + 3] === 0 ? 0 : (rgba.readUInt32BE(i) >>> 0) || 1;
      raw[j] = colors.get(key);
    }
    rowBytes = w;
    bpp = 1;
    parts.push(chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('tRNS', trns));
  } else {
    ihdr[9] = 6;
    raw = rgba;
    rowBytes = w * 4;
    bpp = 4;
    parts.push(chunk('IHDR', ihdr));
  }
  const data = zlib.deflateSync(filterRows(raw, rowBytes, h, bpp), { level: 9, memLevel: 9 });
  parts.push(chunk('IDAT', data), chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

async function collect(hero) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 420 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx.route('http://bake.local/**', (r) => {
    let p = decodeURIComponent(new URL(r.request().url()).pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' } });
  });
  // Partir des générateurs, jamais d'anciens PNG.
  await ctx.addInitScript(() => localStorage.setItem('eoam_perf_off', 'baked'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://bake.local/${GAME}/`);
  await page.waitForFunction(() => window.__game && __game.scene.getScene('Title')?.sys.isActive(), null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  // Nouvelle partie avec le héros demandé (sinon celui proposé par défaut), pour construire le monde.
  await page.evaluate((hero) => {
    const s = __game.scene.getScene('Title');
    if (hero) s.sel = hero;
    s.build('select');
  }, hero);
  await page.waitForTimeout(800);
  const btn = await page.evaluate(() => {
    const s = __game.scene.getScene('Title');
    let r = null;
    const walk = (o) => {
      if (o.type === 'Text' && /^Jouer/.test(o.text)) {
        const m = o.getWorldTransformMatrix();
        r = { x: m.tx, y: m.ty, t: o.text };
      }
      (o.list || []).forEach(walk);
    };
    s.children.list.forEach(walk);
    return r;
  });
  if (!btn) throw new Error('Bouton « Jouer » introuvable sur l’écran de sélection');
  await page.mouse.click(btn.x, btn.y);
  await page.waitForFunction(() => __game.scene.getScene('UI')?.sys.isActive(), null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  const textures = await page.evaluate((prefixes) => {
    const out = {};
    for (const [key, tex] of Object.entries(__game.textures.list)) {
      const src = tex.source[0];
      if (!src || !src.isCanvas || tex.source.length !== 1) continue;
      if (!prefixes.some((p) => key.startsWith(p))) continue;
      const frames = [];
      for (const name of tex.getFrameNames(false)) {
        const f = tex.frames[name];
        frames.push([/^\d+$/.test(name) ? +name : name, f.cutX, f.cutY, f.cutWidth, f.cutHeight]);
      }
      const c = src.image.getContext('2d', { willReadFrequently: true });
      const px = c.getImageData(0, 0, src.width, src.height).data;
      let bin = '';
      for (let i = 0; i < px.length; i += 0x8000) bin += String.fromCharCode.apply(null, px.subarray(i, i + 0x8000));
      out[key] = { w: src.width, h: src.height, frames, rgba: btoa(bin) };
    }
    return out;
  }, PREFIXES);
  await browser.close();
  if (errors.length) throw new Error('Erreurs JS pendant le pré-rendu : ' + errors.join(' | '));
  return { hero: btn.t, textures };
}

(async () => {
  const a = await collect(null);
  const b = await collect('aka');
  console.log(`Parties : ${a.hero} / ${b.hero}`);
  const keep = {};
  const skipped = [];
  for (const [k, v] of Object.entries(a.textures)) {
    const w = b.textures[k];
    if (!w || w.rgba !== v.rgba || JSON.stringify(w.frames) !== JSON.stringify(v.frames)) {
      skipped.push(k);
      continue;
    }
    keep[k] = v;
  }
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = {};
  const hash = crypto.createHash('sha1');
  let bytes = 0;
  for (const k of Object.keys(keep).sort()) {
    const { w, h, frames, rgba } = keep[k];
    const buf = encodePng(w, h, Buffer.from(rgba, 'base64'));
    fs.writeFileSync(path.join(OUT, `${k}.png`), buf);
    bytes += buf.length;
    hash.update(k).update(buf);
    manifest[k] = { w, h, frames };
  }
  const version = hash.digest('hex').slice(0, 10);
  fs.writeFileSync(
    path.join(OUT, 'manifest.js'),
    '// Généré par tools/echoes-bake.js — ne pas modifier à la main.\n' +
      `export default ${JSON.stringify({ version, textures: manifest })};\n`,
  );
  console.log(`${Object.keys(keep).length} textures écrites (${(bytes / 1024).toFixed(0)} Ko), version ${version}`);
  if (skipped.length) console.log(`Ignorées (différentes selon la partie) : ${skipped.join(', ')}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
