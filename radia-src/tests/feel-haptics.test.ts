import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { settings } = vi.hoisted(() => ({ settings: { haptics: true } }));
vi.mock('../src/core/app', () => ({ save: { data: { settings } } }));

import { haptic, hapticMaybeSupported, hapticSupport, isIosLike, PATTERNS, resetHapticsForTests, type HapticKind } from '../src/core/haptics';

let t = 1000;
beforeEach(() => {
  t = 1000;
  settings.haptics = true;
  vi.spyOn(performance, 'now').mockImplementation(() => t);
  resetHapticsForTests();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('haptique : navigator.vibrate (Android / Chrome)', () => {
  it('appelle vibrate avec le motif du type demandé', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate, userAgent: 'Android Chrome' });
    haptic('merge');
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith(PATTERNS.merge);
    t += 500;
    haptic('rare');
    expect(vibrate).toHaveBeenLastCalledWith(PATTERNS.rare);
  });
  it('chaque type a un motif court, discret et fini', () => {
    for (const [k, p] of Object.entries(PATTERNS) as [HapticKind, number[]][]) {
      expect(p.length, k).toBeGreaterThan(0);
      expect(p.reduce((a, b) => a + b, 0), k).toBeLessThanOrEqual(220);
      expect(p.every((n) => n > 0 && n < 100)).toBe(true);
    }
    for (const k of ['chessSelect', 'chessMove', 'chessCapture', 'chessCheck', 'chessMate'] as const) expect(PATTERNS[k]).toBeDefined();
  });
  it('rien quand le réglage « vibrations » est désactivé', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate, userAgent: 'Android' });
    settings.haptics = false;
    haptic('merge');
    haptic('maxMerge');
    expect(vibrate).not.toHaveBeenCalled();
    settings.haptics = true;
    t += 500;
    haptic('merge');
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
  it('anti-rafale : deux appels rapprochés → un seul retour ; ok après le délai', () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate, userAgent: 'Android' });
    haptic('select');
    t += 10;
    haptic('select');
    t += 10;
    haptic('drop');
    expect(vibrate).toHaveBeenCalledTimes(1);
    t += 100;
    haptic('merge');
    expect(vibrate).toHaveBeenCalledTimes(2);
  });
  it('ne lève jamais d\'erreur si vibrate lève (Chrome sans geste utilisateur)', () => {
    vi.stubGlobal('navigator', { vibrate: () => { throw new Error('blocked'); }, userAgent: 'Android' });
    expect(() => haptic('merge')).not.toThrow();
  });
});

describe('haptique : bureau / sans support', () => {
  it('aucune erreur sur desktop sans vibrate ni document', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome' });
    vi.stubGlobal('document', undefined);
    expect(() => haptic('merge')).not.toThrow();
    expect(hapticSupport()).toEqual({ vibrate: false, ios: false });
    expect(hapticMaybeSupported()).toBe(false);
  });
  it('aucune erreur sans navigator du tout', () => {
    vi.stubGlobal('navigator', undefined);
    expect(() => haptic('error')).not.toThrow();
  });
});

describe('haptique : iOS (mécanisme « switch »)', () => {
  it('détection iPhone, iPad, iPadOS déguisé en Mac ; pas un vrai Mac', () => {
    expect(isIosLike({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' })).toBe(true);
    expect(isIosLike({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X)' })).toBe(true);
    expect(isIosLike({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true);
    expect(isIosLike({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false);
    expect(isIosLike({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })).toBe(false);
  });
  it('clique le switch caché : 1 tick immédiat puis les suivants du motif', () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const label = { setAttribute: vi.fn(), style: {} as Record<string, string>, append: vi.fn(), click };
    const input = { setAttribute: vi.fn(), type: '', tabIndex: 0 };
    vi.stubGlobal('document', { body: { append: vi.fn() }, createElement: (tag: string) => (tag === 'label' ? label : input) });
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
    haptic('rare'); // [18, 40, 22] → 2 ticks
    expect(click).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(click).toHaveBeenCalledTimes(2);
    expect(input.type).toBe('checkbox');
    expect(input.setAttribute).toHaveBeenCalledWith('switch', '');
    vi.useRealTimers();
  });
});
