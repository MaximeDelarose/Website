import { useEffect, useRef } from "react";

interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string }

/** Gerbe d'étincelles locale (au-dessus des écrans plein cadre, là où le fond animé est masqué). */
export function Sparks({ color, count = 60, power = 1, origin = [0.5, 0.45], delay = 0 }: { color: string; count?: number; power?: number; origin?: [number, number]; delay?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [originX, originY] = origin;
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = (canvas.width = Math.floor(canvas.clientWidth * dpr));
    const h = (canvas.height = Math.floor(canvas.clientHeight * dpr));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sparks: Spark[] = [];
    let raf = 0;
    let last = performance.now();
    const [ox, oy] = [originX, originY];
    const t0 = window.setTimeout(() => {
      const n = reduced ? Math.ceil(count / 4) : count;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (120 + Math.random() * 340) * power * dpr;
        const max = 0.6 + Math.random() * 0.9;
        sparks.push({ x: w * ox, y: h * oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80 * dpr, life: max, max, size: (1.2 + Math.random() * 2.6) * dpr, color: Math.random() < 0.3 ? "#ffffff" : color });
      }
    }, delay);
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.vx *= 0.95; s.vy = s.vy * 0.95 + 540 * dpr * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        const k = s.life / s.max;
        ctx.globalAlpha = k;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size * k + 0.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03);
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { clearTimeout(t0); cancelAnimationFrame(raf); };
  }, [color, count, power, originX, originY, delay]);
  return <canvas ref={ref} className="sparks" aria-hidden="true" />;
}
