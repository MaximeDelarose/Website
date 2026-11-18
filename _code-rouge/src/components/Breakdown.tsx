import type { ScoreBreakdown } from "../engine/scoring";
import { formatDuration } from "../game";
import { CountUp } from "./ui";

/** Détail du score d'une épreuve, ligne par ligne. */
export function Breakdown({ result, durationMs, errors, hints, animate = true }: { result: ScoreBreakdown; durationMs: number; errors: number; hints: number; animate?: boolean }) {
  const rows: { label: string; detail?: string; value: number }[] = [
    { label: "Verrou ouvert", value: result.base },
    { label: "Bonus de rapidité", detail: formatDuration(durationMs), value: result.timeBonus },
  ];
  if (result.errorPenalty) rows.push({ label: "Erreurs", detail: `× ${errors}`, value: -result.errorPenalty });
  if (result.hintPenalty) rows.push({ label: "Indices", detail: `× ${hints}`, value: -result.hintPenalty });
  if (result.otherPenalty) rows.push({ label: "Surcharges du noyau", value: -result.otherPenalty });
  const sum = rows.reduce((a, r) => a + r.value, 0);
  if (sum < result.total) rows.push({ label: "Plancher garanti", value: result.total - sum });
  return (
    <dl className="breakdown">
      {rows.map((r, i) => (
        <div key={r.label} className="breakdown__row" style={{ animationDelay: animate ? `${350 + i * 220}ms` : "0ms" }}>
          <dt>{r.label}{r.detail && <span className="breakdown__detail">{r.detail}</span>}</dt>
          <dd className={r.value < 0 ? "is-neg" : ""}>{r.value < 0 ? "−" : "+"}{Math.abs(r.value)}</dd>
        </div>
      ))}
      <div className="breakdown__row breakdown__row--total" style={{ animationDelay: animate ? `${350 + rows.length * 220}ms` : "0ms" }}>
        <dt>Score de l'épreuve</dt>
        <dd>{animate ? <CountUp value={result.total} delay={350 + rows.length * 220} sound /> : result.total}</dd>
      </div>
    </dl>
  );
}
