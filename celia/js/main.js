/* Démarrage : barre du haut (maison, retour, étoiles, son), panneau parents, service worker. */
(function () {
  'use strict';
  var hud = C.$('#hud');
  hud.innerHTML =
    '<div class="hl"><button class="btn big-home pink" id="btnHome" aria-label="maison">' + Art.ui.home + '</button><button class="btn blue" id="btnBack" aria-label="retour" hidden>' + Art.ui.back + '</button><button class="btn yellow small" id="btnAlbum" aria-label="album">' + Art.ui.gallery + '</button></div>' +
    '<div class="hr"><div class="stars" id="starsBox" aria-label="étoiles"><span class="stico">' + Art.ui.star + '</span><b id="starsN">0</b></div><button class="btn turq" id="btnSound" aria-label="son"></button></div>';

  var bHome = C.$('#btnHome'), bBack = C.$('#btnBack'), bSound = C.$('#btnSound'), bAlbum = C.$('#btnAlbum');
  C.hud = {
    setStars: function (n) { C.$('#starsN').textContent = n; },
    update: function () {
      var cur = C.current();
      bHome.hidden = cur === 'home';
      bAlbum.hidden = cur !== 'home';
      bBack.hidden = !C.hasBack();
      document.body.dataset.screen = cur || '';
      bSound.innerHTML = C.settings.sound ? Art.ui.soundOn : Art.ui.soundOff;
      bSound.classList.toggle('off', !C.settings.sound);
    }
  };
  C.hud.setStars(C.rewards.s.stars);

  bHome.addEventListener('click', function () { C.sfx.pop(); C.go('home'); });
  bBack.addEventListener('click', function () { C.sfx.pop(); C.doBack(); });
  bAlbum.addEventListener('click', function () { C.sfx.pop(); C.gallery.open('draw'); });

  /* bouton son : un toucher = couper / remettre ; appui long = panneau des parents */
  var holdT = null, held = false;
  function toggleSound() {
    C.settings.sound = !C.settings.sound; C.saveSettings(); C.hud.update();
    if (C.settings.sound) { C.audio.unlock(); C.sfx.chime(); } else { C.say.stop(); }
  }
  bSound.addEventListener('pointerdown', function () { held = false; holdT = setTimeout(function () { held = true; parentPanel(); }, 1200); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { bSound.addEventListener(ev, function () { clearTimeout(holdT); }); });
  bSound.addEventListener('click', function () { if (held) { held = false; return; } toggleSound(); });

  function parentPanel() {
    var m = C.modal('<div class="ptitle">Parents</div><div class="pgrid">' +
      '<button class="pbtn" data-k="voice"><span class="btn green">' + Art.ui.voice + '</span><em>Voix</em></button>' +
      '<button class="pbtn" data-k="music"><span class="btn purple">' + Art.ui.music + '</span><em>Musique</em></button>' +
      '<button class="pbtn" data-k="reset"><span class="btn red">' + Art.ui.trash + '</span><em>Tout effacer</em></button>' +
      '</div><p class="pnote">Les créations sont enregistrées uniquement sur cet appareil, sans compte. Safari peut les effacer si l’espace manque. Si tu n’entends rien, vérifie que l’iPhone n’est pas en mode silencieux.</p>' +
      '<div class="row"><button class="btn big green" data-ok>' + Art.ui.check + '</button></div>', 'parent');
    function paint() {
      C.$('[data-k=voice] .btn', m).classList.toggle('dim', !C.settings.voice);
      C.$('[data-k=music] .btn', m).classList.toggle('dim', !C.settings.music);
    }
    paint();
    C.$('[data-k=voice]', m).onclick = function () { C.settings.voice = !C.settings.voice; C.saveSettings(); paint(); C.sfx.pop(); if (C.settings.voice) C.say('Coucou !'); };
    C.$('[data-k=music]', m).onclick = function () { C.settings.music = !C.settings.music; C.saveSettings(); paint(); C.sfx.pop(); };
    C.$('[data-k=reset]', m).onclick = function () {
      C.confirm('<div class="trashicon">' + Art.ui.trash.replace(/#fff/g, '#c4a8ff').replace('#ff8fb8', '#fff') + '</div>').then(function (yes) {
        if (!yes) return;
        ['profile', 'rewards', 'pets', 'room'].forEach(function (k) { C.store.del(k); });
        C.db.clear().then(function () { location.reload(); });
      });
    };
    C.$('[data-ok]', m).onclick = function () { C.sfx.pop(); m.close(); };
  }

  /* hors ligne : service worker limité au dossier de l'appli */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { scope: './' }).catch(function () { });
    });
  }

  C.go('home');
})();
