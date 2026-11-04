/** Carte d'Auguste (jetons apportés à la table), salon d'accueil, missions. */
import { h } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { audio, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt, fmtTime } from '../../core/wallet';
import { casinoHallCanvas, cardFaceUrl, chipUrl, memberCardUrl, rouletteWheelCanvas, slotSymbolUrl } from '../../game/art/casino';
import { CLOTHES } from '../../data/world/wardrobe';
import { FURNITURE } from '../../data/world/furniture';
import { sparkleBurst } from '../../ui/fx/sparkle';
import { bounce, centerOf, celebrate, soft } from '../fx';
import { cs, persist, notifyCasino } from '../store';
import { REFILL_BELOW, REFILL_TO, WELCOME_CHIPS, refill, refillIn, setBring, total } from '../chips';
import { MISSIONS, claimMission, isClaimable, isDone, progressOf, type MissionDef } from '../missions';
import { WHEEL_ORDER, colorOf } from '../roulette';
import type { Scene, Shell } from './shell';

const p = (t: string, cls = ''): HTMLElement => { const e = h('p', t); for (const c of cls.split('.').filter(Boolean)) e.classList.add(c); return e; };

// ------------------------------------------------------------------ carte d'Auguste

export function cardScene(sh: Shell, o: { welcomed: boolean; onEnter(): void; onBack(): void }): Scene {
  const s = cs();
  const pool = () => total(s);
  const amount = h('b.cz-amt', fmt(s.bring));
  const slider = h('input.cz-slider', { type: 'range', min: '0', max: String(pool()), step: pool() >= 100 ? '5' : '1', value: String(s.bring), 'aria-label': 'Jetons apportés à la table' }) as HTMLInputElement;
  const info = h('p.cz-cardinfo');
  const refillBox = h('div.cz-refill');
  const card = h('img.cz-member', { src: memberCardUrl(320), alt: 'Carte de membre offerte par Auguste', draggable: false });
  let timer = 0;

  const apply = (n: number, fx = true) => {
    const before = s.bring;
    const k = setBring(s, n);
    persist(); notifyCasino();
    slider.max = String(pool()); slider.value = String(k);
    amount.textContent = fmt(k);
    info.textContent = `En poche : ${fmt(s.chips)} · À la table : ${fmt(k)}`;
    sh.setShown(k);
    if (fx && k !== before) { audio.play('chip', 1 + Math.min(0.5, k / 2000)); haptic('bet'); bounce(amount, 1.1); }
    enter.disabled = false;
  };
  const step = (d: number) => apply(s.bring + d);
  const btn = (label: string, fn: () => void, cls = '') => h(`button.cz-mini${cls}`, { on: { click: fn } }, label);
  const enter = h('button.btn.gold.wide.cz-enter', { on: { click: () => { audio.play('pop2'); const r = card.getBoundingClientRect(); sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, { rarity: 'rare', count: 12 }); o.onEnter(); } } }, 'Entrer au salon ♡') as HTMLButtonElement;

  const drawRefill = () => {
    refillBox.replaceChildren();
    const w = refillIn(s, Date.now());
    if (w === Infinity) return;
    if (w === 0) {
      refillBox.append(p(`Ta bourse est presque vide ? Auguste t'offre une mini-recharge gratuite jusqu'à ${REFILL_TO} jetons.`, '.cz-small'),
        h('button.btn.lavande.wide', { on: { click: () => { const g = refill(s, Date.now()); if (g > 0) { audio.play('reward'); haptic('reward'); persist(); notifyCasino(); celebrate('small', centerOf(card)); apply(Math.min(pool(), s.bring + g), false); drawRefill(); } } } }, 'Recevoir ma mini-recharge ♡'));
    } else {
      refillBox.append(p(`Prochaine mini-recharge gratuite dans ${fmtTime(w)}.`, '.cz-small'));
    }
  };
  slider.addEventListener('input', () => apply(Number(slider.value), false));
  slider.addEventListener('change', () => apply(Number(slider.value)));
  timer = window.setInterval(() => { if (refillIn(s, Date.now()) !== Infinity) drawRefill(); }, 1000);

  const el = h('div.cz-card',
    o.welcomed ? h('div.cz-welcome', `Bienvenue ! Auguste t'offre ${WELCOME_CHIPS} jetons pour ta première soirée ♡`) : null,
    card,
    h('h2', 'La carte d\'Auguste'),
    p('Combien de jetons apportes-tu à la table ? Tout reste virtuel et gratuit : en sortant, tu reprends le reste.', '.cz-lead'),
    h('div.cz-amtrow', h('img', { src: chipUrl(25, 48), alt: '', draggable: false }), amount),
    h('div.cz-sliderrow', btn('−', () => step(-10), '.big'), slider, btn('+', () => step(10), '.big')),
    h('div.cz-quick', btn('Rien', () => apply(0)), btn('−50', () => step(-50)), btn('+50', () => step(50)), btn('Moitié', () => apply(Math.floor(pool() / 2 / 5) * 5)), btn('Tout', () => apply(pool()))),
    info, refillBox, enter);
  apply(Math.min(s.bring || pool(), pool()), false);
  if (s.bring === 0 && pool() > 0) apply(Math.min(pool(), Math.max(100, Math.floor(pool() / 2 / 5) * 5)), false);
  drawRefill();
  if (!soft()) card.animate([{ transform: 'rotateY(90deg) scale(.85)', opacity: 0 }, { transform: 'rotateY(-12deg) scale(1.03)', opacity: 1, offset: 0.65 }, { transform: 'rotateY(0) scale(1)' }], { duration: 700, easing: 'cubic-bezier(.34,1.3,.64,1)' });
  return {
    el, title: 'Carte d\'Auguste', onBack: o.onBack, dispose: () => window.clearInterval(timer),
    help: () => h('div', p('La carte d\'Auguste te permet de choisir combien de jetons tu apportes à la table.'), p('Les jetons sont gratuits et fictifs : ils ne servent qu\'à jouer ici. Tu peux en apporter plus ou moins à tout moment, et en sortant du casino le reste revient dans ta poche.'),
      p(`Si ta bourse est presque vide (moins de ${REFILL_BELOW} jetons), une mini-recharge gratuite jusqu'à ${REFILL_TO} jetons est offerte toutes les 3 minutes environ.`)),
  };
}

// ------------------------------------------------------------------ salon

export interface LobbyOpts { go(game: 'roulette' | 'slots' | 'blackjack' | 'missions' | 'card'): void; onBack(): void }

export function lobbyScene(sh: Shell, o: LobbyOpts): Scene {
  const W = Math.min(440, Math.max(320, Math.round(sh.stage.clientWidth || 393)));
  const hall = casinoHallCanvas(W, Math.round(W * 0.62));
  hall.classList.add('cz-hall');
  const s = cs();
  const claim = MISSIONS.filter((m) => isClaimable(s, m)).length;
  const wheelImg = rouletteWheelCanvas(26, WHEEL_ORDER, colorOf);
  const row = (id: 'roulette' | 'slots' | 'blackjack', name: string, tag: string, icon: Node) =>
    h('button.cz-game', { on: { click: () => { audio.play('pop2'); haptic('select'); o.go(id); } } },
      h('span.cz-gico', icon), h('span.cz-gtxt', h('b', name), h('small', tag)), h('span.cz-chev', '›'));
  const imgs = (...u: string[]) => h('span.cz-ico-row', ...u.map((x) => h('img', { src: x, alt: '', draggable: false })));
  const el = h('div.cz-lobby',
    h('div.cz-halbox', hall, h('div.cz-sign', h('span', '♛'), h('b', 'CASINO ROYAL'), h('span', '♛'))),
    h('div.cz-purse', h('span', `À la table : `, h('b', fmt(s.bring))), h('span', `En poche : `, h('b', fmt(s.chips)))),
    h('div.cz-games',
      row('roulette', 'Roulette', 'Rouge, noir, numéros : chaque case a sa chance', h('span.cz-wheelico', wheelImg)),
      row('slots', 'Machine à sous', 'Cœurs, couronnes, diamants', imgs(slotSymbolUrl('heart', 40), slotSymbolUrl('crown', 40), slotSymbolUrl('diamond', 40))),
      row('blackjack', 'Blackjack', 'Approche 21 sans le dépasser', imgs(cardFaceUrl(1, 0, 44), cardFaceUrl(13, 2, 44)))),
    h('div.cz-sub',
      h('button.cz-pill2', { on: { click: () => { audio.play('select'); o.go('missions'); } } }, '🎀 Missions', claim > 0 ? h('i.cz-badge', String(claim)) : null),
      h('button.cz-pill2', { on: { click: () => { audio.play('select'); o.go('card'); } } }, '💳 Ma carte')),
    h('button.cz-leave', { on: { click: () => { audio.play('button'); o.onBack(); } } }, 'Quitter le casino et reprendre mes jetons'));
  return {
    el, title: 'Casino Royal', onBack: o.onBack,
    help: () => h('div', p('Bienvenue au Casino Royal ! Trois jeux pour s\'amuser : la roulette, la machine à sous RADIA et le blackjack.'),
      p('Tout est facultatif et gratuit. Les jetons sont fictifs : ils ne servent qu\'à jouer ici, et tu en reçois de nouveaux avec les missions, la roue du jour et la mini-recharge.'),
      p('Chaque jeu a son bouton « ? » avec les règles et les probabilités exactes. Aucune manche ne se lance toute seule : c\'est toujours toi qui décides.')),
  };
}

// ------------------------------------------------------------------ missions

const itemName = (m: MissionDef): string | null => {
  if (!m.item) return null;
  return m.item.t === 'cloth' ? (CLOTHES as Record<string, { name: string }>)[m.item.id]?.name ?? m.item.id : (FURNITURE as Record<string, { name: string }>)[m.item.id]?.name ?? m.item.id;
};

export function missionsScene(o: { onBack(): void }): Scene {
  const s = cs();
  const list = h('div.cz-mlist');
  const draw = () => {
    list.replaceChildren(...MISSIONS.map((m) => {
      const done = isDone(s, m.id), can = isClaimable(s, m), prog = progressOf(s, m);
      const nm = itemName(m);
      const b = h('button.btn.small.gold', { on: { click: () => doClaim(m, b) } }, 'Réclamer') as HTMLButtonElement;
      return h(`div.cz-mission${done ? '.done' : ''}${can ? '.ready' : ''}`,
        h('div.cz-mtop', h('b', m.name), done ? h('span.cz-mok', '✓') : null),
        h('small', m.desc),
        h('div.cz-mbar', h('i', { style: `width:${Math.round((prog / m.goal) * 100)}%` })),
        h('div.cz-mrow', h('span.cz-mprog', `${prog}/${m.goal}`), h('span.cz-mrew', `+${m.chips} jetons`, nm ? ` · ${nm}` : '')),
        can ? b : null);
    }));
  };
  const doClaim = (m: MissionDef, b: HTMLElement) => {
    const w = save.data.world;
    const r = claimMission(s, w, m.id);
    if (!r.ok) return;
    persist(); notifyCasino();
    const c = centerOf(b);
    audio.play('reward'); haptic('reward'); celebrate(r.item ? 'big' : 'mid', c);
    ui.toast({ title: `+${r.chips} jetons ♡`, sub: r.item ? (r.duplicate ? 'Objet déjà possédé : jetons en plus' : `Nouveau : ${itemName(m)}`) : m.name, icon: 'star', ms: 3200 });
    draw();
  };
  draw();
  return {
    el: h('div.cz-missions', h('h2', 'Missions'), p('Aucun hasard : il suffit de jouer ou de revenir. Les récompenses sont garanties.', '.cz-lead'), list),
    title: 'Missions', onBack: o.onBack,
    help: () => h('div', p('Les missions se remplissent toutes seules quand tu joues ou que tu reviens au casino. Gagner n\'est jamais nécessaire.'), p('Chaque mission donne des jetons et parfois un objet exclusif pour ton monde. Si tu l\'as déjà, tu reçois des jetons à la place.')),
  };
}

/** Message « il te faut au moins X jetons » avec accès à la carte d'Auguste. */
export function lowFunds(min: number, goCard: () => void): HTMLElement {
  return h('div.cz-low', h('p', `Il te faut au moins ${fmt(min)} jetons à la table.`), h('button.btn.lavande.small', { on: { click: goCard } }, '💳 La carte d\'Auguste'));
}
