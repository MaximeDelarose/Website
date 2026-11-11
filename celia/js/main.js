/* Démarrage : barre du haut (maison, retour, étoiles, son), panneau parents, service worker. */
(function () {
  'use strict';
  var hud = C.$('#hud');
  hud.innerHTML =
    '<div class="hl"><button class="castlebtn" id="btnHome" aria-label="mon château">' + Art.castle() + '</button><button class="btn blue" id="btnBack" aria-label="retour" hidden>' + Art.ui.back + '</button><button class="btn yellow small" id="btnAlbum" aria-label="album">' + Art.ui.gallery + '</button></div>' +
    '<div class="hr"><div class="stars" id="starsBox" aria-label="étoiles"><span class="stico">' + Art.ui.star + '</span><b id="starsN">0</b></div><button class="btn blue small" id="btnReplay" aria-label="réécouter" hidden>' + Art.ui.replay + '</button><button class="btn turq" id="btnSound" aria-label="son"></button></div>';

  var bHome = C.$('#btnHome'), bBack = C.$('#btnBack'), bSound = C.$('#btnSound'), bAlbum = C.$('#btnAlbum'), bReplay = C.$('#btnReplay');
  C.hud = {
    setStars: function (n) { C.$('#starsN').textContent = n; },
    update: function () {
      var cur = C.current();
      bHome.hidden = cur === 'home';
      bAlbum.hidden = cur !== 'home';
      bReplay.hidden = cur === 'home';
      bBack.hidden = !C.hasBack();
      document.body.dataset.screen = cur || '';
      bSound.innerHTML = C.settings.sound ? Art.ui.soundOn : Art.ui.soundOff;
      bSound.classList.toggle('off', !C.settings.sound);
    }
  };
  C.hud.setStars(C.rewards.s.stars);

  bHome.addEventListener('click', function () { C.sfx.pop(); C.go('home'); });
  bBack.addEventListener('click', function () { C.sfx.pop(); C.doBack(); });
  bReplay.addEventListener('click', function () { C.sfx.pop(); if (C.lastSay) C.say(C.lastSay, { keep: false }); });
  bAlbum.addEventListener('click', function () { C.sfx.pop(); C.gallery.open('draw'); });

  /* bouton son : un toucher = couper / remettre ; appui long = panneau des parents */
  var holdT = null, held = false;
  function toggleSound() {
    C.settings.sound = !C.settings.sound; C.saveSettings(); C.hud.update();
    if (C.settings.sound) { C.audio.unlock(); C.sfx.chime(); } else { C.say.stop(); }
    C.music.sync();
  }
  bSound.addEventListener('pointerdown', function () { held = false; holdT = setTimeout(function () { held = true; parentPanel(); }, 1200); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { bSound.addEventListener(ev, function () { clearTimeout(holdT); }); });
  bSound.addEventListener('click', function () { if (held) { held = false; return; } toggleSound(); });

  function parentPanel() {
    var m = C.modal('<div class="ptitle">Parents</div><div class="pgrid">' +
      '<button class="pbtn" data-k="voice"><span class="btn green">' + Art.ui.voice + '</span><em>Voix</em></button>' +
      '<button class="pbtn" data-k="music"><span class="btn purple">' + Art.ui.music + '</span><em>Musique</em></button>' +
      '<button class="pbtn" data-k="reset"><span class="btn red">' + Art.ui.trash + '</span><em>Tout effacer</em></button>' +
      '</div><label class="pvol"><span class="btn purple small">' + Art.ui.music + '</span><input type="range" min="0" max="100" step="5" value="' + Math.round((C.settings.musicVol || 0) * 100) + '" aria-label="volume de la musique"><b>' + Math.round((C.settings.musicVol || 0) * 100) + '%</b></label><p class="pnote">Les créations sont enregistrées uniquement sur cet appareil, sans compte. Safari peut les effacer si l’espace manque. Si tu n’entends rien, vérifie que l’iPhone n’est pas en mode silencieux.</p>' +
      '<div class="row"><button class="btn big green" data-ok>' + Art.ui.check + '</button></div>', 'parent');
    function paint() {
      C.$('[data-k=voice] .btn', m).classList.toggle('dim', !C.settings.voice);
      C.$('[data-k=music] .btn', m).classList.toggle('dim', !C.settings.music);
    }
    paint();
    C.$('[data-k=voice]', m).onclick = function () { C.settings.voice = !C.settings.voice; C.saveSettings(); paint(); C.sfx.pop(); if (C.settings.voice) C.say('Coucou !'); };
    C.$('[data-k=music]', m).onclick = function () { C.settings.music = !C.settings.music; C.saveSettings(); paint(); C.sfx.pop(); C.music.sync(); };
    var vol = C.$('.pvol input', m);
    vol.addEventListener('input', function () { C.music.setVol(vol.value / 100); C.$('.pvol b', m).textContent = vol.value + '%'; if (!C.settings.music) { C.settings.music = true; C.saveSettings(); paint(); C.music.sync(); } });
    C.$('[data-k=reset]', m).onclick = function () {
      C.confirm('<div class="trashicon">' + Art.ui.trash.replace(/#fff/g, '#c4a8ff').replace('#ff8fb8', '#fff') + '</div>').then(function (yes) {
        if (!yes) return;
        ['profile', 'rewards', 'pets', 'room', 'hint.draw', 'hint.color'].forEach(function (k) { C.store.del(k); });
        C.db.clear().then(function () { location.reload(); });
      });
    };
    C.$('[data-ok]', m).onclick = function () { C.sfx.pop(); m.close(); };
  }

  /* hors ligne + mise à jour automatique : le service worker est limité au dossier du jeu.
     Quand une nouvelle version est publiée, l'appli installée la récupère toute seule et se recharge à un moment sans risque
     (sur l'accueil, ou au prochain retour à l'accueil) : jamais au milieu d'un dessin. */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }           /* première installation : rien à recharger */
      try { var last = +sessionStorage.getItem('celia.reloaded') || 0; if (Date.now() - last < 20000) return; } catch (e) { }   /* jamais de boucle */
      C.pendingReload = true;
      if (C.current() === 'home' && !C.$('.modal', C.$('#overlay'))) C.applyUpdate();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then(function (reg) {
        var check = function () { try { reg.update().catch(function () { }); } catch (e) { } };
        check();
        document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });   /* à chaque retour dans l'appli */
        setInterval(check, 30 * 60 * 1000);
      }).catch(function () { });
    });
  }
  C.applyUpdate = function () { try { sessionStorage.setItem('celia.reloaded', String(Date.now())); } catch (e) { } C.pendingReload = false; location.reload(); };

  C.go('home');
})();
