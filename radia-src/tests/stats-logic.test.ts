import { describe, it, expect } from 'vitest';
import { ActivityMeter, HEARTBEAT_MS, IDLE_MS, MAX_ACT_S, fmtDuration, sessionState } from '../src/core/statsLogic';

const S = 1000;
describe('temps de jeu ACTIF estimé', () => {
  it('compte le temps tant que la joueuse touche l\'écran', () => {
    const m = new ActivityMeter(0);
    for (let t = 10; t <= 40; t += 10) { m.touch(t * S); }
    expect(m.drain(40 * S)).toBe(40);
  });
  it('un écran laissé allumé sans toucher : seulement 60 s comptées au plus après le dernier toucher', () => {
    const m = new ActivityMeter(0);
    m.touch(10 * S);
    // 10 s actives jusqu'au dernier toucher + 60 s d'inactivité tolérée = 70 s au plus, même après 10 minutes
    expect(m.drain(10 * 60 * S)).toBe(10 + IDLE_MS / S);
    expect(m.drain(20 * 60 * S)).toBe(0);
  });
  it('téléphone verrouillé / application en arrière-plan : rien ne compte', () => {
    const m = new ActivityMeter(0);
    m.touch(5 * S);
    m.setVisible(false, 8 * S);
    expect(m.drain(3 * 3600 * S)).toBe(8); // 5 s + 3 s actives avant la mise en arrière-plan, puis plus rien pendant 3 h
  });
  it('revenir dans le jeu compte comme un geste (reprise du comptage), mais pas le temps passé dehors', () => {
    const m = new ActivityMeter(0);
    m.setVisible(false, 2 * S); m.drain(2 * S);
    m.setVisible(true, 600 * S);
    m.touch(610 * S);
    expect(m.drain(610 * S)).toBe(10);
  });
  it('envoi plafonné à 75 s ; le reste attend le prochain envoi ; réseau coupé : les secondes sont rendues (au plus 150 s gardées)', () => {
    const m = new ActivityMeter(0);
    for (let t = 1; t <= 200; t++) m.touch(t * S);
    expect(m.pendingSeconds).toBe(150);
    expect(m.drain(200 * S)).toBe(MAX_ACT_S);
    m.giveBack(MAX_ACT_S);
    expect(m.pendingSeconds).toBe(150);
    expect(m.drain(200 * S)).toBe(MAX_ACT_S);
  });
  it('battement toutes les 45 s : jamais plus de 45 s d\'activité par envoi en jeu continu', () => {
    const m = new ActivityMeter(0); let sent = 0;
    for (let t = 0; t < 600; t += 5) { m.touch(t * S); if (t > 0 && (t * S) % HEARTBEAT_MS === 0) { const a = m.drain(t * S); expect(a).toBeLessThanOrEqual(45); sent += a; } }
    expect(sent).toBeGreaterThan(400);
  });
  it('l\'horloge ne recule jamais (réglage de l\'heure) et ne produit pas de temps négatif', () => {
    const m = new ActivityMeter(100 * S);
    expect(m.drain(50 * S)).toBe(0);
    m.touch(50 * S); expect(m.pendingSeconds).toBe(0);
  });
});

describe('présentation (estimation clairement indiquée)', () => {
  it('durées lisibles', () => {
    expect([0, 45, 59, 60, 725, 3600, 7500].map(fmtDuration)).toEqual(['0 s', '45 s', '59 s', '1 min', '12 min', '1 h 00', '2 h 05']);
  });
  it('état d\'une session : en cours, terminée (signalée) ou fin estimée (fermeture brutale)', () => {
    expect(sessionState({ ended_at: null, end_reason: null, live: true })).toBe('live');
    expect(sessionState({ ended_at: '2026-11-05T10:00:00Z', end_reason: 'closed' })).toBe('ended');
    expect(sessionState({ ended_at: '2026-11-05T10:00:00Z', end_reason: 'timeout' })).toBe('estimated');
    expect(sessionState({ ended_at: null, end_reason: null, live: false })).toBe('estimated');
  });
});
