/** Scène Blackjack : distribution animée (glissement, retournement, rebond), Tirer / Rester / Doubler, croupier jusqu'à 17. */
import { h } from '../../ui/dom';
import { audio } from '../../core/app';
import { haptic } from '../../core/haptics';
import { fmt } from '../../core/wallet';
import { cardBackUrl, cardFaceUrl, chipUrl } from '../../game/art/casino';
import { bounce, celebrate, centerOf, shake, soft, wait } from '../fx';
import { cs, hooks, notifyCasino, persist } from '../store';
import { LIMITS, recordRound } from '../chips';
import { balance, creditCoins as credit, debitCoins as debit, maxBet } from '../bank';
import { canDouble, doubleDown, freshShuffledDeck, handValue, hit, returned, stakeOf, stand, startRound, type Card, type Outcome, type Round } from '../blackjack';
import { defaultRng, seededRng } from '../rng';
import { lowFunds } from './lobby';
import type { Scene, Shell } from './shell';

const CHIPS = [50, 100, 500, 1000, 5000] as const;

export function helpBlackjack(): HTMLElement {
  return h('div',
    h('p', 'Approche 21 sans le dépasser, et fais mieux que le croupier.'),
    h('ul.cz-list', ...[
      'Les cartes de 2 à 10 valent leur chiffre, Valet, Dame et Roi valent 10, l\'As vaut 1 ou 11 (le plus avantageux).',
      'Tu reçois 2 cartes, le croupier en montre une (l\'autre est cachée). Tire une carte, reste, ou double.',
      'Doubler : seulement sur tes deux premières cartes. Ta mise est doublée, tu reçois UNE seule carte, puis le croupier joue.',
      'Si tu dépasses 21, tu perds tout de suite.',
      'Le croupier tire jusqu\'à 17 et reste sur 17 (même avec un As).',
      'Blackjack naturel (As + figure ou 10 en deux cartes) : payé 3 pour 2. Victoire : 1 pour 1 (mise rendue en plus). Égalité : ta mise est rendue. Défaite : la mise est perdue.',
      `Mises de ${LIMITS.blackjack.min} pièces jusqu'à la moitié de ta bourse, par pas de ${LIMITS.blackjack.step}.`,
      'À chaque donne, un paquet de 52 cartes neuf est mélangé honnêtement (Fisher–Yates) : aucune carte n\'est truquée et rien ne dépend de tes parties précédentes.',
    ].map((t) => h('li', t))),
    h('p', 'Pas d\'assurance ni de séparation des paires : c\'est un blackjack simplifié.'));
}

const OUT: Record<Outcome, string> = { blackjack: 'BLACKJACK ♛', win: 'Gagné ! ♡', push: 'Égalité', lose: 'Perdu', bust: 'Dépassé !' };

export function blackjackScene(sh: Shell, o: { onBack(): void; goCard(): void }): Scene {
  let bet = 0, last = 0, phase: 'bet' | 'dealing' | 'player' | 'end' = 'bet', round: Round | null = null, settled = false, alive = true;
  const cap = () => maxBet();

  const dealerHand = h('div.bj-hand.dealer'), playerHand = h('div.bj-hand.player');
  const dVal = h('span.bj-val', ''), pVal = h('span.bj-val', '');
  const deck = h('div.bj-deck', h('img', { src: cardBackUrl(132), alt: '', draggable: false }), h('img', { src: cardBackUrl(132), alt: '', draggable: false }));
  const banner = h('div.bj-banner');
  const betPile = h('div.bj-pile');
  const betTxt = h('b', '0');
  const rules = h('div.bj-rules', h('b', 'Règles & gains'), h('span', 'Blackjack naturel : 3 pour 2 · Victoire : 1 pour 1'), h('span', 'Égalité : mise rendue · Le croupier tire jusqu\'à 17'), h('span', 'Doubler : 1 seule carte, mise doublée'));
  const ctrl = h('div.bj-ctrl');
  const low = h('div.bj-lowbox');

  // ---------------------------------------------------------------- cartes
  function cardEl(c: Card, up: boolean): HTMLElement {
    const front = h('img.bj-front', { src: up ? cardFaceUrl(c.rank, c.suit, 132) : '', alt: '', draggable: false }) as HTMLImageElement;
    const back = h('img.bj-back', { src: cardBackUrl(132), alt: '', draggable: false });
    const el = h(`div.bj-card${up ? '.up' : ''}`, h('div.bj-inner', front, back));
    (el as HTMLElement & { c?: Card }).c = c;
    return el;
  }
  const spread = (hand: HTMLElement) => { const n = hand.children.length; hand.style.setProperty('--ov', n > 3 ? `${-46 - (n - 3) * 6}px` : '-40px'); };

  async function dealCard(hand: HTMLElement, c: Card, up: boolean): Promise<HTMLElement> {
    const el = cardEl(c, up);
    hand.append(el); spread(hand);
    audio.play('cardDeal', 0.9 + Math.random() * 0.2); haptic('cardDeal');
    if (!soft() && deck.isConnected) {
      const a = deck.getBoundingClientRect(), b = el.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2);
      el.animate([
        { transform: `translate(${dx}px,${dy}px) rotate(-24deg) scale(.7)`, opacity: 0.4 },
        { transform: 'translate(0,0) rotate(3deg) scale(1.06)', opacity: 1, offset: 0.78 },
        { transform: 'translate(0,0) rotate(0) scale(1)' }], { duration: 440, easing: 'cubic-bezier(.22,.8,.3,1)' });
      await wait(300);
      if (up) { audio.play('cardFlip'); }
    } else await wait(120);
    return el;
  }
  async function flip(el: HTMLElement): Promise<void> {
    const c = (el as HTMLElement & { c: Card }).c;
    (el.querySelector('.bj-front') as HTMLImageElement).src = cardFaceUrl(c.rank, c.suit, 132);
    audio.play('cardFlip'); haptic('cardDeal');
    el.classList.add('up');
    await wait(soft() ? 100 : 380);
  }

  function values(hideSecond: boolean): void {
    if (!round) { pVal.textContent = ''; dVal.textContent = ''; return; }
    const p = handValue(round.player), d = handValue(hideSecond ? round.dealer.slice(0, 1) : round.dealer);
    pVal.textContent = `${p.total}${p.soft && p.total < 21 ? ' souple' : ''}`;
    dVal.textContent = hideSecond ? `${d.total} + ?` : `${d.total}${d.soft && d.total < 21 ? ' souple' : ''}`;
    pVal.classList.toggle('bust', p.total > 21);
    dVal.classList.toggle('bust', !hideSecond && d.total > 21);
  }

  // ---------------------------------------------------------------- mise
  function drawPile(): void {
    const stake = round ? stakeOf(round) : bet;
    betTxt.textContent = fmt(stake);
    const chips: number[] = []; let rest = stake;
    for (const v of [5000, 1000, 500, 100, 50, 10]) { while (rest >= v && chips.length < 9) { chips.push(v); rest -= v; } }
    betPile.replaceChildren(...chips.map((v, i) => h('img', { src: chipUrl(v, 44), alt: '', draggable: false, style: `bottom:${i * 5}px;left:${(i % 2) * 3}px` })));
  }

  function drawCtrl(): void {
    ctrl.replaceChildren();
    rules.style.display = phase === 'bet' ? '' : 'none';
    if (phase === 'bet') {
      const go = h('button.btn.gold.wide', 'Distribuer') as HTMLButtonElement;
      go.disabled = bet < LIMITS.blackjack.min || bet > cap();
      go.textContent = bet < LIMITS.blackjack.min ? `Mise minimum : ${LIMITS.blackjack.min}` : `Distribuer · ${fmt(bet)} ♡`;
      go.addEventListener('click', () => void deal());
      const row = h('div.bj-chips', ...CHIPS.map((v) => {
        const b = h('button.rl-chip', { 'aria-label': `Ajouter ${v}` }, h('img', { src: chipUrl(v, 52), alt: '', draggable: false })) as HTMLButtonElement;
        const ok = bet + v <= cap();
        b.disabled = !ok; b.classList.toggle('dim', !ok);
        b.addEventListener('click', () => { bet += v; audio.play('chip', 0.9 + Math.random() * 0.25); haptic('bet'); bounce(betPile, 1.1); refresh(); });
        return b;
      }), h('button.cz-mini', { on: { click: () => { bet = 0; audio.play('select'); refresh(); } } }, 'Effacer'),
      last >= LIMITS.blackjack.min && last <= cap() && last !== bet ? h('button.cz-mini', { on: { click: () => { bet = last; audio.play('chip'); haptic('bet'); refresh(); } } }, `⟲ ${fmt(last)}`) : null);
      ctrl.append(row, go);
      low.replaceChildren(balance() < LIMITS.blackjack.min ? lowFunds(LIMITS.blackjack.min, o.goCard) : '');
    } else if (phase === 'player' && round) {
      const afford = balance() >= round.bet;
      const hitB = h('button.btn.wide', { on: { click: () => void act('hit') } }, 'Tirer');
      const standB = h('button.btn.lavande.wide', { on: { click: () => void act('stand') } }, 'Rester');
      const dblB = h('button.btn.secondary.wide', { on: { click: () => void act('double') } }, `Doubler +${fmt(round.bet)}`) as HTMLButtonElement;
      dblB.disabled = !(canDouble(round) && afford);
      ctrl.append(h('div.bj-acts', hitB, standB, dblB));
    } else if (phase === 'end') {
      const again = h('button.btn.gold.wide', { on: { click: () => newHand() } }, 'Nouvelle donne');
      ctrl.append(again);
    } else {
      ctrl.append(h('p.bj-wait', phase === 'dealing' ? 'Le croupier distribue…' : ''));
    }
    low.style.display = phase === 'bet' ? '' : 'none';
  }

  function refresh(): void { bet = Math.min(bet, cap()); drawPile(); drawCtrl(); }

  function newHand(): void {
    audio.play('button');
    dealerHand.replaceChildren(); playerHand.replaceChildren(); banner.className = 'bj-banner'; banner.textContent = '';
    round = null; settled = false; phase = 'bet'; values(false);
    bet = last && last <= cap() ? last : 0;
    refresh();
  }

  // ---------------------------------------------------------------- manche
  async function deal(): Promise<void> {
    if (phase !== 'bet') return;
    if (bet < LIMITS.blackjack.min || bet > cap()) { haptic('error'); audio.play('invalid'); return; }
    if (!debit(bet)) return; // mise débitée AVANT la donne
    last = bet; persist(); void sh.sync(false);
    phase = 'dealing'; settled = false; drawCtrl();
    const rng = hooks.deckSeed !== null ? seededRng(hooks.deckSeed) : (hooks.rng ?? defaultRng);
    hooks.deckSeed = null;
    round = startRound(freshShuffledDeck(rng), bet);
    drawPile(); values(true);
    const r = round;
    await dealCard(playerHand, r.player[0], true); if (!alive) return;
    await dealCard(dealerHand, r.dealer[0], true);
    values(true);
    await dealCard(playerHand, r.player[1], true);
    const hidden = await dealCard(dealerHand, r.dealer[1], false);
    values(true);
    (hidden as HTMLElement).dataset.hidden = '1';
    if (!alive) return;
    if (r.phase === 'done') { await wait(300); await flip(hidden); await finish(); return; }
    phase = 'player'; drawCtrl();
  }

  async function act(a: 'hit' | 'stand' | 'double'): Promise<void> {
    const r = round;
    if (!r || phase !== 'player') return;
    const hidden = dealerHand.children[1] as HTMLElement;
    if (a === 'hit') {
      phase = 'dealing'; drawCtrl();
      const c = hit(r)!;
      await dealCard(playerHand, c, true); values(true);
      if (r.phase === 'done') { await wait(250); await flip(hidden); await finish(); return; }
      if (handValue(r.player).total === 21) { phase = 'player'; await act('stand'); return; }
      phase = 'player'; drawCtrl();
    } else if (a === 'stand') {
      phase = 'dealing'; drawCtrl();
      const drawn = stand(r);
      await dealerTurn(hidden, drawn);
    } else {
      if (!canDouble(r) || !debit(r.bet)) { shake(ctrl); haptic('error'); return; }
      persist(); void sh.sync(false);
      phase = 'dealing'; drawCtrl(); drawPile(); audio.play('chip');
      const d = doubleDown(r)!;
      await dealCard(playerHand, d.card, true); values(true);
      if (r.phase === 'done' && d.dealerCards.length === 0 && r.outcome === 'bust') { await wait(250); await flip(hidden); await finish(); return; }
      await dealerTurn(hidden, d.dealerCards);
    }
  }

  async function dealerTurn(hidden: HTMLElement, drawn: Card[]): Promise<void> {
    await wait(soft() ? 150 : 350);
    await flip(hidden); values(false);
    for (const c of drawn) { await wait(soft() ? 150 : 450); await dealCard(dealerHand, c, true); values(false); }
    await wait(soft() ? 100 : 300);
    await finish();
  }

  async function finish(): Promise<void> {
    const r = round;
    if (!r || settled || !r.outcome) return;
    settled = true;
    const hidden = dealerHand.children[1] as HTMLElement | undefined;
    if (hidden && !hidden.classList.contains('up')) await flip(hidden);
    values(false);
    const stake = stakeOf(r), ret = returned(r), net = ret - stake;
    credit(ret);
    recordRound(cs(), 'blackjack', stake, ret, Date.now(), r.outcome === 'blackjack' ? ['blackjack.naturels'] : []);
    persist(); notifyCasino();
    phase = 'end';
    banner.textContent = `${OUT[r.outcome]}${net > 0 ? `  +${fmt(net)}` : net < 0 ? `  −${fmt(-net)}` : ''}`;
    banner.className = `bj-banner show ${r.outcome}`;
    bounce(banner, 1.25);
    const at = centerOf(playerHand);
    if (r.outcome === 'blackjack') { celebrate('big', at); await sh.fly(at, 9, 50); }
    else if (r.outcome === 'win') { celebrate(r.doubled ? 'mid' : 'small', at); await sh.fly(at, r.doubled ? 8 : 5, 25); }
    else if (r.outcome === 'push') { audio.play('chip'); haptic('select'); await sh.fly(centerOf(betPile), 2, 25); }
    else { audio.play('invalid'); haptic('error'); shake(playerHand); }
    await sh.sync(true);
    drawCtrl();
  }

  const el = h('div.bj',
    h('div.bj-table',
      h('div.bj-row', h('span.bj-lab', 'Croupier'), dVal, deck),
      dealerHand, banner,
      playerHand,
      h('div.bj-row.me', h('span.bj-lab', 'Radia'), pVal, h('div.bj-bet', betPile, h('span', 'Mise ', betTxt)))),
    rules, low, ctrl);
  refresh();
  return {
    el, title: 'Blackjack', onBack: o.onBack, help: helpBlackjack, busy: () => phase === 'dealing' || phase === 'player',
    dispose: () => { alive = false; },
  };
}
