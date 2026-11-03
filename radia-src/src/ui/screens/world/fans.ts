/**
 * « Fans de Radia ♡ » : popularité FICTIVE du jeu. Compteur animé, 6 paliers
 * (récompenses réelles), fiche d'Auguste (fan n° 1) et album des 5 couvertures
 * de magazines. `grantFans(n)` est le point d'entrée commun pour ajouter des
 * fans (formule, paliers, récompenses, célébrations).
 */
import '../../styles/world-fans.css';
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { save, audio, events } from '../../../core/app';
import { stat, checkAchievements } from '../../../core/progress';
import { wallet, fmt } from '../../../core/wallet';
import { addFans, world } from '../../../core/world';
import { hasPhotos, photoUrlNow } from '../../../core/photos';
import { reactAuguste } from '../../../game/world/auguste';
import { augusteSays } from '../../components/augusteSays';
import { canvasUrl, paint } from '../../../game/art/kit';
import { medallionCanvas } from '../../../game/art/characters';
import { drawMagazine } from '../../../game/art/world/careers';
import { AUGUSTE_FICHE, FAN_TIER_DEFS, MAGAZINES } from '../../../data/world/careers';
import { FAN_TIERS, MAGAZINE_IDS, type MagazineId } from '../../../data/world/ids';
import { claimFanTiers, fansTierOf, magazineUnlocked, syncMagazines, ownedMagazinesOf, type FanTierClaim } from '../../../game/world/careers';
import { countUp, rewardChips, runQueue, showFanTier, showMagazineReveal } from './careerFx';

/** Couvertures possédées (pour le module « château » : meuble « painting »). */
export function ownedMagazines(): MagazineId[] { return ownedMagazinesOf(world()); }

/** Applique les effets hors `World` d'une série de paliers (diamants, énergie). */
function applyOutside(claims: FanTierClaim[]): void {
  for (const c of claims) {
    if (c.outside.diamonds) wallet.giveDiamonds(c.outside.diamonds);
    if (c.outside.energy) wallet.giveEnergy(c.outside.energy);
    stat('world.fans.tier');
  }
}

/**
 * Ajoute des fans (via `addFans`), récompense les paliers franchis et les
 * débloque (magazines). Renvoie les célébrations à jouer (au moment voulu).
 */
export function grantFans(n: number): { celebrate: () => Promise<void>; claims: FanTierClaim[]; magazines: MagazineId[] } {
  if (n > 0) { addFans(n); stat('world.career.fansGained', Math.floor(n)); }
  const claims = claimFanTiers(world());
  const magazines = syncMagazines(world());
  save.save();
  events.emit('economy', undefined);
  applyOutside(claims);
  for (const m of magazines) { void m; stat('world.career.magazine'); }
  const celebrate = async () => {
    const jobs: (() => Promise<void>)[] = [];
    for (const c of claims) jobs.push(async () => { await showFanTier(c); reactAuguste('fansTier', 1, true); });
    for (const m of magazines) jobs.push(async () => { await showMagazineReveal(m); reactAuguste('magazine', 0.6); });
    await runQueue(jobs);
    if (claims.length || magazines.length) checkAchievements();
  };
  return { celebrate, claims, magazines };
}

// ------------------------------------------------------------------ écran
function augusteHead(): string {
  return (hasPhotos() && photoUrlNow('head-new')) || canvasUrl('med:auguste:laugh:96', () => medallionCanvas('auguste', { expr: 'laugh' }, 96));
}

let lineIdx = 0;
function augusteReacts(): void {
  const own = lineIdx++ % 3 === 2;
  if (own) augusteSays(AUGUSTE_FICHE.lines[Math.floor(Math.random() * AUGUSTE_FICHE.lines.length)], 4200);
  else reactAuguste('fans', 1, true);
}

function viewer(id: MagazineId): void {
  const m = MAGAZINES[id];
  const cv = paint(300, 400, 2, (c) => drawMagazine(c, id, 300, 400));
  const img = h('img.mag-full', { src: cv.toDataURL('image/png'), alt: m.name });
  const wrap = h('div.mag-viewer', { role: 'dialog', 'aria-label': m.name },
    h('div.mag-view-stage', img),
    h('h3', m.name),
    h('p', m.heads.join(' · ')),
    h('button.btn.secondary', { on: { click: tap(() => { wrap.classList.add('leaving'); window.setTimeout(() => wrap.remove(), 220); }) } }, 'Fermer'));
  wrap.addEventListener('click', (e) => { if (e.target === wrap) { wrap.classList.add('leaving'); window.setTimeout(() => wrap.remove(), 220); } });
  // légère inclinaison au toucher
  const stage = wrap.querySelector('.mag-view-stage') as HTMLElement;
  stage.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2, y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    img.style.transform = `perspective(700px) rotateY(${x * 12}deg) rotateX(${-y * 10}deg)`;
  });
  stage.addEventListener('pointerleave', () => { img.style.transform = ''; });
  ui.root.append(wrap);
  audio.play('page');
}

export function openFans(opts: { album?: boolean } = {}): Promise<void> {
  return new Promise((resolve) => {
    // rattrape d'éventuels paliers non encore vus (fans ajoutés ailleurs)
    const g = grantFans(0);
    const w = world();
    const body = h('div.screen-body.fn-body');
    const back = () => { ui.closeScreen(); resolve(); };
    const screen = h('div.screen.bg-soft.fn-screen', ui.header('Fans de Radia ♡', back), body);
    ui.showScreen(screen);

    // --- compteur
    const count = h('b.fn-count', '0');
    const tier = fansTierOf(w.fans);
    const next = FAN_TIERS[tier + 1];
    const prevN = tier >= 0 ? FAN_TIERS[tier] : 0;
    const pct = next ? Math.max(0, Math.min(1, (w.fans - prevN) / (next - prevN))) : 1;
    const bar = h('i', { style: 'width:0%' });
    body.append(h('section.panel.fn-hero',
      h('div.fn-heart', icon('heart', 40)),
      h('div.fn-counter', count, h('span', 'fans')),
      h('div.fn-bar', bar),
      h('small.fn-next', next ? `Prochain palier : ${fmt(next)} fans` : 'Tous les paliers sont atteints !'),
      h('small.fn-fict', 'popularité fictive du jeu')));
    countUp(count, 0, w.fans, 1300);
    window.setTimeout(() => { bar.style.width = `${Math.round(pct * 100)}%`; }, 100);

    // --- paliers
    const list = h('div.fn-tiers');
    FAN_TIER_DEFS.forEach((t, i) => {
      const reached = w.fans >= t.n;
      list.append(h(`div.fn-tier${reached ? '.on' : ''}${i === tier + 1 ? '.next' : ''}`, { style: `--i:${i}` },
        h('div.fn-t-n', reached ? icon('check', 18) : icon('lock', 16), h('b', fmt(t.n))),
        h('div.fn-t-body', h('b', t.title), h('small', t.note), h('div.rc-row.small', ...rewardChips(t.reward), ...(t.event ? [h('span.rc.rc-fans', t.event)] : [])))));
    });
    body.append(h('h3.fn-h', 'Les paliers'), list);

    // --- Auguste, fan n° 1
    const ahead = h('div.fn-aug-head', h('img', { src: augusteHead(), alt: 'Auguste' }), h('span.fn-no1', 'n°1'));
    const reactBtn = h('button.btn.lavande.small', 'Voir sa réaction');
    reactBtn.addEventListener('click', tap(() => { augusteReacts(); ahead.classList.remove('hop'); void ahead.offsetWidth; ahead.classList.add('hop'); audio.play('heart'); }));
    body.append(h('h3.fn-h', 'Fan n° 1'), h('section.panel.fn-aug',
      ahead,
      h('div.fn-aug-txt', h('b', AUGUSTE_FICHE.name), h('div.fn-aug-title', AUGUSTE_FICHE.title), h('p', AUGUSTE_FICHE.text), reactBtn)));

    // --- album des couvertures
    const owned = ownedMagazinesOf(w);
    const album = h('div.fn-album');
    for (const id of MAGAZINE_IDS) {
      const m = MAGAZINES[id];
      const has = owned.includes(id);
      const thumb = has
        ? h('img', { src: canvasUrl(`mag:${id}:150`, () => paint(150, 200, 2, (c) => drawMagazine(c, id, 150, 200))), alt: m.name })
        : h('div.fn-locked', icon('lock', 26));
      const cell = h(`button.fn-mag${has ? '' : '.locked'}`, { 'aria-label': has ? m.name : `${m.name} (verrouillé)` }, thumb, h('b', has ? m.name : '???'), h('small', has ? '' : m.how));
      if (has) cell.addEventListener('click', tap(() => viewer(id), { sound: false }));
      else cell.addEventListener('click', tap(() => ui.toast({ title: m.name, sub: m.how, icon: 'lock' })));
      album.append(cell);
    }
    body.append(h('h3.fn-h#album', `Album des couvertures · ${owned.length}/${MAGAZINE_IDS.length}`), album,
      h('small.fn-note', 'Magazines fictifs : ils n\'existent que dans le jeu ♡'));
    void magazineUnlocked;

    if (opts.album) window.setTimeout(() => body.querySelector('#album')?.scrollIntoView({ behavior: 'smooth' }), 250);
    if (g.claims.length || g.magazines.length) window.setTimeout(() => void g.celebrate(), 500);
  });
}
