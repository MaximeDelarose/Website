/**
 * Mises à jour du jeu : quand une nouvelle version est publiée, les anciens fichiers (chargés à la demande) disparaissent du
 * serveur. Une session restée ouverte pouvait alors « planter » en silence au premier chargement tardif (ex. pendant une fusion).
 * Ici : (1) on détecte l'échec d'un chargement tardif et on propose de recharger ; (2) quand l'onglet redevient visible, on
 * vérifie discrètement si une nouvelle version existe ; (3) on garde les dernières erreurs (localStorage) pour le diagnostic.
 * La progression est sauvegardée à chaque action : recharger ne perd rien.
 */
const ERR_KEY = 'radia-errors';
let shown = false;

function remember(kind: string, msg: string, stack?: string): void {
  try {
    const raw = localStorage.getItem(ERR_KEY);
    const list: { t: number; k: string; m: string; s?: string }[] = raw ? JSON.parse(raw) : [];
    list.push({ t: Date.now(), k: kind, m: String(msg).slice(0, 300), s: stack ? String(stack).slice(0, 600) : undefined });
    localStorage.setItem(ERR_KEY, JSON.stringify(list.slice(-8)));
  } catch { /* stockage indisponible : on ignore */ }
}

export function showUpdateBar(text = 'Le jeu a été mis à jour ♡'): void {
  if (shown || typeof document === 'undefined') return;
  shown = true;
  const bar = document.createElement('div');
  bar.setAttribute('role', 'alert');
  bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:2000;display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:18px;background:#fff7fb;color:#3b3152;box-shadow:0 0 0 2px #f5a0bb,0 10px 28px rgba(59,49,82,.35);font:600 15px/1.25 Fredoka,system-ui,sans-serif';
  const label = document.createElement('span');
  label.style.flex = '1';
  label.textContent = `${text} Recharge pour continuer.`;
  const btn = document.createElement('button');
  btn.textContent = 'Recharger';
  btn.style.cssText = 'min-height:44px;padding:0 16px;border:0;border-radius:14px;background:linear-gradient(180deg,#ff8fb8,#e8558f);color:#fff;font:700 15px Fredoka,system-ui,sans-serif';
  btn.addEventListener('click', () => location.reload());
  bar.append(label, btn);
  document.body.append(bar);
}

const STALE = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically|Unable to preload CSS/i;

async function currentEntry(): Promise<string | null> {
  const s = document.querySelector('script[type="module"][src]') as HTMLScriptElement | null;
  return s ? new URL(s.src, location.href).pathname : null;
}

async function checkNewVersion(): Promise<void> {
  try {
    const mine = await currentEntry();
    if (!mine) return;
    const res = await fetch(`${location.pathname}?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    const m = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/);
    if (m && new URL(m[1], location.href).pathname !== mine) showUpdateBar();
  } catch { /* hors ligne : rien */ }
}

export function startUpdateWatch(): void {
  window.addEventListener('vite:preloadError', (e) => { remember('preload', String((e as { payload?: unknown }).payload ?? 'preloadError')); showUpdateBar(); });
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String((e.reason && (e.reason.message ?? e.reason)) ?? '');
    remember('rejection', msg, e.reason?.stack);
    if (STALE.test(msg)) showUpdateBar();
  });
  window.addEventListener('error', (e) => {
    remember('error', e.message, e.error?.stack);
    if (STALE.test(e.message ?? '')) showUpdateBar();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void checkNewVersion(); });
  window.setTimeout(() => void checkNewVersion(), 20_000);
}
