// Partie complète jouée dans un vrai navigateur (format iPhone) : chaque écran, chaque épreuve,
// pénalités, indices, sauvegarde/reprise, temps écoulé, score final.
//   npm run build && (cd .. && python3 -m http.server 8765) &   puis   npm run e2e
import { createRequire } from "node:module";
// Playwright est fourni par l'environnement (installation globale) ou par `npm i -D playwright`.
const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync } from "node:fs";

const URL = process.env.E2E_URL ?? "http://localhost:8765/code-rouge/";
const SHOTS = process.env.E2E_SHOTS ?? "shots";
mkdirSync(SHOTS, { recursive: true });

const log = (...a) => console.log("•", ...a);
const fail = (msg) => { throw new Error(msg); };
const expect = (cond, msg) => { if (!cond) fail(msg); log("ok :", msg); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "fr-FR" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

let n = 0;
const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, "0")}-${name}.png` }); };
const tid = (id) => page.locator(`[data-testid="${id}"]`);
const score = async () => Number((await tid("score").innerText()).replace(/\D/g, ""));
const clock = async () => { const [m, s] = (await page.locator(".hud__clock").innerText()).split(":").map(Number); return m * 60 + s; };
const noOverflow = async (where) => {
  const bad = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (bad) fail(`débordement horizontal : ${where}`);
};

await page.goto(URL);
await page.waitForTimeout(1600);
await shot("accueil");
expect((await page.locator('meta[name="robots"]').getAttribute("content")).includes("noindex"), "page en noindex");
await page.getByText("Comment le score est calculé").click();
await shot("bareme");
await page.locator(".sheet__head .iconbtn").click();

await tid("start").click();
expect(await tid("team-ok").isDisabled(), "validation impossible sans nom d'équipe");
await tid("team-input").fill("Unité Phénix");
await shot("equipe");
await tid("team-ok").click();
await page.waitForTimeout(2500);
await shot("briefing");
await tid("briefing-skip").click();
await tid("briefing-go").click();
await page.waitForTimeout(1100);
await shot("intro-memoire");
expect((await tid("timer").innerText()).includes("15:00"), "chrono à 15:00 et en pause avant le lancement");

/* ---------- Épreuve 1 ---------- */
await tid("stage-go").click();
let fragmentSymbol = "";
for (let round = 0; round < 3; round++) {
  await tid("memory-show").click();
  await page.waitForTimeout(900);
  if (round === 0) await shot("memoire-grille");
  await tid("memory-seq").waitFor({ timeout: 15000 });
  await page.waitForTimeout(700);
  const seq = await page.locator(".seq").evaluateAll((els) => els.map((e) => e.dataset.symbol));
  fragmentSymbol = seq[seq.length - 1];
  if (round === 0) {
    const before = await score();
    const wrong = await page.locator(".card").evaluateAll((els, s) => els.findIndex((e) => !s.includes(e.dataset.symbol)), seq);
    await page.locator(".card").nth(wrong).click();
    await page.waitForTimeout(300);
    await shot("memoire-erreur");
    await page.waitForTimeout(700);
    expect((await score()) === 0 && before === 0, "le score affiché ne descend pas sous zéro");
    await tid("hint-open").click();
    await shot("memoire-indice");
    await tid("hint-take").click();
    await page.waitForTimeout(3600);
  }
  if (round === 2) await shot("memoire-rappel-4x4");
  for (const s of seq) { await page.locator(`.card[data-symbol="${s}"]`).click(); await page.waitForTimeout(220); }
  if (round === 0) await shot("memoire-manche-gagnee");
  await noOverflow(`mémoire manche ${round + 1}`);
  await page.waitForTimeout(1700);
}
await tid("stage-done").waitFor();
await page.waitForTimeout(2600);
await shot("bilan-memoire");
const s1 = await score();
expect(s1 > 900 && s1 < 1500, `score épreuve 1 cohérent (${s1}) : base + rapidité − 1 erreur − 1 indice`);
const t1 = await clock();
await page.waitForTimeout(1500);
expect((await clock()) === t1, "chrono en pause pendant le bilan");
await tid("next-stage").click();
await page.waitForTimeout(1100);
await shot("intro-deduction");

/* ---------- Épreuve 2 ---------- */
await tid("stage-go").click();
await shot("deduction-note");
for (const d of ["journal", "vestiaire", "voyage"]) { await tid(`doc-${d}`).click(); await shot(`deduction-${d}`); await noOverflow(`document ${d}`); }

// Sauvegarde : rechargement en pleine épreuve → écran de reprise → même épreuve, chrono qui a continué.
const beforeReload = await clock();
await page.reload();
await page.waitForTimeout(1500);
await shot("reprise");
expect(await tid("resume").isVisible(), "rechargement : la reprise de mission est proposée");
await tid("resume").click();
await page.waitForTimeout(600);
expect((await page.locator(".stage").getAttribute("data-stage")) === "deduction", "reprise dans l'épreuve en cours");
expect((await score()) === s1, "score conservé après rechargement");
const afterReload = await clock();
expect(afterReload <= beforeReload - 1 && afterReload > beforeReload - 10, `le chrono a continué pendant le rechargement (${beforeReload}s → ${afterReload}s)`);

await tid("hint-open").click();
await tid("hint-take").click();
await shot("deduction-indice");
await page.locator(".sheet__head .iconbtn").click();
await tid("code-open").click();
for (const d of "1111") await page.locator(".keypad .key", { hasText: d }).first().click();
await page.locator(".key--go").click();
await page.waitForTimeout(150);
expect((await tid("code-msg").innerText()).includes("refusé"), "mauvais code refusé avec pénalité");
await page.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, "0")}-deduction-code-refuse.png` });
await page.waitForTimeout(800);
for (const d of "4927") await page.locator(".keypad .key", { hasText: d }).first().click();
await shot("deduction-code");
await page.locator(".key--go").click();
await tid("stage-done").waitFor();
await page.waitForTimeout(2600);
await shot("bilan-deduction");
expect((await tid("fragment-value").innerText()) === "4927", "fragment 2 = code du coffre");
const s2 = await score();
await tid("next-stage").click();
await page.waitForTimeout(1100);

/* ---------- Épreuve 3 ---------- */
await tid("stage-go").click();
await shot("chiffre-indices");
expect((await tid("cipher-message").getAttribute("data-message")) === "FZWTWJ", "message intercepté = FZWTWJ");
await page.locator(".stage__body").evaluate((el) => el.scrollTo(0, 9999));
await shot("chiffre-indices-bas");
await tid("tab-wheel").click();
for (let i = 0; i < 5; i++) { await tid("wheel-plus").click(); await page.waitForTimeout(120); }
await page.waitForTimeout(500);
await shot("chiffre-roue");
expect((await tid("wheel-shift").innerText()) === "5", "roue réglée sur un recul de 5");
const decoded = [];
for (let i = 0; i < 6; i++) {
  await page.locator(".tile").nth(i).click();
  await page.waitForTimeout(80);
  decoded.push(await page.locator(".wheel__inner .wheel__l.is-on i").innerText());
}
expect(decoded.join("") === "AURORE", `la roue déchiffre bien le message (${decoded.join("")})`);
await noOverflow("roue");
await tid("word-open").click();
for (const l of "AURORE") await page.locator(".key--letter", { hasText: new RegExp(`^${l}$`) }).click();
await shot("chiffre-mot");
await page.locator(".key--go").click();
await tid("stage-done").waitFor();
await page.waitForTimeout(2600);
await shot("bilan-chiffre");
const s3 = await score();
expect(s3 > s2 && s2 > s1, `le score progresse à chaque verrou (${s1} → ${s2} → ${s3})`);
await tid("next-stage").click();
await page.waitForTimeout(1100);
await shot("intro-finale");

/* ---------- Finale ---------- */
await tid("stage-go").click();
await shot("finale-symbole");
const wrongSymbol = await page.locator(".symbol").evaluateAll((els, s) => els.map((e) => e.dataset.symbol).find((x) => x !== s), fragmentSymbol);
const stabBefore = Number((await tid("stability").innerText()).replace(/\D/g, ""));
await page.locator(`.symbol[data-symbol="${wrongSymbol}"]`).click();
await page.waitForTimeout(250);
expect(Number((await tid("stability").innerText()).replace(/\D/g, "")) < stabBefore - 8, "mauvais symbole : la stabilité chute");
await page.locator(`.symbol[data-symbol="${fragmentSymbol}"]`).click();
await page.waitForTimeout(400);
// Deux doigts simultanés (événements tactiles) sur les deux verrous.
const touch = (id, type) => page.evaluate(([i, t]) => document.querySelector(`[data-testid="${i}"]`).dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: "touch" })), [id, type]);
await touch("pad-0", "pointerdown");
await page.waitForTimeout(900);
expect(await page.locator(".dual__fill").evaluate((e) => getComputedStyle(e.parentElement.parentElement).getPropertyValue("--p")) === "0", "un seul verrou tenu : aucune charge");
await touch("pad-1", "pointerdown");
await page.waitForTimeout(1500);
await shot("finale-double-verrou");
await page.waitForTimeout(1900);
await shot("finale-code");
for (const d of "4927") await page.locator(".keypad .key", { hasText: d }).first().click();
await page.locator(".key--go").click();
await page.waitForTimeout(900);
await shot("finale-synchro");
// Synchronisation : on verrouille quand le curseur est dans la zone (3 anneaux), après un raté volontaire.
const lockWhen = (inside) => page.evaluate((wantInside) => new Promise((resolve) => {
  const dial = document.querySelector('[data-testid="sync-dial"]');
  const marker = dial.querySelector(".sync__marker");
  const btn = document.querySelector('[data-testid="sync-lock"]');
  const tick = () => {
    const a = parseFloat(marker.style.transform.replace("rotate(", "")) || 0;
    const diff = Math.abs(((a - Number(dial.dataset.center) + 540) % 360) - 180);
    const half = Number(dial.dataset.width) / 2;
    if (wantInside ? diff < half * 0.4 : diff > half + 40) { btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); resolve(); }
    else requestAnimationFrame(tick);
  };
  tick();
}), inside);
const errBefore = await score();
await lockWhen(false);
await page.waitForTimeout(300);
expect((await score()) === errBefore - 40, "verrouillage hors zone : −40 points");
for (let i = 0; i < 3; i++) { await lockWhen(true); await page.waitForTimeout(500); }
await page.waitForTimeout(600);
await shot("finale-mot");
for (const l of "AURORE") await page.locator(".key--letter", { hasText: new RegExp(`^${l}$`) }).click();
await page.locator(".key--go").click();
await page.waitForTimeout(500);
await shot("finale-retablir");
await touch("restore", "pointerdown");
await tid("victory").waitFor({ timeout: 6000 });
await page.waitForTimeout(700);
await shot("victoire-flash");
await page.waitForTimeout(2600);
await shot("victoire");
await tid("see-report").click();
await page.waitForTimeout(2600);
await shot("rapport");
const final = Number(await tid("final-score").getAttribute("data-value"));
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("code-rouge/save")));
const sum = saved.stages.reduce((a, s) => a + s.result.total, 0) + saved.timeBonus;
expect(final === sum && saved.outcome === "success", `score final = somme des épreuves + temps restant (${final})`);
expect(saved.stages[0].errors === 1 && saved.stages[0].hints === 1 && saved.stages[1].errors === 1 && saved.stages[1].hints === 1 && saved.stages[3].errors === 2, "erreurs et indices correctement comptés");
await page.locator(".report__row").first().click();
await page.locator(".screen").evaluate((el) => el.scrollTo(0, 9999));
await shot("rapport-detail");
await page.reload();
await page.waitForTimeout(1200);
expect(await tid("end").isVisible(), "le rapport final survit à un rechargement");

/* ---------- Rejouer + temps écoulé ---------- */
await tid("replay").click();
await tid("team-input").fill("Cellule Comète");
await tid("team-ok").click();
await tid("briefing-skip").click();
await tid("briefing-go").click();
await tid("stage-go").click();
expect((await clock()) >= 898, "nouvelle partie : chrono remis à 15:00");
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("code-rouge/save"));
  s.clock.runningSince = Date.now() - (15 * 60 - 14) * 1000;
  localStorage.setItem("code-rouge/save", JSON.stringify(s));
});
await page.reload();
await tid("resume").click();
await page.waitForTimeout(4500);
await shot("derniere-minute");
expect((await page.locator(".hud__timer").getAttribute("class")).includes("critical"), "dernières secondes : chrono en alerte");
await tid("end").waitFor({ timeout: 15000 });
await page.waitForTimeout(2200);
await shot("echec");
expect((await tid("end-title").innerText()).toLowerCase().includes("signal perdu"), "temps écoulé : mission échouée, rapport affiché");

await browser.close();
if (errors.length) fail(`erreurs console : ${errors.join(" | ")}`);
console.log(`\nPartie complète validée — ${n} captures dans ${SHOTS}/`);
