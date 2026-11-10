// Remplace « Auguste » écrit en dur DANS LES TEXTES (littéraux) par la configuration (PARTNER / PARTNER_DE).
// Identifiants, noms de fichiers et commentaires ne sont pas touchés. Usage : node scripts/guest-codemod-partner.mjs [--dry]
import ts from 'typescript';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';

const ROOT = 'src'; const DRY = process.argv.includes('--dry');
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|js)$/.test(f) && !p.startsWith(join('src', 'config'))) files.push(p); } })(ROOT);

const has = (t) => /\bAuguste\b/.test(t);
// « d'Auguste » / « de Auguste » → ${PARTNER_DE} ; reste → ${PARTNER}
function convert(text) {
  let out = ''; let usesDe = false, usesName = false; let i = 0;
  const re = /\b(?:d['’]|de\s+)Auguste\b|\bAuguste\b/g; let m;
  while ((m = re.exec(text))) {
    out += esc(text.slice(i, m.index));
    if (m[0] === 'Auguste') { out += '${PARTNER}'; usesName = true; } else { out += '${PARTNER_DE}'; usesDe = true; }
    i = m.index + m[0].length;
  }
  out += esc(text.slice(i));
  return { out, usesDe, usesName };
}
const esc = (t) => t.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
let total = 0; const touched = [];
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!has(src)) continue;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2020, true, file.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS);
  const edits = []; let needName = false, needDe = false;
  const visit = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isLiteralTypeNode(n) || ts.isPropertyAssignment(n) && false) return;
    // clés d'objet / types littéraux : on ne touche pas
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && has(n.text)) {
      const p = n.parent;
      if (ts.isLiteralTypeNode(p) || (ts.isPropertyAssignment(p) && p.name === n) || ts.isElementAccessExpression(p) && p.argumentExpression === n || ts.isCaseClause(p) || ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken].includes(p.operatorToken.kind)) { return; }
      const c = convert(n.text);
      edits.push([n.getStart(), n.getEnd(), '`' + c.out + '`']); needName ||= c.usesName; needDe ||= c.usesDe; total++;
    } else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      if (has(n.text)) {
        // morceau de gabarit : on garde le texte BRUT (déjà échappé), on remplace seulement le mot
        const raw = n.rawText ?? n.text; const c = rawConvert(raw);
        const start = n.getStart(); const end = n.getEnd();
        const lead = src.slice(start, start + 1); const tail = src.slice(end - (ts.isTemplateTail(n) ? 1 : 2), end);
        edits.push([start, end, lead + c.out + tail]); needName ||= c.usesName; needDe ||= c.usesDe; total++;
      }
    }
    ts.forEachChild(n, visit);
  };
  const rawConvert = (raw) => { let out = '', i = 0, usesDe = false, usesName = false, m; const re = /\b(?:d(?:\\)?['’]|de\s+)Auguste\b|\bAuguste\b/g;
    while ((m = re.exec(raw))) { out += raw.slice(i, m.index) + (m[0] === 'Auguste' ? (usesName = true, '${PARTNER}') : (usesDe = true, '${PARTNER_DE}')); i = m.index + m[0].length; }
    return { out: out + raw.slice(i), usesDe, usesName }; };
  visit(sf);
  if (!edits.length) continue;
  edits.sort((a, b) => b[0] - a[0]);
  let res = src; for (const [s, e, t] of edits) res = res.slice(0, s) + t + res.slice(e);
  const names = [needName && 'PARTNER', needDe && 'PARTNER_DE'].filter(Boolean);
  if (names.length) {
    let rel = relative(dirname(file), join('src', 'config', 'gift')).split(sep).join('/'); if (!rel.startsWith('.')) rel = './' + rel;
    const imp = `import { ${names.join(', ')} } from '${rel}';\n`;
    // après le dernier import de tête de fichier (ou tout en haut)
    const ms = [...res.matchAll(/^import[^;]*;\s*$/gm)]; const last = ms.length ? ms[ms.length - 1] : null;
    res = last ? res.slice(0, last.index + last[0].length) + '\n' + imp.trimEnd() + res.slice(last.index + last[0].length) : imp + res;
  }
  touched.push(file);
  if (!DRY) writeFileSync(file, res);
}
console.log(`${total} littéraux dans ${touched.length} fichiers${DRY ? ' (simulation)' : ''}`);
