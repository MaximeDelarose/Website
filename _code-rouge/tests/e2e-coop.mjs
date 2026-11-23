// Salon coopératif à trois téléphones (trois onglets d'un même navigateur reliés par BroadcastChannel, latence simulée).
//   npm run build && (cd .. && python3 -m http.server 8765 &) && npm run e2e:coop
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.E2E_URL ?? "http://localhost:8765/code-rouge/";
const SHOTS = process.env.E2E_SHOTS ?? "shots-coop";
mkdirSync(SHOTS, { recursive: true });
const log = (...a) => console.log("•", ...a);
const fail = (m) => { throw new Error(m); };
const expect = (c, m) => { if (!c) fail(m); log("ok :", m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const [VW, VH] = (process.env.E2E_VIEW ?? "390x664").split("x").map(Number);
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "fr-FR" });
const errors = [];
const open = async (cid, hash = "#salle") => {
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${cid}] ${e}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`[${cid}] ${m.text()}`); });
  await page.goto(`${BASE}?net=bc&lat=40&jit=30&cid=${cid}${hash}`);
  return page;
};
const tid = (p, id) => p.locator(`[data-testid="${id}"]`);
let n = 0;
const shot = async (p, name) => { await sleep(500); await p.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, "0")}-${name}.png` }); };
const noOverflow = async (p, where) => { if (await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fail(`débordement horizontal : ${where}`); };
const statusOf = (p, slot) => tid(p, `bead-${slot}`).getAttribute("data-status");
const waitFor = async (fn, what, ms = 15000) => { const t = Date.now(); for (;;) { try { if (await fn()) return; } catch { /* retry */ } if (Date.now() - t > ms) fail(`délai dépassé : ${what}`); await sleep(150); } };

/* Une sauvegarde solo doit rester intacte, quoi qu'on fasse en coop. */
const host = await open("host", "");
await host.evaluate(() => {
  const st = () => ({ status: "locked", startedAt: 0, durationMs: 0, errors: 0, hints: 0, penalties: 0, result: null });
  localStorage.setItem("code-rouge/save", JSON.stringify({ version: 1, phase: "stageIntro", teamName: "SoloIntact", seed: 7, stageIndex: 0, clock: { elapsedMs: 0, runningSince: null }, stages: [st(), st(), st(), st()], memoryRound: 0, finaleStep: 0, outcome: null, timeBonus: 0 }));
});
await host.reload();
await sleep(1200);
await shot(host, "accueil-partie-solo-en-cours");
expect(await tid(host, "multi").isVisible(), "bouton « Jouer à plusieurs » sur l'accueil");

/* ---------- Création du salon ---------- */
await tid(host, "multi").click();
await tid(host, "room-entry").waitFor();
expect(await tid(host, "room-create").isDisabled(), "créer un salon impossible sans prénom");
await tid(host, "room-name").fill("Maxime");
await shot(host, "entree");
await tid(host, "room-create").click();
await tid(host, "lobby").waitFor({ timeout: 10000 });
const code = await tid(host, "room-code").getAttribute("data-code");
expect(/^[A-HJKMNP-Z]{4}$/.test(code), `code de salon valide (${code})`);
await sleep(900);
await shot(host, "salle-hote-seul");

/* ---------- Deux autres téléphones rejoignent ---------- */
const p1 = await open("p1", `#salle=${code}`);
await tid(p1, "room-name").fill("Léa");
expect((await tid(p1, "room-code-input").inputValue()) === code, "le lien #salle=CODE préremplit le code");
await tid(p1, "room-join").click();
const p2 = await open("p2", "#salle");
await tid(p2, "room-name").fill("Sam");
await tid(p2, "room-code-input").fill(code.toLowerCase());
await tid(p2, "room-join").click();
await Promise.all([p1, p2].map((p) => tid(p, "lobby").waitFor({ timeout: 10000 })));
await waitFor(async () => (await tid(host, "member").count()) === 3 && (await tid(p2, "member").count()) === 3, "3 membres vus par tous");
for (const [name, p] of [["hôte", host], ["Léa", p1], ["Sam", p2]]) {
  const names = await p.locator('[data-testid="member"]').evaluateAll((els) => els.map((e) => e.dataset.name));
  expect(names.join(",") === "Maxime,Léa,Sam", `${name} voit Maxime, Léa, Sam`);
}
expect((await statusOf(host, 1)) === "online" && (await statusOf(p2, 2)) === "online", "tous « en ligne »");
await shot(host, "salle-trois-joueurs");
await shot(p1, "salle-client");
await noOverflow(host, "salle");

/* ---------- Distribution des rôles, révélation synchronisée ---------- */
expect(await tid(p1, "deal").count() === 0, "seul l'hôte peut distribuer les rôles");
await tid(host, "deal").click();
await Promise.all([host, p1, p2].map((p) => tid(p, "role-reveal").waitFor({ timeout: 5000 })));
await sleep(500);
await shot(p1, "revelation-cliquet");
await Promise.all([host, p1, p2].map((p) => tid(p, "role-card").waitFor({ timeout: 5000 })));
await sleep(1900);
await shot(host, "revelation-role-hote");
await shot(p2, "revelation-role-sam");
const roles = [];
for (const p of [host, p1, p2]) roles.push(await tid(p, "role-card").getAttribute("data-role"));
expect(new Set(roles).size === 3, `trois rôles différents, un par téléphone (${roles.join(", ")})`);
for (const p of [host, p1, p2]) await tid(p, "role-ok").click();
await sleep(500);
await shot(host, "salle-roles");
await noOverflow(p1, "rôles");

/* ---------- Prêt : tous confirment ---------- */
await tid(host, "ready").click();
await tid(p1, "ready").click();
await sleep(600);
expect(await tid(p2, "room-ready").count() === 0, "pas de « salle prête » tant qu'un joueur n'a pas confirmé");
await tid(p2, "ready").click();
await Promise.all([host, p1, p2].map((p) => tid(p, "room-ready").waitFor({ timeout: 6000 })));
expect(true, "« salle prête » sur les trois téléphones");
await shot(host, "salle-prete");

/* ---------- Écran verrouillé puis coupure : Léa disparaît, puis revient avec son rôle ---------- */
const roleLea = await tid(p1, "my-role").innerText();
await p1.evaluate(() => {
  const t = window.__cr.room.getState().session.o.transport;
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
  t.setOffline(true);
});
await waitFor(async () => (await statusOf(host, 1)) === "away", "Léa « en arrière-plan » vue par l'hôte", 6000);
await waitFor(async () => (await statusOf(p2, 1)) === "away", "Sam voit aussi Léa en arrière-plan", 5000);
log("ok : Sam voit aussi Léa en arrière-plan");
await shot(host, "lea-arriere-plan");
await waitFor(async () => (await statusOf(host, 1)) === "lost", "Léa « connexion perdue »", 20000);
log("ok : Léa « connexion perdue » après 12 s de silence");
await shot(host, "lea-connexion-perdue");
await p1.evaluate(() => {
  const t = window.__cr.room.getState().session.o.transport;
  t.setOffline(false);
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
});
await waitFor(async () => (await statusOf(host, 1)) === "online", "Léa de retour en ligne", 10000);
expect((await tid(p1, "my-role").innerText()) === roleLea, "Léa retrouve son rôle après reconnexion");
await waitFor(async () => (await tid(p1, "room-ready").count()) === 1, "l'état « prêt » de la salle est conservé", 5000);
const logLea = await tid(p1, "lab-log").count();
log("journal Léa disponible :", logLea === 0 ? "onglet Liaison" : "oui");

/* ---------- Rechargement complet d'un téléphone ---------- */
await p2.reload();
await tid(p2, "lobby").waitFor({ timeout: 10000 });
await waitFor(async () => (await p2.locator('[data-testid="member"]').count()) === 3, "Sam retrouve la salle après rechargement");
expect((await tid(p2, "room-code").getAttribute("data-code")) === code, "Sam revient dans le même salon");
expect(await tid(p2, "my-role").count() === 1, "Sam garde son rôle");

/* ---------- Salon complet / salon inconnu ---------- */
const p3 = await open("p3", `#salle=${code}`);
await tid(p3, "room-name").fill("Intrus");
await tid(p3, "room-join").click();
await tid(p3, "room-wait").waitFor({ timeout: 10000 });
await waitFor(async () => (await tid(p3, "room-wait").innerText()).includes("complet"), "4e téléphone : « Salon complet »");
await shot(p3, "salon-complet");
const p4 = await open("p4", "#salle=ZZZZ");
await tid(p4, "room-name").fill("Perdu");
await tid(p4, "room-join").click();
await waitFor(async () => (await tid(p4, "room-wait").innerText()).includes("introuvable"), "salon inconnu : « Salon introuvable »", 12000);
await shot(p4, "salon-introuvable");
await p3.close(); await p4.close();

/* ---------- Test de liaison ---------- */
await tid(host, "tab-link").click();
await tid(host, "lab-start").click();
await Promise.all([p1, p2].map((p) => tid(p, "lab-running").waitFor({ timeout: 8000 })));
expect(true, "le test démarre automatiquement sur les téléphones des autres");
await sleep(9000);
await shot(p1, "liaison-en-cours");
await tid(host, "lab-verdict").waitFor({ timeout: 40000 });
await sleep(1200);
await shot(host, "liaison-resultats");
const verdict = await tid(host, "lab-verdict").getAttribute("data-verdict");
expect(["excellent", "good"].includes(verdict), `verdict cohérent avec 40–70 ms simulés (${verdict})`);
if ((await tid(host, "lab-pair").count()) !== 3) { const info = await host.evaluate(() => { const l = window.__cr.room.getState().session.getState().snapshot.lab; return { status: l.status, expected: l.expected, from: l.results.map((r) => [r.from, Object.keys(r.rtt), r.msgs, r.device.visible]) }; }); fail("trois paires mesurées : " + JSON.stringify(info)); }
log("ok : trois paires mesurées");
await Promise.all([p1, p2].map((p) => tid(p, "lab-verdict").waitFor({ timeout: 8000 })));
expect(true, "les résultats sont partagés avec les trois téléphones");
await host.locator(".lobby__scroll").evaluate((el) => el.scrollTo(0, 1100));
await shot(host, "liaison-details");
await noOverflow(host, "liaison");

// Sensations : un coéquipier envoie une vibration, l'autre répond.
await tid(host, "feel-send-haptic").click();
await tid(p1, "tab-link").click();
await tid(p1, "ask-remote").waitFor({ timeout: 6000 });
await tid(p1, "ask-yes").click();
await waitFor(async () => (await tid(host, "lab").innerText()).includes("Vibration d'un coéquipier : oui"), "la réponse « oui » apparaît dans le rapport partagé", 6000);

/* ---------- Hôte rechargé : la salle survit ---------- */
await host.reload();
await tid(host, "lobby").waitFor({ timeout: 10000 });
await waitFor(async () => (await host.locator('[data-testid="member"][data-status="online"]').count()) === 3, "l'hôte rechargé retrouve ses trois joueurs en ligne", 15000);
expect(await tid(host, "my-role").count() === 1, "l'hôte garde son rôle");
await waitFor(async () => (await tid(p1, "host-lost").count()) === 0, "les autres ne voient plus d'alerte « hôte injoignable »", 15000);

/* ---------- Le solo n'a pas bougé ---------- */
const solo = await host.evaluate(() => JSON.parse(localStorage.getItem("code-rouge/save") ?? "{}").teamName);
expect(solo === "SoloIntact", "la partie solo en cours est intacte après tout ça");

await browser.close();
if (errors.length) fail(`erreurs console : ${[...new Set(errors)].join(" | ")}`);
console.log(`\nSalon coopératif validé — ${n} captures dans ${SHOTS}/`);
