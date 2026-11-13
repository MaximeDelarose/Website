import { Phaser } from "./engines.js";
const OUT = "#2b1709";
function defs() {
    const d = window.ES_DATA;
    return d?.SPRITES ?? null;
}
/** Dessine une image du sprite (+ contour) à l'échelle k dans une nouvelle texture. */
function build(scene, key, rows, pal, k) {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const W = w + 2;
    const H = h + 2;
    const filled = new Uint8Array(W * H);
    const tex = scene.textures.createCanvas(key, W * k, H * k);
    if (!tex)
        return;
    const g = tex.getContext();
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const ch = rows[y][x];
            if (ch && pal[ch]) {
                g.fillStyle = pal[ch];
                g.fillRect((x + 1) * k, (y + 1) * k, k, k);
                filled[(y + 1) * W + x + 1] = 1;
            }
        }
    }
    g.fillStyle = OUT;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (filled[y * W + x])
                continue;
            const near = (x > 0 && filled[y * W + x - 1]) || (x < W - 1 && filled[y * W + x + 1]) || (y > 0 && filled[(y - 1) * W + x]) || (y < H - 1 && filled[(y + 1) * W + x]);
            if (near)
                g.fillRect(x * k, y * k, k, k);
        }
    }
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}
/** Clés de texture (une par image d'animation) d'un sprite du site, créées à la demande. Vide si inconnu. */
export function spriteKeys(scene, name, k = 3) {
    const def = defs()?.[name];
    if (!def)
        return [];
    return def.frames.map((rows, i) => {
        const key = `es:${name}:${k}:${i}`;
        if (!scene.textures.exists(key))
            build(scene, key, rows, def.pal, k);
        return key;
    });
}
export function spriteKey(scene, name, k = 3, frame = 0) {
    return spriteKeys(scene, name, k)[frame] ?? null;
}
/** Réserve d'images réutilisées à chaque frame : on appelle begin(), draw() autant de fois que voulu, puis end(). */
export class SpritePool {
    constructor(scene, depth, ox = 0, oy = 0) {
        this.scene = scene;
        this.depth = depth;
        this.ox = ox;
        this.oy = oy;
        this.list = [];
        this.used = 0;
    }
    begin() {
        this.used = 0;
    }
    draw(key, x, y, o = {}) {
        if (!key)
            return;
        let img = this.list[this.used];
        if (!img) {
            img = this.scene.add.image(0, 0, key).setDepth(this.depth);
            this.list.push(img);
        }
        this.used++;
        const s = o.scale ?? 1;
        img.setTexture(key).setPosition(x + this.ox, y + this.oy).setRotation(o.rotation ?? 0).setScale(o.flip ? -s : s, s).setAlpha(o.alpha ?? 1).setVisible(true);
        if (o.tint !== undefined)
            img.setTint(o.tint);
        else
            img.clearTint();
    }
    end() {
        for (let i = this.used; i < this.list.length; i++)
            this.list[i].setVisible(false);
    }
}
/** Écureuil du site qui vit dans un coin de l'écran : respire, saute de joie, déprime. */
export class Mascot {
    constructor(scene, name, x, y, k = 4, depth = 6) {
        this.scene = scene;
        this.name = name;
        this.x = x;
        this.y = y;
        this.k = k;
        this.depth = depth;
        this.img = null;
        this.frames = [];
        this.t = 0;
        this.frame = 0;
        this.set(name);
    }
    /** Change d'écureuil (le site en a une quinzaine). */
    set(name) {
        this.name = name;
        this.frames = spriteKeys(this.scene, name, this.k);
        if (this.frames.length === 0)
            return;
        if (!this.img)
            this.img = this.scene.add.image(this.x, this.y, this.frames[0]).setDepth(this.depth).setOrigin(0.5, 1);
        else
            this.img.setTexture(this.frames[0]);
        this.frame = 0;
    }
    update(dtMs) {
        if (!this.img || this.frames.length < 2)
            return;
        this.t += dtMs;
        if (this.t > 520) {
            this.t = 0;
            this.frame = (this.frame + 1) % this.frames.length;
            this.img.setTexture(this.frames[this.frame]);
        }
    }
    /** Petit saut de joie. */
    cheer() {
        if (!this.img)
            return;
        this.scene.tweens.killTweensOf(this.img);
        this.img.setY(this.y).setAngle(0);
        this.scene.tweens.add({ targets: this.img, y: this.y - 26, duration: 130, yoyo: true, repeat: 1, ease: "Quad.Out", onComplete: () => this.img?.setY(this.y) });
    }
    /** Penché, dépité. */
    sad() {
        if (!this.img)
            return;
        this.scene.tweens.killTweensOf(this.img);
        this.scene.tweens.add({ targets: this.img, angle: 18, y: this.y + 6, duration: 300, ease: "Sine.Out" });
    }
    /** Remet l'écureuil droit (nouvelle partie). */
    reset() {
        if (!this.img)
            return;
        this.scene.tweens.killTweensOf(this.img);
        this.img.setAngle(0).setY(this.y);
    }
}
/** Les écureuils du site, pour changer de mascotte au fil de la partie. */
export const SQUIRREL_NAMES = ["sq_noisette", "sq_pip", "sq_pop", "sq_cendrine", "sq_flocon", "sq_charbon", "sq_planeur", "sq_capitaine"];
