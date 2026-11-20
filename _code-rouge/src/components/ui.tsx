import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { audio, buzz } from "../services/audio";
import { formatPoints } from "../game";
import { Icon, type IconName } from "./Icons";

/* ---------- Bouton ---------- */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "amber" | "danger";
  icon?: IconName;
  iconRight?: IconName;
  block?: boolean;
  silent?: boolean;
}

export function Button({ variant = "primary", icon, iconRight, block, silent, className = "", children, onClick, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${block ? "btn--block" : ""} ${className}`}
      onClick={(e) => {
        audio.unlock();
        if (!silent) audio.tap();
        buzz(8);
        onClick?.(e);
      }}
      {...rest}
    >
      <span className="btn__shine" aria-hidden="true" />
      {icon && <Icon name={icon} size={20} />}
      <span className="btn__label">{children}</span>
      {iconRight && <Icon name={iconRight} size={20} />}
    </button>
  );
}

/* ---------- Feuille modale (bas d'écran) ---------- */
export function Sheet({ open, onClose, title, kicker, children }: { open: boolean; onClose: () => void; title: string; kicker?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet__scrim" aria-label="Fermer" onClick={onClose} />
      <div className="sheet__panel">
        <header className="sheet__head">
          <div>
            {kicker && <p className="kicker">{kicker}</p>}
            <h2 className="sheet__title">{title}</h2>
          </div>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Fermer">
            <Icon name="close" />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Compteur animé ---------- */
export function CountUp({ value, duration = 900, delay = 0, prefix = "", sound = false }: { value: number; duration?: number; delay?: number; prefix?: string; sound?: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    let lastTick = 0;
    const start = performance.now() + delay;
    const step = (t: number) => {
      const k = Math.min(1, Math.max(0, (t - start) / duration));
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(value * eased));
      if (sound && k > 0 && k < 1 && t - lastTick > 55) { lastTick = t; audio.count(); }
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, delay, sound]);
  return <>{prefix}{formatPoints(shown)}</>;
}

/* ---------- Cases de saisie ---------- */
export function Slots({ value, length, state = "idle", size = "md", onClick }: { value: string; length: number; state?: "idle" | "error" | "success"; size?: "md" | "lg"; onClick?: () => void }) {
  const cells = Array.from({ length }, (_, i) => value[i] ?? "");
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`slots slots--${size} slots--${state}`} {...(onClick ? { type: "button" as const, onClick, "aria-label": "Saisir la réponse" } : {})} data-testid="slots">
      {cells.map((c, i) => (
        <span key={i} className={`slots__cell ${c ? "is-filled" : ""} ${i === value.length ? "is-cursor" : ""}`} style={{ animationDelay: `${i * 70}ms` }}>
          {c}
        </span>
      ))}
    </Tag>
  );
}

/* ---------- Pavé numérique ---------- */
export function Keypad({ onDigit, onBack, onSubmit, canSubmit, disabled }: { onDigit: (d: string) => void; onBack: () => void; onSubmit: () => void; canSubmit: boolean; disabled?: boolean }) {
  const press = (fn: () => void, sound: "key" | "tap" = "key") => () => {
    audio.unlock();
    audio[sound]();
    buzz(6);
    fn();
  };
  return (
    <div className="keypad" aria-disabled={disabled}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button key={d} type="button" className="key" disabled={disabled} onClick={press(() => onDigit(d))}>{d}</button>
      ))}
      <button type="button" className="key key--aux" disabled={disabled} onClick={press(onBack, "tap")} aria-label="Effacer"><Icon name="back" /></button>
      <button type="button" className="key" disabled={disabled} onClick={press(() => onDigit("0"))}>0</button>
      <button type="button" className="key key--go" disabled={disabled || !canSubmit} onClick={press(onSubmit, "tap")} aria-label="Valider"><Icon name="check" /></button>
    </div>
  );
}

/* ---------- Clavier de lettres ---------- */
const ROWS = ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"];

export function LetterPad({ onLetter, onBack, onSubmit, canSubmit, disabled }: { onLetter: (l: string) => void; onBack: () => void; onSubmit: () => void; canSubmit: boolean; disabled?: boolean }) {
  const press = (fn: () => void) => () => {
    audio.unlock();
    audio.key();
    buzz(6);
    fn();
  };
  return (
    <div className="letterpad">
      {ROWS.map((row, r) => (
        <div key={row} className="letterpad__row">
          {r === 2 && <button type="button" className="key key--aux key--wide" disabled={disabled} onClick={press(onBack)} aria-label="Effacer"><Icon name="back" /></button>}
          {row.split("").map((l) => (
            <button key={l} type="button" className="key key--letter" disabled={disabled} onClick={press(() => onLetter(l))}>{l}</button>
          ))}
          {r === 2 && <button type="button" className="key key--go key--wide" disabled={disabled || !canSubmit} onClick={press(onSubmit)} aria-label="Valider"><Icon name="check" /></button>}
        </div>
      ))}
    </div>
  );
}

/* ---------- Bouton à maintenir ---------- */
export function HoldButton({ seconds, label, hint, onDone, testId }: { seconds: number; label: string; hint: string; onDone: () => void; testId?: string }) {
  const [progress, setProgress] = useState(0);
  const holding = useRef(false);
  const value = useRef(0);
  const done = useRef(false);
  const cb = useRef(onDone);
  cb.current = onDone;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      if (!done.current) {
        const before = value.current;
        value.current = Math.max(0, Math.min(1, before + (holding.current ? dt / seconds : -dt * 1.6)));
        if (value.current !== before) setProgress(value.current);
        audio.setCharge(holding.current ? value.current : null);
        if (value.current >= 1) {
          done.current = true;
          audio.setCharge(null);
          cb.current();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      audio.setCharge(null);
    };
  }, [seconds]);

  const set = (v: boolean) => () => {
    if (v) { audio.unlock(); buzz(10); }
    holding.current = v;
  };
  return (
    <button
      type="button"
      className={`hold ${progress > 0 ? "is-charging" : ""}`}
      style={{ ["--p" as string]: progress }}
      onPointerDown={set(true)}
      onPointerUp={set(false)}
      onPointerLeave={set(false)}
      onPointerCancel={set(false)}
      onContextMenu={(e) => e.preventDefault()}
      data-testid={testId}
    >
      <span className="hold__fill" aria-hidden="true" />
      <span className="hold__label">{label}</span>
      <span className="hold__hint">{hint}</span>
    </button>
  );
}

/* ---------- Mot-symbole / logo ---------- */
export function BrandMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) return <img className="brand__logo" src={logoUrl} alt={name} />;
  const [first, ...rest] = name.split(" ");
  return (
    <span className="brand">
      <span className="brand__mark">{first}</span>
      {rest.length > 0 && <span className="brand__rest">{rest.join(" ")}</span>}
    </span>
  );
}
