/* Portraits illustrés (SVG) des deux personnages, style cartoon 2D cohérent.
   Radia : longs cheveux bruns/châtains, grands yeux bruns, sourcils foncés bien
   dessinés, visage ovale, teint chaud, petit anneau au nez et la petite tache
   pigmentée DANS son œil gauche. Portrait vu de face, non inversé : son œil
   gauche est donc à DROITE de l'image (réglable dans RADIA_LOOK).
   Auguste : cheveux bruns courts un peu décoiffés, veste en cuir noire, tee-shirt noir. */

export type RadiaExpr = "neutral" | "smile" | "joy" | "tender" | "pout";
export type AugusteExpr = "smile" | "smirk" | "wink" | "surprised" | "think" | "tender";

export const RADIA_LOOK = {
  skin: "#E7AF8E", skinShade: "#CF9171", blush: "#F0908A",
  hair: "#5A3425", hairLight: "#86523A", hairDark: "#3F2419",
  brow: "#2A1812", iris: "#5B321F", lips: "#C2696A", lipsLow: "#D27F79",
  /** Côté de la tache, vu par la personne qui regarde le portrait. Son œil gauche = "viewerRight". */
  spotEye: "viewerRight" as "viewerRight" | "viewerLeft",
  /** Narine de l'anneau, vue par la personne qui regarde le portrait. */
  ringSide: "viewerRight" as "viewerRight" | "viewerLeft",
};

const AUG = {
  skin: "#EBBA9A", skinShade: "#D39C7C", hair: "#4E3222", hairLight: "#74503A", brow: "#3A2418",
  iris: "#4A2E1E", jacket: "#18171C", jacketLight: "#3C3B46", tee: "#0F0E12", lips: "#A85E58",
};

interface Opts { expr?: string; crown?: boolean; outfit?: "hoodie" | "elegant"; blink?: boolean; idPrefix?: string }

function eye(cx: number, cy: number, iris: string, lid: string, opts: { spot?: boolean; spotDir?: number; look?: number; size?: number; closed?: boolean; happy?: boolean; blink?: boolean }) {
  const s = opts.size ?? 1;
  const w = 13 * s, h = 8.5 * s;
  if (opts.happy) {
    return `<path d="M${cx - w} ${cy + 1} Q${cx} ${cy - h * 1.15} ${cx + w} ${cy + 1}" fill="none" stroke="#1E120C" stroke-width="3.2" stroke-linecap="round"/>`;
  }
  if (opts.closed) {
    return `<path d="M${cx - w} ${cy} Q${cx} ${cy + h * 0.9} ${cx + w} ${cy}" fill="none" stroke="#1E120C" stroke-width="3" stroke-linecap="round"/>`;
  }
  const lx = (opts.look ?? 0) * 2.2;
  const shape = `M${cx - w} ${cy} Q${cx - w * 0.2} ${cy - h * 1.35} ${cx + w} ${cy - 1} Q${cx + w * 0.1} ${cy + h * 1.05} ${cx - w} ${cy} Z`;
  const sd = opts.spotDir ?? 1;
  return `<g>
    <path d="${shape}" fill="#FFFDF9"/>
    <clipPath id="ec${cx | 0}${cy | 0}"><path d="${shape}"/></clipPath>
    <g clip-path="url(#ec${cx | 0}${cy | 0})">
      <circle cx="${cx + lx}" cy="${cy - 0.5}" r="${7.4 * s}" fill="${iris}"/>
      <circle cx="${cx + lx}" cy="${cy - 0.5}" r="${7.4 * s}" fill="none" stroke="#2B160D" stroke-width="1.3"/>
      <circle cx="${cx + lx}" cy="${cy - 0.5}" r="${3.4 * s}" fill="#140A06"/>
      ${opts.spot ? `<ellipse cx="${cx + lx + sd * 7.4 * s}" cy="${cy + 1.6 * s}" rx="${2.2 * s}" ry="${1.8 * s}" fill="#3B1D10"/>` : ""}
      <circle cx="${cx + lx + 2.6 * s}" cy="${cy - 3.2 * s}" r="${2 * s}" fill="#fff"/>
      <circle cx="${cx + lx - 2.6 * s}" cy="${cy + 2.4 * s}" r="${0.9 * s}" fill="#fff" opacity=".8"/>
    </g>
    <path d="M${cx - w - 1} ${cy + 0.5} Q${cx - w * 0.2} ${cy - h * 1.4} ${cx + w + 1.5} ${cy - 1.5}" fill="none" stroke="#1E120C" stroke-width="2.6" stroke-linecap="round"/>
    ${opts.blink === false ? "" : `<path class="lid" d="M${cx - w - 1.5} ${cy + 1} Q${cx - w * 0.2} ${cy - h * 1.6} ${cx + w + 1.5} ${cy - 1.5} Q${cx} ${cy + h * 1.1} ${cx - w - 1.5} ${cy + 1} Z" fill="${lid}"/>`}
  </g>`;
}

function crownSVG(x: number, y: number, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" class="crown-pop">
    <path d="M-20 10 L-24 -10 L-12 0 L0 -16 L12 0 L24 -10 L20 10 Z" fill="#F3C86B" stroke="#B5852E" stroke-width="2" stroke-linejoin="round"/>
    <rect x="-20" y="8" width="40" height="6" rx="3" fill="#E9B44F" stroke="#B5852E" stroke-width="2"/>
    <circle cx="0" cy="-16" r="3" fill="#FF75A8" stroke="#B8406E" stroke-width="1.2"/>
    <circle cx="-24" cy="-10" r="2.4" fill="#FFF4E8"/><circle cx="24" cy="-10" r="2.4" fill="#FFF4E8"/>
    <circle cx="0" cy="11" r="2.2" fill="#FF75A8"/>
  </g>`;
}

/** Radia en buste (viewBox 0 0 200 200). */
export function radiaSVG(o: Opts = {}): string {
  const L = RADIA_LOOK;
  const expr = (o.expr ?? "neutral") as RadiaExpr;
  const elegant = o.outfit === "elegant";
  const spotRight = L.spotEye === "viewerRight";
  const ringX = L.ringSide === "viewerRight" ? 105.5 : 94.5;
  const id = o.idPrefix ?? "r";
  const happy = expr === "joy";
  const mouth =
    expr === "smile" || expr === "tender"
      ? `<path d="M88.5 129 Q100 126 111.5 129 Q100 140 88.5 129 Z" fill="${L.lips}"/><path d="M91 130 Q100 132.5 109 130" stroke="#fff" stroke-width="2.4" fill="none" opacity=".9"/>`
      : expr === "joy"
      ? `<path d="M86 127 Q100 124 114 127 Q111 144 100 144 Q89 144 86 127 Z" fill="#8E3A42"/><path d="M89 128 Q100 131 111 128 L110 131.5 Q100 134 90 131.5 Z" fill="#fff"/><path d="M93 139 Q100 136 107 139 Q100 143 93 139Z" fill="#E5868A"/>`
      : expr === "pout"
      ? `<path d="M92 129 Q96 125 100 127 Q104 125 108 129 Q104 135 100 135 Q96 135 92 129 Z" fill="${L.lipsLow}"/><path d="M92.5 129.5 Q100 131 107.5 129.5" stroke="${L.lips}" stroke-width="1.6" fill="none"/>`
      : `<path d="M89.5 129.5 Q95 125.5 100 127.5 Q105 125.5 110.5 129.5 Q100 132.5 89.5 129.5 Z" fill="${L.lips}"/><path d="M89.5 129.5 Q100 139 110.5 129.5 Q100 132.5 89.5 129.5 Z" fill="${L.lipsLow}"/>`;
  const body = elegant
    ? `<defs><pattern id="${id}-stripes" width="7" height="10" patternUnits="userSpaceOnUse"><rect width="7" height="10" fill="#2C2838"/><rect width="1.6" height="10" fill="#6E6886"/></pattern></defs>
       <path d="M16 200 Q22 166 64 158 L100 176 L136 158 Q178 166 184 200 Z" fill="url(#${id}-stripes)"/>
       <path d="M64 158 L86 196 L100 176 Z M136 158 L114 196 L100 176 Z" fill="#3A3549" stroke="#1C1924" stroke-width="2" stroke-linejoin="round"/>
       <path d="M100 176 V200" stroke="#1C1924" stroke-width="2"/><circle cx="100" cy="186" r="1.8" fill="#C9C3DD"/>`
    : `<path d="M14 200 Q20 164 62 156 Q80 170 100 170 Q120 170 138 156 Q180 164 186 200 Z" fill="#1E1B23"/>
       <path d="M62 156 Q80 176 100 176 Q120 176 138 156" fill="none" stroke="#2F2B36" stroke-width="6" stroke-linecap="round"/>
       <path d="M90 174 Q88 186 89 196" stroke="#E9E2F2" stroke-width="2.2" fill="none" stroke-linecap="round"/>
       <path d="M110 174 Q112 186 111 196" stroke="#E9E2F2" stroke-width="2.2" fill="none" stroke-linecap="round"/>
       <circle cx="89" cy="197" r="2.2" fill="#E9E2F2"/><circle cx="111" cy="197" r="2.2" fill="#E9E2F2"/>`;
  const hood = elegant ? "" : `<path d="M30 196 Q22 118 46 72 Q66 30 100 27 Q134 30 154 72 Q178 118 170 196 Q150 168 138 156 Q148 118 140 86 Q128 50 100 48 Q72 50 60 86 Q52 118 62 156 Q50 168 30 196 Z" fill="#26222C"/>
       <path d="M58 150 Q46 112 60 78 Q74 46 100 44 Q126 46 140 78 Q154 112 142 150" fill="none" stroke="#38333F" stroke-width="5" stroke-linecap="round"/>`;
  const browL = expr === "tender" ? "M70.5 84 Q81 78.5 93 83" : "M70 84.5 Q80.5 76.5 93.5 82";
  const browR = expr === "tender" ? "M107 83 Q119 78.5 129.5 84" : "M106.5 82 Q119.5 76.5 130 84.5";
  return `<svg class="portrait radia" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Radia">
  ${hood}
  <path d="M54 196 Q42 140 52 98 Q60 52 100 44 Q140 52 148 98 Q158 140 146 196 Q124 178 100 180 Q76 178 54 196 Z" fill="${L.hair}"/>
  <path d="M60 180 Q52 140 58 104" stroke="${L.hairLight}" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
  <path d="M140 180 Q148 140 142 104" stroke="${L.hairDark}" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
  <g class="breathe">
  ${body}
  <path d="M87 136 Q88 156 84 168 Q100 176 116 168 Q112 156 113 136 Z" fill="${L.skinShade}"/>
  <path d="M100 51 Q133 52 136.5 92 Q138 122 120 140 Q108 150.5 100 150.5 Q92 150.5 80 140 Q62 122 63.5 92 Q67 52 100 51 Z" fill="${L.skin}"/>
  <ellipse cx="76" cy="115" rx="9" ry="5.5" fill="${L.blush}" opacity=".32"/>
  <ellipse cx="124" cy="115" rx="9" ry="5.5" fill="${L.blush}" opacity=".32"/>
  <path d="${browL}" stroke="${L.brow}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="${browR}" stroke="${L.brow}" stroke-width="5" fill="none" stroke-linecap="round"/>
  ${eye(83.5, 98, L.iris, L.skin, { spot: !spotRight, spotDir: -1, closed: expr === "tender", happy, blink: o.blink })}
  ${eye(116.5, 98, L.iris, L.skin, { spot: spotRight, spotDir: 1, closed: expr === "tender", happy, blink: o.blink })}
  <path d="M101 100 Q99.5 111 96 116.5 Q100 120 104.5 116.5" stroke="${L.skinShade}" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${ringX - 2.6} 117.6 A3.1 3.1 0 1 0 ${ringX + 2.6} 117.6" stroke="#EADFC2" stroke-width="1.7" fill="none" stroke-linecap="round"/>
  ${mouth}
  <path d="M100 47 Q72 50 64 84 Q62 100 66 120 Q70 96 80 76 Q90 62 100 58 Z" fill="${L.hair}"/>
  <path d="M100 47 Q128 50 136 84 Q138 100 134 120 Q130 96 120 76 Q110 62 100 58 Z" fill="${L.hair}"/>
  <path d="M100 48 Q92 60 86 70" stroke="${L.hairLight}" stroke-width="2.4" fill="none" opacity=".75" stroke-linecap="round"/>
  <path d="M66 96 Q60 140 64 176" stroke="${L.hair}" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M134 96 Q140 140 136 176" stroke="${L.hair}" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M66 110 Q63 140 66 168" stroke="${L.hairLight}" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>
  ${o.crown ? crownSVG(100, elegant ? 40 : 30, 0.95) : ""}
  </g>
</svg>`;
}

/** Auguste en buste (viewBox 0 0 200 200). */
export function augusteSVG(o: Opts = {}): string {
  const A = AUG;
  const expr = (o.expr ?? "smile") as AugusteExpr;
  const look = expr === "think" ? -1 : 0;
  const mouth =
    expr === "smirk" || expr === "wink"
      ? `<path d="M88 131 Q99 136 113 127" stroke="${A.lips}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
      : expr === "surprised"
      ? `<ellipse cx="100" cy="133" rx="6" ry="7.5" fill="#6E2F33"/>`
      : expr === "think"
      ? `<path d="M91 133 Q100 130 109 133" stroke="${A.lips}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
      : `<path d="M86 128 Q100 132 114 128 Q111 141 100 141 Q89 141 86 128 Z" fill="#8A3A3E"/><path d="M88.5 129 Q100 132 111.5 129 L110.5 132 Q100 134 89.5 132 Z" fill="#fff"/>`;
  const browY = expr === "surprised" ? -4 : 0;
  const browR = expr === "smirk" || expr === "wink" ? -3 : 0;
  return `<svg class="portrait auguste" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Auguste">
  <g class="breathe">
  <path d="M12 200 Q16 164 58 154 Q80 166 100 167 Q120 166 142 154 Q184 164 188 200 Z" fill="${A.jacket}"/>
  <path d="M80 162 Q100 172 120 162 L116 200 H84 Z" fill="${A.tee}"/>
  <path d="M58 154 L82 164 L90 200 H70 Q66 178 58 154 Z" fill="#232229" stroke="#0A090C" stroke-width="2" stroke-linejoin="round"/>
  <path d="M142 154 L118 164 L110 200 H130 Q134 178 142 154 Z" fill="#232229" stroke="#0A090C" stroke-width="2" stroke-linejoin="round"/>
  <path d="M58 154 L70 144 L84 162 Z M142 154 L130 144 L116 162 Z" fill="#26252D" stroke="#0A090C" stroke-width="2" stroke-linejoin="round"/>
  <path d="M30 186 Q40 170 56 166" stroke="${A.jacketLight}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
  <path d="M170 186 Q160 172 148 168" stroke="${A.jacketLight}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>
  <path d="M72 170 Q76 184 76 196" stroke="#55545F" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
  <path d="M87 134 Q88 154 84 164 Q100 172 116 164 Q112 154 113 134 Z" fill="${A.skinShade}"/>
  <path d="M100 49 Q134 50 136.5 92 Q137.5 124 119 141 Q108 150 100 150 Q92 150 81 141 Q62.5 124 63.5 92 Q66 50 100 49 Z" fill="${A.skin}"/>
  <ellipse cx="62.5" cy="104" rx="5" ry="9" fill="${A.skinShade}"/><ellipse cx="137.5" cy="104" rx="5" ry="9" fill="${A.skinShade}"/>
  <path d="M71 ${84 + browY} Q81 ${79 + browY} 93 ${82.5 + browY}" stroke="${A.brow}" stroke-width="4.6" fill="none" stroke-linecap="round"/>
  <path d="M107 ${82.5 + browY + browR} Q119 ${79 + browY + browR} 129 ${84 + browY + browR}" stroke="${A.brow}" stroke-width="4.6" fill="none" stroke-linecap="round"/>
  ${eye(83.5, 97.5, A.iris, A.skin, { size: 0.9, look, blink: o.blink, happy: expr === "tender" })}
  ${expr === "wink" ? `<path d="M105 98 Q116.5 103 128 97" stroke="#1E120C" stroke-width="3" fill="none" stroke-linecap="round"/>` : eye(116.5, 97.5, A.iris, A.skin, { size: 0.9, look, blink: o.blink, happy: expr === "tender" })}
  <path d="M101 98 Q99 112 95 118 Q100 122 105.5 118" stroke="${A.skinShade}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M88 125.5 Q100 120.5 112 125.5" stroke="${A.hair}" stroke-width="2.2" fill="none" opacity=".45" stroke-linecap="round"/>
  ${mouth}
  <path d="M61 96 Q54 58 78 42 Q96 29 120 35 Q146 44 140 80 Q139 92 136.5 97 Q133 76 125 66 Q112 73 97 66 Q85 74 72 70 Q65 80 63.5 97 Z" fill="${A.hair}"/>
  <path d="M97 66 Q91 78 84 83" stroke="${A.hair}" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M112 70 Q116 78 115 84" stroke="${A.hair}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M80 46 Q92 38 108 40" stroke="${A.hairLight}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
  <path d="M120 38 Q126 32 132 33 M78 44 Q72 38 66 42" stroke="${A.hair}" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;
}

export { crownSVG };
