/**
 * « La carte d'Auguste ♡ » — boutique 100 % fictive et gratuite.
 * Aucun paiement réel, aucune donnée bancaire, aucun service externe :
 * « payer » avec la carte cadeau virtuelle d'Auguste ajoute simplement des
 * diamants au solde local. Les diamants s'utilisent ensuite pour de vrais
 * effets en jeu (énergie, bonus, objets rares, coffres, sac, apparence).
 */
import '../styles/shop.css';
import { h, tap } from '../dom';
import { ui } from '../ui';
import { icon } from '../icons';
import { save, audio, events } from '../../core/app';
import { addHearts, checkAchievements, stat } from '../../core/progress';
import { wallet, fmt, fmtTime } from '../../core/wallet';
import * as E from '../../game/economy/economy';
import { augusteSays } from '../components/augusteSays';
import { canvasUrl, paint } from '../../game/art/kit';
import { drawChest, drawDiamond, drawEnergy } from '../../game/art/generators';
import { itemImageUrl } from '../../game/merge/textures';
import { itemName, SPECIAL, type ItemRef } from '../../data/items';

export const diamondUrl = (size = 64) => canvasUrl(`ico:diamond:${size}`, () => paint(size, size, 2, (c) => drawDiamond(c, size)));
export const energyUrl = (size = 64) => canvasUrl(`ico:energy:${size}`, () => paint(size, size, 2, (c) => drawEnergy(c, size)));
const chestUrl = (open: boolean, size = 120) => canvasUrl(`ico:chest:${open}:${size}`, () => paint(size, size, 2, (c) => drawChest(c, size, open)));

/** Répliques d'Auguste quand Radia utilise sa carte (sans répétition rapprochée). */
const LINES = [
  'Encore un petit cadeau pour ma reine ?',
  'Bon, je crois que tu vas encore vider ma boutique.',
  'Bon, celui-là c\'est pour ton sourire.',
  'C\'est cool d\'être dans le Nord de Paris bb, mais ça coûte cher apparemment.',
  'Même ici, j\'arrive pas à te dire non.',
  'T\'inquiète, c\'est cadeau.',
  'Elle a encore vidé ma boutique !',
  'J\'aurais dû mettre un plafond à ma carte… mais bon, c\'est toi.',
  'Mon banquier m\'appelle. Je fais semblant de pas entendre.',
  'Prends, prends. De toute façon, tout ce qui est à moi est à toi.',
  'Tu sais que cette carte n\'a pas de limite quand c\'est pour toi ?',
  'Encore ? …Bon. Parce que c\'est toi.',
];
let lineBag: number[] = [];
function nextLine(): string {
  if (!lineBag.length) lineBag = [...LINES.keys()].sort(() => Math.random() - 0.5);
  return LINES[lineBag.pop()!];
}

/** La carte cadeau (HTML/CSS : nette sur iPhone). Jamais de numéro, CVV ou date. */
export function giftCard(small = false): HTMLElement {
  return h(`div.gift-card${small ? '.small' : ''}`, { 'aria-label': 'Carte cadeau virtuelle d\'Auguste' },
    h('div.gc-shine'),
    h('div.gc-top', h('span.gc-brand', 'La carte d\'Auguste'), h('span.gc-heart', '♡')),
    h('div.gc-chip', h('i'), h('i'), h('i')),
    h('div.gc-contactless', { html: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 7a7 7 0 010 10M12 5a10 10 0 010 14M16 3a13 13 0 010 18"/></svg>' }),
    h('div.gc-bottom', h('div', h('small', 'Carte cadeau virtuelle'), h('b', 'AUGUSTE')), h('span.gc-logo', '♥♥')),
  );
}

/** Petit bouton permanent (carte + cœur) qui ouvre la boutique. */
export function shopButton(): HTMLElement {
  const b = h('button.shop-btn', { 'aria-label': 'La carte d\'Auguste' },
    h('span.sb-card', h('span.sb-heart', '♥')), h('small', 'Boutique'));
  b.addEventListener('click', tap(() => void openShop()));
  return b;
}

type Tab = 'diamonds' | 'spend' | 'style';
let open = false;

export function openShop(tab: Tab = 'diamonds'): Promise<void> {
  if (open) return Promise.resolve();
  open = true;
  return new Promise((resolve) => {
    const balance = h('span.shop-balance', h('img', { src: diamondUrl(48), alt: '' }), h('b', fmt(wallet.diamonds())));
    const body = h('div.shop-body');
    const seg = h('div.seg.shop-tabs');
    const tabs: [Tab, string][] = [['diamonds', 'Diamants'], ['spend', 'Boutique'], ['style', 'Style']];
    for (const [t, label] of tabs) {
      const b = h(`button${t === tab ? '.on' : ''}`, label);
      b.addEventListener('click', tap(() => { seg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); render(t); }));
      seg.append(b);
    }
    const sheet = h('div.shop-sheet', { role: 'dialog', 'aria-label': 'La carte d\'Auguste' },
      h('div.shop-grab'),
      h('div.shop-head',
        h('div', h('h2', 'La carte d\'Auguste ♡'), h('p', 'Fais-toi plaisir, ma reine.')),
        h('button.icon-btn', { 'aria-label': 'Fermer', on: { click: tap(() => close()) } }, icon('close'))),
      h('div.shop-hero', giftCard(), balance),
      seg, body);
    const layer = h('div.shop-layer', sheet);
    layer.addEventListener('click', (e) => { if (e.target === layer) close(); });
    ui.root.append(layer);
    audio.play('whoosh');

    const refreshBalance = (from?: number) => {
      const b = balance.querySelector('b')!;
      const to = wallet.diamonds();
      if (from === undefined || from === to) { b.textContent = fmt(to); return; }
      countUp(b, from, to, 1200);
      balance.classList.remove('bump'); void balance.offsetWidth; balance.classList.add('bump');
    };
    const off = events.on('economy', () => { if (!paying) refreshBalance(); });

    let paying = false;
    function render(t: Tab) {
      body.textContent = '';
      if (t === 'diamonds') renderPacks();
      else if (t === 'spend') renderSpend();
      else renderStyle();
    }

    // ---------------------------------------------------------- packs
    function renderPacks() {
      let selected: (typeof E.PACKS)[number] = E.PACKS[2];
      const grid = h('div.packs');
      const cards = E.PACKS.map((p, i) => {
        const c = h(`button.pack${p === selected ? '.on' : ''}`, { style: `--i:${i}` },
          p.tag ? h('span.pack-tag', p.tag) : null,
          h('div.pack-gems', ...Array.from({ length: Math.min(5, i + 1) }, (_, k) => h('img', { src: diamondUrl(64), alt: '', style: `--k:${k}` }))),
          h('b.pack-amount', fmt(p.diamonds)),
          h('span.pack-label', 'diamants'),
          h('span.pack-price', `${p.euros} €`));
        c.addEventListener('click', tap(() => { selected = p; cards.forEach((x) => x.classList.toggle('on', x === c)); payBtn.textContent = `Payer avec la carte d'Auguste · ${p.euros} €`; audio.play('pickup'); }));
        return c;
      });
      grid.append(...cards);
      const payBtn = h('button.btn.wide.pay-btn', `Payer avec la carte d'Auguste · ${selected.euros} €`);
      payBtn.addEventListener('click', tap(() => void pay(selected)));
      body.append(
        grid, payBtn);
    }

    async function pay(p: (typeof E.PACKS)[number]) {
      if (paying) return;
      paying = true;
      const before = wallet.diamonds();
      await payAnimation(p.diamonds, p.euros);
      const e = save.data.economy;
      e.giftCount++;
      e.diamondsGifted += p.diamonds;
      wallet.giveDiamonds(p.diamonds);
      stat('shopGifts');
      refreshBalance(before);
      paying = false;
      window.setTimeout(() => augusteSays(nextLine(), 4200), 400);
      checkAchievements();
    }

    // ---------------------------------------------------------- dépenses
    function renderSpend() {
      const now = Date.now();
      const e = save.data.economy;
      // gratuits d'abord : le jeu reste jouable sans jamais passer par la boutique
      const chestIn = Math.max(0, e.freeChestTs + E.FREE_CHEST_MS - now);
      const refillIn = wallet.freeRefillIn();
      const free = h('div.spend-group', h('h3', 'Cadeaux gratuits'),
        row(chestUrl(false, 80), 'Coffre d\'Auguste', chestIn ? `Revient dans ${fmtTime(chestIn)}` : 'Énergie, cœurs et petites surprises', chestIn ? null : 'Ouvrir', () => void openChest('free')),
        row(energyUrl(64), 'Recharge d\'énergie', refillIn ? `Revient dans ${fmtTime(refillIn)}` : `+${E.FREE_REFILL} ⚡ offertes`, refillIn ? null : 'Prendre', () => {
          if (wallet.takeFreeRefill()) { audio.play('reward'); ui.toast({ title: `+${E.FREE_REFILL} énergie`, sub: 'Offerte par Auguste ♡', img: energyUrl(64) }); render('spend'); }
        }));
      const paid = h('div.spend-group', h('h3', 'Avec tes diamants'));
      for (const it of E.DIAMOND_ITEMS) {
        const price = E.priceOf(it.id, e);
        const disabled = it.id === 'bag' && e.bagSlots >= E.BAG_MAX;
        const img = it.icon === 'energy' ? energyUrl(64) : it.icon === 'chest' ? chestUrl(false, 80)
          : it.icon === 'star' ? itemImageUrl({ c: 'special', l: SPECIAL.STAR }, 80) : it.icon === 'box' ? itemImageUrl({ c: 'special', l: SPECIAL.BOX }, 80)
          : it.icon === 'bag' ? bagIconUrl() : null;
        const desc = it.id === 'bag' ? `${e.bagSlots} places → ${Math.min(E.BAG_MAX, e.bagSlots + 2)}` : it.desc;
        paid.append(row(img ?? icon(it.icon), it.name, desc, disabled ? null : price, () => void buy(it.id), true));
      }
      body.append(free, paid);
    }

    function row(img: string | Element, name: string, desc: string, price: number | string | null, onBuy: () => void, diamonds = false): HTMLElement {
      const btn = price === null
        ? h('button.btn.small.secondary.buy', { disabled: true }, '—')
        : h(`button.btn.small.buy${diamonds ? '.gold' : ''}`, diamonds ? h('img', { src: diamondUrl(32), alt: '' }) : null, typeof price === 'number' ? fmt(price) : price);
      if (price !== null) btn.addEventListener('click', tap(() => onBuy()));
      return h('div.spend-row',
        typeof img === 'string' ? h('img.spend-ico', { src: img, alt: '' }) : h('span.spend-ico', img),
        h('div.grow', h('b', name), h('small', desc)), btn);
    }

    async function buy(id: E.DiamondBuy) {
      const e = save.data.economy;
      const price = E.priceOf(id, e);
      if ((id === 'star' || id === 'box') && E.bagFull(e)) {
        ui.toast({ title: 'Ton sac est plein', sub: 'Sors des objets ou agrandis-le', icon: 'info' });
        return;
      }
      if (e.diamonds < price) {
        const v = await ui.modal({ title: 'Pas assez de diamants', body: 'Auguste a une carte cadeau pour ça… 😌', actions: [{ label: 'Voir les diamants', value: 'go' }, { label: 'Plus tard', value: 'no', style: 'secondary' }] });
        if (v === 'go') { (seg.children[0] as HTMLElement).click(); }
        return;
      }
      if (id === 'royalChest') {
        if (!wallet.spendDiamonds(price)) return;
        await openChest('royal');
        render('spend');
        return;
      }
      if (id === 'bag') {
        if (!E.upgradeBag(e)) return;
        save.save(); wallet.notify(); audio.play('reward');
        ui.toast({ title: `Sac agrandi : ${e.bagSlots} places`, sub: `−${fmt(price)} diamants`, img: bagIconUrl() });
        render('spend');
        return;
      }
      if (!wallet.spendDiamonds(price)) return;
      let title = '';
      let img: string | undefined;
      switch (id) {
        case 'energy': wallet.giveEnergy(100); title = '+100 énergie'; img = energyUrl(64); break;
        case 'wand3': save.data.boosters.wand += 3; title = '+3 Baguettes magiques'; break;
        case 'wind3': save.data.boosters.wind += 3; title = '+3 Souffles'; break;
        case 'star': wallet.bagPut({ c: 'special', l: SPECIAL.STAR }); title = 'Étoile filante rangée dans ton sac'; img = itemImageUrl({ c: 'special', l: SPECIAL.STAR }, 80); break;
        case 'box': wallet.bagPut({ c: 'special', l: SPECIAL.BOX }); title = 'Coffret surprise rangé dans ton sac'; img = itemImageUrl({ c: 'special', l: SPECIAL.BOX }, 80); break;
      }
      save.save();
      events.emit('boosters', undefined);
      wallet.notify();
      audio.play('reward');
      ui.toast({ title, sub: `−${fmt(price)} diamants`, img, icon: img ? undefined : 'sparkle' });
      render('spend');
    }

    // ---------------------------------------------------------- apparence
    function renderStyle() {
      const c = save.data.cosmetics;
      body.append(h('p.fake-note', 'Change l\'apparence du plateau et des fusions.'));
      for (const kind of ['tiles', 'fx'] as const) {
        const group = h('div.spend-group', h('h3', kind === 'tiles' ? 'Plateau' : 'Éclats de fusion'));
        for (const it of E.COSMETICS.filter((x) => x.kind === kind || (kind === 'fx' && x.id === 'classic' && false))) {
          const owned = c.owned.includes(it.id);
          const active = (kind === 'tiles' ? c.tiles : c.fx) === it.id;
          const btn = active ? h('button.btn.small.secondary.buy', { disabled: true }, 'Utilisé')
            : owned ? h('button.btn.small.lavande.buy', 'Utiliser')
              : h('button.btn.small.gold.buy', h('img', { src: diamondUrl(32), alt: '' }), fmt(it.price));
          if (!active) btn.addEventListener('click', tap(() => {
            if (!owned) {
              if (!wallet.spendDiamonds(it.price)) { ui.toast({ title: 'Pas assez de diamants', icon: 'info' }); return; }
              c.owned.push(it.id);
              audio.play('reward');
            }
            if (kind === 'tiles') c.tiles = it.id; else c.fx = it.id;
            save.save();
            wallet.notify();
            body.textContent = '';
            renderStyle();
          }));
          group.append(h('div.spend-row', h('span.swatch', { class: `sw-${it.id}` }), h('div.grow', h('b', it.name)), btn));
        }
        if (kind === 'fx') {
          const isClassic = c.fx === 'classic';
          const b = h(`button.btn.small${isClassic ? '.secondary' : '.lavande'}.buy`, { disabled: isClassic }, isClassic ? 'Utilisé' : 'Utiliser');
          if (!isClassic) b.addEventListener('click', tap(() => { c.fx = 'classic'; save.save(); wallet.notify(); body.textContent = ''; renderStyle(); }));
          group.append(h('div.spend-row', h('span.swatch.sw-fx-classic'), h('div.grow', h('b', 'Éclats classiques')), b));
        }
        body.append(group);
      }
      const deco = h('button.btn.wide.secondary', { style: 'margin-top:8px' }, icon('home', 20), 'Mon monde');
      deco.addEventListener('click', tap(async () => { close(); const d = await import('./decor'); await d.openDecor(); }));
      body.append(deco);
    }

    render(tab);

    function close() {
      if (paying) return;
      off();
      layer.classList.add('leaving');
      window.setTimeout(() => layer.remove(), 280);
      open = false;
      resolve();
    }
  });
}

// ------------------------------------------------------------ animations

function countUp(el: HTMLElement, from: number, to: number, ms: number): void {
  const t0 = performance.now();
  const stepFn = (t: number) => {
    const k = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) requestAnimationFrame(stepFn);
  };
  requestAnimationFrame(stepFn);
}

/** Éclats de diamants depuis un point de l'écran. */
export function diamondBurst(x: number, y: number, n = 26): void {
  const wrap = h('div.gem-burst', { style: `left:${x}px;top:${y}px` });
  for (let k = 0; k < n; k++) {
    const a = (Math.PI * 2 * k) / n + Math.random() * 0.5;
    const d = 90 + Math.random() * 140;
    const g = h('img', { src: diamondUrl(48), alt: '' });
    g.style.setProperty('--dx', `${Math.cos(a) * d}px`);
    g.style.setProperty('--dy', `${Math.sin(a) * d - 40}px`);
    g.style.setProperty('--r', `${(Math.random() - 0.5) * 540}deg`);
    g.style.setProperty('--s', `${0.5 + Math.random() * 0.7}`);
    g.style.animationDelay = `${Math.random() * 120}ms`;
    wrap.append(g);
  }
  ui.root.append(wrap);
  window.setTimeout(() => wrap.remove(), 1600);
}

/** Paiement fictif : la carte, le terminal, la validation, les diamants. */
function payAnimation(diamonds: number, euros: number): Promise<void> {
  return new Promise((resolve) => {
    const status = h('div.pay-status', h('span.pay-dots', 'Paiement en cours'), h('small', `${euros} €`));
    const terminal = h('div.pay-terminal', h('div.pt-screen', h('span', '♡'), h('small', `${euros},00 €`)), h('div.pt-keys', ...Array.from({ length: 6 }, () => h('i'))));
    const card = giftCard();
    card.classList.add('paying');
    const layer = h('div.pay-layer', h('div.pay-stage', card, terminal), status);
    ui.root.append(layer);
    audio.play('whoosh');
    window.setTimeout(() => audio.play('pickup'), 700);
    window.setTimeout(() => {
      // validation
      audio.play('deliver');
      layer.classList.add('ok');
      status.textContent = '';
      const amount = h('b.pay-amount', '+0');
      status.append(
        h('div.pay-check', icon('check', 44)),
        h('p.pay-done', 'Le paiement a été effectué.'),
        h('p.pay-gift', 'Cadeau offert par Auguste ♡'),
        amount, h('span.pay-unit', 'diamants !'));
      const r = amount.getBoundingClientRect();
      window.setTimeout(() => {
        audio.play('chest');
        audio.play('reward');
        diamondBurst(r.left + r.width / 2, r.top + r.height / 2, 30);
        countUp(amount, 0, diamonds, 1100);
        window.setTimeout(() => { amount.textContent = `+${fmt(diamonds)}`; }, 1150);
        window.setTimeout(() => audio.play('sparkle'), 500);
      }, 350);
      const btn = h('button.btn.gold.pay-thanks', 'Merci Auguste ♡');
      btn.addEventListener('click', tap(() => {
        layer.classList.add('leaving');
        window.setTimeout(() => layer.remove(), 300);
        resolve();
      }));
      window.setTimeout(() => status.append(btn), 1200);
    }, 1900);
  });
}

/** Coffre : secousse, ouverture, récompenses appliquées. */
async function openChest(kind: 'free' | 'royal'): Promise<void> {
  const e = save.data.economy;
  if (kind === 'free') {
    if (Date.now() < e.freeChestTs + E.FREE_CHEST_MS) return;
    e.freeChestTs = Date.now();
  }
  const loot = E.rollChest(kind, Math.random);
  // appliquer tout de suite (rien ne se perd si l'écran est fermé)
  wallet.giveEnergy(loot.energy);
  addHearts(loot.hearts);
  if (loot.diamonds) wallet.giveDiamonds(loot.diamonds);
  save.data.boosters.wand += loot.wands;
  save.data.boosters.wind += loot.winds;
  const stored: ItemRef[] = [];
  const lost: ItemRef[] = [];
  for (const it of loot.items) (wallet.bagPut(it) ? stored : lost).push(it);
  if (lost.length) addHearts(lost.length * 15);
  save.save();
  events.emit('boosters', undefined);

  const img = h('img.chest-img', { src: chestUrl(false, 160), alt: '' });
  const list = h('div.loot', { style: 'visibility:hidden' },
    lootChip(energyUrl(48), `+${loot.energy}`),
    lootChip(null, `+${loot.hearts} ♡`),
    loot.diamonds ? lootChip(diamondUrl(48), `+${loot.diamonds}`) : null,
    loot.wands ? lootChip(null, `+${loot.wands} baguette${loot.wands > 1 ? 's' : ''}`) : null,
    loot.winds ? lootChip(null, `+${loot.winds} souffle${loot.winds > 1 ? 's' : ''}`) : null,
    ...stored.map((it) => lootChip(itemImageUrl(it, 72), itemName(it))),
  );
  const body = h('div.chest-open', img, list, stored.length ? h('small.muted', 'Les objets sont rangés dans ton sac.') : null);
  img.classList.add('shake');
  audio.play('chest');
  window.setTimeout(() => {
    img.src = chestUrl(true, 160);
    img.classList.remove('shake');
    img.classList.add('opened');
    list.style.visibility = 'visible';
    audio.play('reward');
    const r = img.getBoundingClientRect();
    diamondBurst(r.left + r.width / 2, r.top + r.height / 3, 14);
  }, 900);
  await ui.modal({ title: kind === 'free' ? 'Coffre d\'Auguste' : 'Coffre du royaume', body, actions: [{ label: 'Super ♡', value: 'ok' }] });
  checkAchievements();
}

function lootChip(img: string | null, text: string): HTMLElement {
  return h('span.loot-chip', img ? h('img', { src: img, alt: '' }) : null, text);
}

export const bagIconUrl = () => canvasUrl('ico:bag', () => paint(64, 64, 2, (c) => {
  // petit sac rose avec un cœur
  c.lineJoin = 'round';
  c.beginPath(); c.moveTo(14, 24); c.lineTo(50, 24); c.lineTo(54, 56); c.quadraticCurveTo(32, 61, 10, 56); c.closePath();
  const g = c.createLinearGradient(0, 24, 0, 60); g.addColorStop(0, '#FFB3CB'); g.addColorStop(1, '#E8558F');
  c.fillStyle = g; c.fill(); c.lineWidth = 2.6; c.strokeStyle = '#58433F'; c.stroke();
  c.beginPath(); c.moveTo(22, 26); c.bezierCurveTo(22, 8, 42, 8, 42, 26); c.lineWidth = 4; c.stroke();
  c.beginPath(); c.moveTo(32, 48); c.bezierCurveTo(22, 40, 24, 32, 32, 37); c.bezierCurveTo(40, 32, 42, 40, 32, 48); c.fillStyle = '#fff'; c.fill();
}));
