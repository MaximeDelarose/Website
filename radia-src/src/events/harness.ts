/**
 * Banc d'essai (debug) : joue UNE activité seule, sans passer par une invitation.
 * Utilisation : `await window.RADIA.activity('menuPick', { menu: 'restaurant' }, {})` → ActivityResult.
 */
import { h } from '../ui/dom';
import { ui } from '../ui/ui';
import { createCtx } from './ctx';
import { loadActivity } from './registry';
import type { ActivityId, ActivityResult } from './types';

export async function runActivityStandalone(id: ActivityId, params: Record<string, unknown> = {}, data: Record<string, unknown> = {}, repeat = 0): Promise<ActivityResult> {
  const prev = ui.screen;
  prev?.classList.add('ev-under');
  const layer = h('div.ev-layer');
  const body = h('div.ev-body');
  layer.append(body);
  ui.root.append(layer);
  ui.root.classList.add('ev-active');
  let alive = true;
  const { ctx, dispose } = createCtx({ root: body, eventId: `test:${id}`, runId: `test${Date.now().toString(36)}`, params, data, repeat, alive: () => alive });
  try {
    const act = await loadActivity(id);
    return await act(ctx);
  } finally {
    alive = false;
    dispose();
    layer.remove();
    prev?.classList.remove('ev-under');
    ui.root.classList.remove('ev-active');
  }
}
