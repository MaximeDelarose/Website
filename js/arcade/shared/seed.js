/** Graine : ?seed=N dans l'URL (replay, graine du jour), sinon aléatoire. */
export function readSeed() {
    try {
        const raw = new URLSearchParams(location.search).get("seed");
        if (raw !== null && /^\d+$/.test(raw))
            return Number(raw) >>> 0;
    }
    catch {
        /* pas de location : graine aléatoire */
    }
    return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
/** Graine du jour, identique pour tout le monde (base du mode « graine du jour »). */
export function dailySeed(date = new Date()) {
    const key = date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
    return key >>> 0;
}
