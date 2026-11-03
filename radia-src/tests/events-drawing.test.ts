import { describe, it, expect } from 'vitest';
import { SAILBOAT_CAPTION, SAILBOAT_RATIO } from '../src/events/art/sailboat';
import { SMALL_MESSAGES } from '../src/events/data';

describe('le dessin de la petite', () => {
  it('porte la dédicace exacte et un format de papier portrait', () => {
    expect(SAILBOAT_CAPTION).toBe('pour tonton et maman');
    expect(SAILBOAT_RATIO).toBeLessThan(1);
  });
  it('le message « regarde mon dessin » existe pour ouvrir le dessin', () => {
    expect(SMALL_MESSAGES.some((m) => m.from === 'kid1' && /dessin/i.test(m.text))).toBe(true);
  });
});
