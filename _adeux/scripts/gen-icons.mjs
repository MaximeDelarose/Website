// Génère les icônes PNG et les écrans de lancement iPhone (Chromium/Playwright requis).
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true }); mkdirSync('public/splash', { recursive: true })
const mark = (bg) => `<g>${bg}<circle cx="196" cy="236" r="96" fill="#A88BC7"/><circle cx="316" cy="236" r="96" fill="#F6B7A0"/><path d="M196 236a96 96 0 0 0 120 0 96 96 0 0 0-120 0z" fill="#F3C1CC"/><path d="M112 392Q256 352 400 392" stroke="#FFF7EF" stroke-width="14" stroke-linecap="round" fill="none" stroke-dasharray="2 34"/></g>`
const icon = (maskable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${maskable ? '<rect width="512" height="512" fill="#231C39"/>' : '<rect width="512" height="512" rx="112" fill="#231C39"/>'}<g transform="${maskable ? 'translate(76 76) scale(.7)' : ''}">${mark('')}</g></svg>`
const splash = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#FFF7EF"/><g transform="translate(${w / 2 - w * 0.18} ${h / 2 - w * 0.3}) scale(${(w * 0.36) / 512})">${mark('')}</g><text x="${w / 2}" y="${h / 2 + w * 0.2}" text-anchor="middle" font-family="Georgia, serif" font-size="${w * 0.1}" font-weight="700" fill="#231C39" letter-spacing="${w * 0.006}">À DEUX</text><text x="${w / 2}" y="${h / 2 + w * 0.28}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="${w * 0.035}" fill="#231C39" opacity=".7">On ne trouve pas l’amour. On le construit.</text></svg>`

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
