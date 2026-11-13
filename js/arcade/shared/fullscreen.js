export function bindFullscreen(stageId, onChange) {
    const stage = document.getElementById(stageId);
    const btn = document.querySelector("[data-game-fullscreen]");
    if (!stage || !btn)
        return;
    const gk = window.GameKit;
    const isFull = () => (gk?.fullscreen ? gk.fullscreen.is(stage) : document.fullscreenElement === stage);
    const sync = () => {
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
        if (isFull())
            void document.exitFullscreen?.();
        else
            void stage.requestFullscreen?.();
    });
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    window.addEventListener("resize", onChange);
}
