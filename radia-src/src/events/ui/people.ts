import { kidName } from '../../core/family';
import { speakerFace } from '../ctx';
import type { Sender } from '../types';
import type { KidId } from '../../data/world/ids';
import { isRelId, relLabel } from '../../data/family/relatives';
import { relativeFaceUrl } from '../../game/art/relatives';

export const AGENCY_NAME = 'Studio Lumière';
export const senderName = (s: Sender): string => (s === 'auguste' ? 'Auguste ♡' : s === 'agency' ? AGENCY_NAME : isRelId(s) ? relLabel(s) : kidName(s as KidId));
/** Visage rond du contact (agence : initiale dessinée). */
export function senderFace(s: Sender): string {
  if (isRelId(s)) return relativeFaceUrl(s, 96);
  if (s !== 'agency') return speakerFace(s);
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 96, 96);
  gr.addColorStop(0, '#f3c86b'); gr.addColorStop(1, '#e8558f');
  g.fillStyle = gr; g.beginPath(); g.arc(48, 48, 48, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff'; g.font = '700 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SL', 48, 52);
  return c.toDataURL('image/png');
}
