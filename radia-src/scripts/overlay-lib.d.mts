export interface OvNode {
  tag: string; id?: string; cls?: string; anc?: string; sel?: string; z?: string;
  rect: { left: number; top: number; right: number; bottom: number };
  display: string; visibility: string; opacity: number; pe: string;
  bg: string; bgImage: string; backdrop: string; onTop?: boolean;
}
export interface OvGlobals {
  roots?: { name: string; opacity: number; filter?: string; pe?: string; visibility?: string; display?: string }[];
  bodyStyle?: string; rootClass?: string; underCount?: number; eventExpected?: boolean; canvasFilter?: string;
}
export const FULL_W: number;
export const FULL_H: number;
export function colorAlpha(c: string): number;
export function hasPaint(n: Pick<OvNode, 'bg' | 'bgImage' | 'backdrop'>): boolean;
export function coverage(r: OvNode['rect'], vw: number, vh: number): { w: number; h: number };
export function isFullscreen(r: OvNode['rect'], vw: number, vh: number): boolean;
export function isVisible(n: Pick<OvNode, 'display' | 'visibility' | 'opacity'>): boolean;
export function isAllowed(n: Pick<OvNode, 'tag' | 'id' | 'cls'>, allow?: string[]): boolean;
export function classify(n: OvNode, vw: number, vh: number, allow?: string[]): 'blocker' | 'ghost' | 'dimmer' | null;
export function globalIssues(g: OvGlobals): string[];
export function leftovers(nodes: Pick<OvNode, 'cls' | 'display' | 'sel'>[]): (string | undefined)[];
export function formatReport(label: string, findings: string[]): string;
export function describe(n: Pick<OvNode, 'tag' | 'id' | 'cls'>): string;
export function evaluate(o: { vw: number; vh: number; nodes: OvNode[]; globals?: OvGlobals; allow?: string[]; settled?: boolean }): string[];
export function findCssCollisions(files: { path: string; css: string }[]): { cls: string; defs: { path: string; body: string }[] }[];
export interface OvItem { name: string; rect: { left: number; top: number; right: number; bottom: number }; touch?: boolean; hit?: { w: number; h: number } }
export function overlappingPairs(items: OvItem[], tol?: number): [string, string, number, number][];
export function layoutIssues(items: OvItem[], vw: number, vh: number, o?: { min?: number; tol?: number }): string[];
export function outsideBox(items: OvItem[], box: { left: number; right: number }, tol?: number): string[];
