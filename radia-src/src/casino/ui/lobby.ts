/** Carte d'Auguste (tickets apportés à la table), salon d'accueil, missions. */
import { h } from '../../ui/dom';
import { audio, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt, fmtTime } from '../../core/wallet';
import { HALL_ASPECT, HALL_SPOTS, casinoHallCanvas, cardFaceUrl, memberCardUrl, rouletteWheelCanvas, slotSymbolUrl } from '../../game/art/casino';
import { CLOTHES } from '../../data/world/wardrobe';
import { FURNITURE } from '../../data/world/furniture';
import { ticketUrl } from '../../game/art/world/giftArt';
import { sparkleBurst } from '../../ui/fx/sparkle';
import { bounce, centerOf, celebrate, soft } from '../fx';
import { cs, persist, notifyCasino, casinoStatus, onCasinoChange } from '../store';
import { DAILY_TASKS, TICKETS_NAME, claimTask, markTask, taskClaimed, taskDone, type DailyTask } from '../tickets';
import { pickLine } from '../../data/augusteTone';
import { nextWheelIn, wheelReady } from '../../wheel/store';
import { canClaimToday } from '../../daily/state';
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
  const slider = h('input.cz-slider', { type: 'range', min: '0', max: String(pool()), step: pool() >= 100 ? '5' : '1', value: String(s.bring), 'aria-label': 'Tickets apportés à la table' }) as HTMLInputElement;
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

  let refillSig = '';
  const drawRefill = () => {
    const w = refillIn(s, Date.now());
    const sig = w === Infinity ? 'none' : w === 0 ? 'ready' : 'wait';
    if (sig === refillSig) { const t = refillBox.querySelector('.cd'); if (t && w !== Infinity) t.textContent = `Prochaine mini-recharge gratuite dans ${fmtTime(w)}.`; return; } // le bouton n'est jamais recréé sous le doigt
    refillSig = sig;
    refillBox.replaceChildren();
    if (w === Infinity) return;
    if (w === 0) {
      refillBox.append(p(`Ta bourse est presque vide ? Auguste t'offre une mini-recharge gratuite jusqu'à ${REFILL_TO} tickets.`, '.cz-small'),
        h('button.btn.lavande.wide', { on: { click: () => { const g = refill(s, Date.now()); if (g > 0) { audio.play('reward'); haptic('reward'); persist(); notifyCasino(); celebrate('small', centerOf(card)); apply(Math.min(pool(), s.bring + g), false); drawRefill(); } } } }, 'Recevoir ma mini-recharge ♡'));
    } else {
      refillBox.append(p(`Prochaine mini-recharge gratuite dans ${fmtTime(w)}.`, '.cz-small.cd'));
    }
  };
  slider.addEventListener('input', () => apply(Number(slider.value), false));
  slider.addEventListener('change', () => apply(Number(slider.value)));
  timer = window.setInterval(() => { if (refillIn(s, Date.now()) !== Infinity) drawRefill(); }, 1000);

  const el = h('div.cz-card',
    o.welcomed ? h('div.cz-welcome', `Bienvenue ! Auguste t'offre ${WELCOME_CHIPS} tickets pour ta première soirée ♡`) : null,
    card,
    h('h2', 'La carte d\'Auguste'),
    p('Combien de tickets apportes-tu à la table ? Tout reste virtuel et gratuit : en sortant, tu reprends le reste.', '.cz-lead'),
    h('div.cz-amtrow', h('img', { src: ticketUrl(52), alt: '', draggable: false }), amount),
    h('div.cz-sliderrow', btn('−', () => step(-10), '.big'), slider, btn('+', () => step(10), '.big')),
    h('div.cz-quick', btn('Rien', () => apply(0)), btn('−50', () => step(-50)), btn('+50', () => step(50)), btn('Moitié', () => apply(Math.floor(pool() / 2 / 5) * 5)), btn('Tout', () => apply(pool()))),
    info, refillBox, enter);
  apply(Math.min(s.bring || pool(), pool()), false);
  if (s.bring === 0 && pool() > 0) apply(Math.min(pool(), Math.max(100, Math.floor(pool() / 2 / 5) * 5)), false);
  drawRefill();
  if (!soft()) card.animate([{ transform: 'rotateY(90deg) scale(.85)', opacity: 0 }, { transform: 'rotateY(-12deg) scale(1.03)', opacity: 1, offset: 0.65 }, { transform: 'rotateY(0) scale(1)' }], { duration: 700, easing: 'cubic-bezier(.34,1.3,.64,1)' });
  return {
    el, title: 'Carte d\'Auguste', onBack: o.onBack, dispose: () => window.clearInterval(timer),
    help: () => h('div', p('La carte d\'Auguste te permet de choisir combien de tickets tu apportes à la table.'), p('Les tickets sont gratuits et fictifs : ils ne servent qu\'à jouer ici. Tu peux en apporter plus ou moins à tout moment, et en sortant du casino le reste revient dans ta poche.'),
      p(`Si ta bourse est presque vide (moins de ${REFILL_BELOW} tickets), une mini-recharge gratuite jusqu'à ${REFILL_TO} tickets est offerte toutes les 3 minutes environ.`)),
  };
}

// ------------------------------------------------------------------ salon

export type LobbyGo = 'roulette' | 'slots' | 'blackjack' | 'missions' | 'card' | 'wheel' | 'daily';
export interface LobbyOpts { go(game: LobbyGo): void; onBack(): void }

const RADIA_LINES = ['Oh, ça brille partout ici !', 'On commence par quoi ? ♡', 'Rien que pour s\'amuser, hein ?', 'La grande roue me fait de l\'œil…', 'Les lustres sont magnifiques.'];
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];
const left = (ms: number): string => { const m = Math.ceil(ms / 60000); const hh = Math.floor(m / 60); return hh > 0 ? `${hh} h ${String(m % 60).padStart(2, '0')} min` : m > 0 ? `${m} min` : 'moins d\'une minute'; };

export function lobbyScene(sh: Shell, o: LobbyOpts): Scene {
  const W = Math.min(440, Math.max(320, Math.round(sh.stage.clientWidth || 393)));
  const hall = casinoHallCanvas(W, Math.round(W * HALL_ASPECT));
  hall.classList.add('cz-hall');
  const s = cs();
  const claim = MISSIONS.filter((m) => isClaimable(s, m)).length;
  const wheelImg = rouletteWheelCanvas(26, WHEEL_ORDER, colorOf);
  const row = (id: 'roulette' | 'slots' | 'blackjack', name: string, tag: string, icon: Node) =>
    h('button.cz-game', { on: { click: () => { audio.play('pop2'); haptic('select'); o.go(id); } } },
      h('span.cz-gico', icon), h('span.cz-gtxt', h('b', name), h('small', tag)), h('span.cz-chev', '›'));
  const imgs = (...u: string[]) => h('span.cz-ico-row', ...u.map((x) => h('img', { src: x, alt: '', draggable: false })));

  // zones tactiles sur l'illustration (chacune a une vraie cible de 44 px au minimum)
  const spot = (key: keyof typeof HALL_SPOTS, label: string, aria: string, fn: () => void, pill = true) => {
    const r = HALL_SPOTS[key];
    const b = h(`button.cz-spot.${key}`, { 'aria-label': aria, style: `left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%` }, pill ? h('span', label) : null);
    b.addEventListener('click', fn);
    return b;
  };
  // petites bulles de Radia et d'Auguste (rares : une toutes les ~11 s au plus, jamais en rafale)
  const bubble = h('div.cz-bubble');
  let bubbleTimer = 0, lastSay = 0;
  const say = (who: 'radia' | 'auguste', text: string, force = false) => {
    if (!force && Date.now() - lastSay < 2500) return;
    lastSay = Date.now();
    bubble.textContent = text;
    bubble.className = `cz-bubble ${who} on`;
    window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => bubble.classList.remove('on'), 3600);
  };
  const greeted = new Set<string>();
  const greet = (who: 'radia' | 'auguste') => {
    audio.play('pop3'); haptic('select');
    say(who, who === 'radia' ? pick(RADIA_LINES) : pickLine('welcomeBack'), true);
    const r = (who === 'radia' ? radiaSpot : augusteSpot).getBoundingClientRect();
    sparkleBurst(r.left + r.width / 2, r.top + r.height * 0.3, { rarity: 'uncommon', count: 6 });
    greeted.add(who);
    if (greeted.size === 2 && !taskDone(s, 'greet')) { markTask(s, 'greet'); persist(); drawTasks(); drawFree(); }
  };
  const radiaSpot = spot('radia', '', 'Saluer Radia', () => greet('radia'), false);
  const augusteSpot = spot('auguste', '', 'Saluer Auguste', () => greet('auguste'), false);
  const twinkles = [[14, 18], [30, 10], [58, 16], [78, 9], [90, 30], [8, 44], [66, 40]].map(([x, y], i) => h('i.cz-tw', { style: `left:${x}%;top:${y}%;animation-delay:${(i * 0.55).toFixed(2)}s` }));
  const halbox = h('div.cz-halbox', hall, h('div.cz-lights'), ...twinkles, h('div.cz-sign', h('span', '♛'), h('b', 'CASINO ROYAL'), h('span', '♛')),
    spot('slots', 'Machines', 'Aller aux machines à sous', () => { audio.play('pop2'); o.go('slots'); }),
    spot('wheel', 'Roue du jour', 'Ouvrir la grande roue du jour', () => { audio.play('pop2'); o.go('wheel'); }),
    spot('roulette', 'Roulette', 'Aller à la table de roulette', () => { audio.play('pop2'); o.go('roulette'); }),
    spot('blackjack', 'Blackjack', 'Aller à la table de blackjack', () => { audio.play('pop2'); o.go('blackjack'); }),
    radiaSpot, augusteSpot, bubble);

  // ---- prochain gain gratuit (reconstruit seulement quand son contenu change : un bouton ne disparaît jamais sous le doigt)
  const free = h('div.cz-free');
  let freeSig = '';
  const drawFree = () => {
    const now = Date.now();
    const st = casinoStatus(now);
    const wr = wheelReady(now), dg = canClaimToday(), tk = st.tasks > 0, rf = refillIn(s, now);
    type Row = { ico: string; title: string; sub: string; cd?: boolean; btn?: { label: string; fn: () => void } };
    const rows: Row[] = [];
    if (rf !== Infinity) rows.push(rf === 0
      ? { ico: '🎟️', title: 'Mini-recharge gratuite', sub: `Ta bourse est presque vide : Auguste t'offre jusqu'à ${REFILL_TO} tickets.`, btn: { label: 'Recevoir', fn: () => { const g = refill(s, Date.now()); if (g > 0) { audio.play('reward'); haptic('reward'); persist(); notifyCasino(); celebrate('small', centerOf(free)); sh.setShown(s.bring); drawFree(); drawPurse(); } } } }
      : { ico: '🎟️', title: 'Mini-recharge gratuite', sub: `Prochaine dans ${fmtTime(rf)} : tu ne restes jamais bloquée.`, cd: true });
    if (wr) rows.push({ ico: '🎡', title: 'La roue du jour t\'attend', sub: 'Un tirage gratuit : tickets, diamants, accessoires…', btn: { label: 'Tourner', fn: () => o.go('wheel') } });
    if (dg) rows.push({ ico: '🎁', title: 'Ton cadeau du jour t\'attend', sub: 'Une surprise de plus dans le calendrier de 7 jours.', btn: { label: 'Ouvrir', fn: () => o.go('daily') } });
    if (tk) rows.push({ ico: '🎀', title: `${st.tasks} ticket${st.tasks > 1 ? 's' : ''} du jour à récupérer`, sub: 'Les mini-défis sans hasard sont accomplis.' });
    if (rows.length === 0) {
      const next = Math.min(nextWheelIn(now), rf === Infinity ? Infinity : rf);
      rows.push({ ico: '✨', title: 'Prochain gain gratuit', sub: next === Infinity ? 'Les mini-défis du jour reviennent demain ♡' : `La roue du jour revient dans ${left(next)} ♡`, cd: true });
    }
    const sig = JSON.stringify(rows.map((r) => [r.ico, r.title, r.cd ? '' : r.sub, r.btn?.label ?? '']));
    if (sig === freeSig && free.childElementCount > 0) { // seul le compte à rebours bouge : on met le texte à jour sur place
      free.querySelectorAll<HTMLElement>('.cd').forEach((el, i) => { const r = rows.filter((x) => x.cd)[i]; if (r) el.textContent = r.sub; });
      return;
    }
    freeSig = sig;
    free.replaceChildren(h('h3', 'Prochain gain gratuit ♡'), ...rows.map((r) => h('div.cz-fitem', h('span.cz-fico', r.ico), h('div.cz-ftxt', h('b', r.title), h(r.cd ? 'small.cd' : 'small', r.sub)), r.btn ? h('button.btn.small.gold', { on: { click: r.btn.fn } }, r.btn.label) : null)));
  };

  // ---- mini-défis du jour (sans hasard, sans mise)
  const tasks = h('div.cz-tasks');
  const drawTasks = () => {
    const now = Date.now();
    tasks.replaceChildren(h('h3', 'Tickets du jour'), p('Des mini-défis sans hasard, sans mise : ils reviennent chaque jour.', '.cz-tsub'),
      ...DAILY_TASKS.map((t) => {
        const done = taskDone(s, t.id, now), got = taskClaimed(s, t.id, now);
        const b = done && !got ? h('button.btn.small.gold', { on: { click: () => claimIt(t.id, b) } }, 'Réclamer') : h(`span.cz-tstate${got ? '.ok' : ''}`, got ? '✓' : 'À faire');
        return h(`div.cz-task${got ? '.done' : done ? '.ready' : ''}`, h('div.cz-ttxt', h('b', t.name), h('small', t.desc)), h('span.cz-treward', `+${t.tickets}`), b);
      }));
  };
  const claimIt = (id: DailyTask['id'], b: Element) => {
    const g = claimTask(s, id);
    if (g <= 0) { drawTasks(); return; }
    persist(); notifyCasino();
    audio.play('reward'); haptic('reward'); celebrate('small', centerOf(b));
    void sh.fly(centerOf(b), 4, 25).then(() => { sh.setShown(s.bring); });
    drawTasks(); drawFree(); drawPurse();
  };

  const purse = h('div.cz-purse');
  const drawPurse = () => purse.replaceChildren(h('span', 'À la table : ', h('b', fmt(s.bring))), h('span', 'En poche : ', h('b', fmt(s.chips))));
  drawPurse(); drawTasks(); drawFree();
  const timer = window.setInterval(() => { drawFree(); }, 1000);
  const sayTimer = window.setInterval(() => { if (document.hidden) return; if (Math.random() < 0.55) say(Math.random() < 0.5 ? 'radia' : 'auguste', Math.random() < 0.5 ? pick(RADIA_LINES) : pickLine('welcomeBack')); }, 11000);
  const offChange = onCasinoChange(() => { drawPurse(); });
  window.setTimeout(() => { if (halbox.isConnected && !soft()) say('radia', 'Bienvenue au Casino Royal ♡'); }, 900);

  const el = h('div.cz-lobby',
    halbox,
    purse,
    free,
    h('div.cz-games',
      row('roulette', 'Roulette', 'Rouge, noir, numéros : chaque case a sa chance', h('span.cz-wheelico', wheelImg)),
      row('slots', 'Machine à sous', 'Cœurs, couronnes, diamants', imgs(slotSymbolUrl('heart', 40), slotSymbolUrl('crown', 40), slotSymbolUrl('diamond', 40))),
      row('blackjack', 'Blackjack', 'Approche 21 sans le dépasser', imgs(cardFaceUrl(1, 0, 44), cardFaceUrl(13, 2, 44)))),
    tasks,
    h('div.cz-sub',
      h('button.cz-pill2', { on: { click: () => { audio.play('select'); o.go('missions'); } } }, '🎀 Missions', claim > 0 ? h('i.cz-badge', String(claim)) : null),
      h('button.cz-pill2', { on: { click: () => { audio.play('select'); o.go('wheel'); } } }, '🎡 Roue du jour', wheelReady() ? h('i.cz-badge', '!') : null),
      h('button.cz-pill2', { on: { click: () => { audio.play('select'); o.go('card'); } } }, '💳 Ma carte')),
    h('button.cz-leave', { on: { click: () => { audio.play('button'); o.onBack(); } } }, 'Quitter le casino et reprendre mes tickets'));
  return {
    el, title: 'Casino Royal', onBack: o.onBack,
    dispose: () => { window.clearInterval(timer); window.clearInterval(sayTimer); window.clearTimeout(bubbleTimer); offChange(); },
    help: () => h('div', p(`Bienvenue au Casino Royal ! Trois jeux pour s'amuser : la roulette, la machine à sous RADIA et le blackjack. Touche l'illustration ou les boutons pour y aller.`),
      p(`Tout est facultatif. Les ${TICKETS_NAME} sont gratuits : ils ne s'achètent pas, ne se convertissent pas et ne se donnent pas. Tu en reçois avec l'allocation d'ouverture, le cadeau du jour, la roue du jour, les missions, les mini-défis « Tickets du jour », les événements du mode Libre et les succès.`),
      p(`Aucun objet important n'est réservé au hasard : les missions sans hasard donnent aussi les objets exclusifs. Si ta bourse est presque vide, une mini-recharge gratuite revient toutes les 3 minutes : tu n'es jamais bloquée.`),
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
        h('div.cz-mrow', h('span.cz-mprog', `${prog}/${m.goal}`), h('span.cz-mrew', `+${m.chips} tickets`, nm ? ` · ${nm}` : '')),
        can ? b : null);
    }));
  };
  const doClaim = (m: MissionDef, _b: HTMLElement) => {
    const w = save.data.world;
    const r = claimMission(s, w, m.id);
    if (!r.ok) return;
    persist(); notifyCasino();
    draw();
    // coffre de mission : ouverture mise en scène (récompenses déjà versées ci-dessus, affichage seulement)
    void Promise.all([import('../../ui/rewards'), import('../../ui/rewards/adapters')]).then(([rw, ad]) => rw.openGift(ad.casinoMissionSpec({ name: m.name, chips: r.chips, item: r.item, duplicate: r.duplicate })));
  };
  draw();
  return {
    el: h('div.cz-missions', h('h2', 'Missions'), p('Aucun hasard : il suffit de jouer ou de revenir. Les récompenses sont garanties.', '.cz-lead'), list),
    title: 'Missions', onBack: o.onBack,
    help: () => h('div', p('Les missions se remplissent toutes seules quand tu joues ou que tu reviens au casino. Gagner n\'est jamais nécessaire.'), p('Chaque mission donne des tickets et parfois un objet exclusif pour ton monde. Si tu l\'as déjà, tu reçois des tickets à la place.')),
  };
}

/** Message « il te faut au moins X tickets » avec accès à la carte d'Auguste. */
export function lowFunds(min: number, goCard: () => void): HTMLElement {
  return h('div.cz-low', h('p', `Il te faut au moins ${fmt(min)} tickets à la table.`), h('button.btn.lavande.small', { on: { click: goCard } }, '💳 La carte d\'Auguste'));
}
