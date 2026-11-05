/** Règles pures des étapes d'événement (sans DOM, testables). */
import type { StepCond } from './types';

/** Une étape conditionnelle est jouée si la donnée d'activité demandée a l'une des valeurs attendues. */
export function stepAllowed(c: StepCond, data: Record<string, unknown>): boolean {
  const d = data[c.activity] as Record<string, unknown> | undefined;
  return !!d && c.in.includes(d[c.field] as string | number | boolean);
}
