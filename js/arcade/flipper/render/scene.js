import { Phaser, Matter } from "../../shared/engines.js";
import { readPad } from "../../shared/gamepad.js";
import { loadBest, saveBest } from "../../shared/storage.js";
import { arp, noise, tone } from "../../shared/audio.js";
import { FONT_BODY, PAL, mix } from "../../shared/theme.js";
import { Counter, MuteButton, Overlay, Particles, TouchPad, drawPanel, isTouch, makeText, onBlur, popText } from "../../shared/kit.js";
import { BALLS_PER_GAME, FlipperRules } from "../core/rules.js";
import { buildStatics, buildFlipper } from "./table.js";
const TICK_MS = 1000 / 60;
export const TOUCH = isTouch();
export const GAME_W = 800;
export const GAME_H = TOUCH ? 1090 : 900;
const TX = 194; // origine de la table dans le canvas
const TY = 60;
const LX = 20;
const RX = 640;
const COL_W = 140;
const BEST_KEY = "arcade.flipper.best";
const SAVE_MS = 7000;
export class FlipperScene extends Phaser.Scene {
    constructor() {
        super("flipper");
        this.state = "loading";
        this.statics = [];
        this.targetBodies = new Map();
        this.flips = [];
        this.balls = [];
        this.trails = new Map();
        this.readyBall = null;
        this.charge = 0;
        this.plungerWasDown = false;
        /** Vrai tant que la touche qui a démarré ou repris la partie n'est pas relâchée (sinon elle lancerait la bille). */
        this.plungerIgnore = false;
        this.saveUntil = 0;
        this.acc = 0;
        this.best = 0;
        this.newRecord = false;
        this.pending = [];
        this.hitFlash = new Map();
        this.fx = new Particles();
        this.score = new Counter();
        this.pad = null;
        this.prevPad = [];
        this.lastFlip = { left: false, right: false };
    }
    create() {
        this.tg = this.add.graphics().setDepth(10).setPosition(TX, TY);
        this.fxg = this.add.graphics().setDepth(40).setPosition(TX, TY);
        this.ug = this.add.graphics().setDepth(60);
        this.overlay = new Overlay(this, GAME_W, GAME_H);
        new MuteButton(this, GAME_W - 68, 8, 48);
        this.keys = this.input.keyboard.addKeys({
            left: "LEFT", a: "A", z: "Z", lshift: "SHIFT", right: "RIGHT", d: "D", m: "M", x: "X",
            space: "SPACE", down: "DOWN", p: "P", esc: "ESC", r: "R", enter: "ENTER",
        });
        onBlur(this, () => {
            if (this.state === "playing")
                this.pause();
        });
        makeText(this, 20, 6, "FLIPPER", 46, PAL.orangeLight, { strokeW: 8 }).setDepth(5);
        this.add.text(GAME_W / 2, GAME_H / 2, "chargement…", { fontFamily: FONT_BODY, fontSize: "24px", color: "#fdf3de" }).setOrigin(0.5).setName("loading");
        void fetch("data/arcade/table.json")
            .then((r) => r.json())
            .then((data) => {
            this.table = data;
            this.children.getByName("loading")?.destroy();
            this.best = loadBest(BEST_KEY);
            this.buildStatic();
            if (TOUCH) {
                const y = 920;
                this.pad = new TouchPad(this, [
                    { id: "left", x: 20, y, w: 225, h: 150, label: "◀" },
                    { id: "launch", x: 265, y, w: 230, h: 150, label: "LANCER", color: PAL.orange },
                    { id: "right", x: 515, y, w: 225, h: 150, label: "▶" },
                ]);
            }
            this.resetGame();
            this.showStart();
        });
    }
    // ---------- décor fixe ----------
    buildStatic() {
        const d = this.table;
        const bg = this.add.graphics().setDepth(0);
        drawPanel(bg, TX - 14, TY - 14, d.width + 28, d.height + 28, { fill: 0x1b3224, depth: 8, bw: 8 });
        // fond de table : arche décorative, repères lumineux
        const deco = this.add.graphics().setDepth(1).setPosition(TX, TY);
        deco.fillStyle(0x1d3a2a, 1);
        deco.fillRect(0, 0, d.width, d.height);
        deco.lineStyle(10, 0x22442f, 1);
        deco.strokeCircle(210, 210, 150);
        deco.strokeCircle(210, 210, 90);
        deco.fillStyle(0x16291f, 1);
        deco.fillRect(380, 0, 40, d.height);
        deco.fillStyle(0x22442f, 1);
        for (let i = 0; i < 6; i++)
            deco.fillCircle(80 + i * 44, 470, 5);
        for (let i = 0; i < 5; i++)
            deco.fillCircle(100 + i * 50, 120 - (i % 2) * 10, 4);
        // rails : contour sombre, corps brun, reflet
        const walls = this.add.graphics().setDepth(2).setPosition(TX, TY);
        for (const line of d.walls) {
            const pass = (w, color, a = 1) => {
                walls.lineStyle(w, color, a);
                walls.beginPath();
                walls.moveTo(line[0][0], line[0][1]);
                for (let i = 1; i < line.length; i++)
                    walls.lineTo(line[i][0], line[i][1]);
                walls.strokePath();
            };
            pass(18, PAL.ink0);
            pass(10, PAL.cap);
            pass(3, PAL.tan, 0.7);
        }
        const panel = (x, y, h, title) => {
            drawPanel(bg, x, y, COL_W, h, { fill: PAL.field, depth: 6, bw: 4 });
            bg.fillStyle(PAL.ink0, 1);
            bg.fillRect(x + 4, y + 4, COL_W - 8, 30);
            makeText(this, x + COL_W / 2, y + 19, title, 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
        };
        panel(LX, TY, 130, "SCORE");
        panel(LX, TY + 152, 110, "BILLES");
        panel(LX, TY + 284, 100, "MEILLEUR");
        panel(RX, TY, 218, "MISSIONS");
        makeText(this, RX + 12, TY + 130, "3 lettres\n= +1000", 15, PAL.panel2, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5);
        makeText(this, RX + 12, TY + 40, "3 cibles\n= bille bonus", 15, PAL.panel2, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5);
        this.texts = {
            score: makeText(this, LX + COL_W / 2, TY + 88, "0", 38, PAL.cream, { origin: [0.5, 0.5], strokeW: 6 }).setDepth(5),
            best: makeText(this, LX + COL_W / 2, TY + 284 + 66, "0", 32, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 5 }).setDepth(5),
        };
        if (!TOUCH) {
            drawPanel(bg, RX, TY + 240, COL_W, 300, { fill: PAL.field, depth: 6, bw: 4 });
            bg.fillStyle(PAL.ink0, 1);
            bg.fillRect(RX + 4, TY + 244, COL_W - 8, 30);
            makeText(this, RX + COL_W / 2, TY + 259, "COMMANDES", 21, PAL.orangeLight, { origin: [0.5, 0.5], strokeW: 0, shadow: false }).setDepth(5);
            const rows = [["← Z", "gauche"], ["→ M", "droit"], ["ESPACE", "lancer"], ["P", "pause"], ["M", "son"]];
            rows.forEach(([k, label], i) => {
                const y = TY + 290 + i * 38;
                makeText(this, RX + 12, y, k, 16, PAL.leaf, { font: FONT_BODY, strokeW: 3, shadow: false }).setDepth(5).setFontStyle("800");
                makeText(this, RX + COL_W - 12, y + 2, label, 14, PAL.panel2, { font: FONT_BODY, origin: [1, 0], strokeW: 3, shadow: false }).setDepth(5);
            });
        }
    }
    // ---------- états ----------
    resetGame() {
        const d = this.table;
        this.engine = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: d.gravityScale } });
        this.engine.positionIterations = 10;
        this.engine.velocityIterations = 10;
        this.statics = buildStatics(d);
        this.targetBodies.clear();
        for (const b of this.statics)
            if (b.label.startsWith("target:"))
                this.targetBodies.set(b.label.slice(7), b);
        this.flips = ["left", "right"].map((side) => {
            const f = buildFlipper(d, side);
            return { body: f.body, sign: f.sign, side, ang: f.sign * d.flipper.restAngle };
        });
        Matter.Composite.add(this.engine.world, [...this.statics, ...this.flips.map((f) => f.body)]);
        Matter.Events.on(this.engine, "collisionStart", (event) => {
            for (const pair of event.pairs)
                this.onPair(pair.bodyA, pair.bodyB);
        });
        this.rules = new FlipperRules(d.targets.map((t) => t.id), d.rollovers.map((r) => r.id));
        this.balls = [];
        this.trails.clear();
        this.pending = [];
        this.charge = 0;
        this.saveUntil = 0;
        this.newRecord = false;
        this.fx.clear();
        this.score.reset(0);
        this.spawnReady();
    }
    showStart() {
        this.state = "ready";
        this.overlay.show({
            title: "FLIPPER",
            subtitle: this.best > 0 ? `Meilleur score : ${this.best}` : "Trois billes, un seul but",
            lines: TOUCH ? ["Touche LANCER, puis ◀ ▶ pour les flippers"] : ["Tiens ESPACE pour charger le plongeur", "← → pour les flippers"],
            button: "Jouer",
            hint: TOUCH ? "Touche pour jouer" : "ESPACE ou clic",
        }, () => this.startGame());
    }
    startGame() {
        this.overlay.hide();
        if (this.state === "over" || this.rules.ballsLeft < BALLS_PER_GAME || this.rules.score > 0)
            this.resetGame();
        this.state = "playing";
        this.plungerIgnore = true;
        arp([392, 523, 659], 0.07, { vol: 0.04 });
    }
    pause() {
        if (this.state !== "playing")
            return;
        this.state = "paused";
        this.overlay.show({ title: "PAUSE", lines: ["Ta partie est en attente"], button: "Reprendre", hint: "P ou ESPACE" }, () => this.resume());
    }
    resume() {
        if (this.state !== "paused")
            return;
        this.overlay.hide();
        this.state = "playing";
        this.plungerIgnore = true;
    }
    gameOver(score) {
        this.state = "over";
        if (score > this.best) {
            this.best = score;
            this.newRecord = true;
            saveBest(BEST_KEY, this.best);
        }
        [0, 1, 2, 3].forEach((i) => tone(330 - i * 60, 0.22, { vol: 0.05, type: "sawtooth", delay: i * 0.12, freqEnd: 200 - i * 40 }));
        this.time.delayedCall(800, () => {
            if (this.state !== "over")
                return;
            this.overlay.show({ title: "PARTIE FINIE", subtitle: `Score ${score}`, lines: [this.newRecord ? "★ Nouveau record ! ★" : `Meilleur : ${this.best}`], button: "Rejouer", hint: "ESPACE ou R" }, () => this.startGame());
        });
    }
    // ---------- billes ----------
    makeBall(x, y) {
        const b = this.table.ball;
        const ball = Matter.Bodies.circle(x, y, b.radius, { frictionStatic: 0, restitution: b.restitution, friction: b.friction, frictionAir: b.frictionAir, density: b.density, label: "ball" });
        this.balls.push(ball);
        this.trails.set(ball, []);
        Matter.Composite.add(this.engine.world, ball);
        return ball;
    }
    spawnReady() {
        const l = this.table.launch;
        this.readyBall = this.makeBall(l.x, l.y);
    }
    removeBall(ball) {
        Matter.Composite.remove(this.engine.world, ball);
        this.balls = this.balls.filter((b) => b !== ball);
        this.trails.delete(ball);
        if (this.readyBall === ball)
            this.readyBall = null;
    }
    launchReady(power) {
        const ball = this.readyBall;
        if (!ball)
            return;
        Matter.Body.setVelocity(ball, { x: 0, y: -power });
        this.readyBall = null;
        this.rules.launch();
        if (this.saveUntil === 0)
            this.saveUntil = this.time.now + SAVE_MS;
        noise(0.18, { vol: 0.06, freq: 1400 });
        tone(180, 0.2, { vol: 0.05, type: "sawtooth", freqEnd: 520 });
    }
    // ---------- boucle ----------
    update(_time, delta) {
        if (this.state === "loading")
            return;
        this.fx.update(delta);
        this.pad?.poll();
        const j = {};
        for (const name of Object.keys(this.keys))
            j[name] = Phaser.Input.Keyboard.JustDown(this.keys[name]);
        if (j.r && this.state !== "ready")
            this.startGame();
        if ((j.space || j.enter) && this.overlay.visible)
            this.overlay.activate();
        if (j.p || j.esc) {
            if (this.state === "playing")
                this.pause();
            else if (this.state === "paused")
                this.resume();
        }
        const pad = readPad();
        if (pad && pad.buttons[9] && !this.prevPad[9]) {
            if (this.state === "playing")
                this.pause();
            else if (this.overlay.visible)
                this.overlay.activate();
        }
        this.prevPad = pad ? pad.buttons.slice() : [];
        if (this.state === "playing") {
            this.acc += delta;
            const k = this.keys;
            const left = k.left.isDown || k.a.isDown || k.z.isDown || k.lshift.isDown || !!pad?.buttons[4] || !!pad?.buttons[6] || (pad?.x ?? 0) < 0 || !!this.pad?.isDown("left");
            const right = k.right.isDown || k.d.isDown || k.m.isDown || k.x.isDown || !!pad?.buttons[5] || !!pad?.buttons[7] || (pad?.x ?? 0) > 0 || !!this.pad?.isDown("right");
            const plunger = k.space.isDown || k.down.isDown || !!pad?.buttons[0] || !!this.pad?.isDown("launch");
            this.handlePlunger(plunger, delta);
            if (this.flipEdge(left, right))
                tone(150, 0.04, { vol: 0.04, type: "square", freqEnd: 90 });
            while (this.acc >= TICK_MS) {
                this.acc -= TICK_MS;
                this.physicsTick(left, right);
            }
            this.afterTick();
        }
        this.render(delta);
    }
    flipEdge(left, right) {
        const edge = (left && !this.lastFlip.left) || (right && !this.lastFlip.right);
        this.lastFlip = { left, right };
        return edge;
    }
    handlePlunger(down, delta) {
        const l = this.table.launch;
        if (this.plungerIgnore) {
            if (!down)
                this.plungerIgnore = false;
            this.plungerWasDown = false;
            return;
        }
        if (this.readyBall) {
            if (down)
                this.charge = Math.min(1, this.charge + delta / (l.chargeFrames * TICK_MS));
            if (!down && this.plungerWasDown) {
                const c = Math.max(this.charge, 0.3);
                this.launchReady(l.powerMin + c * (l.powerMax - l.powerMin));
                this.charge = 0;
            }
        }
        else if (!down) {
            this.charge = 0;
        }
        this.plungerWasDown = down;
    }
    physicsTick(left, right) {
        const d = this.table;
        const sub = d.substeps;
        const dt = TICK_MS / sub;
        for (let s = 0; s < sub; s++) {
            for (const f of this.flips) {
                const pressed = f.side === "left" ? left : right;
                const fl = d.flipper;
                const target = pressed ? -f.sign * fl.upAngle : f.sign * fl.restAngle;
                const step = fl.speed / sub;
                f.ang += Math.max(-step, Math.min(step, target - f.ang));
                this.poseFlipper(f);
            }
            Matter.Engine.update(this.engine, dt);
            for (const b of this.balls) {
                const v = b.velocity;
                const speed = Math.hypot(v.x, v.y);
                if (speed > d.ball.maxSpeed)
                    Matter.Body.setVelocity(b, { x: (v.x / speed) * d.ball.maxSpeed, y: (v.y / speed) * d.ball.maxSpeed });
            }
            if (this.readyBall) {
                Matter.Body.setPosition(this.readyBall, { x: d.launch.x, y: d.launch.y + this.charge * d.launch.pull });
                Matter.Body.setVelocity(this.readyBall, { x: 0, y: 0 });
            }
            this.flushPending();
        }
    }
    /** Place le flipper autour de son pivot ; la vitesse est mise à jour pour transmettre le coup à la bille. */
    poseFlipper(f) {
        const fl = this.table.flipper;
        const [px, py] = fl.pivots[f.side];
        const half = fl.length / 2;
        const api = Matter.Body;
        api.setAngle(f.body, f.ang, true);
        api.setPosition(f.body, { x: px + f.sign * half * Math.cos(f.ang), y: py + f.sign * half * Math.sin(f.ang) }, true);
    }
    /** Une fois par frame : traînées, bille rendue au plongeur, événements de règles. */
    afterTick() {
        const d = this.table;
        for (const b of this.balls) {
            const tr = this.trails.get(b);
            if (tr) {
                tr.push({ x: b.position.x, y: b.position.y });
                if (tr.length > 14)
                    tr.shift();
            }
            const speed = Math.hypot(b.velocity.x, b.velocity.y);
            // Une bille retombée dans le couloir et immobile est rendue au plongeur.
            if (!this.readyBall && this.balls.length === 1 && b.position.x > d.launch.x - 16 && b.position.y > d.launch.y - 60 && speed < 1) {
                Matter.Body.setVelocity(b, { x: 0, y: 0 });
                this.readyBall = b;
                popText(this, TX + d.launch.x - 40, TY + d.launch.y - 80, "au plongeur", 20, PAL.panel2, { ms: 900, rise: 24 });
            }
        }
        for (const e of this.rules.flush())
            this.onRuleEvent(e);
        for (const [k, v] of [...this.hitFlash]) {
            if (v <= 1)
                this.hitFlash.delete(k);
            else
                this.hitFlash.set(k, v - 1);
        }
    }
    // ---------- collisions ----------
    onPair(a, b) {
        const ball = a.label === "ball" ? a : b.label === "ball" ? b : null;
        if (!ball)
            return;
        const other = ball === a ? b : a;
        const label = other.label;
        const d = this.table;
        if (label === "drain") {
            this.pending.push(() => this.drainBall(ball));
        }
        else if (label.startsWith("bumper:")) {
            const id = label.slice(7);
            const bumper = d.bumpers.find((x) => x.id === id);
            this.pending.push(() => {
                if (bumper)
                    this.kick(ball, bumper.x, bumper.y, 14);
                this.rules.bumper();
                this.hitFlash.set(id, 14);
                if (bumper)
                    this.fx.burst(bumper.x, bumper.y, { n: 10, color: [PAL.cream, PAL.orangeLight, PAL.berry], speed: 260, life: 420, size: 7, gravity: 300 });
                this.cameras.main.shake(70, 0.0016);
                tone(780 + Math.random() * 260, 0.07, { vol: 0.045, type: "square", freqEnd: 1100 });
                noise(0.05, { vol: 0.03, freq: 3000 });
            });
        }
        else if (label === "slingshot") {
            this.pending.push(() => {
                const cx = other.position.x;
                const cy = other.position.y;
                this.kick(ball, cx, cy, 15);
                this.rules.slingshot();
                this.hitFlash.set(`s${cx > d.width / 2 ? 1 : 0}`, 12);
                this.fx.burst(ball.position.x, ball.position.y, { n: 6, color: [PAL.leaf, PAL.cream], speed: 200, life: 320, size: 6, gravity: 300 });
                tone(300, 0.06, { vol: 0.04, type: "square", freqEnd: 520 });
            });
        }
        else if (label.startsWith("target:")) {
            const id = label.slice(7);
            this.pending.push(() => {
                const body = this.targetBodies.get(id);
                if (!body || !this.engine.world.bodies.includes(body))
                    return;
                Matter.Composite.remove(this.engine.world, body);
                const bank = this.rules.target(id);
                this.fx.burst(body.position.x, body.position.y, { n: 10, color: [PAL.leaf, PAL.cream], speed: 220, life: 420, size: 6 });
                tone(620, 0.07, { vol: 0.045, type: "square", freqEnd: 860 });
                if (bank) {
                    for (const [, tb] of this.targetBodies)
                        if (!this.engine.world.bodies.includes(tb))
                            Matter.Composite.add(this.engine.world, tb);
                    this.spawnExtraBall();
                }
            });
        }
        else if (label.startsWith("rollover:")) {
            const id = label.slice(9);
            this.pending.push(() => {
                if (this.rules.lit(id))
                    return;
                this.rules.rollover(id);
                this.hitFlash.set(`r:${id}`, 16);
                tone(990, 0.06, { vol: 0.04, type: "sine", freqEnd: 1320 });
            });
        }
        else if (label.startsWith("flipper:")) {
            const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
            if (speed > 6)
                this.pending.push(() => tone(210, 0.04, { vol: 0.03, type: "triangle" }));
        }
    }
    /** Coup actif d'un bumper ou d'une élingue : la bille repart à l'opposé du centre, jamais moins vite que `min`. */
    kick(ball, cx, cy, min) {
        const dx = ball.position.x - cx;
        const dy = ball.position.y - cy;
        const len = Math.hypot(dx, dy) || 1;
        const speed = Math.min(this.table.ball.maxSpeed, Math.max(Math.hypot(ball.velocity.x, ball.velocity.y) * 0.95, min));
        Matter.Body.setVelocity(ball, { x: (dx / len) * speed, y: (dy / len) * speed });
    }
    flushPending() {
        const work = this.pending;
        this.pending = [];
        for (const fn of work)
            fn();
    }
    drainBall(ball) {
        if (!this.balls.includes(ball))
            return;
        const d = this.table;
        this.removeBall(ball);
        if (this.balls.length > 0)
            return; // multibille : la bille restante continue
        if (this.time.now < this.saveUntil) {
            // Bille sauvée : elle revient au plongeur sans coûter de bille.
            this.spawnReady();
            popText(this, TX + d.width / 2, TY + d.height / 2, "BILLE SAUVÉE", 44, PAL.leaf, { ms: 1100 });
            arp([523, 659, 784], 0.07, { vol: 0.045 });
            return;
        }
        this.rules.drain();
        this.saveUntil = 0;
        if (!this.rules.over)
            this.spawnReady();
    }
    spawnExtraBall() {
        const ball = this.makeBall(210, 110);
        Matter.Body.setVelocity(ball, { x: (Math.random() - 0.5) * 8, y: 5 });
        popText(this, TX + 210, TY + 180, "MULTIBILLE !", 40, PAL.orangeLight, { ms: 1100 });
        arp([523, 659, 784, 1047], 0.06, { vol: 0.05 });
    }
    onRuleEvent(e) {
        const cx = TX + this.table.width / 2;
        switch (e.type) {
            case "score":
                break;
            case "bank":
                popText(this, cx, TY + 300, `BANQUE +${e.points}`, 40, PAL.leaf, { ms: 1100 });
                break;
            case "lightAll":
                popText(this, cx, TY + 120, `LETTRES +${e.points}`, 38, PAL.orangeLight, { ms: 1100 });
                arp([659, 784, 988, 1319], 0.06, { vol: 0.05 });
                break;
            case "ballLost":
                tone(180, 0.35, { vol: 0.05, type: "sawtooth", freqEnd: 60 });
                if (e.bonus > 0)
                    popText(this, cx, TY + 480, `BONUS BILLE +${e.bonus}`, 30, PAL.cream, { ms: 1300 });
                break;
            case "gameover":
                this.gameOver(e.score);
                break;
        }
    }
    // ---------- rendu ----------
    render(delta) {
        const d = this.table;
        const g = this.tg;
        g.clear();
        const fxg = this.fxg;
        fxg.clear();
        const ug = this.ug;
        ug.clear();
        // élingues
        d.slingshots.forEach((s, i) => {
            const flash = (this.hitFlash.get(`s${i}`) ?? 0) / 12;
            const p = s.points;
            g.fillStyle(PAL.ink0, 1);
            g.fillTriangle(p[0][0] - 3, p[0][1] - 5, p[1][0] + (i ? -6 : 6), p[1][1], p[2][0] - 3, p[2][1] + 5);
            g.fillStyle(mix(PAL.moss2, 0xffffff, flash * 0.7), 1);
            g.fillTriangle(p[0][0], p[0][1], p[1][0], p[1][1], p[2][0], p[2][1]);
        });
        // rollovers (lettres)
        for (const r of d.rollovers) {
            const lit = this.rules.lit(r.id);
            const flash = (this.hitFlash.get(`r:${r.id}`) ?? 0) / 16;
            g.fillStyle(PAL.ink0, 1);
            g.fillCircle(r.x, r.y, 13);
            g.fillStyle(lit ? PAL.orangeLight : 0x2d4f3a, 1);
            g.fillCircle(r.x, r.y, 9);
            if (lit || flash > 0) {
                g.fillStyle(0xffffff, 0.5 + flash * 0.4);
                g.fillCircle(r.x - 3, r.y - 3, 3);
            }
        }
        // cibles
        for (const t of d.targets) {
            const down = this.rules.targetDown(t.id);
            const h = down ? t.h * 0.22 : t.h;
            const y = t.y + t.h / 2 - h;
            g.fillStyle(PAL.ink0, 1);
            g.fillRect(t.x - t.w / 2 - 3, y - 3, t.w + 6, h + 6);
            g.fillStyle(down ? PAL.moss2 : PAL.leaf, 1);
            g.fillRect(t.x - t.w / 2, y, t.w, h);
        }
        // bumpers
        for (const b of d.bumpers) {
            const pulse = (this.hitFlash.get(b.id) ?? 0) / 14;
            const r = b.r + pulse * 6;
            g.fillStyle(PAL.ink0, 1);
            g.fillCircle(b.x, b.y + 4, r + 5);
            g.fillCircle(b.x, b.y, r + 5);
            g.fillStyle(mix(PAL.berry, PAL.cream, pulse * 0.6), 1);
            g.fillCircle(b.x, b.y, r);
            g.lineStyle(4, PAL.cream, 0.9);
            g.strokeCircle(b.x, b.y, r - 8);
            g.fillStyle(PAL.cream, 0.9);
            g.fillCircle(b.x - r * 0.3, b.y - r * 0.35, r * 0.16);
        }
        // plongeur : ressort et tête
        const l = d.launch;
        const headY = l.y + this.charge * l.pull + d.ball.radius + 3;
        g.fillStyle(PAL.ink0, 1);
        g.fillRect(l.x - 15, headY - 1, 30, 11);
        g.fillStyle(PAL.cream, 1);
        g.fillRect(l.x - 12, headY + 1, 24, 6);
        g.lineStyle(4, PAL.dim, 1);
        g.beginPath();
        g.moveTo(l.x, headY + 8);
        const bottom = d.height - 6;
        const coils = 6;
        for (let i = 1; i <= coils; i++)
            g.lineTo(l.x + (i % 2 ? 9 : -9), headY + 8 + ((bottom - headY - 8) * i) / coils);
        g.strokePath();
        // flippers
        for (const f of this.flips) {
            const pressed = f.side === "left" ? this.lastFlip.left : this.lastFlip.right;
            const verts = f.body.vertices.map((v) => new Phaser.Math.Vector2(v.x, v.y));
            g.fillStyle(PAL.ink0, 1);
            g.lineStyle(10, PAL.ink0, 1);
            g.strokePoints(verts, true);
            g.fillStyle(pressed ? PAL.orangeLight : PAL.orange, 1);
            g.fillPoints(verts, true);
            g.lineStyle(3, 0xffffff, 0.45);
            g.beginPath();
            g.moveTo(verts[0].x, verts[0].y);
            g.lineTo(verts[Math.floor(verts.length / 4)].x, verts[Math.floor(verts.length / 4)].y);
            g.strokePath();
            const [px, py] = d.flipper.pivots[f.side];
            g.fillStyle(PAL.ink0, 1);
            g.fillCircle(px, py, 8);
            g.fillStyle(PAL.cream, 1);
            g.fillCircle(px, py, 4);
        }
        // billes : traînée puis bille
        for (const b of this.balls) {
            const tr = this.trails.get(b) ?? [];
            tr.forEach((p, i) => {
                const k = i / Math.max(1, tr.length);
                g.fillStyle(PAL.orangeLight, 0.28 * k);
                g.fillCircle(p.x, p.y, d.ball.radius * (0.4 + 0.5 * k));
            });
            g.fillStyle(PAL.ink0, 1);
            g.fillCircle(b.position.x, b.position.y, d.ball.radius + 2);
            g.fillStyle(PAL.cream, 1);
            g.fillCircle(b.position.x, b.position.y, d.ball.radius);
            g.fillStyle(0xffffff, 0.9);
            g.fillCircle(b.position.x - 3, b.position.y - 3, 3);
        }
        this.fx.draw(fxg);
        // panneaux : billes restantes, missions
        const ballsLeft = this.rules.ballsLeft;
        for (let i = 0; i < BALLS_PER_GAME; i++) {
            const x = LX + 28 + i * 36;
            const y = TY + 152 + 74;
            const alive = i < ballsLeft;
            ug.fillStyle(PAL.ink0, 1);
            ug.fillCircle(x, y, 14);
            ug.fillStyle(alive ? PAL.cream : 0x2d4f3a, 1);
            ug.fillCircle(x, y, 11);
            if (alive) {
                ug.fillStyle(0xffffff, 0.9);
                ug.fillCircle(x - 3, y - 3, 3);
            }
        }
        d.targets.forEach((t, i) => {
            const x = RX + 24 + i * 40;
            const y = TY + 106;
            ug.fillStyle(PAL.ink0, 1);
            ug.fillRect(x - 13, y - 17, 26, 34);
            ug.fillStyle(this.rules.targetDown(t.id) ? PAL.leaf : 0x2d4f3a, 1);
            ug.fillRect(x - 10, y - 14, 20, 28);
        });
        d.rollovers.forEach((r, i) => {
            const x = RX + 24 + i * 40;
            const y = TY + 188;
            ug.fillStyle(PAL.ink0, 1);
            ug.fillCircle(x, y, 15);
            ug.fillStyle(this.rules.lit(r.id) ? PAL.orangeLight : 0x2d4f3a, 1);
            ug.fillCircle(x, y, 11);
        });
        this.pad?.draw(ug);
        // valeurs
        const shown = this.score.update(this.rules.score, delta);
        if (this.texts.score.text !== String(shown))
            this.texts.score.setText(String(shown));
        const best = String(Math.max(this.best, this.rules.score));
        if (this.texts.best.text !== best)
            this.texts.best.setText(best);
    }
}
