import { useEffect, useRef } from "react";
import { burstBus, shakeBus } from "../services/fx";

interface Dot { x: number; y: number; r: number; vy: number; vx: number; a: number; tw: number }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }

/** Fond vivant : poussière lumineuse qui dérive + étincelles déclenchées par les réussites. */
export function Backdrop({ mood }: { mood: "alert" | "focus" | "stable" | "coop" }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0, last = performance.now();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const dots: Dot[] = [];
    const sparks: Spark[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const count = reduced ? 16 : Math.min(70, Math.floor((w * h) / 9000));
    for (let i = 0; i < count; i++) {
      dots.push({ x: Math.random() * w, y: Math.random() * h, r: 0.6 + Math.random() * 1.6, vy: -(4 + Math.random() * 14), vx: (Math.random() - 0.5) * 6, a: 0.15 + Math.random() * 0.5, tw: Math.random() * 6.28 });
    }

    const offBurst = burstBus.on(({ x, y, color, count: n = 26, power = 1 }) => {
      const css = getComputedStyle(document.documentElement);
      const main = color ?? css.getPropertyValue("--cyan").trim();
      const total = reduced ? Math.ceil(n / 3) : n;
      for (let i = 0; i < total; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (90 + Math.random() * 260) * power;
        const max = 0.5 + Math.random() * 0.6;
        sparks.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60, life: max, max, color: Math.random() < 0.25 ? "#ffffff" : main, size: 1.2 + Math.random() * 2.4 });
      }
    });

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      const dotColor = getComputedStyle(canvas).color;
      ctx.fillStyle = dotColor;
      for (const d of dots) {
        d.y += d.vy * dt;
        d.x += d.vx * dt;
        d.tw += dt * 1.4;
        if (d.y < -4) { d.y = h + 4; d.x = Math.random() * w; }
        ctx.globalAlpha = d.a * (0.55 + 0.45 * Math.sin(d.tw));
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.vx *= 0.94; s.vy = s.vy * 0.94 + 520 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const k = s.life / s.max;
        ctx.globalAlpha = k;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size * k + 0.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 0.035, s.y - s.vy * 0.035);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      offBurst();
    };
  }, []);

  // Secousse d'écran (erreurs, surcharge).
  useEffect(() => shakeBus.on((kind) => {
    const root = document.getElementById("app-shell");
    if (!root) return;
    const cls = kind === "hard" ? "shake-hard" : "shake-soft";
    root.classList.remove("shake-hard", "shake-soft");
    void root.offsetWidth;
    root.classList.add(cls);
  }), []);

  return (
    <div className={`backdrop backdrop--${mood}`} aria-hidden="true">
      <div className="backdrop__glow" />
      <div className="backdrop__grid" />
      <canvas ref={ref} className="backdrop__canvas" />
      <div className="backdrop__vignette" />
    </div>
  );
}
