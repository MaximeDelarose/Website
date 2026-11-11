/* Mode parent : temps de jeu de Celia.
   - La maman choisit la durée (5, 10, 15 ou 20 min) avant de lui donner le téléphone ; code PIN demandé pour tout réglage.
   - Le minuteur démarre à l'entrée dans le château, continue dans toutes les activités, se met en pause quand l'appli passe en arrière-plan,
     et survit à un rechargement. Il est calculé à partir de l'horloge (Date.now), jamais d'un simple compteur d'intervalle.
   - Une minute avant la fin : une phrase douce et la création en cours est sauvegardée. À la fin : sauvegarde, château qui s'endort, musique qui s'éteint.
   - Ensuite plus aucune activité sans le code parent.
   IMPORTANT : c'est une protection de l'interface du jeu, pas un verrouillage de l'iPhone ni une sécurité inviolable
   (le code est haché, jamais enregistré en clair, mais vider les données du site Safari remet tout à zéro). */
(function () {
  'use strict';
  var KEY = 'session', DURS = [5, 10, 15, 20], WARN_MS = 60000, GAP_MS = 5000;
  var S = Object.assign({ v: 1, minutes: 10, state: 'none', remaining: 0, tick: null, warned: false, pin: null, fails: 0, lockUntil: 0, endedAt: 0 }, C.store.get(KEY, {}));
  function save() { C.store.set(KEY, S); }
  var holds = 0, touching = {}, ending = false, warnEl = null;
  function hidden() { return document.hidden || document.visibilityState === 'hidden'; }
  var Ses = C.session = {};
  Ses.state = function () { return S.state; };
  Ses.remaining = function () { return S.remaining; };
  Ses.minutes = function () { return S.minutes; };
  Ses.pinSet = function () { return !!(S.pin && S.pin.hash); };

  /* ---------- doigts posés : on ne coupe jamais un geste en cours ---------- */
  window.addEventListener('pointerdown', function (e) { touching[e.pointerId] = 1; }, true);
  ['pointerup', 'pointercancel'].forEach(function (ev) { window.addEventListener(ev, function (e) { delete touching[e.pointerId]; }, true); });
  function isTouching() { return Object.keys(touching).length > 0; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------- minuteur : toujours calculé depuis l'horloge ---------- */
  /* temps écoulé depuis le dernier point de contrôle (plafonné : un trou inexpliqué n'est pas compté comme du jeu) */
  function account() {
    if (S.state !== 'playing' || S.tick == null) return;
    var d = Math.min(Math.max(0, Date.now() - S.tick), GAP_MS); S.remaining -= d; S.tick = Date.now();
  }
  function tick() {
    if (S.state !== 'playing') return;
    if (hidden() || holds > 0) { S.tick = null; save(); return; }      /* en arrière-plan ou espace parent ouvert : pause */
    if (S.tick == null) { S.tick = Date.now(); save(); return; }       /* reprise : on repart de maintenant */
    account(); save();
    if (S.remaining <= WARN_MS && !S.warned) warn();
    if (S.remaining <= 0) endSession();
  }
  function pause() { if (S.state !== 'playing') return; account(); S.tick = null; save(); }
  function resume() { if (S.state !== 'playing' || hidden() || holds > 0) return; S.tick = Date.now(); save(); }
  function hold() { pause(); holds++; }
  function release() { holds = Math.max(0, holds - 1); if (holds === 0) resume(); }
  /* Safari iOS peut suspendre les minuteries : on s'appuie sur la visibilité de la page ET sur l'horloge */
  document.addEventListener('visibilitychange', function () { if (hidden()) pause(); else { resume(); tick(); } });
  window.addEventListener('pagehide', pause);
  window.addEventListener('pageshow', function () { resume(); tick(); if (S.state === 'ended' && C.current() !== 'sleep') C.go('sleep'); });
  document.addEventListener('freeze', pause);
  document.addEventListener('resume', function () { resume(); tick(); });
  setInterval(tick, 1000);

  /* ---------- une minute avant la fin : doux, sans alarme ---------- */
  function warn() {
    S.warned = true; save();
    C.saveCurrent();                                              /* si elle dessine ou décore : on sauvegarde */
    C.say(C.NAME + ', on va bientôt dire au revoir au château !', { must: true });
    try {
      var el = C.el('<div class="sleepy" aria-hidden="true">' + Art.item('moon') + '<i>' + Art.item('star') + '</i><i>' + Art.item('star') + '</i><i>' + Art.item('star') + '</i></div>');
      C.$('#fx').appendChild(el); warnEl = el; setTimeout(function () { el.remove(); }, 7000);
    } catch (e) { }
  }

  /* ---------- fin de la session ---------- */
  async function endSession() {
    if (ending || S.state === 'ended') return; ending = true;
    var blocker = C.el('<div class="blocker"></div>'); C.$('#overlay').appendChild(blocker);   /* plus d'interaction pendant la fin */
    S.state = 'ended'; S.remaining = 0; S.tick = null; S.endedAt = Date.now(); save();                /* enregistré tout de suite : un rechargement ne contourne rien */
    try { C.music.fadeOut(7); } catch (e) { }
    for (var i = 0; i < 30 && isTouching(); i++) await sleep(100);                                   /* on laisse finir le geste en cours (3 s max) */
    C.saveCurrent(); await sleep(700);
    for (var k = 0; k < 8 && C.current() !== 'sleep'; k++) { C.go('sleep', { fresh: true }); await sleep(450); }
    blocker.remove(); ending = false;
  }
  Ses.end = endSession;

  /* ---------- code PIN (haché, jamais en clair) ---------- */
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  async function hashPin(pin, salt) {
    try {
      if (window.crypto && crypto.subtle && window.TextEncoder) { var b = new TextEncoder().encode(salt + ':' + pin); for (var i = 0; i < 1200; i++) b = new Uint8Array(await crypto.subtle.digest('SHA-256', b)); return 's' + hex(b); }
    } catch (e) { }
    var h = 2166136261, str = salt + ':' + pin;
    for (var r = 0; r < 3000; r++) for (var j = 0; j < str.length; j++) { h ^= str.charCodeAt(j) + r; h = Math.imul(h, 16777619) >>> 0; }
    return 'f' + h.toString(16);
  }
  function newSalt() { var a = new Uint8Array(12); try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); } return hex(a); }
  async function verify(pin) {
    var t = Date.now();
    if (S.lockUntil > t) return { ok: false, msg: 'Trop d’essais : réessayez dans ' + Math.ceil((S.lockUntil - t) / 1000) + ' s.' };
    var h = await hashPin(pin, S.pin.salt);
    if (h === S.pin.hash) { S.fails = 0; save(); return { ok: true }; }
    S.fails++; var msg = 'Code incorrect.';
    if (S.fails >= 5) { S.lockUntil = Date.now() + 30000; S.fails = 0; msg = 'Trop d’essais : réessayez dans 30 s.'; }
    save(); return { ok: false, msg: msg };
  }
  function pinPad(o) {
    return new Promise(function (res) {
      var m = C.modal('<div class="pintitle">' + o.title + '</div><div class="pinsub">' + (o.sub || '') + '</div><div class="pindots"><i></i><i></i><i></i><i></i></div><div class="pinerr" aria-live="polite"></div><div class="pinpad">' +
        '123456789'.split('').map(function (d) { return '<button data-d="' + d + '">' + d + '</button>'; }).join('') + '<button class="ghost" disabled></button><button data-d="0">0</button><button data-d="del" aria-label="effacer">←</button></div>' +
        '<button class="btn red small pincancel" aria-label="annuler">' + Art.ui.cross + '</button>', 'pin');
      var digits = '', busy = false, dots = C.$$('.pindots i', m), err = C.$('.pinerr', m);
      function paint() { dots.forEach(function (d, i) { d.classList.toggle('on', i < digits.length); }); }
      C.$$('.pinpad button[data-d]', m).forEach(function (b) {
        b.addEventListener('click', async function () {
          if (busy) return; var d = b.dataset.d; C.sfx.pop();
          if (d === 'del') { digits = digits.slice(0, -1); err.textContent = ''; paint(); return; }
          if (digits.length >= 4) return;
          digits += d; paint();
          if (digits.length === 4) {
            busy = true; var r = await o.onSubmit(digits); busy = false;
            if (r.ok) { m.close(); res(true); return; }
            err.textContent = r.msg || 'Code incorrect.'; digits = ''; paint();
            if (!r.soft) { C.sfx.oops(); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake'); }
          }
        });
      });
      C.$('.pincancel', m).onclick = function () { m.close(); res(false); };
    });
  }
  async function askPin(title) { hold(); try { return await pinPad({ title: title || 'Code parent', sub: 'Pour les adultes', onSubmit: verify }); } finally { release(); } }
  async function createPin() {
    hold();
    try {
      var first = null;
      return await pinPad({
        title: 'Choisissez un code', sub: '4 chiffres, que Celia ne connaît pas',
        onSubmit: async function (pin) {
          if (first === null) { first = pin; return { ok: false, soft: true, msg: 'Entrez-le une 2e fois pour confirmer.' }; }
          if (pin !== first) { first = null; return { ok: false, msg: 'Les deux codes sont différents. Recommencez.' }; }
          var salt = newSalt(); S.pin = { salt: salt, hash: await hashPin(pin, salt) }; S.fails = 0; S.lockUntil = 0; save(); return { ok: true };
        }
      });
    } finally { release(); }
  }
  Ses._debug = function () { return { pin: S.pin, state: S.state, remaining: S.remaining, tick: S.tick, warned: S.warned, holds: holds }; };

  /* ---------- démarrer / reprendre ---------- */
  function startSession(minutes) {
    S.minutes = minutes; S.remaining = minutes * 60000; S.state = 'playing'; S.warned = false; S.tick = null; S.endedAt = 0; save();
    try { C.music.unsilence(); } catch (e) { }
    C.go('home'); resume();           /* le minuteur commence quand Celia entre dans son château */
  }
  Ses.start = startSession;
  function addMinutes(n) {
    var wasEnded = S.state === 'ended';
    S.remaining = Math.max(0, S.remaining) + n * 60000; if (S.remaining > WARN_MS) S.warned = false;
    S.state = 'playing'; S.tick = null; save();
    if (wasEnded) { try { C.music.unsilence(); } catch (e) { } C.go('home'); }
    resume();
  }
  function setDuration(m) {
    if (S.state === 'playing') { S.minutes = m; S.remaining = m * 60000; S.warned = false; S.tick = null; save(); resume(); }
    else startSession(m);
  }

  /* ---------- illustrations ---------- */
  var HOURGLASS = Art.svg('0 0 48 48', '<path d="M12 6h24M12 42h24" stroke="#6b3f72" stroke-width="5" stroke-linecap="round"/><path d="M15 6c0 12 9 14 9 18s-9 6-9 18h18c0-12-9-14-9-18s9-6 9-18z" fill="#fff" stroke="#6b3f72" stroke-width="3.500" stroke-linejoin="round"/><path d="M19 38h10c-1-5-5-6-5-8 0 2-4 3-5 8z" fill="#ffd84d"/><path d="M18 11h12c-1 4-4 5-6 8-2-3-5-4-6-8z" fill="#ffd84d" opacity=".5"/>');
  var LOCK = Art.svg('0 0 48 48', '<rect x="9" y="21" width="30" height="22" rx="6" fill="#fff"/><path d="M15 21v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="31" r="3.500" fill="#8b60ee"/><path d="M24 33v5" stroke="#8b60ee" stroke-width="3" stroke-linecap="round"/>');

  /* ---------- écran parent avant de jouer ---------- */
  C.register('setup', {
    enter: function (el, params) {
      var chosen = DURS.indexOf(S.minutes) >= 0 ? S.minutes : 10;
      el.innerHTML = '<div class="setup"><div class="setbg"></div><div class="setcard"><div class="sbody"></div></div></div>';
      var body = C.$('.sbody', el);
      function locked() {
        body.innerHTML = '<div class="lumi-s">' + Art.lumi() + '</div><h1>Espace parents</h1><p class="sfine">Cet espace est réservé aux adultes.</p><button class="bigbtn" data-enter>' + (Ses.pinSet() ? 'Entrer le code' : 'Choisir mon code') + '</button>';
        C.$('[data-enter]', body).onclick = function () { C.sfx.pop(); gate(); };
      }
      async function gate() { var ok = Ses.pinSet() ? await askPin('Code parent') : await createPin(); if (ok) durations(); else locked(); }
      function durations() {
        body.innerHTML = '<div class="lumi-s small">' + Art.lumi() + '</div><h1>Combien de temps pour jouer ?</h1>' +
          '<div class="durs">' + DURS.map(function (m) { return '<button class="dur' + (m === chosen ? ' on' : '') + '" data-m="' + m + '"><span class="dhg">' + HOURGLASS + '</span><b>' + m + '</b><em>minutes</em></button>'; }).join('') + '</div>' +
          '<button class="voicetog" data-voice></button>' +
          '<button class="bigbtn go" data-go><span>' + Art.castle() + '</span>Commencer à jouer !</button>' +
          '<p class="sfine">Le jeu se termine doucement quand le temps est écoulé. Cette protection concerne uniquement l’application : elle ne verrouille pas l’iPhone.</p>';
        C.$$('.dur', body).forEach(function (b) { b.onclick = function () { chosen = +b.dataset.m; C.$$('.dur', body).forEach(function (x) { x.classList.toggle('on', x === b); }); C.sfx.tap(C.rint(0, 6)); C.bounce(b, 1.1); }; });
        var vt = C.$('[data-voice]', body);
        function paintV() { vt.classList.toggle('off', !C.settings.voice); vt.textContent = C.settings.voice ? '🔊 Voix de la conteuse : activée' : '🔇 Voix de la conteuse : coupée (musique et sons gardés)'; }
        vt.onclick = function () { C.settings.voice = !C.settings.voice; C.saveSettings(); paintV(); C.sfx.tap(2); if (C.settings.voice) C.say('Coucou !', { must: true }); };
        paintV();
        var go = C.$('[data-go]', body), once = false;
        go.onclick = function () { if (once) return; once = true; C.sfx.yay(); C.fx.confetti(24); setTimeout(function () { startSession(chosen); }, 350); };
      }
      if (params && params.unlocked) durations(); else { locked(); setTimeout(gate, 400); }
    },
    leave: function () { }
  });

  /* ---------- écran de fin : le château s'endort ---------- */
  C.register('sleep', {
    enter: function (el, params) {
      var fresh = !!(params && params.fresh);
      var stars = ''; for (var i = 0; i < 26; i++) stars += '<i style="left:' + ((i * 37) % 100) + '%;top:' + ((i * 23) % 60) + '%;animation-delay:' + ((i % 7) * 0.5) + 's"></i>';
      el.innerHTML = '<div class="sleep' + (fresh ? ' fresh' : '') + '"><div class="nstars">' + stars + '</div><div class="nmoon">' + Art.item('moon') + '</div>' +
        '<div class="ncastle">' + Art.castle() + '</div><div class="zzz"><i>z</i><i>Z</i><i>z</i></div>' +
        '<div class="bye"><h1>À bientôt ' + C.NAME + ' !</h1><p>Le château se repose.</p></div>' +
        '<button class="parentlock" aria-label="espace parents">' + LOCK + '</button></div>';
      /* accès parent : appui long (pas un simple bouton) */
      var lk = C.$('.parentlock', el), t = null;
      lk.addEventListener('pointerdown', function () { t = setTimeout(function () { t = null; Ses.openParent(); }, 1400); lk.classList.add('arm'); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { lk.addEventListener(ev, function () { clearTimeout(t); lk.classList.remove('arm'); }); });
      if (fresh) setTimeout(function () { C.say('Bravo ' + C.NAME + ' ! Maintenant, le château va se reposer. À bientôt !', { must: true }); }, 1200);
    },
    leave: function () { }
  });

  /* ---------- espace parents (réglages + session) ---------- */
  var panelOpen = false;
  Ses.openParent = async function () {
    if (panelOpen) return;
    if (!Ses.pinSet()) { C.go('setup'); return; }
    panelOpen = true;
    var ok = await askPin('Espace parents');
    if (!ok) { panelOpen = false; return; }
    hold(); panel();
  };
  function fmt(ms) { ms = Math.max(0, ms); var s = Math.round(ms / 1000), m = Math.floor(s / 60); return m + ' min ' + ('0' + (s % 60)).slice(-2) + ' s'; }
  function panel() {
    var st = S.state;
    var sess = st === 'playing'
      ? '<button class="pbtn" data-a="add"><span class="btn green">+5</span><em>Ajouter 5 min</em></button><button class="pbtn" data-a="dur"><span class="btn blue">' + HOURGLASS + '</span><em>Changer la durée</em></button><button class="pbtn" data-a="stop"><span class="btn red">' + Art.ui.cross + '</span><em>Arrêter la session</em></button>'
      : (st === 'ended'
        ? '<button class="pbtn" data-a="new"><span class="btn green">' + Art.ui.again + '</span><em>Nouvelle session</em></button><button class="pbtn" data-a="add"><span class="btn blue">+5</span><em>Ajouter 5 min</em></button><button class="pbtn" data-a="back"><span class="btn purple">' + Art.ui.back + '</span><em>Écran de fin</em></button>'
        : '<button class="pbtn" data-a="new"><span class="btn green">' + Art.ui.next + '</span><em>Nouvelle session</em></button>');
    var m = C.modal('<div class="ptitle">Espace parents</div><div class="pstat"></div><div class="pgrid sess">' + sess + '</div>' +
      '<div class="pgrid"><button class="pbtn" data-k="voice"><span class="btn green">' + Art.ui.voice + '</span><em>Voix</em></button><button class="pbtn" data-k="music"><span class="btn purple">' + Art.ui.music + '</span><em>Musique</em></button>' +
      '<button class="pbtn" data-a="pin"><span class="btn yellow">' + LOCK + '</span><em>Changer le code</em></button><button class="pbtn" data-k="reset"><span class="btn red">' + Art.ui.trash + '</span><em>Tout effacer</em></button></div>' +
      '<label class="pvol"><span class="btn purple small">' + Art.ui.music + '</span><input type="range" min="0" max="100" step="5" value="' + Math.round((C.settings.musicVol || 0) * 100) + '" aria-label="volume de la musique"><b>' + Math.round((C.settings.musicVol || 0) * 100) + '%</b></label>' +
      '<p class="pnote">Protection de l’application uniquement : elle ne verrouille pas l’iPhone et n’est pas une sécurité inviolable. Les créations restent sur cet appareil, sans compte.</p>' +
      '<div class="row"><button class="btn big green" data-ok aria-label="fermer">' + Art.ui.check + '</button></div>', 'parent psess');
    var stat = C.$('.pstat', m);
    function paintStat() { stat.textContent = S.state === 'playing' ? 'Temps restant : ' + fmt(S.remaining) + ' (en pause pendant ce réglage)' : (S.state === 'ended' ? 'Session terminée' : 'Aucune session en cours'); }
    paintStat();
    function close() { if (!panelOpen) return; panelOpen = false; m.close(); release(); }
    function paint() { C.$('[data-k=voice] .btn', m).classList.toggle('dim', !C.settings.voice); C.$('[data-k=music] .btn', m).classList.toggle('dim', !C.settings.music); }
    paint();
    C.$('[data-k=voice]', m).onclick = function () { C.settings.voice = !C.settings.voice; C.saveSettings(); paint(); C.sfx.pop(); if (C.settings.voice) C.say('Coucou !', { must: true }); };
    C.$('[data-k=music]', m).onclick = function () { C.settings.music = !C.settings.music; C.saveSettings(); paint(); C.sfx.pop(); C.music.sync(); };
    var vol = C.$('.pvol input', m);
    vol.addEventListener('input', function () { C.music.setVol(vol.value / 100); C.$('.pvol b', m).textContent = vol.value + '%'; if (!C.settings.music) { C.settings.music = true; C.saveSettings(); paint(); C.music.sync(); } });
    C.$('[data-k=reset]', m).onclick = function () {
      C.confirm('<div class="trashicon">' + Art.ui.trash.replace(/#fff/g, '#c4a8ff').replace('#ff8fb8', '#fff') + '</div>').then(function (yes) {
        if (!yes) return;
        ['profile', 'rewards', 'pets', 'room', 'hint.draw', 'hint.color', 'hint.coloring'].forEach(function (k) { C.store.del(k); });
        C.db.clear().then(function () { location.reload(); });
      });
    };
    C.$('[data-a=pin]', m).onclick = async function () { close(); var ok = await createPin(); if (ok) C.say('Code enregistré !'); };
    var a = function (k) { return C.$('[data-a=' + k + ']', m); };
    if (a('add')) a('add').onclick = function () { C.sfx.chime(); close(); addMinutes(5); };
    if (a('stop')) a('stop').onclick = function () { close(); endSession(); };
    if (a('new')) a('new').onclick = function () { close(); C.go('setup', { unlocked: true }); };
    if (a('back')) a('back').onclick = function () { close(); };
    if (a('dur')) a('dur').onclick = function () {
      var d = C.modal('<div class="ptitle">Durée de jeu</div><div class="durs">' + DURS.map(function (n) { return '<button class="dur" data-m="' + n + '"><span class="dhg">' + HOURGLASS + '</span><b>' + n + '</b><em>minutes</em></button>'; }).join('') + '</div><p class="pnote">Le temps restant repart à zéro avec la nouvelle durée.</p>', 'parent psess');
      C.$$('.dur', d).forEach(function (b) { b.onclick = function () { C.sfx.chime(); d.close(); close(); setDuration(+b.dataset.m); }; });
    };
    C.$('[data-ok]', m).onclick = function () { C.sfx.pop(); close(); };
  }

  /* ---------- démarrage de l'application ---------- */
  Ses.boot = function () {
    if (S.state === 'playing') {
      if (S.tick != null) { S.remaining -= Math.min(Math.max(0, Date.now() - S.tick), 2000); }   /* rechargement : au plus 2 s comptées */
      S.tick = null; save();
      if (S.remaining <= 0) { S.state = 'ended'; S.remaining = 0; save(); C.go('sleep'); return; }
      C.go('home'); resume(); return;
    }
    if (S.state === 'ended') { C.go('sleep'); return; }
    C.go('setup');
  };

  /* plus aucune activité tant que la session est terminée : tout est redirigé vers l'écran de fin */
  var go0 = C.go;
  C.go = function (name, params, from) {
    if (S.state === 'ended' && name !== 'sleep' && name !== 'setup') name = 'sleep';
    if (S.state === 'none' && name !== 'setup' && name !== 'sleep') name = 'setup';
    return go0.call(C, name, params, from);
  };
})();
