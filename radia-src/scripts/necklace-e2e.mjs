// « L'Éclat Éternel ♡ » : parcours réel par clics (Chromium émulé iPhone, PAS un vrai iPhone).
// Prérequis : npx vite build --outDir /tmp/claude-0/i && npx vite preview --outDir /tmp/claude-0/i --port 4190
// Lancer : PORT=4190 H=852 node scripts/necklace-e2e.mjs   (puis H=660). Captures : shots/i-*.png
import { chromium } from 'playwright';
const PORT = process.env.PORT ?? '4190';
const H = +(process.env.H ?? 852);
const T = H === 852 ? '' : `-${H}`;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctxB = await b.newContext({ viewport: { width: 393, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, acceptDownloads: true });
const p = await ctxB.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push('page: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
await p.addInitScript(() => { if (!localStorage.getItem('radia-save-v1')) localStorage.setItem('radia-save-v1', JSON.stringify({ v: 3, seenUpdates: ['v2', 'v3', 'v4'], story: { step: 80 }, levels: {}, hearts: 5 })); });
const out = [];
const check = (n, ok, x = '') => { out.push(`${ok ? 'OK ' : 'KO '} ${n}${x ? ' — ' + x : ''}`); console.log(out[out.length - 1]); };
const sh = (n) => p.screenshot({ path: `shots/i-${n}${T}.png` });
const wait = (ms) => p.waitForTimeout(ms);
const S = () => p.evaluate(() => JSON.parse(JSON.stringify(window.RADIA.save.data)));

/** Ferme les fenêtres d'accueil (Nouveautés, cadeau du jour…) qui peuvent apparaître au démarrage. */
async function clean(n = 6) {
  for (let i = 0; i < n; i++) {
    await wait(500);
    await p.evaluate(() => { document.querySelectorAll('.dy-back').forEach((e) => e.remove()); const bs = document.querySelectorAll('.modal-backdrop:not(.leaving) .actions button'); if (bs.length && !document.querySelector('.nl-show-back')) bs[bs.length - 1].click(); });
  }
}
async function boot() {
  await p.goto(`http://localhost:${PORT}/?debug`);
  await wait(5500);
  await clean(6);
}
/** Clique la réplique en cours (en vérifiant son texte exact) ; renvoie le texte. */
async function say(expected) {
  await p.waitForSelector('.ev-say:not(.out)', { timeout: 25000 });
  await wait(420);
  await p.evaluate(() => document.querySelectorAll('.dy-back').forEach((e) => e.remove()));
  const txt = (await p.locator('.ev-say:not(.out) .ev-say-tx span').first().textContent()).trim();
  if (expected !== undefined) check(`réplique exacte : « ${expected.slice(0, 48)}… »`, txt === expected, txt === expected ? '' : txt);
  await p.locator('.ev-say:not(.out)').first().click();
  await wait(380);
  return txt;
}

await boot();
check('sauvegarde : champ fun.necklace présent, compteur à 1 après la première ouverture', await p.evaluate(() => window.RADIA.save.data.fun.necklace.launches === 1));
await p.evaluate(() => { const d = window.RADIA.save.data; d.world.res.coins = 5000000; d.world.res.fabric = 99999; d.economy.diamonds = 1000000; d.world.wardrobe.owned.push('dr-romantic-pink', 'sh-heels', 'ac-pearls'); d.world.wardrobe.look.dress = 'dr-romantic-pink'; d.world.wardrobe.look.top = null; d.world.wardrobe.look.bottom = null; d.world.wardrobe.look.shoes = 'sh-heels'; d.world.wardrobe.look.acc = ['ac-pearls']; });

// ------------------------------------------------------------------ 1. vitrine verrouillée dans le dressing
await p.getByText('MON MONDE').first().click(); await wait(1500);
await sh('1-hub');
await p.locator('.hub-card', { hasText: 'Dressing' }).first().click(); await wait(1800);
await p.evaluate(() => document.querySelectorAll('.dr-tip').forEach((e) => e.remove()));
await p.locator('.dr-group', { hasText: 'Bijoux' }).click(); await wait(400);
await p.locator('.dr-tab', { hasText: 'Colliers' }).click(); await wait(500);
const locked = p.locator('.dr-card.eclat-locked');
check('vitrine : carte « L\'Éclat Éternel ♡ » visible dans Bijoux > Colliers', (await locked.count()) === 1);
const cardTxt = (await locked.textContent()) ?? '';
check('vitrine : « Inestimable » et aucun prix chiffré sur la carte', cardTxt.includes('Inestimable') && !/\d/.test(cardTxt.replace('♡', '')), cardTxt.trim());
await sh('2-vitrine-grille');
await locked.click(); await wait(900);
const showTxt = (await p.locator('.nl-show').textContent()) ?? '';
check('fiche : « Prix : Inestimable ♡ » + phrase exacte', showTxt.includes('Prix : Inestimable ♡') && showTxt.includes('Ce bijou ne s’achète pas. Il s’offre avec le cœur.'));
check('fiche : rareté légendaire + nom', showTxt.includes('Légendaire') && showTxt.includes('L’Éclat Éternel ♡'));
const lockBtn = p.locator('.nl-lock');
check('fiche : bouton « Cadeau mystérieux — Verrouillé » désactivé', (await lockBtn.textContent())?.includes('Cadeau mystérieux — Verrouillé') && (await lockBtn.isDisabled()));
check('fiche : aucun bouton « Acheter », aucun chiffre de prix', !/Acheter/.test(showTxt) && !/\d/.test(showTxt.replace('♡', '')));
await lockBtn.click({ force: true }).catch(() => {}); await wait(300);
await sh('3-vitrine-fiche');
await p.locator('.nl-close').click(); await wait(500);
let st = await S();
check('achat impossible côté interface : rien débité, rien possédé', st.world.res.coins === 5000000 && st.economy.diamonds === 1000000 && !st.world.wardrobe.owned.includes('ac-eclat'));
check('collier absent de la tenue', !st.world.wardrobe.look.acc.includes('ac-eclat'));
await p.locator('.screen-head .icon-btn').first().click(); await wait(800);
await p.locator('.screen-head .icon-btn').first().click().catch(() => {}); await wait(800);

// ------------------------------------------------------------------ 2. invitation (jamais le mot « collier »)
await p.evaluate(() => window.RADIA.necklace.invite());
await p.waitForSelector('.ev-notif', { timeout: 20000 }).then(() => check('notification dans le téléphone', true)).catch(() => check('notification dans le téléphone', false));
const nTxt = (await p.locator('.ev-notif').textContent()) ?? '';
check('notification : expéditeur « A ♡ » + message exact', nTxt.includes('A ♡') && nTxt.includes('J’ai quelque chose à te montrer ce soir. Mets une jolie tenue, je t’emmène voir un spectacle que j’ai préparé rien que pour toi.'), nTxt.slice(0, 70));
check('notification : aucun spoiler (collier, bijou, diamant, écrin, cadeau)', !/collier|bijou|diamant|écrin|ecrin|cadeau|éclat/i.test(nTxt));
await sh('4-notification');
await p.getByRole('button', { name: 'Voir l’invitation' }).click(); await wait(900);
const invTxt = (await p.locator('.ev-inv').textContent()) ?? '';
check('feuille d\'invitation : boutons « J\'arrive ♡ » / « Plus tard », sans spoiler', invTxt.includes('J’arrive ♡') && invTxt.includes('Plus tard') && !/collier|bijou|diamant|écrin|éclat/i.test(invTxt));
await sh('5-invitation');
await p.getByRole('button', { name: 'Plus tard' }).click(); await wait(600);
st = await S();
check('« Plus tard » : l\'invitation reste dans le téléphone (état later)', st.events.inbox.filter((i) => i.eventId === 'n-eclat' && i.state === 'later').length === 1);
await p.reload(); await wait(5500); await clean(3);
st = await S();
check('après rechargement : invitation toujours là, un seul exemplaire, compteur non gonflé', st.events.inbox.filter((i) => i.eventId === 'n-eclat').length === 1 && st.fun.necklace.launches === 1);
await p.evaluate(() => window.RADIA.necklace.invite());
await p.waitForSelector('.ev-notif', { timeout: 20000 });
await p.getByRole('button', { name: 'Voir l’invitation' }).click(); await wait(700);
await p.getByRole('button', { name: 'J’arrive ♡' }).click();

// ------------------------------------------------------------------ 3. habillage (ambiance soirée exceptionnelle)
await p.waitForSelector('.dr-ready', { timeout: 15000 });
await wait(900);
check('dressing en mode événement, ambiance « soirée exceptionnelle »', (await p.locator('.dr-screen.dr-gala').count()) === 1);
await sh('6-habillage');
await p.locator('.dr-ready').click();
await p.waitForSelector('.ev-travel', { timeout: 15000 }); await wait(700);
await sh('7-trajet');
await p.locator('.ev-body').click({ position: { x: 120, y: 200 } });
await say('Ah ouais… t’es vraiment magnifique comme ça.');
await sh('8-auguste-magnifique');
await say('Allez, viens. J’ai quelque chose à te montrer.');

// ------------------------------------------------------------------ 4. feu d'artifice puis RADIA ❤️
await say('Regarde le ciel, j’ai préparé quelque chose pour toi.');
check('musique atténuée pendant la scène (duck)', await p.evaluate(() => window.RADIA.audio.duckLevel < 0.5), '');
await wait(3000); await sh('9-feu-1');
await wait(3800); await sh('10-feu-2');
await wait(5500); await sh('11-feu-3');
await p.waitForFunction(() => document.querySelector('.nl-cv') !== null, null, { timeout: 5000 });
await wait(7000); await sh('12-radia-ecriture');
await p.waitForSelector('.nl-cv[data-msg-done]', { timeout: 30000 });
const doneAt = await p.evaluate(() => +document.querySelector('.nl-cv').dataset.msgDone);
await wait(1500); await sh('13-radia-final');
await p.waitForSelector('.nl-act', { timeout: 30000 });
const held = (await p.evaluate(() => Date.now())) - doneAt;
check('RADIA ❤️ reste affiché ≥ 8 s après avoir été complètement écrit, avant « Continuer »', held >= 8000, `${(held / 1000).toFixed(1)} s`);
await sh('14-radia-continuer');
// bouton discret « revoir le feu d'artifice »
check('bouton discret pour revoir le feu d\'artifice', (await p.locator('.nl-replay').count()) === 1);
await p.locator('.nl-replay').click(); await wait(6000); await sh('15-revoir');
await p.waitForSelector('.nl-act', { timeout: 80000 });
await wait(600);
await p.locator('.nl-act').click(); await wait(2500);

// ------------------------------------------------------------------ 5. déclaration, écrin, collier
const D = ['Tu sais… j’avais envie de faire quelque chose que tu n’oublierais pas.', 'Alors j’ai passé du temps à imaginer tout ce petit monde pour toi.', 'Les détails, les souvenirs, les fleurs, les chocolats… Je voulais que tu retrouves ici des petites choses qui te ressemblent.', 'Et j’ai encore une dernière surprise.'];
for (let i = 0; i < D.length; i++) { if (i === 1) await sh('16-declaration'); await say(D[i]); }
await p.waitForSelector('.nl-act', { timeout: 10000 }); await wait(1500);
const openTxt = (await p.locator('.nl-act').textContent()) ?? '';
check('bouton « Ouvrir l\'écrin ♡ »', openTxt.includes('Ouvrir l’écrin ♡'));
await sh('17-ecrin-ferme');
st = await S();
check('pas encore attribué à ce moment', st.fun.necklace.owned === false && !st.world.wardrobe.owned.includes('ac-eclat'));
await p.locator('.nl-act').click();
await wait(1800); await sh('18-ouverture-1');
await wait(2500); await sh('19-ouverture-2');
check('musique encore plus basse pendant la révélation', await p.evaluate(() => window.RADIA.audio.duckLevel <= 0.2));
await wait(3500); await sh('20-collier-revele');
const G = ['Ce collier, tu ne pouvais pas l’acheter dans le jeu.', 'Parce que je voulais être celui qui te l’offre, un jour, au moment que j’aurais choisi.', 'Et je voulais qu’il représente quelque chose de plus précieux que les diamants.', 'Tout le temps, toute l’attention et tout le cœur que j’ai mis dans ce monde pour toi.', 'Je ne sais pas ce que demain nous réserve… Mais je veux que tu saches à quel point ce que je fais pour toi est sincère.', 'Ce collier, c’est juste un petit éclat de tout ce que j’avais envie de t’offrir.'];
for (let i = 0; i < G.length; i++) { await say(G[i]); }
await p.waitForSelector('.nl-banner', { timeout: 8000 }); await wait(700);
check('bannière « L\'Éclat Éternel ♡ obtenu ! »', (await p.locator('.nl-banner').textContent()) === 'L’Éclat Éternel ♡ obtenu !');
st = await S();
check('attribution : collier possédé, scène terminée, une seule fois', st.fun.necklace.owned && st.fun.necklace.sceneDone && st.world.wardrobe.owned.filter((x) => x === 'ac-eclat').length === 1);
await sh('21-obtenu');
await p.waitForSelector('.nl-ask', { timeout: 8000 }); await wait(600);
const askTxt = (await p.locator('.nl-ask').textContent()) ?? '';
check('question « Veux-tu porter ton collier ? » + deux choix', askTxt.includes('Veux-tu porter ton collier ?') && askTxt.includes('Le porter ♡') && askTxt.includes('Le garder dans mon dressing'));
await sh('22-question');
await p.getByRole('button', { name: 'Le porter ♡' }).click();
await wait(2200); await sh('23-porter-1');
await wait(2800); await sh('24-porter-2');
await p.waitForSelector('.nl-act', { timeout: 10000 });
await p.locator('.nl-act').click();
await p.waitForSelector('.ev-concl', { timeout: 15000 });
await sh('25-conclusion');
await p.getByRole('button', { name: 'Reprendre ma partie' }).click(); await wait(1500);
st = await S();
check('collier porté (look.acc), choix enregistré', st.world.wardrobe.look.acc.includes('ac-eclat') && st.fun.necklace.chose);
check('souvenir + succès enregistrés', st.fun.necklace.memory && st.fun.necklace.photo && !!st.achievements.ev_eclat);
check('événement terminé une seule fois, plus rien en cours', st.events.done['n-eclat']?.count === 1 && st.events.current === null);
check('musique remontée à la fin', await p.evaluate(() => window.RADIA.audio.duckLevel === 1));

// ------------------------------------------------------------------ 6. le collier sur l'avatar (dressing, MON MONDE)
await p.getByText('MON MONDE').first().click().catch(() => {}); await wait(1500);
await sh('26-mon-monde-porte');
await p.locator('.hub-card', { hasText: 'Dressing' }).first().click(); await wait(1800);
await p.evaluate(() => document.querySelectorAll('.dr-tip').forEach((e) => e.remove()));
await p.locator('.dr-group', { hasText: 'Bijoux' }).click(); await wait(400);
await p.locator('.dr-tab', { hasText: 'Colliers' }).click(); await wait(600);
check('dressing : la vitrine devient une pièce portée (plus verrouillée)', (await p.locator('.dr-card.eclat-locked').count()) === 0 && (await p.locator('.dr-card.worn').count()) >= 1);
await sh('27-dressing-porte');
// retirer puis remettre (choix libre)
await p.locator('.dr-card', { hasText: 'L’Éclat Éternel' }).first().click(); await wait(600);
st = await S(); check('dressing : on peut le retirer', !st.world.wardrobe.look.acc.includes('ac-eclat') && st.world.wardrobe.owned.includes('ac-eclat'));
await p.locator('.dr-card', { hasText: 'L’Éclat Éternel' }).first().click(); await wait(900);
await sh('28-dressing-remis');
st = await S(); check('dressing : on peut le remettre', st.world.wardrobe.look.acc.includes('ac-eclat'));
await p.locator('.screen-head .icon-btn').first().click(); await wait(800);
await p.locator('.screen-head .icon-btn').first().click().catch(() => {}); await wait(800);

// ------------------------------------------------------------------ 7. souvenir dans l'album, PNG, replay
await p.reload(); await wait(5500); await clean(3);
st = await S();
check('rechargement : pas de doublon (un seul collier, une seule invitation, événement terminé)', st.world.wardrobe.owned.filter((x) => x === 'ac-eclat').length === 1 && st.events.inbox.filter((i) => i.eventId === 'n-eclat').length === 1 && st.events.done['n-eclat'].count === 1);
await wait(6000);
check('rechargement : aucune nouvelle notification', (await p.locator('.ev-notif').count()) === 0);
await p.getByText('SOUVENIRS').first().click(); await wait(1500);
await p.locator('.memory-card', { hasText: 'Le ciel portait ton prénom ♡' }).waitFor({ timeout: 8000 }).then(() => check('album : souvenir « Le ciel portait ton prénom ♡ »', true)).catch(() => check('album : souvenir', false));
await sh('29-album');
await p.locator('.memory-card', { hasText: 'Le ciel portait ton prénom ♡' }).click(); await wait(900);
await sh('30-souvenir');
const memTxt = (await p.locator('.modal').textContent()) ?? '';
check('souvenir : texte de la déclaration + « Revoir l\'événement » + export PNG', memTxt.includes('Tu sais… j’avais envie de faire quelque chose que tu n’oublierais pas.') && memTxt.includes('Revoir l’événement') && memTxt.includes('Enregistrer la photo'));
const dl = p.waitForEvent('download', { timeout: 15000 }).catch(() => null);
await p.getByRole('button', { name: 'Enregistrer la photo (PNG)' }).click();
const d = await dl;
if (d) { const path = await d.path(); const fs = await import('node:fs'); const buf = fs.readFileSync(path); check('export PNG : fichier PNG valide', buf.length > 50000 && buf.subarray(1, 4).toString() === 'PNG', `${(buf.length / 1024).toFixed(0)} Ko, ${d.suggestedFilename()}`); fs.copyFileSync(path, `shots/i-photo-souvenir${T}.png`); }
else check('export PNG', false, 'pas de téléchargement détecté');
await wait(800);
await p.getByRole('button', { name: 'Revoir l’événement ♡' }).click();
await p.waitForSelector('.ev-travel', { timeout: 15000 }); await wait(600);
await p.locator('.ev-body').click({ position: { x: 120, y: 200 } });
await say('Regarde le ciel, j’ai préparé quelque chose pour toi.');
await p.waitForSelector('.nl-act', { timeout: 90000 }); await wait(400); await p.locator('.nl-act').click(); await wait(2500);
for (let i = 0; i < 4; i++) await say();
await p.waitForSelector('.nl-act', { timeout: 10000 }); await wait(800); await p.locator('.nl-act').click(); await wait(8000);
for (let i = 0; i < 6; i++) await say();
await p.waitForSelector('.nl-act', { timeout: 15000 });
check('revoir : aucune question « Veux-tu porter », aucune bannière d\'obtention', (await p.locator('.nl-ask').count()) === 0 && (await p.locator('.nl-banner').count()) === 0);
await sh('31-revoir-fin');
await p.locator('.nl-act').click(); await wait(2500);
st = await S();
check('revoir : aucune re-récompense, collier toujours en un seul exemplaire, historique inchangé', st.world.wardrobe.owned.filter((x) => x === 'ac-eclat').length === 1 && st.events.done['n-eclat'].count === 1 && st.events.current === null && !('n-eclat-replay' in st.events.done));
await sh('32-apres-revoir');

// ------------------------------------------------------------------ 8. déclencheur automatique (7ᵉ ouverture + 5 min de jeu actif)
await p.evaluate(() => window.RADIA.necklace.reset());
st = await S();
check('mode développeur : reset remet le collier et l\'invitation à zéro', !st.fun.necklace.owned && st.fun.necklace.launches === 0 && !st.world.wardrobe.owned.includes('ac-eclat') && st.events.inbox.every((i) => i.eventId !== 'n-eclat'));
for (let i = 0; i < 6; i++) await p.evaluate(() => window.RADIA.necklace.skipLaunches(1));
st = await S(); check('6 ouvertures : pas armé', st.fun.necklace.launches === 6 && !st.fun.necklace.armed);
await p.evaluate(() => window.RADIA.necklace.skipLaunches(1));
st = await S(); check('7ᵉ ouverture : minuteur armé', st.fun.necklace.launches === 7 && st.fun.necklace.armed && st.fun.necklace.activeMs === 0);
await p.evaluate(() => window.RADIA.necklace.advance(3)); await wait(6000);
check('3 min de jeu actif : pas encore d\'invitation', (await p.locator('.ev-notif').count()) === 0 && !(await S()).fun.necklace.invited);
await p.reload(); await wait(5500); await clean(3);
st = await S();
check('rechargement : la progression du minuteur est conservée (≥ 3 min), rechargement rapide non compté', st.fun.necklace.activeMs >= 180000 && st.fun.necklace.launches === 7);
await p.evaluate(() => window.RADIA.necklace.advance(2));
await p.waitForSelector('.ev-notif', { timeout: 25000 }).then(() => check('5 min de jeu actif : l\'invitation arrive toute seule', true)).catch(() => check('invitation automatique', false));
await sh('33-invitation-auto');
st = await S(); check('une seule invitation automatique déposée', st.fun.necklace.invited && st.events.inbox.filter((i) => i.eventId === 'n-eclat').length === 1);
await p.getByRole('button', { name: 'Plus tard' }).first().click(); await wait(800);
await p.evaluate(() => window.RADIA.necklace.advance(30));
await wait(5000);
st = await S(); check('l\'invitation « plus tard » ne crée pas de doublon', st.events.inbox.filter((i) => i.eventId === 'n-eclat').length === 1);

console.log('\n' + out.join('\n'));
console.log('KO :', out.filter((l) => l.startsWith('KO')).length);
console.log('erreurs:', errs.length ? errs.slice(0, 6) : 'aucune');
await b.close();
