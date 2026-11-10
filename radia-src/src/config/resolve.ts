/**
 * Lecture tolérante d'une configuration de cadeau (src/config/gifts/<id>.json).
 * Fonction PURE (aucun accès au navigateur ni au disque) : utilisée par l'application, par la build (vite.config.ts) et par les tests.
 *  - `resolveGift(raw)` ne lève jamais d'exception : un champ manquant ou invalide prend une valeur par défaut cohérente ;
 *  - `problems` liste ce qui a été corrigé (la build échoue si la configuration est inutilisable, voir `giftErrors`).
 */

export interface GiftConfig {
  id: string;
  partner: {
    /** Prénom saisi par l'acheteur (vide = formulation neutre). */
    name: string;
    /** Libellé du champ dans le questionnaire / l'outil de préparation (jamais affiché dans le jeu). */
    fieldLabel: string;
    /** Formulation utilisée si aucun prénom n'est renseigné. */
    fallbackName: string;
  };
  app: { title: string; shortName: string; subtitle: string; description: string; lang: string; themeColor: string; backgroundColor: string };
  pwa: { id: string; cachePrefix: string; display: 'standalone' | 'fullscreen' | 'minimal-ui'; orientation: 'portrait' | 'any' };
}

export interface ResolvedGift { config: GiftConfig; problems: string[] }

export const PARTNER_FIELD_LABELS = ['Prénom de votre homme', 'Prénom de votre partenaire', 'Prénom de votre femme'] as const;

const DEFAULTS: GiftConfig = {
  id: 'gift',
  partner: { name: '', fieldLabel: 'Prénom de votre partenaire', fallbackName: 'Ta moitié' },
  app: { title: 'Mon petit monde ♡', shortName: 'Petit monde', subtitle: 'Un petit monde rien que pour toi.', description: 'Un petit monde rien que pour toi.', lang: 'fr', themeColor: '#51446D', backgroundColor: '#F5B5C8' },
  pwa: { id: 'gift-app', cachePrefix: 'gift', display: 'standalone', orientation: 'portrait' },
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,40}$/;

/** Prénom : espaces normalisés, longueur raisonnable, pas de balisage. */
export function cleanName(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[<>`$\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}

export function resolveGift(raw: unknown): ResolvedGift {
  const problems: string[] = [];
  const src = isObj(raw) ? raw : (problems.push('configuration absente ou illisible : valeurs par défaut'), {});
  const str = (o: unknown, k: string, def: string, label: string, max = 120): string => {
    const v = isObj(o) ? o[k] : undefined;
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, max);
    if (v !== undefined) problems.push(`${label} invalide : valeur par défaut`);
    return def;
  };
  const slug = (o: unknown, k: string, def: string, label: string): string => {
    const v = isObj(o) ? o[k] : undefined;
    if (typeof v === 'string' && SLUG.test(v)) return v;
    problems.push(`${label} absent ou invalide (minuscules, chiffres et tirets) : « ${def} »`);
    return def;
  };
  const color = (o: unknown, k: string, def: string, label: string): string => {
    const v = isObj(o) ? o[k] : undefined;
    if (typeof v === 'string' && HEX.test(v)) return v;
    if (v !== undefined) problems.push(`${label} doit être au format #RRGGBB : valeur par défaut`);
    return def;
  };
  const partner = src.partner, app = src.app, pwa = src.pwa;
  const rawName = isObj(partner) ? partner.name : undefined;
  const name = cleanName(rawName);
  if (rawName !== undefined && typeof rawName !== 'string') problems.push('partner.name doit être du texte');
  const display = isObj(pwa) && (pwa.display === 'fullscreen' || pwa.display === 'minimal-ui') ? pwa.display : 'standalone';
  const orientation = isObj(pwa) && pwa.orientation === 'any' ? 'any' : 'portrait';
  const id = slug(src, 'id', DEFAULTS.id, 'id');
  const config: GiftConfig = {
    id,
    partner: {
      name,
      fieldLabel: str(partner, 'fieldLabel', DEFAULTS.partner.fieldLabel, 'partner.fieldLabel', 60),
      fallbackName: cleanName(isObj(partner) ? partner.fallbackName : undefined) || DEFAULTS.partner.fallbackName,
    },
    app: {
      title: str(app, 'title', DEFAULTS.app.title, 'app.title', 60),
      shortName: str(app, 'shortName', DEFAULTS.app.shortName, 'app.shortName', 14),
      subtitle: str(app, 'subtitle', DEFAULTS.app.subtitle, 'app.subtitle', 120),
      description: str(app, 'description', DEFAULTS.app.description, 'app.description', 200),
      lang: str(app, 'lang', DEFAULTS.app.lang, 'app.lang', 8),
      themeColor: color(app, 'themeColor', DEFAULTS.app.themeColor, 'app.themeColor'),
      backgroundColor: color(app, 'backgroundColor', DEFAULTS.app.backgroundColor, 'app.backgroundColor'),
    },
    pwa: { id: slug(pwa, 'id', `${id}-app`, 'pwa.id'), cachePrefix: slug(pwa, 'cachePrefix', id, 'pwa.cachePrefix'), display, orientation },
  };
  return { config, problems };
}

/** Problèmes BLOQUANTS pour une livraison (la build s'arrête) : un cadeau doit avoir un identifiant et un préfixe de cache propres. */
export function giftErrors(raw: unknown): string[] {
  const e: string[] = [];
  if (!isObj(raw)) return ['la configuration doit être un objet JSON'];
  if (typeof raw.id !== 'string' || !SLUG.test(raw.id)) e.push('« id » obligatoire (minuscules, chiffres, tirets)');
  const pwa = raw.pwa;
  if (!isObj(pwa) || typeof pwa.cachePrefix !== 'string' || !SLUG.test(pwa.cachePrefix)) e.push('« pwa.cachePrefix » obligatoire : il sépare le cache de ce cadeau de celui des autres');
  if (!isObj(pwa) || typeof pwa.id !== 'string' || !SLUG.test(pwa.id)) e.push('« pwa.id » obligatoire : identifiant unique de l\'application installée');
  return e;
}

// ------------------------------------------------------------------ formulations du prénom
const VOWEL = /^[aeiouyàâäéèêëîïôöùûüœæh]/i;

export interface PartnerNames {
  /** Prénom (ou formulation neutre) : « Auguste » / « Ta moitié ». */
  name: string;
  /** Complément du nom avec élision : « d'Auguste », « de Thomas », « de ta moitié ». */
  de: string;
  /** Vrai si aucun prénom n'a été renseigné. */
  generic: boolean;
}

export function partnerNames(p: GiftConfig['partner']): PartnerNames {
  if (!p.name) {
    const n = p.fallbackName;
    return { name: n, de: `de ${n.charAt(0).toLowerCase()}${n.slice(1)}`, generic: true };
  }
  return { name: p.name, de: VOWEL.test(p.name) ? `d'${p.name}` : `de ${p.name}`, generic: false };
}
