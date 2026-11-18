import { describe, expect, it } from "vitest";
import { gameConfig as cfg } from "../src/config/game.config";
import { buildMemoryRounds, cipherShift, cipherText, deductionCode, deductionEntrants, finaleSymbolChoices, memoryFragment, shiftText } from "../src/engine/puzzles";
import { hintCost, rankFor, scoreStage, timeLeftBonus } from "../src/engine/scoring";
import { elapsedMs, initialState, makeReducer, remainingMs, STAGE_ORDER, totalScore, type Action, type GameState } from "../src/engine/state";

describe("énigmes : solutions vérifiables", () => {
  it("déduction : le code vient des documents (casiers des entrants, par ordre d'entrée, badge cloné écarté)", () => {
    expect(deductionEntrants(cfg.deduction).map((a) => a.name)).toEqual(["LEROY", "NOVAK", "IMBERT", "DUVAL"]);
    expect(deductionCode(cfg.deduction)).toBe("4927");
  });

  it("déduction : l'énigme est bien posée (4 chiffres, casiers distincts, badge cloné présent au journal)", () => {
    const d = cfg.deduction;
    expect(deductionCode(d)).toMatch(/^\d{4}$/);
    expect(new Set(d.agents.map((a) => a.locker)).size).toBe(d.agents.length);
    expect(d.agents.every((a) => a.locker >= 0 && a.locker <= 9)).toBe(true);
    expect(d.agents.find((a) => a.name === d.clonedBadgeOf)?.entry).not.toBeNull();
    const times = d.agents.filter((a) => a.entry).map((a) => a.entry);
    expect(new Set(times).size).toBe(times.length);
    // sans écarter le badge cloné, on obtiendrait 5 chiffres : la preuve d'absence est nécessaire
    expect(d.agents.filter((a) => a.entry).length).toBe(5);
  });

  it("chiffre : le message intercepté se déchiffre en reculant du nombre de relais actifs", () => {
    const shift = cipherShift(cfg.cipher);
    expect(shift).toBe(5);
    expect(cipherText(cfg.cipher)).toBe("FZWTWJ");
    expect(shiftText(cipherText(cfg.cipher), -shift)).toBe(cfg.cipher.plaintext);
    expect(cfg.cipher.plaintext).toMatch(/^[A-Z]+$/);
    // aucun autre décalage ne redonne le mot
    for (let s = 1; s < 26; s++) if (s !== shift) expect(shiftText(cipherText(cfg.cipher), -s)).not.toBe(cfg.cipher.plaintext);
  });

  it("mémoire : grilles sans doublon, séquences valides, reproductibles par graine", () => {
    for (const seed of [1, 42, 123456789, 0xffffffff]) {
      const rounds = buildMemoryRounds(seed, cfg.memory.rounds);
      expect(rounds).toEqual(buildMemoryRounds(seed, cfg.memory.rounds));
      rounds.forEach((r, i) => {
        expect(r.grid.length).toBe(r.cols * r.rows);
        expect(new Set(r.grid).size).toBe(r.grid.length);
        expect(r.sequence.length).toBe(cfg.memory.rounds[i].sequence);
        expect(new Set(r.sequence).size).toBe(r.sequence.length);
        expect(r.sequence.every((c) => c >= 0 && c < r.grid.length)).toBe(true);
      });
      const fragment = memoryFragment(rounds);
      const choices = finaleSymbolChoices(seed, fragment);
      expect(choices.length).toBe(6);
      expect(new Set(choices).size).toBe(6);
      expect(choices).toContain(fragment);
    }
    expect(buildMemoryRounds(1, cfg.memory.rounds)).not.toEqual(buildMemoryRounds(2, cfg.memory.rounds));
  });
});

describe("barème", () => {
  const rule = cfg.scoring.stages.deduction;

  it("réussite immédiate = base + bonus complet ; au temps de référence le bonus est nul", () => {
    expect(scoreStage(rule, { durationMs: 0, errors: 0, hints: 0, penalties: 0 }).total).toBe(1500);
    expect(scoreStage(rule, { durationMs: rule.parSeconds * 1000, errors: 0, hints: 0, penalties: 0 }).total).toBe(1000);
    expect(scoreStage(rule, { durationMs: rule.parSeconds * 500, errors: 0, hints: 0, penalties: 0 }).timeBonus).toBe(250);
  });

  it("erreurs et indices retirent des points, sans passer sous le plancher", () => {
    const r = scoreStage(rule, { durationMs: rule.parSeconds * 1000, errors: 2, hints: 2, penalties: 0 });
    expect(r.errorPenalty).toBe(100);
    expect(r.hintPenalty).toBe(175);
    expect(r.total).toBe(725);
    expect(scoreStage(rule, { durationMs: 9e9, errors: 99, hints: 9, penalties: 500 }).total).toBe(rule.minScore);
  });

  it("le coût des indices est progressif puis constant", () => {
    expect(hintCost(rule, 0)).toBe(0);
    expect(hintCost(rule, 3)).toBe(325);
    expect(hintCost(rule, 4)).toBe(475);
    expect(hintCost(cfg.scoring.stages.memory, 3)).toBe(180);
  });

  it("bonus de temps restant et grades", () => {
    expect(timeLeftBonus(cfg.scoring, 125_900)).toBe(250);
    expect(timeLeftBonus(cfg.scoring, -5)).toBe(0);
    expect(rankFor(cfg.scoring, 99999).title).toBe(cfg.scoring.ranks[0].title);
    expect(rankFor(cfg.scoring, 0).title).toBe(cfg.scoring.ranks[cfg.scoring.ranks.length - 1].title);
  });
});

describe("déroulement d'une partie", () => {
  const reduce = makeReducer(cfg);
  const run = (state: GameState, actions: Action[]) => actions.reduce(reduce, state);

  it("le chrono ne tourne que pendant les épreuves et se met en pause entre elles", () => {
    let s = run(initialState(), [{ type: "NEW_GAME", seed: 7 }, { type: "SET_TEAM", name: "  Phénix  " }, { type: "BRIEFING_DONE" }]);
    expect(s.teamName).toBe("Phénix");
    expect(s.phase).toBe("stageIntro");
    expect(elapsedMs(s, 999_999)).toBe(0);
    s = reduce(s, { type: "BEGIN_STAGE", now: 1_000 });
    expect(elapsedMs(s, 61_000)).toBe(60_000);
    expect(remainingMs(s, cfg, 61_000)).toBe(cfg.durationSeconds * 1000 - 60_000);
    s = reduce(s, { type: "COMPLETE_STAGE", now: 61_000 });
    expect(s.phase).toBe("stageDone");
    expect(elapsedMs(s, 500_000)).toBe(60_000);
    expect(s.stages[0].durationMs).toBe(60_000);
  });

  it("partie complète : scores par épreuve, bonus de temps, total", () => {
    let s = run(initialState(), [{ type: "NEW_GAME", seed: 7 }, { type: "SET_TEAM", name: "A" }, { type: "BRIEFING_DONE" }]);
    let now = 0;
    for (let i = 0; i < STAGE_ORDER.length; i++) {
      s = reduce(s, { type: "BEGIN_STAGE", now });
      if (i === 1) s = run(s, [{ type: "ERROR" }, { type: "HINT" }]);
      if (i === 3) s = reduce(s, { type: "PENALTY", points: 100 });
      now += 120_000;
      s = reduce(s, { type: "COMPLETE_STAGE", now });
      if (i < 3) {
        expect(s.phase).toBe("stageDone");
        s = reduce(s, { type: "NEXT_STAGE" });
      }
    }
    expect(s.phase).toBe("victory");
    expect(s.outcome).toBe("success");
    const expected = STAGE_ORDER.map((id, i) =>
      scoreStage(cfg.scoring.stages[id], { durationMs: 120_000, errors: i === 1 ? 1 : 0, hints: i === 1 ? 1 : 0, penalties: i === 3 ? 100 : 0 }).total,
    );
    expect(s.stages.map((st) => st.result?.total)).toEqual(expected);
    expect(s.timeBonus).toBe((cfg.durationSeconds - 480) * cfg.scoring.pointsPerSecondLeft);
    expect(totalScore(s)).toBe(expected.reduce((a, b) => a + b, 0) + s.timeBonus);
    expect(reduce(s, { type: "SHOW_END" }).phase).toBe("end");
  });

  it("temps écoulé : la mission échoue en conservant les points acquis", () => {
    let s = run(initialState(), [{ type: "NEW_GAME", seed: 7 }, { type: "SET_TEAM", name: "A" }, { type: "BRIEFING_DONE" }, { type: "BEGIN_STAGE", now: 0 }]);
    s = run(s, [{ type: "COMPLETE_STAGE", now: 30_000 }, { type: "NEXT_STAGE" }, { type: "BEGIN_STAGE", now: 30_000 }]);
    s = reduce(s, { type: "TIMEOUT" });
    expect(s.phase).toBe("end");
    expect(s.outcome).toBe("timeout");
    expect(s.timeBonus).toBe(0);
    expect(totalScore(s)).toBe(s.stages[0].result?.total);
    expect(remainingMs(s, cfg, 1e12)).toBe(0);
  });

  it("les actions d'épreuve sont ignorées hors épreuve", () => {
    const s = run(initialState(), [{ type: "NEW_GAME", seed: 7 }]);
    expect(run(s, [{ type: "ERROR" }, { type: "HINT" }, { type: "COMPLETE_STAGE", now: 5 }, { type: "TIMEOUT" }])).toEqual(s);
  });
});
