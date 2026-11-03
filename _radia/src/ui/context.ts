import type { Content } from "../content/types";
import type { Store } from "../store/save";
import type { AudioManager } from "../audio/audio";
import type { AugusteAI } from "../ai/auguste";

/** Accès aux fichiers personnels (déchiffrés à la volée en production). */
export interface Vault { url(path: string): Promise<string | null> }

export type ScreenId = "home" | "game" | "album" | "stats";

export interface Ctx {
  content: Content;
  store: Store;
  audio: AudioManager;
  ai: AugusteAI;
  vault: Vault;
  go(screen: ScreenId, opts?: { resume?: boolean; rematch?: boolean }): void;
  openSettings(inGame?: boolean): Promise<void>;
  openFinale(): Promise<void>;
  fullscreen: { supported: boolean; toggle(): void; active(): boolean };
  tap(): void;
}
