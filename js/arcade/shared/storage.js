/** Meilleur score local. localStorage peut être absent ou bloqué (navigation privée) : on ne plante jamais. */
export function loadBest(key) {
    try {
        const value = Number(localStorage.getItem(key));
        return Number.isFinite(value) ? value : 0;
    }
    catch {
        return 0;
    }
}
export function saveBest(key, value) {
    try {
        localStorage.setItem(key, String(value));
    }
    catch {
        /* stockage indisponible : le score reste affiché pour la session */
    }
}
