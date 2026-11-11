export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
/** Petit PRNG déterministe pour que les partenaires fictifs répondent de façon reproductible. */
export function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export const dayKey = (offsetDays = 0, now = Date.now()) => {
  const d = new Date(now + offsetDays * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
export const ageBand = (age: number) => (age < 25 ? '18–24 ans' : age < 30 ? '25–29 ans' : age < 35 ? '30–34 ans' : age < 40 ? '35–39 ans' : age < 45 ? '40–44 ans' : '45 ans et plus')
