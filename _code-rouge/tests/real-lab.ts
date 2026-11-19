/**
 * Mesure de référence sur le VRAI Supabase Realtime : trois « téléphones » simulés (hôte + 2 clients) dans un même processus,
 * rôles distribués, puis test de liaison complet. À lancer depuis un ordinateur :  npm run lab:real
 * Ce n'est PAS la latence d'un téléphone en 4G (réseau d'un poste de travail) : c'est un plancher, à comparer avec le test réel.
 * Consomme environ 800 messages du quota du projet partagé.
 */
import { gameConfig } from "../src/config/game.config";
import { labDurationMs } from "../src/net/lab";
import { makeCode } from "../src/net/protocol";
import { RoomSession } from "../src/net/session";
import { SupabaseTransport } from "../src/net/transport";

const cfg = gameConfig.coop;
const code = makeCode();
const names: Record<string, string> = { n0: "Hôte", n1: "Léa", n2: "Sam" };
const mk = (i: number, role: "host" | "client") => new RoomSession({ transport: new SupabaseTransport(code, cfg.supabase!), code, me: { id: `n${i}`, name: names[`n${i}`] }, role, cfg });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const [host, a, b] = [mk(0, "host"), mk(1, "client"), mk(2, "client")];
host.start();
await sleep(3000);
a.start(); b.start();
await sleep(4000);
console.log("salon", code, "→", [host, a, b].map((s) => s.getState().status).join(", "));
host.dealRoles();
await sleep(1500);
host.startLab();
await sleep(labDurationMs(3) + 8000);
const lab = b.getState().snapshot?.lab;
console.log("test de liaison :", lab?.status, `(${lab?.results.length} résultats)`);
for (const r of lab?.results ?? []) {
  for (const [peer, s] of Object.entries(r.rtt)) console.log(`  RTT ${names[r.from]}→${names[peer]} : médiane ${s.med} ms · p95 ${s.p95} · perdus ${s.lost}/16`);
  for (const [peer, s] of Object.entries(r.burst)) console.log(`  rafale ${names[peer]}→${names[r.from]} : ${s.got}/${s.sent} · désordre ${s.ooo} · gigue ${s.jitter} ms`);
}
[host, a, b].forEach((s) => s.stop());
process.exit(0);
