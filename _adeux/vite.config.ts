import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

/** Empreinte du code source : identifie une version de façon déterministe. */
function sourceHash(): string {
  const h = createHash('sha256')
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name)
      const s = statSync(p)
      if (s.isDirectory()) walk(p)
      else h.update(p).update(readFileSync(p))
    }
  }
  for (const d of ['src', 'public']) walk(d)
  h.update(readFileSync('index.html')).update(readFileSync('package.json'))
  return h.digest('hex').slice(0, 10)
}
const BUILD_ID = process.env.ADEUX_BUILD_ID || sourceHash()

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'adeux-version-file',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ app: 'adeux', version: pkg.version, build: BUILD_ID, builtAt: new Date().toISOString() }),
        })
      },
    },
  ],
  base: process.env.ADEUX_BASE ?? '/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD_ID__: JSON.stringify(BUILD_ID) },
  build: { outDir: 'dist', sourcemap: false, target: 'es2022', chunkSizeWarningLimit: 800 },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node', testTimeout: 30000 },
})
