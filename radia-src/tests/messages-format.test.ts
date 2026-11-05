import { describe, it, expect } from 'vitest';
import { hhmm, listTime, needSeparator, separatorLabel } from '../src/apps/messages/format';

const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m, 0).getTime(); // 5 novembre 2026 = jeudi
describe('horodatages Messages', () => {
  const now = at(5, 15, 0);
  it('heure sur 2 chiffres', () => { expect(hhmm(at(5, 8, 5))).toBe('08:05'); });
  it('séparateurs : aujourd\'hui, hier, jour de la semaine, date', () => {
    expect(separatorLabel(at(5, 14, 32), now)).toBe('Aujourd\'hui 14:32');
    expect(separatorLabel(at(4, 21, 10), now)).toBe('Hier 21:10');
    expect(separatorLabel(at(2, 8, 15), now)).toBe('lundi 08:15');
    expect(separatorLabel(at(25, 9, 0) - 40 * 86_400_000, now)).toMatch(/^\d{1,2} [a-zéû]+ \d{2}:\d{2}$/);
  });
  it('liste : heure, Hier, jour, date courte, vide si jamais', () => {
    expect(listTime(at(5, 9, 3), now)).toBe('09:03');
    expect(listTime(at(4, 23, 59), now)).toBe('Hier');
    expect(listTime(at(2, 10, 0), now)).toBe('lundi');
    expect(listTime(at(5, 10, 0) - 30 * 86_400_000, now)).toMatch(/^\d{2}\/\d{2}\/\d{2}$/);
    expect(listTime(0, now)).toBe('');
  });
  it('séparateur d\'heure : premier message, > 30 min, autre jour ; pas entre deux messages proches', () => {
    expect(needSeparator(null, at(5, 10, 0))).toBe(true);
    expect(needSeparator(at(5, 10, 0), at(5, 10, 20))).toBe(false);
    expect(needSeparator(at(5, 10, 0), at(5, 10, 31))).toBe(true);
    expect(needSeparator(at(4, 23, 50), at(5, 0, 5))).toBe(true);
  });
});
