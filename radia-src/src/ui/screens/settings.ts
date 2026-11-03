/** Paramètres : volumes, sons, effets, vitesse du texte, réinitialisation. */
import { h, tap } from '../dom';
import { ui } from '../ui';
import { save, applySettings, audio } from '../../core/app';
import { setLowFx } from '../../game/layout';

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
    const body = h('div.panel', { style: 'text-align:left' },
      h('div.setting-row', h('label', 'Musique'), toggle(s.musicOn, (v) => { s.musicOn = v; commit(); if (v) audio.playMusic(); })),
      h('div.setting-row', h('label', 'Volume musique'), slider(s.music, (v) => { s.music = v; commit(); })),
      h('div.setting-row', h('label', 'Effets sonores'), toggle(s.sfxOn, (v) => { s.sfxOn = v; commit(); })),
      h('div.setting-row', h('label', 'Volume effets'), slider(s.sfx, (v) => { s.sfx = v; commit(); audio.play('pop2'); })),
      h('div.setting-row', h('label', 'Effets visuels', h('small', 'Réduits : moins de particules, plus économe')), seg([['full', 'Complets'], ['reduced', 'Réduits']], s.effects, (v) => { s.effects = v; setLowFx(v === 'reduced'); commit(); })),
      h('div.setting-row', h('label', 'Animations réduites'), toggle(s.reducedMotion, (v) => { s.reducedMotion = v; commit(); })),
      h('div.setting-row', h('label', 'Vitesse du texte'), seg([['normal', 'Normale'], ['fast', 'Rapide'], ['instant', 'Immédiate']], s.textSpeed, (v) => { s.textSpeed = v; commit(); })),
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
