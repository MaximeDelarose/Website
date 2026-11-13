/** Version de la page (?v=… de l'URL du bundle) : ajoutée aux données pour contourner le cache du navigateur. */
export const VERSION_QUERY: string = (() => {
  try {
    return new URL(import.meta.url).search;
  } catch {
    return "";
  }
})();
