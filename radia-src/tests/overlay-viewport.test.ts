import { describe, expect, it } from 'vitest';
import { bottomGap, isTextField, keyboardHeight } from '../src/ui/viewportLogic';

describe('viewportLogic', () => {
  it('les barres de Safari ne comptent pas comme un clavier', () => {
    expect(keyboardHeight(852, 852)).toBe(0);
    expect(keyboardHeight(852, 800)).toBe(0); // barre d'adresse repliée : 52 px
  });
  it('un vrai clavier (≈ 300 px) est détecté, décalage de défilement inclus', () => {
    expect(keyboardHeight(852, 540)).toBe(312);
    expect(keyboardHeight(852, 520, 12)).toBe(320);
  });
  it('détecte les champs de saisie', () => {
    expect(isTextField('input', false)).toBe(true);
    expect(isTextField('TEXTAREA', false)).toBe(true);
    expect(isTextField('div', true)).toBe(true);
    expect(isTextField('button', false)).toBe(false);
  });
  it('espace bas = zone sûre + clavier + marge', () => {
    expect(bottomGap(34, 0)).toBe(48);
    expect(bottomGap(34, 300)).toBe(348);
    expect(bottomGap(-5, -9, 10)).toBe(10);
  });
});
