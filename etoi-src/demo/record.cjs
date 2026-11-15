// Enregistre un parcours de démonstration de l'app (mobile 390x844 @2x) -> demo/etoi-demo.mp4
// Usage : (serveur statique sur ../etoi, port 4173)  NODE_PATH=$(npm root -g) node demo/record.cjs
const { chromium } = require('playwright');
const fs = require('fs'); const { execSync } = require('child_process');
const OUT = __dirname + '/frames'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'fr-FR' });
  await ctx.addInitScript(() => {
    addEventListener('pointerdown', (e) => {
      const d = document.createElement('div');
      d.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;z-index:99999;pointer-events:none;background:radial-gradient(circle,rgba(255,226,170,.55),rgba(242,179,94,.25) 60%,transparent 72%);box-shadow:0 0 24px rgba(242,179,94,.6);transition:transform .55s cubic-bezier(.2,.7,.2,1),opacity .55s;`;
      document.body.appendChild(d);
      requestAnimationFrame(() => { d.style.transform = 'scale(1.7)'; d.style.opacity = '0'; });
      setTimeout(() => d.remove(), 700);
    }, true);
  });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    const name = `f${String(n++).padStart(5, '0')}.jpg`;
    fs.writeFileSync(`${OUT}/${name}`, Buffer.from(f.data, 'base64'));
    frames.push({ name, ts: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });

  const w = (ms) => p.waitForTimeout(ms);
  const tap = async (loc, pause = 700) => { await loc.scrollIntoViewIfNeeded().catch(() => {}); await w(250); await loc.click(); await w(pause); };
  const btn = (name, o = {}) => p.getByRole('button', { name, ...o }).first();
  const scrollTo = (sel, y) => p.evaluate(([s, y]) => document.querySelector(s)?.scrollTo({ top: y, behavior: 'smooth' }), [sel, y]);

  await p.goto('http://localhost:4173/');
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  await w(6200);                                             // 1. accueil, apparition progressive
  await tap(p.getByText('Découvrir', { exact: true }), 900);
  await tap(p.getByPlaceholder("Comment dois-je t'appeler ?"), 300); await p.keyboard.type('Alex', { delay: 110 }); await w(400);
  await p.locator('input[type=date]').fill('1988-04-12'); await w(500);
  await tap(btn('Homme'), 400);
  await tap(p.getByPlaceholder('Lyon'), 300); await p.keyboard.type('Lyon', { delay: 110 }); await w(500);
  await scrollTo('.scroll', 600); await w(1300); await scrollTo('.scroll', 0); await w(600);
  await tap(btn('Continuer'), 1300);                          // 2. ta vie de parent
  await tap(btn('2', { exact: true }), 450); await tap(btn('6-10 ans'), 450); await tap(btn('Parent solo, garde principale'), 700);
  await scrollTo('.scroll', 500); await w(1100); await tap(btn('Continuer'), 1300);
  await tap(btn(/Relation sérieuse|Une relation sérieuse/), 600); await tap(btn('Continuer'), 1300);   // 3. intentions
  await tap(btn(/En soirée/), 500); await tap(btn(/Le week-end/), 700); await tap(btn('Continuer'), 1300);   // 4. dispos
  for (const t of ['Cuisine', 'Cinéma', 'Randonnée', 'Musique live']) await tap(btn(t, { exact: true }), 330);
  await scrollTo('.scroll', 900); await w(900);
  await tap(p.locator('textarea'), 300); await p.keyboard.type('Je cuisine mieux que je ne danse, mais je danse quand même.', { delay: 45 }); await w(700);
  await tap(btn('Terminer'), 3800);                           // splash bienvenue
  await w(900);                                               // 5. découverte
  await scrollTo('.scroll', 520); await w(1700); await scrollTo('.scroll', 0); await w(900);
  await tap(btn('Faire connaissance'), 3200);                 // 6. réciprocité
  await tap(btn(/Écrire à/), 1400);                           // 7. messagerie
  await tap(p.getByText('À quoi ressemble ta soirée idéale ?'), 4200);
  await tap(btn('Notre moment'), 1800);                       // 8. notre moment
  await tap(btn('Proposer'), 4200);
  await tap(btn('Retour'), 900);
  await tap(btn('Découvrir', { exact: true }), 600);          // retour découverte : passer
  await tap(btn('Passer'), 1100);
  await tap(btn('Ce soir'), 1300);                            // 9. Ce soir, je suis là
  await tap(btn('1 h'), 600); await tap(btn('Je suis là'), 2800);
  await scrollTo('.scroll', 420); await w(1800);
  await tap(btn('Connexions'), 1800);
  await tap(btn('Messages'), 1800);
  await tap(btn('Moi', { exact: true }), 1400);               // 10. profil & confidentialité
  await scrollTo('.scroll', 700); await w(2200); await scrollTo('.scroll', 0); await w(800);
  await tap(btn('Modifier'), 2200);
  await w(800);

  await cdp.send('Page.stopScreencast');
  await b.close();

  // assemblage à cadence variable (les frames n'arrivent que lorsque l'écran change)
  const lines = [];
  frames.forEach((f, i) => { const d = i < frames.length - 1 ? Math.max(.001, frames[i + 1].ts - f.ts) : 1.2; lines.push(`file '${f.name}'`, `duration ${d.toFixed(4)}`); });
  lines.push(`file '${frames.at(-1).name}'`);
  fs.writeFileSync(`${OUT}/list.txt`, lines.join('\n'));
  console.log(frames.length, 'frames, ~', (frames.at(-1).ts - frames[0].ts).toFixed(1), 's');
  execSync(`ffmpeg -y -loglevel error -f concat -safe 0 -i ${OUT}/list.txt -vf "fps=30,scale=-2:1800:flags=lanczos,pad=1080:1920:(ow-iw)/2:60:color=0x0f0e12,format=yuv420p" -c:v libx264 -preset slow -crf 17 -movflags +faststart ${__dirname}/etoi-demo.mp4`, { stdio: 'inherit' });
  fs.rmSync(OUT, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
