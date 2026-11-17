// « Nuages » : le petit jeu du téléphone. Une boule avance toute seule ; on saute par-dessus les pensées sombres.
// Chaque nuage touché l'alourdit, en éviter plusieurs d'affilée l'allège. Pas de score : juste lâcher prise.

interface Cloud { x: number; y: number; w: number; h: number; hit: boolean; passed: boolean; fade: number }
interface Spark { x: number; y: number; t: number }
export interface RunnerSounds { jump: () => void; hit: () => void; light: () => void; done: () => void }

/** Lance une partie et renvoie le nombre de nuages touchés. */
export function playRunner(cv: HTMLCanvasElement, seconds: number, snd: RunnerSounds): Promise<number> {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = cv.clientWidth || 270, H = cv.clientHeight || 300;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d")!;
  g.scale(dpr, dpr);

  const ground = H - 48, bx = Math.min(70, W * 0.24);
  let r = 13, y = 0, vy = 0, held = false, holdT = 0, onGround = true, squash = 0;
  let t = 0, dist = 0, hits = 0, streak = 0, nextAt = 260, last = 0, over = false;
  const clouds: Cloud[] = [], sparks: Spark[] = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const press = (e: Event) => {
    e.preventDefault(); e.stopPropagation();
    held = true;
    if (onGround && !over) { vy = 370 * Math.pow(13 / r, 0.4); onGround = false; holdT = 0; snd.jump(); }
  };
  const release = () => { held = false; };
  const key = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "ArrowUp") { if (e.type === "keydown") { if (!e.repeat) press(e); } else release(); } };
  cv.addEventListener("pointerdown", press);
  window.addEventListener("pointerup", release);
  window.addEventListener("keydown", key);
  window.addEventListener("keyup", key);

  const blob = (x: number, yy: number, w: number, h: number) => {
    g.beginPath();
    g.ellipse(x - w * 0.24, yy + h * 0.1, w * 0.3, h * 0.4, 0, 0, 7);
    g.ellipse(x + w * 0.22, yy + h * 0.12, w * 0.3, h * 0.38, 0, 0, 7);
    g.ellipse(x, yy - h * 0.12, w * 0.32, h * 0.46, 0, 0, 7);
    g.fill();
  };

  return new Promise((done) => {
    const frame = (ms: number) => {
      const dt = Math.min(0.033, (ms - last) / 1000 || 0.016);
      last = ms;
      t += dt;
      const speed = 168 - (r - 13) * 2.2; // alourdie, elle avance moins vite
      dist += speed * dt;

      // Saut : court si on tape, long si on reste appuyé.
      if (!onGround) {
        holdT += dt;
        const floaty = held && vy > 0 && holdT < 0.3;
        vy -= (floaty ? 430 : 1500) * dt;
        y += vy * dt;
        if (y <= 0) { y = 0; vy = 0; onGround = true; squash = 1; }
      }
      squash = Math.max(0, squash - dt * 5);

      // Les nuages arrivent, à hauteur de sol (sauter) ou plus haut (ne pas sauter trop fort).
      if (t < seconds && dist > nextAt) {
        const high = rnd() < 0.3, wide = rnd() < 0.35;
        clouds.push({ x: W + 50, y: high ? ground - 122 : ground - 13, w: high ? 62 : wide ? 76 : 46, h: high ? 34 : 26, hit: false, passed: false, fade: 1 });
        nextAt = dist + 215 + rnd() * 130;
      }
      const by = ground - r - y;
      for (const c of clouds) {
        c.x -= speed * dt;
        if (c.hit) c.fade = Math.max(0, c.fade - dt * 2.2);
        const dx = Math.max(Math.abs(bx - c.x) - c.w * 0.42, 0), dy = Math.max(Math.abs(by - c.y) - c.h * 0.36, 0);
        if (!c.hit && !c.passed && dx * dx + dy * dy < r * r * 0.8) {
          c.hit = true; hits++; streak = 0; r = Math.min(34, r + 3.5); squash = 1; snd.hit();
        } else if (!c.hit && !c.passed && c.x + c.w / 2 < bx - r) {
          c.passed = true;
          if (++streak % 3 === 0 && r > 11) { r = Math.max(11, r - 2.5); snd.light(); for (let i = 0; i < 5; i++) sparks.push({ x: bx + (rnd() - 0.5) * 30, y: by + (rnd() - 0.5) * 30, t: -i * 0.05 }); }
        }
      }
      while (clouds.length && clouds[0].x < -80) clouds.shift();

      // ── dessin ──
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#fde9d6"); sky.addColorStop(1, "#f6d3c8");
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      const end = Math.max(0, Math.min(1, (t - seconds + 1.2) / 2.2)); // l'arrivée : le soleil se lève
      g.fillStyle = "#f1c76d"; g.globalAlpha = 0.35 + end * 0.65;
      g.beginPath(); g.arc(W - 46 - end * (W * 0.3), 62 - end * 8, 20 + end * 16, 0, 7); g.fill();
      g.globalAlpha = 1;
      for (const [amp, sp, col, base] of [[16, 0.25, "#d9c9b4", ground - 30], [11, 0.5, "#b9c7ab", ground - 12]] as const) {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) g.lineTo(x, base - Math.sin((x + dist * sp) * 0.018) * amp - Math.sin((x + dist * sp) * 0.007) * amp);
        g.lineTo(W, H); g.fill();
      }
      g.fillStyle = "#a8b89a"; g.fillRect(0, ground, W, H - ground);
      g.fillStyle = "rgba(255,255,255,0.25)";
      for (let x = -((dist * 1) % 46); x < W; x += 46) g.fillRect(x, ground + 14, 18, 3);

      for (const c of clouds) {
        g.globalAlpha = c.hit ? c.fade * 0.6 : 0.92;
        g.fillStyle = c.hit ? "#c9c5dc" : "#6e6a9e";
        blob(c.x, c.y + Math.sin(t * 2 + c.x * 0.02) * 2, c.w, c.h);
      }
      g.globalAlpha = 1;

      // La boule : plus elle est lourde, plus sa couleur se ternit.
      const heavy = Math.min(1, (r - 11) / 23);
      g.fillStyle = "rgba(90,74,68,0.14)";
      g.beginPath(); g.ellipse(bx, ground + 3, r * (1 - Math.min(0.5, y / 200)), 4, 0, 0, 7); g.fill();
      const sx = 1 + squash * 0.18, sy = 1 - squash * 0.16;
      g.save(); g.translate(bx, ground - y - r * sy); g.scale(sx, sy);
      g.fillStyle = `rgb(${241 - heavy * 100},${199 - heavy * 70},${109 + heavy * 50})`;
      g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
      g.fillStyle = "#4a3f3a";
      const ey = -r * 0.1 + (onGround ? 0 : -vy * 0.004);
      g.beginPath(); g.arc(r * 0.18, ey, Math.max(1.6, r * 0.11), 0, 7); g.arc(r * 0.58, ey, Math.max(1.6, r * 0.11), 0, 7); g.fill();
      g.restore();

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]; s.t += dt;
        if (s.t > 0.8) { sparks.splice(i, 1); continue; }
        if (s.t < 0) continue;
        g.globalAlpha = 1 - s.t / 0.8; g.fillStyle = "#fff8e0";
        g.beginPath(); g.arc(s.x, s.y - s.t * 40, 2.5, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      // Avancée : un simple trait, pas de chiffres.
      g.fillStyle = "rgba(90,74,68,0.15)"; g.fillRect(16, 12, W - 32, 3);
      g.fillStyle = "#f1c76d"; g.beginPath(); g.arc(16 + (W - 32) * Math.min(1, t / seconds), 13.5, 5, 0, 7); g.fill();

      if (t >= seconds && !over) { over = true; snd.done(); }
      if (t >= seconds + 2.2) {
        cv.removeEventListener("pointerdown", press);
        window.removeEventListener("pointerup", release);
        window.removeEventListener("keydown", key);
        window.removeEventListener("keyup", key);
        return done(hits);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
