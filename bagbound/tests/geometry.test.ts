import { describe, expect, it } from "vitest";
import { cellsAdjacent, isConnected, placedCells, rotateVec, transformShape, transformSpecialCell, validatePlacements, type Vec } from "../src/engine";

const sorted = (cells: Vec[]) => [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);

describe("géométrie", () => {
  it("rotation horaire (repère écran)", () => {
    expect(rotateVec([1, 0], 1)).toEqual([0, 1]);
    expect(rotateVec([0, 1], 1)).toEqual([-1, 0]);
    expect(rotateVec([3, -2], 4)).toEqual([3, -2]);
    expect(rotateVec([1, 0], -1)).toEqual([0, -1]);
  });

  it("une forme tournée est normalisée en (0,0)", () => {
    const bar: Vec[] = [[0, 0], [0, 1], [0, 2]];
    expect(sorted(transformShape(bar, { rot: 1, mirror: false }))).toEqual([[0, 0], [1, 0], [2, 0]]);
    expect(sorted(transformShape(bar, { rot: 2, mirror: false }))).toEqual(sorted(bar));
  });

  it("banane en arc : rotation et miroir", () => {
    const banana: Vec[] = [[0, 0], [1, 0], [1, 1]];
    expect(sorted(transformShape(banana, { rot: 1, mirror: false }))).toEqual(sorted([[1, 0], [0, 1], [1, 1]]));
    expect(sorted(transformShape(banana, { rot: 0, mirror: true }))).toEqual(sorted([[0, 0], [1, 0], [0, 1]]));
    // 4 rotations = identité
    expect(sorted(transformShape(banana, { rot: 4, mirror: false }))).toEqual(sorted(banana));
  });

  it("case spéciale : la pointe suit la rotation", () => {
    const bar: Vec[] = [[0, 0], [0, 1], [0, 2]];
    const tip = { cell: [0, 0] as Vec, role: "tip", dir: [0, -1] as Vec };
    expect(transformSpecialCell(bar, tip, { rot: 0, mirror: false })).toEqual({ cell: [0, 0], dir: [0, -1] });
    // quart de tour horaire : la lame est horizontale, la pointe vise la droite
    expect(transformSpecialCell(bar, tip, { rot: 1, mirror: false })).toEqual({ cell: [2, 0], dir: [1, 0] });
    expect(transformSpecialCell(bar, tip, { rot: 2, mirror: false })).toEqual({ cell: [0, 2], dir: [0, 1] });
  });

  it("cases posées, adjacence par un côté (pas en diagonale)", () => {
    const a = placedCells([[0, 0], [1, 0]], [2, 3], { rot: 0, mirror: false });
    expect(a).toEqual([[2, 3], [3, 3]]);
    expect(cellsAdjacent(a, [[4, 3]])).toBe(true);
    expect(cellsAdjacent(a, [[4, 4]])).toBe(false);
  });

  it("connexité", () => {
    expect(isConnected([[0, 0], [1, 0], [1, 1]])).toBe(true);
    expect(isConnected([[0, 0], [1, 1]])).toBe(false);
  });

  it("validation : hors du sac et chevauchement", () => {
    const bag: Vec[] = [[0, 0], [1, 0], [0, 1], [1, 1]];
    expect(validatePlacements([{ id: "a", cells: [[0, 0], [1, 0]] }, { id: "b", cells: [[0, 1]] }], bag)).toEqual([]);
    const pb = validatePlacements([{ id: "a", cells: [[0, 0], [1, 0]] }, { id: "b", cells: [[1, 0], [2, 0]] }], bag);
    expect(pb.map((p) => p.kind).sort()).toEqual(["outside", "overlap"]);
  });
});
