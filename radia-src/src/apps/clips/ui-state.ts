/** Drapeau « Clips ouvert » sans importer l'interface (garde le code de l'interface chargé à la demande). */
export const flags = { open: false };
export const clipsOpen = (): boolean => flags.open;
