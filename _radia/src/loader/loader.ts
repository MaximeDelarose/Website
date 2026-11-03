/* Chargeur PUBLIC de RADIA ♛ : il ne contient rien de personnel.
   Il demande le mot de passe, déchiffre l'application et les fichiers privés
   (photos, musique) directement dans le navigateur. Sans le mot de passe, le
   serveur ne sert que des fichiers chiffrés illisibles. */
import { deriveKeys, open, unb64, type Keys, type VaultIndex, type VaultMeta } from "./crypto";

const KEY_STORE = "radia-cle";
const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;

function store(): Storage | null { try { return localStorage; } catch { return null; } }

async function fetchBin(name: string): Promise<ArrayBuffer> {
  const r = await fetch("vault/" + name);
  if (!r.ok) throw new Error("fichier manquant : " + name);
  return r.arrayBuffer();
}

async function unlock(password: string): Promise<{ keys: Keys; index: VaultIndex; meta: VaultMeta }> {
  const meta = (await (await fetch("vault/meta.json", { cache: "no-cache" })).json()) as VaultMeta;
  const keys = await deriveKeys(password, unb64(meta.salt), meta.iter);
  const raw = await open(keys, await fetchBin(meta.index)); // échoue si mauvais mot de passe
  const index = JSON.parse(new TextDecoder().decode(raw)) as VaultIndex;
  return { keys, index, meta };
}

async function launch(keys: Keys, index: VaultIndex): Promise<void> {
  const code = await open(keys, await fetchBin(index.app));
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  const mod = (await import(/* @vite-ignore */ url)) as { start: Function };
  const cache = new Map<string, Promise<string | null>>();
  const vault = {
    url(path: string): Promise<string | null> {
      let p = cache.get(path);
      if (!p) {
        const e = index.files[path];
        p = !e ? Promise.resolve(null) : fetchBin(e.f).then((b) => open(keys, b))
          .then((plain) => URL.createObjectURL(new Blob([plain], { type: e.t })))
          .catch((err) => { console.warn("Déchiffrement impossible :", path, err); return null; });
        cache.set(path, p);
      }
      return p;
    },
  };
  const root = $("#root");
  $("#lock").remove();
  const base = new URL("engine/", location.href).href;
  mod.start(root, vault, {
    version: index.version,
    engines: { stockfish: base + "stockfish-18-lite-single.js", fallback: base + "chess-core.js" },
  });
}

function setBusy(on: boolean, msg = ""): void {
  $("#lock").classList.toggle("busy", on);
  $<HTMLButtonElement>("#go").disabled = on;
  $("#msg").textContent = msg;
}

async function attempt(password: string, remember: boolean, silent: boolean): Promise<boolean> {
  setBusy(true, "Ouverture du cadeau… ♡");
  try {
    const { keys, index } = await unlock(password);
    const st = store();
    if (remember) st?.setItem(KEY_STORE, password); else st?.removeItem(KEY_STORE);
    await launch(keys, index);
    return true;
  } catch (e) {
    console.warn(e);
    const offline = e instanceof TypeError;
    setBusy(false, silent ? "" : offline ? "Connexion impossible, réessaie dans un instant." : "Ce n'est pas le bon mot de passe ♡");
    if (!silent) $("#lock .card").animate([{ transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "none" }], { duration: 300 });
    return false;
  }
}

async function main(): Promise<void> {
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => undefined);
  }
  // lien de partage : …/radia/#cle=MOTDEPASSE (le fragment n'est jamais envoyé au serveur)
  const m = /[#&](?:cle|k)=([^&]+)/.exec(location.hash);
  let pw: string | null = m ? decodeURIComponent(m[1]) : null;
  if (m) history.replaceState(null, "", location.pathname + location.search);
  if (!pw) pw = store()?.getItem(KEY_STORE) ?? null;
  const form = $<HTMLFormElement>("#form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $<HTMLInputElement>("#pw").value.trim();
    if (v) void attempt(v, $<HTMLInputElement>("#remember").checked, false);
  });
  if (pw && (await attempt(pw, true, !m))) return;
  $("#lock").classList.add("ask");
  setTimeout(() => $<HTMLInputElement>("#pw").focus(), 300);
}

void main();
