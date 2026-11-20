import type { DeviceInfo, LabResult, RoomSnapshot } from "./protocol";
import { verdictForRtt, type Verdict } from "./stats";
import type { LogEntry } from "./session";

export interface PairSummary { a: string; b: string; med: number; p95: number; lost: number; total: number; verdict: Verdict }
export interface BurstSummary { from: string; to: string; got: number; sent: number; ooo: number; jitter: number; gapP95: number }
export interface DeviceSummary { id: string; name: string; label: string; vibrate: boolean; connection: string; transport: string; sentPerSec: number; recvPerSec: number; notes: Record<string, string>; hiddenDuringTest: boolean }
export interface LabSummary { done: boolean; pairs: PairSummary[]; bursts: BurstSummary[]; devices: DeviceSummary[]; overall: Verdict; worstP95: number }

const ORDER: Verdict[] = ["excellent", "good", "limit", "bad"];
const worse = (a: Verdict, b: Verdict) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

export function deviceLabel(ua: string): string {
  const ios = /iPhone OS (\d+)[_.](\d+)/.exec(ua);
  if (ios) return `iPhone · iOS ${ios[1]}.${ios[2]}`;
  if (/iPad/.test(ua)) return "iPad";
  const and = /Android (\d+)/.exec(ua);
  if (and) return `Android ${and[1]}${/Chrome\/(\d+)/.test(ua) ? " · Chrome" : ""}`;
  if (/Macintosh|Windows|Linux/.test(ua)) return /Chrome\/(\d+)/.test(ua) ? "Ordinateur · Chrome" : "Ordinateur";
  return ua.slice(0, 40);
}

export function summarizeLab(snap: RoomSnapshot): LabSummary | null {
  const lab = snap.lab;
  if (!lab || lab.results.length === 0) return null;
  const by = new Map<string, LabResult>(lab.results.map((r) => [r.from, r]));
  const ids = lab.results.map((r) => r.from).sort();
  const pairs: PairSummary[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const ab = by.get(ids[i])?.rtt[ids[j]];
      const ba = by.get(ids[j])?.rtt[ids[i]];
      const parts = [ab, ba].filter(Boolean) as NonNullable<typeof ab>[];
      if (!parts.length) continue;
      const total = parts.reduce((s, p) => s + p.n + p.lost, 0);
      const lost = parts.reduce((s, p) => s + p.lost, 0);
      const med = Math.round(parts.reduce((s, p) => s + p.med, 0) / parts.length);
      const p95 = Math.round(Math.max(...parts.map((p) => p.p95)));
      pairs.push({ a: ids[i], b: ids[j], med, p95, lost, total, verdict: verdictForRtt(p95, total ? lost / total : 0) });
    }
  }
  const bursts: BurstSummary[] = [];
  for (const r of lab.results) for (const [from, s] of Object.entries(r.burst)) bursts.push({ from, to: r.from, got: s.got, sent: s.sent, ooo: s.ooo, jitter: s.jitter, gapP95: s.gapP95 });
  let overall: Verdict = pairs.reduce<Verdict>((v, p) => worse(v, p.verdict), "excellent");
  if (bursts.some((b) => b.sent && (b.sent - b.got) / b.sent > 0.05)) overall = worse(overall, "limit");
  if (bursts.some((b) => b.sent && (b.sent - b.got) / b.sent > 0.2)) overall = worse(overall, "bad");
  const devices: DeviceSummary[] = lab.results.map((r) => ({
    id: r.from, name: snap.members.find((m) => m.id === r.from)?.name ?? "?", label: deviceLabel((r.device as DeviceInfo).ua),
    vibrate: r.device.vibrate, connection: r.device.connection, transport: r.device.transport,
    sentPerSec: Math.round((r.msgs.sent / r.msgs.seconds) * 10) / 10, recvPerSec: Math.round((r.msgs.recv / r.msgs.seconds) * 10) / 10,
    notes: r.notes, hiddenDuringTest: !r.device.visible,
  }));
  return { done: lab.status === "done", pairs, bursts, devices, overall, worstP95: Math.max(0, ...pairs.map((p) => p.p95)) };
}

export const VERDICT_TEXT: Record<Verdict, { title: string; text: string }> = {
  excellent: { title: "Liaison excellente", text: "Toutes les mécaniques prévues sont réalisables : maintien partagé, relais d'énergie, unisson." },
  good: { title: "Liaison bonne", text: "Jouable. L'unisson utilisera des fenêtres de tolérance larges." },
  limit: { title: "Liaison limite", text: "À éviter pour l'unisson ; le reste reste jouable avec des tolérances larges. Essayez un même Wi-Fi." },
  bad: { title: "Liaison insuffisante", text: "Changez de réseau (Wi-Fi commun) avant de jouer à plusieurs." },
};

export const NOTE_LABELS: Record<string, string> = { "local-haptic": "Vibration locale", "remote-haptic": "Vibration d'un coéquipier", "remote-sound": "Son d'un coéquipier" };

export function buildReport(snap: RoomSnapshot, log: LogEntry[], transportKind: string, when = new Date()): string {
  const s = summarizeLab(snap);
  const name = (id: string) => snap.members.find((m) => m.id === id)?.name ?? id;
  const lines: string[] = [];
  lines.push("CODE ROUGE — rapport de liaison");
  lines.push(`Salle ${snap.code} · ${snap.members.length} téléphones · transport ${transportKind} · ${when.toLocaleString("fr-FR")}`);
  if (!s) { lines.push("Aucun test de liaison effectué."); return lines.join("\n"); }
  lines.push(`Verdict : ${VERDICT_TEXT[s.overall].title}${s.done ? "" : " (test en cours)"}`);
  lines.push("", "Allers-retours entre téléphones (médiane / p95 / perdus) :");
  s.pairs.forEach((p) => lines.push(`  ${name(p.a)} ↔ ${name(p.b)} : ${p.med} ms / ${p.p95} ms / ${p.lost} sur ${p.total}`));
  lines.push("", "Rafales de 60 messages à 20/s :");
  s.bursts.forEach((b) => lines.push(`  ${name(b.from)} → ${name(b.to)} : ${b.got}/${b.sent} reçus, désordre ${b.ooo}, gigue ${b.jitter} ms, écart p95 ${b.gapP95} ms`));
  lines.push("", "Débit moyen par téléphone (quota du projet partagé : 100 messages/s au total) :");
  s.devices.forEach((d) => lines.push(`  ${d.name} : envoie ${d.sentPerSec}/s, reçoit ${d.recvPerSec}/s`));
  lines.push("", "Appareils :");
  s.devices.forEach((d) => lines.push(`  ${d.name} — ${d.label} · API vibration ${d.vibrate ? "oui" : "non"} · réseau ${d.connection}${d.hiddenDuringTest ? " · écran masqué pendant le test" : ""}`));
  const notes = s.devices.filter((d) => Object.keys(d.notes).length);
  if (notes.length) {
    lines.push("", "Sensations déclarées :");
    notes.forEach((d) => lines.push(`  ${d.name} : ${Object.entries(d.notes).map(([k, v]) => `${NOTE_LABELS[k] ?? k} ${v}`).join(" · ")}`));
  }
  if (log.length) {
    lines.push("", "Journal de cet appareil :");
    log.slice(-12).forEach((l) => lines.push(`  ${new Date(l.at).toLocaleTimeString("fr-FR")} ${l.text}`));
  }
  return lines.join("\n");
}
