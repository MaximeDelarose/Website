import { createStore, del, get, set } from 'idb-keyval'

/** Base IndexedDB dédiée : l'origine est partagée avec le reste du site, on n'utilise jamais la base par défaut. */
export const adeuxStore = createStore('adeux-db', 'kv')

const KEY = 'adeux:my-photo'
/** Redimensionne et ré-encode la photo (supprime au passage les métadonnées EXIF/GPS). */
export async function processPhoto(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const max = 900, r = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * r); c.height = Math.round(bmp.height * r)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.86))
}
export const saveMyPhoto = (b: Blob) => set(KEY, b, adeuxStore)
export const loadMyPhoto = (): Promise<Blob | undefined> => get(KEY, adeuxStore)
export const removeMyPhoto = () => del(KEY, adeuxStore)
