/**
 * Première ouverture de RADIA comme application de l'écran d'accueil (iPhone) avec une mémoire VIDE : cette application a son propre
 * stockage, séparé de Safari — ta partie avancée et la clé des photos n'y sont donc pas. On l'explique une seule fois et on propose
 * de les reprendre tout de suite (code copié dans Safari → Paramètres → « Copier ma sauvegarde »).
 */
import { h } from '../dom';
import { ui } from '../ui';
import { save } from '../../core/app';
import { isStandalone } from '../../core/diagnostics';
import { openImportDialog } from './importSave';

const FLAG = 'radia-standalone-welcome';

export async function maybeShowStandaloneWelcome(): Promise<void> {
  if (!isStandalone() || save.hadSave) return;
  try { if (localStorage.getItem(FLAG)) return; } catch { return; }
  const r = await ui.modal({
    title: 'Ici, une mémoire à part ♡',
    body: h('div', { style: 'text-align:left;font-size:14px;line-height:1.4' },
      h('p', 'Tu ouvres RADIA depuis l\'écran d\'accueil. Cette application a sa propre mémoire, séparée de Safari : ta partie et tes photos n\'y sont pas encore (ce n\'est pas une ancienne version).'),
      h('p', { style: 'margin-bottom:0' }, 'Dans Safari : Paramètres → « Copier ma sauvegarde ». Puis ici : « Importer ma partie ».')),
    actions: [{ label: 'Importer ma partie', value: 'import', style: 'primary' }, { label: 'Commencer une nouvelle partie', value: 'new', style: 'secondary' }],
  });
  try { localStorage.setItem(FLAG, '1'); } catch { /* ignore */ }
  if (r === 'import') await openImportDialog();
}
