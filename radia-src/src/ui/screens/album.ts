/**
 * Album : souvenirs (8), collections d'objets découverts, historique des
 * dialogues. Les souvenirs débloqués restent accessibles après la fin.
 */
import { h, tap } from '../dom';
import { ui } from '../ui';
import { icon } from '../icons';
import { save, audio } from '../../core/app';
import { MEMORIES } from '../../data/memories';
import { COLLECTIONS, COLLECTION_IDS, SPECIAL_ITEMS, itemBlurb, itemName, type ItemRef } from '../../data/items';
import { DIALOGUES } from '../../data/dialogue';
import { canvasUrl, paint } from '../../game/art/kit';
import { drawMemory } from '../../game/art/scenes';
import { itemImageUrl } from '../../game/merge/textures';
import { playLines } from '../components/Dialogue';
import { PHOTOS } from '../../data/photos';
import { hasPhotos, photoUrl } from '../../core/photos';
import { syncPassedPhotos } from '../../game/narrative/Story';

export function memoryImageUrl(id: string): string {
  return canvasUrl(`mem:${id}`, () => paint(330, 440, 2, (ctx) => drawMemory(ctx, id, 330, 440)));
}

type Tab = 'memories' | 'photos' | 'collections' | 'history';

export function openAlbum(tab: Tab = 'memories', overlay = false): Promise<void> {
  return new Promise((resolve) => {
    const body = h('div.screen-body');
    const seg = h('div.seg');
    const tabs: [Tab, string][] = [['memories', 'Souvenirs'], ['photos', 'Photos'], ['collections', 'Objets'], ['history', 'Histoire']];
    for (const [t, label] of tabs) {
      const b = h(`button${t === tab ? '.on' : ''}`, label);
      b.addEventListener('click', tap(() => { seg.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); render(t); }));
      seg.append(b);
    }
    const scr = h('div.bg-soft', ui.header('Album', close), h('div.tabs', seg), body);
    if (overlay) { scr.classList.add('screen'); scr.style.zIndex = '47'; ui.root.append(scr); }
    else ui.showScreen(scr);

    function render(t: Tab) {
      body.textContent = '';
      body.scrollTop = 0;
      if (t === 'memories') renderMemories();
      else if (t === 'photos') renderPhotos();
      else if (t === 'collections') renderCollections();
      else renderHistory();
    }

    function renderMemories() {
      const got = save.data.memories;
      body.append(h('p.center.muted', { style: 'margin:0 0 10px;font-size:14px' }, `${got.length}/8 souvenirs`));
      const grid = h('div.album-grid');
      MEMORIES.forEach((m, i) => {
        const rot = `${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg`;
        if (!got.includes(m.id)) {
          grid.append(h('div.memory-card.locked', { style: `--rot:${rot}` }, icon('lock'), h('b', '???'), h('span', m.how)));
          return;
        }
        const card = h('button.memory-card', { style: `--rot:${rot}`, 'aria-label': m.title },
          h('img', { src: memoryImageUrl(m.id), alt: '' }), h('div.cap', m.title));
        card.addEventListener('click', tap(() => void openMemory(m.id)));
        grid.append(card);
      });
      body.append(grid);
    }

    function renderPhotos() {
      syncPassedPhotos();
      const got = save.data.photos;
      body.append(h('p.center.muted', { style: 'margin:0 0 10px;font-size:14px' }, `${got.length}/${PHOTOS.length} photos de nous`));
      if (!hasPhotos()) {
        body.append(h('p.center.muted', { style: 'font-size:14px' }, 'Les photos s\'ouvrent avec le lien secret envoyé par Auguste ♡'));
      }
      const grid = h('div.photo-grid');
      PHOTOS.forEach((p, i) => {
        const rot = `${(i % 2 ? 1.8 : -2.2)}deg`;
        if (!got.includes(p.id) || !hasPhotos()) {
          grid.append(h('div.locked', { style: `--rot:${rot}` }, icon('lock', 30)));
          return;
        }
        const img = h('img', { alt: p.title });
        void photoUrl(p.id).then((u) => { if (u) img.src = u; });
        const card = h('button.polaroid', { style: `--rot:${rot}` }, img, h('figcaption', p.title));
        card.addEventListener('click', tap(() => {
          const full = h('div.photo-full', h('img', { src: img.src, alt: p.title }), h('b', p.title), h('p', { style: 'margin:0;max-width:340px' }, p.caption), h('small', { style: 'opacity:.7' }, 'Touche pour fermer'));
          full.addEventListener('click', () => full.remove());
          ui.root.append(full);
        }));
        grid.append(card);
      });
      body.append(grid);
    }

    function renderCollections() {
      const d = new Set(save.data.discovered);
      const total = 43;
      body.append(h('p.center.muted', { style: 'margin:0 0 10px;font-size:14px' }, `${d.size}/${total} objets découverts`));
      const row = (title: string, refs: ItemRef[]) => {
        const n = refs.filter((r) => d.has(`${r.c}:${r.l}`)).length;
        body.append(h('div.coll-row', h('header', h('span', title), h('small.muted', `${n}/${refs.length}`)),
          h('div.coll-items', ...refs.map((r) => {
            if (!d.has(`${r.c}:${r.l}`)) return h('div.coll-item.unknown', '?');
            const b = h('button.coll-item', { 'aria-label': itemName(r) }, h('img', { src: itemImageUrl(r, 96), alt: '' }));
            b.addEventListener('click', tap(() => void ui.modal({
              title: itemName(r),
              body: h('div', h('img', { src: itemImageUrl(r, 160), alt: '', style: 'width:120px;height:120px' }), h('p', itemBlurb(r)),
                r.c !== 'special' ? h('p.muted', { style: 'font-size:14px' }, `${COLLECTIONS[r.c].name} · niveau ${r.l}/10`) : null),
              actions: [{ label: 'Joli !', value: 'ok' }],
            })));
            return b;
          }))));
      };
      for (const c of COLLECTION_IDS) row(COLLECTIONS[c].name, Array.from({ length: 10 }, (_, k) => ({ c, l: k + 1 })));
      row('Objets magiques', Object.keys(SPECIAL_ITEMS).map((l) => ({ c: 'special' as const, l: Number(l) })));
    }

    function renderHistory() {
      const hist = save.data.story.history;
      if (!hist.length) { body.append(h('p.center.muted', 'Les dialogues de l\'histoire apparaîtront ici.')); return; }
      for (const id of hist) {
        const d = DIALOGUES[id];
        if (!d) continue;
        const lines = d.lines.filter((l) => l.who !== 'narrator');
        const choice = save.data.story.choices[id];
        const opt = d.choice?.options.find((o) => o.value === choice);
        const all = [...lines, ...(opt ? [...opt.reply, ...(d.choice?.after ?? [])] : [])];
        const item = h('button.history-item', { style: 'display:block;width:100%;text-align:left' }, h('b', d.title),
          ...all.slice(0, 3).map((l) => h('p', `${l.who === 'auguste' ? 'Auguste' : 'Radia'} : ${l.text}`)));
        item.addEventListener('click', tap(() => void playLines(all.length ? all : d.lines, undefined, { skippable: true })));
        body.append(item);
      }
    }

    render(tab);

    function close() {
      if (overlay) { scr.classList.add('leaving'); window.setTimeout(() => scr.remove(), 240); }
      resolve();
    }
  });
}

export async function openMemory(id: string): Promise<void> {
  const m = MEMORIES.find((x) => x.id === id);
  if (!m) return;
  audio.play('page');
  const actions = [{ label: 'Écouter Auguste', value: 'talk', style: 'secondary' as const }, { label: 'Fermer', value: 'close' }];
  if (id === 'monde') actions.unshift({ label: 'Revoir la fin ♡', value: 'ending', style: 'secondary' as const });
  const v = await ui.modal({
    title: m.title,
    body: h('div.memory-view', h('img', { src: memoryImageUrl(id), alt: m.title }), h('p', { style: 'margin:0' }, m.desc)),
    actions,
  });
  if (v === 'talk') await playLines(m.lines, undefined, { skippable: true });
  if (v === 'ending') {
    const f = await import('../../game/narrative/finale');
    await f.runFinale(true);
  }
}
