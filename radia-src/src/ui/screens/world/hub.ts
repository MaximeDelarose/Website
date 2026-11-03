/**
 * Hub « DÉCORER » : le domaine de Radia. Huit destinations (château, dressing,
 * jardin, chocolaterie, famille, chat, carrière, fans), chacune avec un état
 * vivant (progression, nouveautés). Chaque module est chargé à la demande.
 */
import '../../styles/world-hub.css';
import { h, tap } from '../../dom';
import { ui } from '../../ui';
import { icon } from '../../icons';
import { save, audio, events } from '../../../core/app';
import { fmt, wallet } from '../../../core/wallet';
import { world, firstTime } from '../../../core/world';
import { RES_NAMES, ROOM_IDS, CHOC_IDS, FAN_TIERS, CAREER_NAMES, type ResKind } from '../../../data/world/ids';
import { resIconUrl } from '../../../game/art/world/resources';
import { diamondUrl } from '../shop';
import { setBackdrop } from '../../../game/scenes/backdrop';
import { augusteSays } from '../../components/augusteSays';

interface Dest {
  id: string;
  title: string;
  icon: string;
  tone: string;
  sub: () => string;
  badge?: () => string | null;
  open: () => Promise<void>;
}

const mod = async <T>(p: Promise<T>): Promise<T> => p;

const DESTS: Dest[] = [
  {
    id: 'castle', title: 'Château', icon: 'home', tone: 'rose',
    sub: () => `${world().castle.unlocked.length}/${ROOM_IDS.length} pièces`,
    open: async () => (await mod(import('./castle'))).openCastle(),
  },
  {
    id: 'dressing', title: 'Dressing', icon: 'sparkle', tone: 'lavande',
    sub: () => `${world().wardrobe.owned.length} pièces`,
    open: async () => (await mod(import('./dressing'))).openDressing(),
  },
  {
    id: 'garden', title: 'Jardin', icon: 'flower', tone: 'sage',
    sub: () => `${world().garden.plots.filter((p) => p?.flower).length}/${world().garden.plotCount} parcelles`,
    badge: () => (world().garden.plots.some((p) => p?.flower && p.stage >= 3) ? 'Prêt !' : null),
    open: async () => (await mod(import('./garden'))).openGarden(),
  },
  {
    id: 'choc', title: 'Chocolaterie', icon: 'gift', tone: 'choc',
    sub: () => `${world().choc.collection.length}/${CHOC_IDS.length} chocolats`,
    open: async () => (await mod(import('./chocolaterie'))).openChocolaterie(),
  },
  {
    id: 'family', title: 'Famille', icon: 'heart', tone: 'peach',
    sub: () => 'Le salon familial',
    open: async () => (await mod(import('./family'))).openFamily(),
  },
  {
    id: 'cat', title: 'Chat', icon: 'smile', tone: 'cream',
    sub: () => (world().cat.adopted ? world().cat.name || 'Mon chat' : 'À adopter'),
    badge: () => (world().cat.adopted ? null : 'Nouveau'),
    open: async () => (await mod(import('./cat'))).openCat(),
  },
  {
    id: 'career', title: 'Carrière', icon: 'star', tone: 'gold',
    sub: () => {
      const cur = world().careers.current;
      return cur ? CAREER_NAMES[cur as keyof typeof CAREER_NAMES] ?? 'En route' : 'Choisis ta voie';
    },
    open: async () => (await mod(import('./career'))).openCareer(),
  },
  {
    id: 'fans', title: 'Fans', icon: 'trophy', tone: 'violet',
    sub: () => `${fmt(world().fans)} fans`,
    badge: () => {
      const w = world();
      const t = FAN_TIERS.filter((v) => w.fans >= v).length - 1;
      return t > w.fansTierSeen ? 'Récompense' : null;
    },
    open: async () => (await mod(import('./fans'))).openFans(),
  },
];

const RES: ResKind[] = ['coins', 'flowers', 'fabric', 'cocoa'];

export function openWorldHub(): Promise<void> {
  return new Promise((resolve) => {
    setBackdrop('monde');
    const chips = h('div.hub-res');
    const grid = h('div.hub-grid');
    const renderChips = () => {
      chips.textContent = '';
      for (const k of RES) {
        chips.append(h('span.res-chip', { title: RES_NAMES[k] }, h('img', { src: resIconUrl(k, 40), alt: RES_NAMES[k] }), h('b', fmt(world().res[k]))));
      }
      chips.append(h('span.res-chip', { title: 'Diamants' }, h('img', { src: diamondUrl(40), alt: 'Diamants' }), h('b', fmt(wallet.diamonds()))));
    };
    let scr: HTMLElement;
    const reshow = () => {
      scr.classList.remove('leaving');
      scr.style.pointerEvents = '';
      if (ui.screen !== scr || !scr.isConnected) ui.showScreen(scr);
    };
    const renderGrid = () => {
      grid.textContent = '';
      DESTS.forEach((d, i) => {
        const badge = d.badge?.() ?? null;
        const card = h(`button.hub-card.tone-${d.tone}`, { style: `--i:${i}`, 'aria-label': d.title },
          badge ? h('span.hub-badge', badge) : null,
          h('span.hub-ico', icon(d.icon, 34)),
          h('b', d.title),
          h('small', d.sub()));
        card.addEventListener('click', tap(async () => {
          audio.play('whoosh');
          await d.open();
          reshow();
          renderChips();
          renderGrid();
          setBackdrop('monde');
        }));
        grid.append(card);
      });
    };
    const intro = h('p.hub-intro', 'Ton château, ton jardin, ta famille, ta carrière… un mode de jeu rien que pour toi ♡');
    const body = h('div.screen-body', chips, intro, grid,
      h('p.muted.center', { style: 'font-size:12.5px;margin:10px 4px 0' }, 'Les pièces et les matériaux se gagnent en fusionnant et en livrant des commandes.'));
    scr = h('div.bg-soft.hub-screen', ui.header('Mon monde ♡', close), body);
    ui.showScreen(scr);
    renderChips();
    renderGrid();
    const off = events.on('economy', renderChips);
    if (firstTime('tip.hub')) window.setTimeout(() => augusteSays('Bienvenue dans ton monde, ma reine. Tout ici est à toi.', 4200), 700);

    function close() {
      off();
      resolve();
    }
    void save;
  });
}
