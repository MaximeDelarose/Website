import type { StageId } from "../config/types";
import type { ScoreBreakdown } from "../engine/scoring";

/**
 * Point d'extension pour le futur MODE ÉVÉNEMENT (code de session, plusieurs équipes,
 * classement partagé via un backend).
 *
 * Le jeu ne parle qu'à cette interface. Aujourd'hui, `localGateway` ne fait rien : chaque
 * équipe joue seule sur son appareil et aucun classement n'est simulé. Demain, il suffira
 * de fournir une implémentation réseau (WebSocket, Supabase, Cloudflare Durable Objects…)
 * dans `createGateway`, sans toucher aux écrans ni au moteur de jeu.
 */
export interface SessionEvent {
  teamName: string;
  seed: number;
  at: number;
}

export interface StageCompletedEvent extends SessionEvent {
  stage: StageId;
  result: ScoreBreakdown;
  totalScore: number;
}

export interface GameFinishedEvent extends SessionEvent {
  outcome: "success" | "timeout";
  totalScore: number;
  elapsedMs: number;
}

export interface LeaderboardEntry {
  teamName: string;
  score: number;
  stagesDone: number;
  finished: boolean;
}

export interface SessionGateway {
  /** Vrai quand un classement partagé existe réellement. */
  readonly shared: boolean;
  gameStarted(event: SessionEvent): void;
  stageCompleted(event: StageCompletedEvent): void;
  gameFinished(event: GameFinishedEvent): void;
  /** S'abonne au classement ; renvoie la fonction de désabonnement. */
  subscribeLeaderboard(listener: (entries: LeaderboardEntry[]) => void): () => void;
}

export const localGateway: SessionGateway = {
  shared: false,
  gameStarted() {},
  stageCompleted() {},
  gameFinished() {},
  subscribeLeaderboard() {
    return () => {};
  },
};

/** Lira plus tard un code de session (ex. ?session=ABCD) pour renvoyer une passerelle réseau. */
export function createGateway(): SessionGateway {
  return localGateway;
}
