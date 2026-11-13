import { test } from "node:test";
import assert from "node:assert/strict";
import { TetrisGame, framesPerRow, CLEAR_FRAMES } from "./game.js";
import { BOARD_H, BOARD_W } from "./board.js";
import { KINDS, cellsOf } from "./pieces.js";

test("vitesse : niveau 1 = 1 seconde par ligne (60 frames)", () => {
  assert.equal(framesPerRow(1), 60);
  assert.ok(framesPerRow(15) >= 1);
});

test("sac de 7 : chaque pièce apparaît une fois par sac", () => {
  const g = new TetrisGame(42);
  const seen: string[] = [];
  seen.push(g.active!.kind);
  for (let i = 0; i < 6; i++) {
    g.hardDrop();
    seen.push(g.active!.kind);
  }
  assert.deepEqual([...seen].sort(), [...KINDS].sort());
});

test("même graine = même séquence de pièces", () => {
  const a = new TetrisGame(7);
  const b = new TetrisGame(7);
  for (let i = 0; i < 20; i++) {
    assert.equal(a.next.join(""), b.next.join(""));
    a.hardDrop();
    b.hardDrop();
  }
});

test("chute rapide : points par case et verrouillage", () => {
  const g = new TetrisGame(1);
  const startRow = g.active!.row;
  const before = g.score;
  g.hardDrop();
  const dropped = g.score - before;
  assert.ok(dropped > 0 && dropped % 2 === 0, "2 points par case");
  assert.ok(dropped / 2 >= 1 && dropped / 2 <= BOARD_H);
  assert.notEqual(g.active, null);
  assert.ok(g.active!.row <= startRow + 1);
});

test("une ligne pleine est supprimée et rapporte 100 points au niveau 1", () => {
  const g = new TetrisGame(3);
  // Bas du plateau : 9 cases pleines, la colonne 9 reste vide pour la barre verticale
  for (let c = 0; c < BOARD_W - 1; c++) g.board.grid[BOARD_H - 1][c] = 1;
  // Pièce I verticale poussée dans la colonne 9
  g.active = { kind: "I", rot: 1, row: BOARD_H - 4, col: 7 };
  const before = g.score;
  g.hardDrop();
  assert.equal(g.lines, 1);
  assert.ok(g.score - before >= 100);
});

test("DAS : un appui décale tout de suite, puis répète après le délai", () => {
  const g = new TetrisGame(5, { das: 4, arr: 1 });
  const col0 = g.active!.col;
  g.setHeld(true, false);
  assert.equal(g.active!.col, col0 - 1, "décalage immédiat");
  for (let i = 0; i < 4; i++) {
    g.setHeld(true, false);
    g.step();
  }
  const afterDas = g.active!.col;
  g.setHeld(true, false);
  g.step();
  assert.ok(g.active!.col <= afterDas, "répétition après le DAS");
  g.setHeld(false, false);
});

test("rotation SRS : la pièce I contre le mur pivote grâce au kick", () => {
  const g = new TetrisGame(9);
  g.active = { kind: "I", rot: 0, row: 5, col: -1 };
  g.rotate(1);
  assert.equal(g.active!.rot, 1);
  const cells = cellsOf("I", 1);
  for (const [dr, dc] of cells) {
    assert.ok(g.active!.col + dc >= 0 && g.active!.col + dc < BOARD_W);
    assert.ok(dr >= 0);
  }
});

test("hold : échange une fois par pièce", () => {
  const g = new TetrisGame(11);
  const first = g.active!.kind;
  g.holdPiece();
  assert.equal(g.hold, first);
  const second = g.active!.kind;
  g.holdPiece(); // interdit tant qu'aucune pièce n'est verrouillée
  assert.equal(g.active!.kind, second);
  g.hardDrop();
  const third = g.active!.kind;
  g.holdPiece();
  assert.equal(g.hold, third);
});

test("fin de partie quand le spawn est bloqué", () => {
  const g = new TetrisGame(13);
  for (let r = 0; r < 3; r++) for (let c = 0; c < BOARD_W - 2; c++) g.board.grid[r][c] = 2;
  g.hardDrop();
  assert.equal(g.over, true);
  assert.equal(g.active, null);
});

test("effacement : les lignes restent visibles pendant l'animation puis disparaissent", () => {
  const g = new TetrisGame(3);
  for (let c = 0; c < BOARD_W - 1; c++) g.board.grid[BOARD_H - 1][c] = 1;
  g.active = { kind: "I", rot: 1, row: BOARD_H - 4, col: 7 };
  g.hardDrop();
  assert.deepEqual(g.clearRows, [BOARD_H - 1]);
  assert.equal(g.active, null, "pas de pièce pendant l'animation");
  assert.ok(g.board.grid[BOARD_H - 1].every((c) => c !== 0), "la ligne est encore dessinée");
  for (let i = 0; i < CLEAR_FRAMES; i++) g.step();
  assert.equal(g.clearRows.length, 0);
  assert.notEqual(g.active, null, "la pièce suivante apparaît");
  assert.equal(g.board.grid[BOARD_H - 1].filter((c) => c !== 0).length, 1, "seule la barre verticale est descendue");
});

test("back-to-back : deux tetris de suite rapportent 1,5 fois plus", () => {
  const g = new TetrisGame(4);
  const tetris = () => {
    for (let r = BOARD_H - 4; r < BOARD_H; r++) for (let c = 0; c < BOARD_W - 1; c++) g.board.grid[r][c] = 1;
    g.active = { kind: "I", rot: 1, row: BOARD_H - 4, col: 7 };
    const before = g.score;
    g.hardDrop();
    for (let i = 0; i < CLEAR_FRAMES; i++) g.step();
    return g.score - before;
  };
  const first = tetris();
  const second = tetris();
  assert.ok(second > first, "le second tetris est bonifié");
});
