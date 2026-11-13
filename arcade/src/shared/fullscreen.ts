/**
 * Plein écran : même mécanisme que les autres jeux du site (GameKit.fullscreen, repli CSS « is-max »
 * pour iPhone). Le bouton [data-game-fullscreen] est lié ici, puis Phaser est recalculé à chaque changement.
 */
interface GameKitFs {
  toggle(el: Element): void;
  is(el: Element): boolean;
}
interface GameKitGlobal {
  fullscreen?: GameKitFs;
}

export function bindFullscreen(stageId: string, onChange: () => void): void {
  const stage = document.getElementById(stageId);
  const btn = document.querySelector<HTMLElement>("[data-game-fullscreen]");
  if (!stage || !btn) return;
  const gk = (window as unknown as { GameKit?: GameKitGlobal }).GameKit;

  const isFull = (): boolean => (gk?.fullscreen ? gk.fullscreen.is(stage) : document.fullscreenElement === stage);
  const sync = (): void => {
    btn.textContent = isFull() ? "✕ Quitter le plein écran" : "⛶ Plein écran";
    onChange();
    // Certains navigateurs n'envoient le redimensionnement qu'après l'animation
    setTimeout(onChange, 120);
    setTimeout(onChange, 400);
  };

  btn.addEventListener("click", () => {
    if (gk?.fullscreen) {
      gk.fullscreen.toggle(stage);
      return;
    }
    if (isFull()) void document.exitFullscreen?.();
    else void stage.requestFullscreen?.();
  });
  document.addEventListener("fullscreenchange", sync);
  document.addEventListener("webkitfullscreenchange", sync);
  window.addEventListener("resize", onChange);
}
