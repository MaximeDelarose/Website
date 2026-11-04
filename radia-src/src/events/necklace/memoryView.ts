/**
 * Fiche du souvenir « Le ciel portait ton prénom ♡ » (album) : illustration, texte de la déclaration,
 * « Revoir l'événement » (scène éphémère : aucune récompense, aucune attribution) et export PNG de la photo.
 */
import './necklace.css';
import { h, tap } from '../../ui/dom';
import { ui } from '../../ui/ui';
import { audio, save } from '../../core/app';
import { canvasUrl, paint } from '../../game/art/kit';
import { drawMemory } from '../../game/art/scenes';
import { DECLARATION, GIFT_LINES, MEMORY_DESC, MEMORY_ID, MEMORY_TITLE } from './data';
import { isEventRunning } from '../runner';

/** Image de la carte (330 × 440 logiques, mise en cache par tenue). */
export const eclatCardUrl = (): string => canvasUrl(`mem:eclat:${JSON.stringify(save.data.fun.necklace.look)}`, () => paint(330, 440, 2, (c) => drawMemory(c, MEMORY_ID, 330, 440)));

/** Photo en haute résolution (990 × 1320). */
export function renderEclatPhoto(scale = 3): HTMLCanvasElement {
  return paint(330 * scale, 440 * scale, 1, (c) => drawMemory(c, MEMORY_ID, 330 * scale, 440 * scale));
}

/** Enregistre la photo : partage de fichier si le navigateur le permet, sinon téléchargement ; l'image reste appuyable (appui long). */
export async function exportEclatPhoto(): Promise<'shared' | 'downloaded' | 'failed'> {
  const cv = renderEclatPhoto(3);
  const blob: Blob | null = await new Promise((r) => cv.toBlob((b) => r(b), 'image/png'));
  if (!blob) return 'failed';
  const file = new File([blob], 'le-ciel-portait-ton-prenom.png', { type: 'image/png' });
  try {
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare && nav.canShare({ files: [file] })) { await nav.share({ files: [file], title: MEMORY_TITLE }); return 'shared'; }
  } catch (e) { if ((e as { name?: string })?.name === 'AbortError') return 'shared'; }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 8000);
    return 'downloaded';
  } catch { return 'failed'; }
}

export async function openNecklaceMemory(): Promise<void> {
  audio.play('page');
  const quote = (t: string) => h('p.nl-q', { style: 'margin:0;text-align:left;font-size:14px;line-height:1.35' }, t);
  const img = h('img', { src: eclatCardUrl(), alt: MEMORY_TITLE, style: 'width:100%;max-width:300px;border-radius:14px;box-shadow:0 6px 18px rgba(59,49,82,.35)' });
  const body = h('div.memory-view', img,
    h('p', { style: 'margin:0' }, MEMORY_DESC),
    h('div', { style: 'display:flex;flex-direction:column;gap:6px;max-height:34vh;overflow:auto;padding:2px 2px 4px' }, ...[...DECLARATION, ...GIFT_LINES].map(quote)),
    h('small', { style: 'opacity:.7' }, 'Astuce : appui long sur l’image pour l’enregistrer.'));
  for (;;) {
    const v = await ui.modal({
      title: MEMORY_TITLE, body,
      actions: [
        { label: 'Revoir l’événement ♡', value: 'replay' },
        { label: 'Enregistrer la photo (PNG)', value: 'png', style: 'secondary' },
        { label: 'Fermer', value: 'close', style: 'secondary' },
      ],
    });
    if (v === 'png') {
      const r = await exportEclatPhoto();
      ui.toast({ title: r === 'failed' ? 'Impossible pour le moment' : r === 'shared' ? 'Photo prête à partager ♡' : 'Photo enregistrée ♡', sub: r === 'failed' ? 'Appui long sur l’image pour l’enregistrer.' : undefined, icon: 'camera' });
      const n = save.data.fun.necklace; n.photo = true; save.save();
      continue;
    }
    if (v === 'replay' && !isEventRunning()) {
      const [{ startEvent }, { NECKLACE_REPLAY }, { nextId }] = await Promise.all([import('../runner'), import('./event'), import('../api')]);
      save.data.fun.necklace.replays += 1; save.save();
      await startEvent(NECKLACE_REPLAY, nextId('rs'));
    }
    return;
  }
}

/** Carte du souvenir pour la grille de l'album. */
export function eclatMemoryCard(onOpen: () => void, rot: string): HTMLElement {
  const card = h('button.memory-card', { style: `--rot:${rot}`, 'aria-label': MEMORY_TITLE }, h('img', { src: eclatCardUrl(), alt: '' }), h('div.cap', MEMORY_TITLE));
  card.addEventListener('click', tap(onOpen));
  return card;
}
