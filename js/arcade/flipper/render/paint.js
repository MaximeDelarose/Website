import { PAL } from "../../shared/theme.js";
import { drawPanel } from "../../shared/kit.js";
import { spriteKey } from "../../shared/art.js";
function strokeLine(g, pts, width, color, alpha = 1, dx = 0, dy = 0) {
    g.lineStyle(width, color, alpha);
    g.beginPath();
    g.moveTo(pts[0][0] + dx, pts[0][1] + dy);
    for (let i = 1; i < pts.length; i++)
        g.lineTo(pts[i][0] + dx, pts[i][1] + dy);
    g.strokePath();
}
/** Rail : ombre portée (étage), contour sombre, corps brun, reflet. */
function rail(g, pts, raised) {
    if (raised)
        strokeLine(g, pts, 14, PAL.ink0, 0.35, 7, 10);
    strokeLine(g, pts, 18, PAL.ink0);
    strokeLine(g, pts, 10, raised ? PAL.orangeLight : PAL.cap);
    strokeLine(g, pts, 3, raised ? 0xffffff : PAL.tan, raised ? 0.5 : 0.7);
}
/**
 * Dessin fixe de la table (une seule fois) : cadre, fond, décor du site, rails du plateau, puis l'étage
 * supérieur (plateau + rampe) par-dessus avec ombre portée. Renvoie le calque de l'étage, à placer au-dessus
 * des billes du plateau.
 */
export function paintTable(scene, d, tx, ty) {
    const frame = scene.add.graphics().setDepth(0);
    drawPanel(frame, tx - 14, ty - 14, d.width + 28, d.height + 28, { fill: 0x1b3224, depth: 8, bw: 8 });
    const floor = scene.add.graphics().setDepth(1).setPosition(tx, ty);
    floor.fillStyle(0x1d3a2a, 1);
    floor.fillRect(0, 0, d.width, d.height);
    floor.lineStyle(10, 0x22442f, 1);
    floor.strokeCircle(220, 220, 170);
    floor.strokeCircle(220, 220, 105);
    floor.fillStyle(0x16291f, 1);
    floor.fillRect(400, 0, 40, d.height); // couloir de lancement
    floor.fillStyle(0x22442f, 1);
    for (let i = 0; i < 7; i++)
        floor.fillCircle(70 + i * 50, 560, 5);
    for (let i = 0; i < 5; i++)
        floor.fillCircle(130 + i * 45, 120 - (i % 2) * 10, 4);
    // décor du site : trèfles, mousse, coccinelles à peine visibles sous la table
    const decor = [["clover", 70, 560], ["clover", 332, 600], ["moss", 210, 530], ["ladybug", 110, 520], ["clover", 330, 120], ["moss", 250, 240], ["ladybug", 160, 470], ["clover", 190, 700], ["moss", 80, 700], ["clover", 330, 700]];
    for (const [name, x, y] of decor) {
        const key = spriteKey(scene, name, 3);
        if (key)
            scene.add.image(tx + x, ty + y, key).setDepth(1.5).setAlpha(0.45);
    }
    // rails du plateau et de la coque
    const walls = scene.add.graphics().setDepth(2).setPosition(tx, ty);
    for (const w of d.walls)
        if (w.level !== 2)
            rail(walls, w.pts, false);
    // porte du couloir
    const [gf, gt] = [d.laneGate.from, d.laneGate.to];
    strokeLine(walls, [gf, gt], 14, PAL.ink0);
    strokeLine(walls, [gf, gt], 7, PAL.leaf);
    // étage : plateau supérieur et rampe, au-dessus du plateau
    const upper = scene.add.graphics().setDepth(12).setPosition(tx, ty);
    const deck = [[44, 160], [200, 160], [200, 392], [80, 330], [80, 490], [44, 490]];
    const poly = (dx, dy) => deck.map(([x, y]) => ({ x: x + dx, y: y + dy }));
    upper.fillStyle(PAL.ink0, 0.3);
    upper.fillPoints(poly(8, 12), true);
    upper.fillStyle(0x6b4a30, 0.92);
    upper.fillPoints(poly(0, 0), true);
    upper.fillStyle(0x7d5a3c, 0.9);
    upper.fillPoints([{ x: 52, y: 168 }, { x: 192, y: 168 }, { x: 192, y: 372 }, { x: 88, y: 322 }, { x: 88, y: 482 }, { x: 52, y: 482 }], true);
    // veines du bois
    upper.lineStyle(2, 0x5f4029, 0.6);
    for (let y = 190; y < 340; y += 26) {
        upper.beginPath();
        upper.moveTo(58, y);
        upper.lineTo(188, y + 6);
        upper.strokePath();
    }
    for (const w of d.walls)
        if (w.level === 2)
            rail(upper, w.pts, true);
}
