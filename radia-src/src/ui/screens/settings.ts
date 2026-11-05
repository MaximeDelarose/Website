/** Paramètres : volumes, sons, effets, vitesse du texte, réinitialisation. */
import { h, tap } from '../dom';
import { ui } from '../ui';
import { save, applySettings, audio } from '../../core/app';
import { setLowFx } from '../../game/layout';
import { haptic, hapticMaybeSupported } from '../../core/haptics';
import { checkForUpdate, versionLabel } from '../../core/updates';
import { photoKey } from '../../core/photos';
import { encodeTransfer } from '../../save/transfer';
import { openImportDialog } from './importSave';
import { diagnosticsText, formatDiagnostics, gatherDiagnostics } from '../../core/diagnostics';

export function openSettings(): Promise<void> {
  return new Promise((resolve) => {
    const s = save.data.settings;
    const slider = (val: number, on: (v: number) => void) => {
      const el = h('input', { type: 'range', min: '0', max: '100', value: String(Math.round(val * 100)), 'aria-label': 'volume' }) as HTMLInputElement;
      const paint = () => el.style.setProperty('--p', `${el.value}%`);
      paint();
      el.addEventListener('input', () => { paint(); on(Number(el.value) / 100); });
      return el;
    };
    const toggle = (val: boolean, on: (v: boolean) => void) => {
      const el = h(`button.toggle${val ? '.on' : ''}`, { role: 'switch', 'aria-checked': String(val) });
      el.addEventListener('click', tap(() => { const v = !el.classList.contains('on'); el.classList.toggle('on', v); el.setAttribute('aria-checked', String(v)); on(v); }));
      return el;
    };
    const seg = <T extends string>(opts: [T, string][], val: T, on: (v: T) => void) => {
      const wrap = h('div.seg');
      for (const [v, label] of opts) {
        const b = h(`button${v === val ? '.on' : ''}`, label);
        b.addEventListener('click', tap(() => { wrap.querySelectorAll('button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); on(v); }));
        wrap.append(b);
      }
      return wrap;
    };
    const commit = () => { save.save(); applySettings(); };
    // ---- version installée + mises à jour
    const checkBtn = h('button.btn.small.secondary', 'Vérifier');
    checkBtn.addEventListener('click', tap(async () => {
      checkBtn.setAttribute('disabled', 'true'); checkBtn.textContent = '…';
      const r = await checkForUpdate(true);
      checkBtn.removeAttribute('disabled');
      checkBtn.textContent = r === 'uptodate' ? 'À jour ♡' : r === 'available' ? 'Mise à jour prête' : 'Pas de réseau';
    }, { sound: false }));
    // ---- petite pensée du jour : VRAIES notifications iPhone (une par jour, avec le consentement de Radia)
    const pushState = h('small', 'Vérification…');
    const pushBtns = h('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end' });
    const paintPush = async (): Promise<void> => {
      const P = await import('../../core/push');
      const st = await P.pushStatus();
      pushBtns.replaceChildren();
      const btn = (label: string, fn: () => void | Promise<void>, secondary = true) => { const b = h(`button.btn.small${secondary ? '.secondary' : ''}`, { on: { click: tap(async () => { b.setAttribute('disabled', 'true'); try { await fn(); } finally { b.removeAttribute('disabled'); } }, { sound: false }) } }, label); pushBtns.append(b); };
      if (st.kind === 'unsupported') pushState.textContent = st.why === 'not-installed' ? 'Disponible dans l’application installée : dans Safari, Partager → « Sur l’écran d’accueil », puis rouvre RADIA depuis l’icône.' : st.why === 'insecure' ? 'Indisponible (connexion non sécurisée).' : 'Ton navigateur ne gère pas les notifications.';
      else if (st.kind === 'denied') pushState.textContent = 'Notifications refusées. Pour les autoriser : Réglages de l’iPhone → Notifications → RADIA.';
      else if (st.kind === 'on') {
        pushState.textContent = 'Activées ♡ Une petite pensée par jour, le matin, jamais la nuit.';
        btn('Tester maintenant', async () => { const r = await P.sendTestPush(); ui.toast({ title: r === 'ok' ? 'Notification envoyée ♡' : r === 'limit' ? 'Déjà 3 essais aujourd’hui' : 'Envoi impossible pour l’instant', sub: r === 'ok' ? 'Elle arrive dans quelques secondes' : undefined, icon: 'info', ms: 3000 }); });
        btn('Désactiver', async () => { const ok = await P.disablePush(); ui.toast({ title: ok ? 'Petites pensées désactivées' : 'Impossible de désactiver pour l’instant', icon: 'info', ms: 2600 }); await paintPush(); });
      } else {
        pushState.textContent = 'Reçois une petite pensée douce par jour sur ton iPhone, même quand RADIA est fermée.';
        btn('Activer', async () => {
          const go = await ui.modal({ title: 'Une petite pensée par jour ♡', body: h('div', { style: 'text-align:left;font-size:14.5px;line-height:1.4' }, h('p', 'Une seule notification par jour, le matin, jamais la nuit. Tu peux arrêter quand tu veux.'), h('p.muted', { style: 'font-size:12.5px' }, 'RADIA ne te la demande que si tu appuies sur « Activer ». Rien d’autre n’est partagé que l’adresse d’envoi de ton iPhone et ton fuseau horaire.')), actions: [{ label: 'Activer', value: 'go', style: 'primary' }, { label: 'Plus tard', value: 'no', style: 'secondary' }] });
          if (go !== 'go') return;
          const r = await P.enablePush(9);
          if (r === 'ok') ui.toast({ title: 'Petites pensées activées ♡', sub: 'Tu en recevras une par jour', icon: 'heart', ms: 3200 });
          else ui.toast({ title: r === 'denied' ? 'Notifications refusées' : r === 'unsupported' ? 'Pas disponible ici' : 'Activation impossible pour l’instant', sub: r === 'denied' ? 'Tu pourras les autoriser dans les Réglages de l’iPhone' : 'Rien n’a été activé', icon: 'info', ms: 3600 });
          await paintPush();
        }, false);
      }
    };
    void paintPush();
    const thoughtsBtn = h('button.btn.small.secondary', { on: { click: tap(() => { void import('./thoughts').then((m) => m.openThoughtsList()); }, { sound: false }) } }, 'Voir');
    // ---- diagnostic tactile : état réel du plateau (utile si les cases ne répondent plus)
    const touchBtn = h('button.btn.small.secondary', { on: { click: tap(async () => {
      const { touchDiagnostics, unblockBoard } = await import('../../game/touchDiag');
      const rows = touchDiagnostics();
      const text = rows.map(([k, v]) => `${k} : ${v}`).join('\n');
      const list = h('div', { style: 'text-align:left;font-size:12.5px;line-height:1.35' }, ...rows.map(([k, v]) => h('p', { style: 'margin:0 0 7px' }, h('b', `${k} : `), v)));
      const r = await ui.modal({ title: 'Diagnostic tactile', body: list, actions: [{ label: 'Copier', value: 'copy', style: 'primary' }, { label: 'Débloquer le plateau', value: 'fix', style: 'secondary' }, { label: 'Fermer', value: 'ok', style: 'secondary' }] });
      if (r === 'copy') { try { await navigator.clipboard.writeText(text); ui.toast({ title: 'Diagnostic tactile copié ♡', icon: 'info', ms: 2200 }); } catch { /* le texte reste visible */ } }
      if (r === 'fix') { const n = unblockBoard(); ui.toast({ title: n ? 'Plateau débloqué ♡' : 'Rien à débloquer', sub: 'Aucun objet ni sauvegarde touchés', icon: 'info', ms: 2400 }); }
    }, { sound: false }) } }, 'Afficher');
    // ---- diagnostic : comparer objectivement Safari et l'application installée
    const diagBtn = h('button.btn.small.secondary', { on: { click: tap(async () => {
      const rows = formatDiagnostics(await gatherDiagnostics(save, photoKey));
      const text = diagnosticsText(rows);
      const list = h('div', { style: 'text-align:left;font-size:12.5px;line-height:1.35' }, ...rows.map(([k, v]) => h('p', { style: 'margin:0 0 7px' }, h('b', `${k} : `), v)));
      const r = await ui.modal({ title: 'Diagnostic', body: list, actions: [{ label: 'Copier', value: 'copy', style: 'primary' }, { label: 'Fermer', value: 'ok', style: 'secondary' }] });
      if (r === 'copy') { try { await navigator.clipboard.writeText(text); ui.toast({ title: 'Diagnostic copié ♡', icon: 'info', ms: 2200 }); } catch { /* le texte reste visible */ } }
    }, { sound: false }) } }, 'Afficher');
    // ---- transfert de la partie (Safari ⇄ application de l'écran d'accueil : deux stockages distincts sur iPhone)
    const showCode = (code: string) => {
      const ta = h('textarea', { readonly: 'true', rows: '5', style: 'width:100%;font-size:12px;border-radius:12px;padding:8px;border:2px solid #e5d3f5;background:#fff' }) as HTMLTextAreaElement;
      ta.value = code;
      void ui.modal({ title: 'Ton code de sauvegarde', body: h('div', h('p.muted', { style: 'font-size:13px' }, 'Copie tout le code (appui long → Tout sélectionner → Copier), puis colle-le dans « Importer une sauvegarde » de l\'autre RADIA.'), ta), actions: [{ label: 'Fermer', value: 'ok', style: 'primary' }] });
      window.setTimeout(() => { ta.focus(); ta.select(); }, 250);
    };
    const copyBtn = h('button.btn.small.secondary', { on: { click: tap(async () => {
      save.writeNow();
      const code = encodeTransfer(save.data, photoKey());
      try { await navigator.clipboard.writeText(code); ui.toast({ title: 'Code copié ♡', sub: 'Colle-le dans l\'autre RADIA', icon: 'info', ms: 2600 }); } catch { showCode(code); }
    }, { sound: false }) } }, 'Copier');
    const importBtn = h('button.btn.small.secondary', { on: { click: tap(() => void openImportDialog(), { sound: false }) } }, 'Importer');
    const body = h('div.panel', { style: 'text-align:left' },
      h('div.setting-row', h('label', 'Musique'), toggle(s.musicOn, (v) => { s.musicOn = v; commit(); if (v) audio.playMusic(); })),
      h('div.setting-row', h('label', 'Volume musique'), slider(s.music, (v) => { s.music = v; commit(); })),
      h('div.setting-row', h('label', 'Effets sonores'), toggle(s.sfxOn, (v) => { s.sfxOn = v; commit(); })),
      h('div.setting-row', h('label', 'Volume effets'), slider(s.sfx, (v) => { s.sfx = v; commit(); audio.play('pop2'); })),
      h('div.setting-row', h('label', 'Effets visuels', h('small', 'Réduits : moins de particules, plus économe')), seg([['full', 'Complets'], ['reduced', 'Réduits']], s.effects, (v) => { s.effects = v; setLowFx(v === 'reduced'); commit(); })),
      h('div.setting-row', h('label', 'Retours haptiques', h('small', hapticMaybeSupported() ? 'Petites vibrations, si ton téléphone les accepte' : 'Non disponibles ici : le son et l\'image restent')), toggle(s.haptics !== false, (v) => { s.haptics = v; commit(); if (v) haptic('merge'); })),
      h('div.setting-row', h('label', 'Animations réduites'), toggle(s.reducedMotion, (v) => { s.reducedMotion = v; commit(); })),
      h('div.setting-row', h('label', 'Vitesse du texte'), seg([['normal', 'Normale'], ['fast', 'Rapide'], ['instant', 'Immédiate']], s.textSpeed, (v) => { s.textSpeed = v; commit(); })),
      h('div.setting-row', h('label', 'Version', h('small', versionLabel())), checkBtn),
      h('div.setting-row', h('label', 'Ressources', h('small', 'À quoi servent pièces, diamants, énergie, cœurs, tickets')), h('button.btn.small.secondary', { on: { click: tap(async () => { (await import('../components/resourceInfo')).openResourceHelp(); }, { sound: false }) } }, 'Voir')),
      h('div.setting-row.push-row', { style: 'align-items:flex-start;flex-direction:column;gap:6px' }, h('label', 'Petite pensée du jour ♡', pushState), pushBtns),
      h('div.setting-row', h('label', 'Petites pensées ♡', h('small', 'Celles que tu as reçues')), thoughtsBtn),
      h('div.setting-row', h('label', 'Diagnostic', h('small', 'Build, mode (Safari / application), partie, photos')), diagBtn),
      h('div.setting-row', h('label', 'Diagnostic tactile', h('small', 'État du plateau ; « Débloquer le plateau » sans rien perdre')), touchBtn),
      h('div.setting-row', h('label', 'Copier ma sauvegarde', h('small', 'Pour la mettre dans l\'application de l\'écran d\'accueil (ou l\'inverse)')), copyBtn),
      h('div.setting-row', h('label', 'Importer une sauvegarde', h('small', 'Colle le code copié ailleurs')), importBtn),
      h('div.setting-row', h('label', 'Recommencer depuis le début', h('small', 'Efface toute la progression')),
        h('button.btn.small.secondary', { on: { click: tap(async () => {
          const ok = await ui.confirm('Tout effacer ?', 'Toute la progression (niveaux, souvenirs, succès, échecs) sera effacée. Cette action est définitive.', 'Tout effacer', 'Annuler');
          if (!ok) return;
          const ok2 = await ui.confirm('Vraiment ?', 'Dernière confirmation : on recommence à zéro ?', 'Oui, effacer', 'Non');
          if (!ok2) return;
          save.reset();
          location.reload();
        }) } }, 'Effacer')),
    );
    const scr = h('div.bg-soft.settings-screen', ui.header('Paramètres', () => { close(); }), h('div.screen-body', body,
      h('p.muted.center', { style: 'font-size:13px;margin-top:14px' }, 'Sauvegarde automatique dans ce navigateur. Safari peut effacer les données d\'un site peu utilisé : ajoute RADIA à l\'écran d\'accueil pour plus de sûreté.')));
    // superposé à l'écran courant (pas de remplacement)
    scr.classList.add('screen');
    scr.style.zIndex = '48';
    ui.root.append(scr);
    function close() {
      scr.classList.add('leaving');
      window.setTimeout(() => scr.remove(), 240);
      resolve();
    }
  });
}
