/**
 * Configuration ACTIVE du cadeau. Le fichier JSON est choisi À LA BUILD (variable GIFT, voir vite.config.ts : alias « @gift-config ») :
 * un cadeau ne contient donc jamais les données d'un autre. Le moteur ne connaît aucun prénom : il lit ici.
 */
import raw from '@gift-config';
import { resolveGift, partnerNames } from './resolve';

const resolved = resolveGift(raw);
if (resolved.problems.length && typeof console !== 'undefined') console.warn('[gift]', resolved.problems.join(' · '));

export const GIFT = resolved.config;
const names = partnerNames(GIFT.partner);

/** Prénom du compagnon (ou « Ta moitié »). À utiliser dans TOUS les textes : jamais de prénom écrit en dur. */
export const PARTNER: string = names.name;
/** « d'Auguste » / « de Thomas » (élision gérée). */
export const PARTNER_DE: string = names.de;
/** Même chose avec l'apostrophe typographique (textes qui l'utilisaient déjà : « d’Auguste »). */
export const PARTNER_DE_TYPO: string = names.de.replace("'", '\u2019');

/**
 * Nom d'une clé de stockage local PROPRE À CE CADEAU. Pour « radia » rien ne change (les sauvegardes existantes sont conservées) ;
 * un autre cadeau installé sur la même origine utilise son propre préfixe (« demo-save-v1 »…) et ne lit ni n'écrase la progression d'un autre.
 */
export const lsKey = (legacyName: string): string => legacyName.replace(/^radia-/, `${GIFT.pwa.cachePrefix}-`);
