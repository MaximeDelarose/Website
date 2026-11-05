import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await (await b.newContext({ viewport: { width: 400, height: 800 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5210/#k=' + process.env.PHOTO_KEY, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(5000);
const url = await p.evaluate(async (mode) => {
  const av = await import('/src/game/art/world/avatar.ts'); const ids = await import('/src/data/world/ids.ts'); const rn = await import('/src/game/art/world/radiaNow.ts'); await rn.warmAuguste();
  const L = { ...ids.DEFAULT_LOOK, hair: 'hair-wavy', acc: [] };
  const looks = [L, { ...L, top: 'top-tee-white', bottom: 'bot-jeans', bag: null }, { ...L, top: null, bottom: 'bot-track-red', jacket: 'jk-track-red' }, { ...L, top: null, bottom: null, dress: 'dr-pink-satin', shoes: 'sh-heels', bag: null }, { ...L, jacket: 'jk-trench-beige' }, { ...L, top: 'top-hoodie-cream', bag: 'bg-mini-gold' }];
  const W = 300, H = 750; const c = document.createElement('canvas'); c.width = W * looks.length; c.height = H; const x = c.getContext('2d'); x.fillStyle = '#d9c6ef'; x.fillRect(0, 0, c.width, H);
  looks.forEach((l, i) => x.drawImage(av.avatarCanvas(l, W, H, { expr: 'smile' }), i * W, 0));
  return c.toDataURL(); }, 'x');
fs.writeFileSync(process.argv[2], Buffer.from(url.split(',')[1], 'base64')); console.log('erreurs', errs.length); await b.close();
