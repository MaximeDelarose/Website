import { describe, it, expect } from 'vitest';
import { NotifyCore, MERGE_WINDOW_MS, type NotifyItem, type Channel } from '../src/ui/notify/core';

/** Horloge et minuteurs simulés. */
function rig(opts: { blocked?: () => boolean; shared?: boolean } = {}) {
  let t = 0; let id = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const log: string[] = [];
  const core = new NotifyCore({
    now: () => t, blocked: opts.blocked ?? (() => false), gapMs: 400, sharedLane: () => !!opts.shared,
    setTimer: (fn, ms) => { const k = ++id; timers.set(k, { at: t + ms, fn }); return k; },
    clearTimer: (h) => { timers.delete(h as number); },
  });
  const advance = (ms: number) => {
    const end = t + ms;
    for (;;) {
      const next = [...timers.entries()].filter(([, v]) => v.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      t = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    t = end;
  };
  const item = (key: string, channel: Channel, prio = 1, over: Partial<NotifyItem> = {}): NotifyItem => ({
    key, channel, prio, ttl: 5000, ms: 2000, show: () => { log.push(`+${key}`); return (imm) => { log.push(`${imm ? '!' : '-'}${key}`); }; }, ...over,
  });
  return { core, advance, item, log, now: () => t };
}

describe('gestionnaire de notices : cœur', () => {
  it('une notice importante à la fois : la suivante attend la fin de la première', () => {
    const r = rig();
    expect(r.core.push(r.item('a', 'narrative', 3))).toBe('shown');
    expect(r.core.push(r.item('b', 'narrative', 3))).toBe('queued');
    expect(r.core.visibleKeys()).toEqual(['a']);
    r.advance(2000); // a se retire
    r.advance(1000); // délai de calme + tirage de la file
    expect(r.log).toEqual(['+a', '-a', '+b']);
  });
  it('une notice nettement plus importante passe devant (préemption), pas une de même niveau', () => {
    const r = rig();
    r.core.push(r.item('petite', 'narrative', 2));
    expect(r.core.push(r.item('egale', 'narrative', 3))).toBe('queued');
    expect(r.core.push(r.item('urgente', 'narrative', 4))).toBe('shown');
    expect(r.core.visibleKeys()).toEqual(['urgente']);
    expect(r.log.slice(0, 3)).toEqual(['+petite', '!petite', '+urgente']);
  });
  it('toasts et pastilles ne s\'affichent JAMAIS pendant une notice importante', () => {
    const r = rig();
    r.core.push(r.item('aug', 'narrative', 3));
    expect(r.core.push(r.item('t1', 'toast', 1))).toBe('queued');
    expect(r.core.push(r.item('p1', 'ambient', 0))).toBe('queued');
    expect(r.core.visibleKeys()).toEqual(['aug']);
    r.advance(3000);
    expect(r.core.visibleKeys().sort()).toEqual(['p1', 't1']);
  });
  it('limites par canal : 2 toasts, 1 pastille', () => {
    const r = rig();
    expect(r.core.push(r.item('t1', 'toast'))).toBe('shown');
    expect(r.core.push(r.item('t2', 'toast'))).toBe('shown');
    expect(r.core.push(r.item('t3', 'toast'))).toBe('queued');
    expect(r.core.push(r.item('p1', 'ambient'))).toBe('shown');
    expect(r.core.push(r.item('p2', 'ambient'))).toBe('queued');
  });
  it('voie partagée (Endless) : un toast et une pastille se partagent UNE place, la seconde attend', () => {
    const r = rig({ shared: true });
    expect(r.core.push(r.item('t1', 'toast'))).toBe('shown');
    expect(r.core.push(r.item('p1', 'ambient'))).toBe('queued');
    expect(r.core.push(r.item('t2', 'toast'))).toBe('queued');
    r.advance(2600);
    expect(r.core.visible).toBe(1);
  });
  it('fusion : la même notice répétée dans la fenêtre n\'est affichée qu\'une fois (pas d\'empilement)', () => {
    const r = rig();
    expect(r.core.push(r.item('gain', 'toast'))).toBe('shown');
    expect(r.core.push(r.item('gain', 'toast'))).toBe('merged');
    r.advance(2500);
    expect(r.core.push(r.item('gain', 'toast'))).toBe('merged'); // toujours dans la fenêtre de fusion (3 s)
    r.advance(MERGE_WINDOW_MS);
    expect(r.core.push(r.item('gain', 'toast'))).toBe('shown'); // fenêtre écoulée : nouvelle notice légitime
  });
  it('une notice importante qui arrive retire aussitôt les petites notices déjà visibles', () => {
    const r = rig();
    r.core.push(r.item('t1', 'toast')); r.core.push(r.item('p1', 'ambient'));
    expect(r.core.visible).toBe(2);
    r.core.push(r.item('aug', 'narrative', 3));
    expect(r.core.visibleKeys()).toEqual(['aug']);
    expect(r.log).toEqual(['+t1', '+p1', '!t1', '!p1', '+aug']); // retrait IMMÉDIAT (pas de fondu qui chevauche)
  });
  it('rien ne s\'affiche tant que le jeu est bloqué (modale, récompense, fusion) ; tout reprend ensuite', () => {
    let blocked = true;
    const r = rig({ blocked: () => blocked });
    expect(r.core.push(r.item('a', 'toast'))).toBe('queued');
    r.advance(1000); expect(r.core.visible).toBe(0);
    blocked = false; r.advance(300);
    expect(r.core.visibleKeys()).toEqual(['a']);
  });
  it('une notice périmée est abandonnée (jamais d\'information en retard)', () => {
    let blocked = true;
    const r = rig({ blocked: () => blocked });
    r.core.push(r.item('vieux', 'toast', 1, { ttl: 1000 }));
    r.advance(1500); blocked = false; r.advance(500);
    expect(r.core.visible).toBe(0);
    expect(r.log).toEqual([]);
  });
  it('à priorité égale, ordre d\'arrivée ; sinon la plus importante d\'abord', () => {
    let blocked = true;
    const r = rig({ blocked: () => blocked });
    r.core.push(r.item('n1', 'narrative', 2)); r.core.push(r.item('n2', 'narrative', 4)); r.core.push(r.item('n3', 'narrative', 2));
    expect(r.core.waitingKeys()).toEqual(['n2', 'n1', 'n3']);
  });
  it('une notice dont l\'affichage plante est ignorée sans bloquer la suite', () => {
    const r = rig();
    r.core.push({ key: 'x', channel: 'toast', prio: 1, ttl: 1000, ms: 1000, show: () => { throw new Error('boom'); } });
    expect(r.core.push(r.item('ok', 'toast'))).toBe('shown');
    expect(r.core.visibleKeys()).toEqual(['ok']);
  });
  it('clear() retire tout et vide la file', () => {
    const r = rig();
    r.core.push(r.item('a', 'narrative', 3)); r.core.push(r.item('b', 'narrative', 3));
    r.core.clear();
    expect(r.core.visible + r.core.waiting).toBe(0);
    expect(r.log).toContain('!a');
  });
  it('simulation : 300 notices aléatoires — jamais plus d\'une importante visible, jamais de toast pendant une importante', () => {
    let seed = 5; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const r = rig();
    const chans: Channel[] = ['ambient', 'toast', 'narrative'];
    for (let i = 0; i < 300; i++) {
      const c = chans[Math.floor(rnd() * 3)];
      r.core.push(r.item(`k${i % 40}`, c, c === 'narrative' ? 1 + Math.floor(rnd() * 5) : Math.floor(rnd() * 3), { ms: 500 + Math.floor(rnd() * 2500), ttl: 800 + Math.floor(rnd() * 4000) }));
      r.advance(Math.floor(rnd() * 700));
      const keys = r.core.visibleKeys();
      const narr = keys.filter((k) => r.core['live'].find((l: { item: NotifyItem }) => l.item.key === k)!.item.channel === 'narrative');
      expect(narr.length).toBeLessThanOrEqual(1);
      if (narr.length) expect(keys.length).toBe(1);
    }
  });
});
