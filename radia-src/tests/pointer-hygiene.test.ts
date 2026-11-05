import { describe, it, expect } from 'vitest';
import { releasePointer, stalePointerIndexes } from '../src/game/pointerHygiene';

const P = (index: number, active: boolean, identifier: number) => ({ index, active, identifier });

describe('hygiène des pointeurs tactiles (bug « cases inertes »)', () => {
  it('un pointeur actif sans doigt réel correspondant est périmé', () => {
    expect(stalePointerIndexes([P(0, false, 0), P(1, true, 7), P(2, true, 9)], [])).toEqual([1, 2]);
  });
  it('un pointeur dont le doigt est bien posé est conservé', () => {
    expect(stalePointerIndexes([P(0, false, 0), P(1, true, 7), P(2, true, 9)], [9])).toEqual([1]);
    expect(stalePointerIndexes([P(1, true, 7), P(2, true, 9)], [7, 9])).toEqual([]);
  });
  it('les pointeurs inactifs et le pointeur souris (index 0) ne sont jamais touchés', () => {
    expect(stalePointerIndexes([P(0, true, 0), P(1, false, 3), P(2, false, 4)], [])).toEqual([]);
  });
  it('libérer un pointeur ferme son état « doigt posé » sans rien d\'autre', () => {
    const p = { active: true, isDown: true, primaryDown: true, buttons: 1, identifier: 5, wasCanceled: false, wasTouch: false };
    releasePointer(p);
    expect(p).toMatchObject({ active: false, isDown: false, primaryDown: false, buttons: 0, wasCanceled: true, wasTouch: true, identifier: 5 });
  });
});
