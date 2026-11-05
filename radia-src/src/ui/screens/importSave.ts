/** Import d'une sauvegarde (code « RADIA1:… » copié depuis l'autre RADIA : Safari ⇄ application installée). */
import { h, tap } from '../dom';
import { ui } from '../ui';
import { save } from '../../core/app';
import { applyKeyOnly, applyTransfer, decodeTransfer } from '../../save/transfer';

/** mode « photos » : ne reprend que la clé des photos (la partie de ce RADIA est conservée). */
export async function openImportDialog(mode: 'all' | 'photos' = 'all'): Promise<void> {
  const ta = h('textarea', { rows: '5', placeholder: 'Colle ici le code RADIA1:…', style: 'width:100%;font-size:12px;border-radius:12px;padding:8px;border:2px solid #e5d3f5;background:#fff' }) as HTMLTextAreaElement;
  const paste = h('button.btn.small.secondary', { style: 'margin:8px 0 0', on: { click: tap(async () => {
    try { const t = await navigator.clipboard.readText(); if (t) ta.value = t; else ui.toast({ title: 'Presse-papiers vide', sub: 'Copie d\'abord le code dans Safari', icon: 'info', ms: 2600 }); }
    catch { ui.toast({ title: 'Collage non autorisé', sub: 'Appuie longuement dans le cadre → Coller', icon: 'info', ms: 3200 }); }
  }, { sound: false }) } }, 'Coller depuis le presse-papiers');
  const r = await ui.modal({
    title: mode === 'photos' ? 'Reprendre les photos' : 'Importer une sauvegarde',
    body: h('div', h('p.muted', { style: 'font-size:13px' }, mode === 'photos' ? 'Dans Safari : Paramètres → « Copier ma sauvegarde ». Seules les photos sont reprises : la partie de cette application n\'est pas modifiée.' : 'Dans Safari : Paramètres → « Copier ma sauvegarde ». Ta partie actuelle est gardée de côté avant le remplacement.'), ta, paste),
    actions: [{ label: mode === 'photos' ? 'Reprendre les photos' : 'Importer', value: 'go', style: 'primary' }, { label: 'Annuler', value: 'no', style: 'secondary' }],
  });
  if (r !== 'go') return;
  const d = decodeTransfer(ta.value);
  if (!d.ok) { ui.toast({ title: 'Import impossible', sub: d.reason, icon: 'info', ms: 3600 }); return; }
  if (mode === 'photos') {
    if (!applyKeyOnly(d.payload)) { ui.toast({ title: 'Pas de photos dans ce code', sub: 'Recopie la sauvegarde depuis Safari (là où les photos s\'affichent)', icon: 'info', ms: 4200 }); return; }
    location.reload();
    return;
  }
  const ok = await ui.confirm('Remplacer la partie ?', `${d.summary}. La partie de ce RADIA sera remplacée (une copie est gardée).`, 'Remplacer', 'Annuler');
  if (!ok) return;
  save.suspendWrites(); // l'état en mémoire ne doit pas écraser la partie importée pendant le rechargement
  if (!applyTransfer(d.payload)) { save.resumeWrites(); ui.toast({ title: 'Écriture impossible', sub: 'Rien n\'a été modifié', icon: 'info', ms: 3600 }); return; }
  location.reload();
}
