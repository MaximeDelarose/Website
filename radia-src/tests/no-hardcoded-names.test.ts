// Garde-fou : le moteur ne contient AUCUN prénom de personnage écrit dans un texte. Tout passe par src/config/gift.ts.
import { describe, it, expect } from 'vitest';
import ts from 'typescript';

const SOURCES = import.meta.glob(['../src/**/*.ts', '../src/**/*.js', '!../src/config/**'], { query: '?raw', eager: true, import: 'default' }) as Record<string, string>;
const files = Object.keys(SOURCES);

describe('prénom du compagnon', () => {
  it('plus de 100 fichiers examinés', () => { expect(files.length).toBeGreaterThan(100); });
  it('« Auguste » n\'apparaît dans aucun littéral de texte du moteur (hors src/config)', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = SOURCES[file];
      if (!/Auguste/.test(src)) continue;
      const sf = ts.createSourceFile(file, src, ts.ScriptTarget.ES2020, true);
      const visit = (n: ts.Node): void => {
        const text = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text
          : ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) ? n.text : null;
        if (text !== null && /\bAuguste\b/.test(text)) {
          const p = n.parent;
          const isKeyOrTag = ts.isLiteralTypeNode(p) || (ts.isPropertyAssignment(p) && p.name === n) || ts.isCaseClause(p);
          if (!isKeyOrTag) offenders.push(`${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    expect(offenders).toEqual([]);
  });
});
