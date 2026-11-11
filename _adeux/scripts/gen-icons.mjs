// Génère les icônes PNG et les écrans de lancement iPhone (Chromium/Playwright requis).
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true }); mkdirSync('public/splash', { recursive: true })
const arch = (a, b, dot) => `<path d="M11 58V34C11 21 19 12.5 27 12.5" stroke="${a}" stroke-width="10" stroke-linecap="round" fill="none"/><path d="M53 58V34C53 21 45 12.5 37 12.5" stroke="${b}" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="32" cy="40" r="3.4" fill="${dot}"/>`
const icon = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${maskable ? '<rect width="512" height="512" fill="#3B1F4D"/>' : '<rect width="512" height="512" rx="112" fill="#3B1F4D"/>'}<g transform="${maskable ? 'translate(100 93) scale(4.9)' : 'translate(58 39) scale(6.2)'}">${arch('#FDF7EF', '#FFC4AB', '#FDF7EF')}</g></svg>`
const splash = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#FDF7EF"/><g transform="translate(${w / 2 - w * 0.09} ${h / 2 - w * 0.2}) scale(${(w * 0.18) / 64})">${arch('#3B1F4D', '#FFC4AB', '#3B1F4D')}</g><text x="${w / 2}" y="${h / 2 + w * 0.08}" text-anchor="middle" font-family="Georgia, serif" font-size="${w * 0.085}" fill="#3B1F4D" letter-spacing="${w * 0.014}">À DEUX</text><text x="${w / 2}" y="${h / 2 + w * 0.15}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="${w * 0.036}" fill="#3B1F4D" opacity=".65">Moins de swipe. Plus de sens.</text></svg>`

import { existsSync } from 'node:fs'
const exe = process.env.PW_CHROMIUM || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)
const b = await chromium.launch(exe ? { executablePath: exe, args: ['--no-sandbox'] } : {})
async function png(svg, w, h, out) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.setContent(`<style>html,body{margin:0}svg{display:block;width:${w}px;height:${h}px}</style>${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}`)
  await p.screenshot({ path: out, omitBackground: false }); await p.close()
}
await png(icon(false), 192, 192, 'public/icons/icon-192.png')
await png(icon(false), 512, 512, 'public/icons/icon-512.png')
await png(icon(true), 512, 512, 'public/icons/maskable-512.png')
await png(icon(true), 180, 180, 'public/apple-touch-icon.png') // iOS applique lui-même les coins arrondis
for (const [w, h] of [[1290, 2796], [1179, 2556], [1170, 2532], [1125, 2436], [750, 1334]]) await png(splash(w, h), w, h, `public/splash/${w}x${h}.png`)
await b.close()
console.log('icônes et splash générés')
