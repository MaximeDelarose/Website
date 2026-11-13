/** Pièces du Tetris : formes des 4 orientations (sens horaire) et kicks SRS. Aucune dépendance au rendu. */
export const KINDS = ["I", "O", "T", "S", "Z", "J", "L"];
/** Chaque orientation est une matrice de lignes ; « # » = case occupée. */
const SHAPES = {
    I: [
        ["....", "####", "....", "...."],
        ["..#.", "..#.", "..#.", "..#."],
        ["....", "....", "####", "...."],
        [".#..", ".#..", ".#..", ".#.."],
    ],
    O: [["##", "##"], ["##", "##"], ["##", "##"], ["##", "##"]],
    T: [
        [".#.", "###", "..."],
        [".#.", ".##", ".#."],
        ["...", "###", ".#."],
        [".#.", "##.", ".#."],
    ],
    S: [
        [".##", "##.", "..."],
        [".#.", ".##", "..#"],
        ["...", ".##", "##."],
        ["#..", "##.", ".#."],
    ],
    Z: [
        ["##.", ".##", "..."],
        ["..#", ".##", ".#."],
        ["...", "##.", ".##"],
        [".#.", "##.", "#.."],
    ],
    J: [
        ["#..", "###", "..."],
        [".##", ".#.", ".#."],
        ["...", "###", "..#"],
        [".#.", ".#.", "##."],
    ],
    L: [
        ["..#", "###", "..."],
        [".#.", ".#.", ".##"],
        ["...", "###", "#.."],
        ["##.", ".#.", ".#."],
    ],
};
/** Cases [ligne, colonne] occupées pour une pièce et une orientation (0..3). */
export function cellsOf(kind, rot) {
    const rows = SHAPES[kind][((rot % 4) + 4) % 4];
    const out = [];
    rows.forEach((line, r) => {
        for (let c = 0; c < line.length; c++) {
            if (line[c] === "#")
                out.push([r, c]);
        }
    });
    return out;
}
/** Largeur/hauteur de la boîte de la pièce (2 pour le O, 4 pour le I, 3 sinon). */
export function boxSize(kind) {
    return SHAPES[kind][0].length;
}
/**
 * Kicks SRS. Pour chaque transition (de → vers), liste de décalages [x, y] testés dans l'ordre.
 * Convention : y positif vers le HAUT (comme la documentation SRS) ; le moteur inverse l'axe.
 */
const KICKS_JLSTZ = {
    "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I = {
    "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};
/** Décalages de kick à essayer pour passer de `from` à `to` (orientations 0..3). O ne tourne jamais. */
export function kicksFor(kind, from, to) {
    if (kind === "O")
        return [[0, 0]];
    const key = `${from}>${to}`;
    const table = kind === "I" ? KICKS_I : KICKS_JLSTZ;
    return table[key] ?? [[0, 0]];
}
