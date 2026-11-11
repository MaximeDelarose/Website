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
  bReplay.addEventListener('click', function () { C.sfx.pop(); if (C.lastSay) C.say(C.lastSay, { keep: false, must: true }); });
  bAlbum.addEventListener('click', function () { C.sfx.pop(); C.gallery.open('draw'); });

  /* bouton son : un toucher = couper / remettre ; appui long = panneau des parents */
  var holdT = null, held = false;
  function toggleSound() {
    C.settings.sound = !C.settings.sound; C.saveSettings(); C.hud.update();
    if (C.settings.sound) { C.audio.unlock(); C.sfx.chime(); } else { C.say.stop(); }
    C.music.sync();
  }
  bSound.addEventListener('pointerdown', function () { held = false; holdT = setTimeout(function () { held = true; C.session.openParent(); }, 1200); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { bSound.addEventListener(ev, function () { clearTimeout(holdT); }); });
  bSound.addEventListener('click', function () { if (held) { held = false; return; } toggleSound(); });

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

  C.session.boot();   /* écran parent avant de jouer, ou reprise de la session en cours */
})();
