/** Carte d'Auguste (ta bourse de pièces), salon d'accueil, missions. */
import { h } from '../../ui/dom';
import { audio, events, save } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt } from '../../core/wallet';
import { HALL_ASPECT, HALL_SPOTS, casinoHallCanvas, cardFaceUrl, memberCardUrl, rouletteWheelCanvas, slotSymbolUrl } from '../../game/art/casino';
import { CLOTHES } from '../../data/world/wardrobe';
import { FURNITURE } from '../../data/world/furniture';
import { sparkleBurst } from '../../ui/fx/sparkle';
import { centerOf, celebrate, soft } from '../fx';
import { cs, persist, notifyCasino, casinoStatus, onCasinoChange } from '../store';
import { DAILY_TASKS, claimTask, markTask, taskClaimed, taskDone, type DailyTask } from '../rewards';
import { addRes } from '../../core/world';
import { pickLine } from '../../data/augusteTone';
import { nextWheelIn, wheelReady } from '../../wheel/store';
import { canClaimToday } from '../../daily/state';
import { WELCOME_COINS } from '../chips';
import { balance } from '../bank';
import { resIconUrl } from '../../game/art/world/resources';
import { MISSIONS, claimMission, isClaimable, isDone, progressOf, type MissionDef } from '../missions';
import { WHEEL_ORDER, colorOf } from '../roulette';
import type { Scene, Shell } from './shell';

const p = (t: string, cls = ''): HTMLElement => { const e = h('p', t); for (const c of cls.split('.').filter(Boolean)) e.classList.add(c); return e; };

// ------------------------------------------------------------------ carte d'Auguste

export function cardScene(sh: Shell, o: { welcomed: boolean; onEnter(): void; onBack(): void; onPrivileges(): void }): Scene {
  const card = h('img.cz-member', { src: memberCardUrl(320), alt: 'Carte de membre offerte par Auguste', draggable: false });
  const wallet = h('div.cz-wallet');
  const enter = h('button.btn.gold.wide.cz-enter', { on: { click: () => { audio.play('pop2'); const r = card.getBoundingClientRect(); sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, { rarity: 'rare', count: 12 }); o.onEnter(); } } }, 'Entrer au salon ♡') as HTMLButtonElement;

  const drawWallet = () => {
    wallet.replaceChildren(
      h('div.cz-w', h('img', { src: resIconUrl('coins', 40), alt: '', draggable: false }), h('div', h('b', fmt(balance())), h('small', 'pièces — ta mise au casino'))));
  };
  drawWallet(); sh.setShown(balance());

  const el = h('div.cz-card',
    o.welcomed ? h('div.cz-welcome', `Bienvenue ! Auguste t'offre ${WELCOME_COINS} pièces pour ta première soirée ♡`) : null,
    card,
    h('h2', 'La carte d\'Auguste'),
    p('Au Casino Royal, tu mises les pièces que tu gagnes dans RADIA. Tout reste virtuel : jamais d\'argent réel, jamais obligatoire. Les règles et les probabilités sont affichées dans l\'aide (?) de chaque jeu.', '.cz-lead'),
    wallet,
    p('Si tu perds tout, rien de grave : tes commandes en rapportent toujours ♡', '.cz-small'),
    h('button.btn.lavande.wide', { on: { click: () => { audio.play('select'); o.onPrivileges(); } } }, '✨ Privilèges (pièces)'),
    enter);
  return {
    el, title: 'Carte d\'Auguste', onBack: o.onBack,
    help: () => h('div', p('Les jeux du casino se jouent avec les pièces de RADIA : le même portefeuille que partout ailleurs. Tu peux miser 100, 250, 500, 1 000, 2 500, 5 000, 10 000 pièces ou plus si ta bourse le permet (au maximum la moitié de ta bourse, et au moins 10 000 si tu les as).'),
      p('Les privilèges du casino proposent des objets exclusifs (tenues, décors, coffret d’atelier) contre des pièces ; les missions du casino les offrent aussi, sans rien dépenser.')),
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
    const wr = wheelReady(now), dg = canClaimToday(), tk = st.tasks > 0; // pas de mini-recharge : les jeux se jouent avec les pièces, qui reviennent avec les commandes
    type Row = { ico: string; title: string; sub: string; cd?: boolean; btn?: { label: string; fn: () => void } };
    const rows: Row[] = [];
    if (wr) rows.push({ ico: '🎡', title: 'La roue du jour t\'attend', sub: 'Un tirage gratuit : pièces, diamants, énergie, accessoires…', btn: { label: 'Tourner', fn: () => o.go('wheel') } });
    if (dg) rows.push({ ico: '🎁', title: 'Ton cadeau du jour t\'attend', sub: 'Une surprise de plus dans le calendrier de 7 jours.', btn: { label: 'Ouvrir', fn: () => o.go('daily') } });
    if (tk) rows.push({ ico: '🎀', title: `${st.tasks} défi${st.tasks > 1 ? 's' : ''} du jour à récupérer`, sub: 'Les mini-défis sans hasard sont accomplis.' });
    if (rows.length === 0) {
      const next = nextWheelIn(now);
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
    tasks.replaceChildren(h('h3', 'Défis du jour'), p('Des mini-défis sans hasard, sans mise : ils reviennent chaque jour.', '.cz-tsub'),
      ...DAILY_TASKS.map((t) => {
        const done = taskDone(s, t.id, now), got = taskClaimed(s, t.id, now);
        const b = done && !got ? h('button.btn.small.gold', { on: { click: () => claimIt(t.id, b) } }, 'Réclamer') : h(`span.cz-tstate${got ? '.ok' : ''}`, got ? '✓' : 'À faire');
        return h(`div.cz-task${got ? '.done' : done ? '.ready' : ''}`, h('div.cz-ttxt', h('b', t.name), h('small', t.desc)), h('span.cz-treward', h('img', { src: resIconUrl('coins', 18), alt: '', draggable: false, style: 'width:16px;vertical-align:middle;margin-right:2px' }), `+${t.coins}`), b);
      }));
  };
  const claimIt = (id: DailyTask['id'], b: Element) => {
    const g = claimTask(s, id); // pièces autorisées (plafond du jour) : on les verse dans le portefeuille unique
    if (g <= 0) { drawTasks(); return; }
    addRes('coins', g);
    persist(); notifyCasino();
    audio.play('reward'); haptic('reward'); celebrate('small', centerOf(b));
    void sh.fly(centerOf(b), 4, 25).then(() => { sh.setShown(balance()); });
    drawTasks(); drawFree(); drawPurse();
  };

  const purse = h('div.cz-purse');
  const drawPurse = () => purse.replaceChildren(h('img', { src: resIconUrl('coins', 22), alt: '', draggable: false, style: 'width:20px;vertical-align:middle;margin-right:4px' }), h('span', 'Pièces : ', h('b', fmt(balance()))));
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
    h('button.cz-leave', { on: { click: () => { audio.play('button'); o.onBack(); } } }, 'Quitter le casino'));
  return {
    el, title: 'Casino Royal', onBack: o.onBack,
    dispose: () => { window.clearInterval(timer); window.clearInterval(sayTimer); window.clearTimeout(bubbleTimer); offChange(); },
    help: () => h('div', p(`Bienvenue au Casino Royal ! Trois jeux pour s'amuser : la roulette, la machine à sous RADIA et le blackjack. Touche l'illustration ou les boutons pour y aller.`),
      p(`Tout est facultatif. Les jeux se jouent avec tes pièces dorées : le même portefeuille que partout dans RADIA. Tu en gagnes avec tes commandes, le cadeau du jour, la roue du jour, les missions, les défis du jour, les événements du mode Libre et les succès.`),
      p(`Aucun objet important n'est réservé au hasard : les missions sans hasard donnent aussi les objets exclusifs. Si ta bourse est vide, rien de grave : tes commandes en rapportent toujours.`),
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
        h('div.cz-mrow', h('span.cz-mprog', `${prog}/${m.goal}`), h('span.cz-mrew', `+${fmt(m.coins)} pièces`, nm ? ` · ${nm}` : '')),
        can ? b : null);
    }));
  };
  const doClaim = (m: MissionDef, _b: HTMLElement) => {
    const w = save.data.world;
    const r = claimMission(s, w, m.id);
    if (!r.ok) return;
    events.emit('economy', undefined); // les pièces gagnées sont dans le portefeuille unique : les compteurs se mettent à jour
    persist(); notifyCasino();
    draw();
    // coffre de mission : ouverture mise en scène (récompenses déjà versées ci-dessus, affichage seulement)
    void Promise.all([import('../../ui/rewards'), import('../../ui/rewards/adapters')]).then(([rw, ad]) => rw.openGift(ad.casinoMissionSpec({ name: m.name, coins: r.coins, item: r.item, duplicate: r.duplicate })));
  };
  draw();
  return {
    el: h('div.cz-missions', h('h2', 'Missions'), p('Aucun hasard : il suffit de jouer ou de revenir. Les récompenses sont garanties.', '.cz-lead'), list),
    title: 'Missions', onBack: o.onBack,
    help: () => h('div', p('Les missions se remplissent toutes seules quand tu joues ou que tu reviens au casino. Gagner n\'est jamais nécessaire.'), p('Chaque mission donne des pièces et parfois un objet exclusif pour ton monde. Si tu l\'as déjà, tu reçois des pièces à la place.')),
  };
}

/** Message « il te faut au moins X pièces » avec accès à la carte d'Auguste. */
export function lowFunds(min: number, goCard: () => void): HTMLElement {
  return h('div.cz-low', h('p', `Il te faut au moins ${fmt(min)} pièces pour jouer ici. Le casino n’est jamais obligatoire : tes commandes en rapportent ♡`), h('button.btn.lavande.small', { on: { click: goCard } }, 'Retour'));
}
