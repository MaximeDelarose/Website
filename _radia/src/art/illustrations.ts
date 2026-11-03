/* Illustrations décoratives (SVG) des cartes sans photo et de l'accueil.
   Ce sont des dessins, jamais de fausses photos. */
import type { ArtId } from "../content/types";
import { radiaSVG, augusteSVG, crownSVG } from "./portraits";

const W = 300, H = 375;

function bg(id: string, a: string, b: string, extra = ""): string {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>${extra}</defs>
  <rect width="${W}" height="${H}" fill="url(#${id})"/>`;
}

function stars(n: number, seed: number, maxY = 220): string {
  let s = seed, out = "";
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * maxY, sz = 0.6 + r() * 1.6;
    out += `<circle class="twinkle" style="animation-delay:${(r() * 3).toFixed(2)}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sz.toFixed(2)}" fill="#FFF4E8"/>`;
  }
  return out;
}

export function heartPath(cx: number, cy: number, s: number): string {
  return `M${cx} ${cy + 9 * s} C${cx - 14 * s} ${cy} ${cx - 12 * s} ${cy - 11 * s} ${cx - 5 * s} ${cy - 11 * s} C${cx - 2 * s} ${cy - 11 * s} ${cx} ${cy - 8 * s} ${cx} ${cy - 6 * s} C${cx} ${cy - 8 * s} ${cx + 2 * s} ${cy - 11 * s} ${cx + 5 * s} ${cy - 11 * s} C${cx + 12 * s} ${cy - 11 * s} ${cx + 14 * s} ${cy} ${cx} ${cy + 9 * s} Z`;
}

/** Arc de Triomphe stylisé. */
function arc(x: number, y: number, s: number, fill: string): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">
    <path d="M-60 0 V-92 H60 V0 H26 V-46 Q26 -66 0 -66 Q-26 -66 -26 -46 V0 Z"/>
    <rect x="-66" y="-108" width="132" height="18" rx="2"/><rect x="-62" y="-118" width="124" height="10"/>
  </g>`;
}

function flower(x: number, y: number, s: number, petal: string, heart: string): string {
  let p = "";
  for (let i = 0; i < 6; i++) p += `<ellipse cx="0" cy="-11" rx="7" ry="11" transform="rotate(${i * 60})" fill="${petal}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${p}<circle r="6.5" fill="${heart}"/></g>`;
}

const ARTS: Record<ArtId, () => string> = {
  flowers: () => `${bg("gf", "#FFE3EC", "#F5B5C8")}
    ${stars(0, 1)}
    <path d="M150 360 Q148 300 150 250" stroke="#7FA36B" stroke-width="5" fill="none"/>
    <path d="M150 300 Q118 260 104 196 M150 300 Q184 262 198 192 M150 280 Q140 230 150 170 M150 290 Q110 250 80 230 M150 290 Q190 250 222 232" stroke="#7FA36B" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="128" cy="270" rx="16" ry="7" transform="rotate(-35 128 270)" fill="#94BA7C"/>
    <ellipse cx="174" cy="262" rx="16" ry="7" transform="rotate(35 174 262)" fill="#94BA7C"/>
    ${flower(104, 190, 1.6, "#FF75A8", "#F3C86B")}${flower(198, 186, 1.5, "#B9A5E8", "#FFF4E8")}
    ${flower(150, 160, 1.9, "#FFF4E8", "#FF75A8")}${flower(80, 228, 1.2, "#F3C86B", "#FF75A8")}${flower(222, 230, 1.25, "#FF9BBE", "#FFF4E8")}
    <path d="M110 300 L150 360 L190 300 Q170 312 150 310 Q130 312 110 300 Z" fill="#FFF4E8" stroke="#E7A9BF" stroke-width="3"/>
    <path d="M136 318 Q150 330 164 318" stroke="#FF75A8" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  paris: () => `${bg("gp", "#2E2547", "#51446D")}${stars(40, 7)}
    <circle cx="232" cy="70" r="26" fill="#FFF4E8" opacity=".92"/><circle cx="244" cy="62" r="24" fill="#2E2547" opacity=".95"/>
    ${arc(150, 330, 1.25, "#B9A5E8")}
    <rect y="330" width="${W}" height="45" fill="#3A3054"/>
    <path d="M0 330 Q75 322 150 330 T300 330" stroke="#F3C86B" stroke-width="2" fill="none" opacity=".6"/>`,
  montmartre: () => `${bg("gm", "#3B2F5C", "#F5B5C8")}${stars(30, 3, 150)}
    <g fill="#FFF4E8" opacity=".95">
      <path d="M90 300 V230 H210 V300 Z"/>
      <path d="M118 230 Q118 186 150 176 Q182 186 182 230 Z"/>
      <rect x="146" y="150" width="8" height="28"/><circle cx="150" cy="148" r="6"/>
      <path d="M92 236 Q92 212 108 206 Q124 212 124 236 Z M176 236 Q176 212 192 206 Q208 212 208 236 Z"/>
      <path d="M210 300 V200 H232 V300 Z"/><path d="M210 202 Q221 176 232 202 Z"/>
    </g>
    <path d="M0 300 Q80 280 150 296 Q220 312 300 290 V375 H0 Z" fill="#7C5F8E"/>
    <path d="M0 330 Q90 310 160 328 Q230 346 300 326 V375 H0 Z" fill="#51446D"/>
    <text x="150" y="360" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="#FFF4E8" font-style="italic">Nord de Paris ♡</text>`,
  crown: () => `${bg("gc", "#51446D", "#2E2547")}${stars(30, 9)}
    <circle cx="150" cy="180" r="92" fill="#F3C86B" opacity=".14"/><circle cx="150" cy="180" r="64" fill="#F3C86B" opacity=".16"/>
    ${crownSVG(150, 186, 3.4)}
    <text x="150" y="320" text-anchor="middle" font-family="Georgia, serif" font-size="22" fill="#F3C86B">♛</text>`,
  heart: () => `${bg("gh", "#FFE3EC", "#FF9BBE")}
    <path class="beat" d="${heartPath(150, 190, 9)}" fill="#FF75A8" stroke="#FFF4E8" stroke-width="5"/>
    <path d="${heartPath(150, 190, 5.2)}" fill="#FFB6CE" opacity=".6"/>
    ${[40, 90, 220, 260, 70, 240].map((x, i) => `<path d="${heartPath(x, 60 + i * 47, 1.2)}" fill="#FFF4E8" opacity=".7"/>`).join("")}`,
  world: () => `${bg("gw", "#2E2547", "#B9A5E8")}${stars(45, 5)}
    <circle cx="150" cy="250" r="98" fill="#F5B5C8"/>
    <ellipse cx="150" cy="200" rx="70" ry="22" fill="#FFF4E8"/>
    <g transform="translate(150 196) scale(1 .32) rotate(45)">
      ${Array.from({ length: 16 }, (_, i) => `<rect x="${(i % 4) * 22 - 44}" y="${Math.floor(i / 4) * 22 - 44}" width="22" height="22" fill="${(i + Math.floor(i / 4)) % 2 ? "#C8869F" : "#FBEFE3"}"/>`).join("")}
    </g>
    <path d="M118 186 l-6 -18 h12 Z M182 186 l-6 -18 h12 Z" fill="#51446D"/>
    <circle cx="112" cy="166" r="5" fill="#FFF4E8"/><circle cx="188" cy="166" r="5" fill="#2A2238"/>
    <path d="${heartPath(150, 150, 1.6)}" fill="#FF75A8"/>
    <circle cx="96" cy="270" r="12" fill="#FF9BBE"/><circle cx="196" cy="290" r="16" fill="#E893B0"/>`,
  stars: () => `${bg("gs", "#1F1A33", "#51446D")}${stars(90, 13, 375)}
    <path d="M150 90 L162 128 L202 128 L170 152 L182 190 L150 166 L118 190 L130 152 L98 128 L138 128 Z" fill="#F3C86B"/>
    <path d="${heartPath(150, 270, 3)}" fill="#FF75A8" opacity=".9"/>`,
  chess: () => `${bg("gx", "#FFF4E8", "#F5B5C8")}
    <g transform="translate(150 220) scale(1 .5) rotate(45)">
      ${Array.from({ length: 36 }, (_, i) => `<rect x="${(i % 6) * 30 - 90}" y="${Math.floor(i / 6) * 30 - 90}" width="30" height="30" fill="${(i + Math.floor(i / 6)) % 2 ? "#C8869F" : "#FBEFE3"}"/>`).join("")}
    </g>
    <svg x="100" y="90" width="100" height="120" viewBox="0 0 100 100"><use href="#pc-br"/></svg>
    <path d="${heartPath(212, 110, 2)}" fill="#FF75A8"/>`,
};

export function artSVG(id: ArtId): string {
  return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">${ARTS[id]()}</svg>`;
}

/** Scène de l'accueil : Paris la nuit, Radia couronnée et Auguste face à un échiquier. */
export function homeSceneSVG(outfit: "hoodie" | "elegant"): string {
  const board = Array.from({ length: 16 }, (_, i) =>
    `<rect x="${(i % 4) * 24 - 48}" y="${Math.floor(i / 4) * 24 - 48}" width="24" height="24" fill="${(i + Math.floor(i / 4)) % 2 ? "#C8869F" : "#FBEFE3"}"/>`).join("");
  return `<svg class="home-scene" viewBox="0 0 400 330" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="hs-glow" cx=".5" cy=".55" r=".55"><stop offset="0" stop-color="#F3C86B" stop-opacity=".35"/><stop offset="1" stop-color="#F3C86B" stop-opacity="0"/></radialGradient>
      <linearGradient id="hs-table" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A5A55"/><stop offset="1" stop-color="#58433F"/></linearGradient>
    </defs>
    <g opacity=".55">${arc(200, 238, 1.1, "#8E7BB8")}</g>
    <ellipse cx="200" cy="230" rx="190" ry="110" fill="url(#hs-glow)"/>
    <g class="char char-left"><svg x="-6" y="60" width="210" height="210" viewBox="0 0 200 200">${radiaSVG({ crown: true, expr: "smile", outfit }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g>
    <g class="char char-right"><svg x="196" y="60" width="210" height="210" viewBox="0 0 200 200">${augusteSVG({ expr: "smirk" }).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g>
    <path d="M70 268 H330 L352 330 H48 Z" fill="url(#hs-table)"/>
    <g class="mini-board" transform="translate(200 262) scale(1.25 .34) rotate(45)">${board}
      <rect x="-48" y="-48" width="96" height="96" fill="none" stroke="#F3C86B" stroke-width="3"/></g>
    <rect class="board-shine" x="140" y="244" width="22" height="38" fill="#fff" opacity=".0" transform="skewX(-30)"/>
    <svg x="150" y="214" width="34" height="38" viewBox="0 0 100 100"><use href="#pc-wq"/></svg>
    <svg x="218" y="216" width="32" height="36" viewBox="0 0 100 100"><use href="#pc-bk"/></svg>
  </svg>`;
}
