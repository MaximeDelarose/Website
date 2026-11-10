// Après `vite build` : génère dist/sw.js avec la liste de pré-cache et l'identifiant du build.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const dist = 'dist'
const version = JSON.parse(readFileSync(join(dist, 'version.json'), 'utf8'))
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p] })
const files = walk(dist).map((f) => '/' + relative(dist, f).split('\\').join('/'))

const keep = (f) =>
  f === '/index.html' || f === '/manifest.webmanifest' || f === '/icon.svg' || f === '/apple-touch-icon.png' ||
  f.startsWith('/icons/') ||
  (f.startsWith('/assets/') && /\.(js|css)$/.test(f) && !/livekit/i.test(f)) ||
  (f.startsWith('/assets/') && /latin-wght-normal.*\.woff2$/.test(f))
const precache = files.filter(keep).sort()

const tpl = readFileSync('scripts/sw.template.js', 'utf8')
writeFileSync(join(dist, 'sw.js'), tpl.replace('__BUILD__', version.build).replace('__PRECACHE__', JSON.stringify(precache, null, 2)))
console.log(`sw.js généré — build ${version.build}, ${precache.length} fichiers pré-cachés`)
