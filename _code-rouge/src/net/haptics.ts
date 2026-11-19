/**
 * Retour haptique « au mieux ». Android/Chrome : API Vibration. iPhone : Safari ne l'offre pas ; une astuce connue
 * (case à cocher de type « switch », iOS 17.4+) déclenche un léger tic, mais seulement pendant un geste de l'utilisateur.
 * Ce module sert surtout au test de liaison : on mesure ce qui marche VRAIMENT sur les téléphones de l'équipe.
 */
export type HapticKind = "tick" | "success" | "error" | "heavy";

const PATTERNS: Record<HapticKind, number[]> = { tick: [8], success: [14, 40, 22], error: [30, 50, 30], heavy: [60] };

let sw: HTMLLabelElement | null = null;

function iosTick(): boolean {
  try {
    if (!sw) {
      sw = document.createElement("label");
      sw.setAttribute("aria-hidden", "true");
      sw.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.setAttribute("switch", "");
      sw.appendChild(input);
      document.body.appendChild(sw);
    }
    sw.click();
    return true;
  } catch {
    return false;
  }
}

export function hapticCapabilities(): { vibrate: boolean; ios: boolean } {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return { vibrate: typeof navigator.vibrate === "function", ios };
}

export function haptic(kind: HapticKind = "tick"): void {
  const caps = hapticCapabilities();
  if (caps.vibrate) { try { navigator.vibrate(PATTERNS[kind]); } catch { /* rien */ } return; }
  if (caps.ios) PATTERNS[kind].forEach((_, i) => { if (i % 2 === 0) setTimeout(iosTick, i * 45); });
}
