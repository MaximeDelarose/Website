/* Bande-son d'ambiance : 4 morceaux joués en boucle 1 → 2 → 3 → 4 → 1, avec fondu enchaîné.
   - Un seul morceau (et brièvement le suivant) est chargé : lecture en streaming via deux balises <audio>, jamais les 4 en mémoire.
   - Le volume passe par Web Audio (GainNode) car iOS ignore audio.volume. Le fondu et la baisse pendant la voix sont donc possibles sur iPhone.
   - La musique ne redémarre jamais quand on change d'activité : elle appartient à l'application, pas aux écrans.
   - Les fichiers ont été normalisés à −20 LUFS intégrés (crête vraie ≤ −1 dBTP) : même volume perçu pour les 4. */
(function () {
  'use strict';
  var A = C.audio;
  var FILES = ['audio/musique-1.mp3', 'audio/musique-2.mp3', 'audio/musique-3.mp3', 'audio/musique-4.mp3'];
  var FADE = 4;               /* secondes de fondu enchaîné entre deux morceaux */
  var GAIN = 1.6;             /* volume 100 % du curseur = gain 1,6 ; défaut 20 % = 0,32 (≈ −10 dB) */
  var SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  if (typeof C.settings.musicVol !== 'number') C.settings.musicVol = 0.2;

  var S = { idx: (C.store.get('musicIdx', 0) | 0) % FILES.length, cur: 0, els: [], gains: [], ready: false, started: false, xf: false, timer: null, bus: null, duck: null, gen: 0 };
  var M = C.music = {};

  function enabled() { return !!(C.settings.sound && C.settings.music); }
  function build() {
    if (S.ready) return true;
    var ctx = A.init(); if (!ctx) return false;
    S.bus = ctx.createGain(); S.duck = ctx.createGain(); S.bus.gain.value = 0; S.bus.connect(S.duck); S.duck.connect(ctx.destination);
    for (var i = 0; i < 2; i++) {
      var el = new Audio(); el.preload = 'none'; el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', '');
      var src = ctx.createMediaElementSource(el), g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(S.bus);
      S.els.push(el); S.gains.push(g);
      (function (el, k) { el.addEventListener('ended', function () { if (S.cur === k && S.started && !S.xf) next(k); }); el.addEventListener('error', function () { if (S.cur === k && S.started && el.getAttribute('src') && el.getAttribute('src') !== SILENT) setTimeout(function () { if (S.cur === k) next(k); }, 1500); }); })(el, i);
    }
    S.ready = true; return true;
  }
  function ramp(g, to, sec) { var ctx = A.ctx, t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(to, t + sec); }
  M.applyVol = function () {
    if (!S.ready) return;
    var v = enabled() ? Math.max(0, Math.min(1, C.settings.musicVol)) * GAIN : 0;
    S.bus.gain.setTargetAtTime(v, A.ctx.currentTime, 0.25);
  };
  function play(k, idx, fadeIn) {
    var el = S.els[k]; el.src = FILES[idx]; el.preload = 'auto';
    var p = el.play(); ramp(S.gains[k], 1, fadeIn);
    return p;
  }
  function release(k) { var el = S.els[k]; try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) { } }
  /* passage au morceau suivant, sur le même lecteur (repli si le fondu enchaîné n'a pas pu démarrer) */
  function next(k) {
    S.idx = (S.idx + 1) % FILES.length; C.store.set('musicIdx', S.idx);
    var p = play(k, S.idx, 1.5); if (p && p.catch) p.catch(function () { S.started = false; });
  }
  function tick() {
    if (!S.started || S.xf || !enabled()) return;
    var el = S.els[S.cur], d = el.duration, t = el.currentTime;
    if (!isFinite(d) || d <= 0) return;
    if (d - t <= FADE + 0.2 && !el.paused) {
      var k = 1 - S.cur, n = (S.idx + 1) % FILES.length, old = S.cur;
      S.xf = true;
      var p;
      try { p = play(k, n, FADE); } catch (e) { S.xf = false; return; }
      var fail = function () { S.xf = false; ramp(S.gains[k], 0, 0.1); };
      if (p && p.catch) p.catch(fail);
      ramp(S.gains[old], 0, FADE);
      S.cur = k; S.idx = n; C.store.set('musicIdx', n);
      setTimeout(function () { release(old); S.xf = false; }, FADE * 1000 + 400);
    }
  }
  M.start = function () {
    if (S.started || !enabled() || !build()) return;
    A.unlock();
    var p; try { p = play(S.cur, S.idx, 3); } catch (e) { return; }
    S.started = true;
    if (p && p.catch) p.catch(function () { S.started = false; });
    M.applyVol();
    /* « bénit » l'autre lecteur pendant le geste de l'utilisateur, pour que le fondu enchaîné puisse démarrer seul plus tard (iOS) */
    var o = S.els[1 - S.cur]; try { o.src = SILENT; var q = o.play(); if (q && q.then) q.then(function () { o.pause(); }).catch(function () { }); } catch (e) { }
    clearInterval(S.timer); S.timer = setInterval(tick, 300);
  };
  M.stop = function () { };            /* la musique ne s'arrête jamais en changeant d'écran */
  M.sync = function () {
    if (!S.ready) { if (enabled()) M.start(); return; }
    M.applyVol();
    var el = S.els[S.cur];
    if (!enabled()) { setTimeout(function () { if (!enabled()) S.els.forEach(function (e) { try { e.pause(); } catch (x) { } }); }, 600); }
    else if (S.started && el.paused && el.getAttribute('src')) { var p = el.play(); if (p && p.catch) p.catch(function () { }); }
    else if (!S.started) M.start();
  };
  M.setVol = function (v) { C.settings.musicVol = Math.max(0, Math.min(1, v)); C.saveSettings(); M.applyVol(); };
  /* baisse douce de la musique quand la conteuse parle */
  M.duck = function (on) {
    if (!S.ready) return;
    S.duck.gain.setTargetAtTime(on ? 0.28 : 1, A.ctx.currentTime, on ? 0.18 : 0.7);
  };
  M._dbg = function () { return S.els.map(function (e, k) { return { k: k, src: (e.getAttribute('src') || '').slice(-14), t: +e.currentTime.toFixed(1), d: isFinite(e.duration) ? +e.duration.toFixed(1) : null, paused: e.paused, g: +S.gains[k].gain.value.toFixed(2) }; }); };
  M._seekEnd = function (sec) { var e = S.els[S.cur]; if (isFinite(e.duration)) e.currentTime = Math.max(0, e.duration - sec); };
  M.state = function () { return { started: S.started, idx: S.idx, cur: S.cur, files: FILES.length, vol: C.settings.musicVol }; };

  /* démarre au premier vrai geste (Safari iOS exige un geste) ; réessaie tant que ça n'a pas démarré */
  function arm() { if (A.ctx && A.ctx.state === 'suspended' && C.settings.sound) { try { A.ctx.resume(); } catch (e) { } } if (!S.started) M.start(); }
  ['pointerup', 'touchend', 'click'].forEach(function (ev) { window.addEventListener(ev, arm, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () {
    if (!S.ready) return;
    if (document.hidden) S.els.forEach(function (e) { try { e.pause(); } catch (x) { } });
    else if (enabled() && S.started) { var el = S.els[S.cur]; if (el.getAttribute('src')) { var p = el.play(); if (p && p.catch) p.catch(function () { }); } }
  });
})();
