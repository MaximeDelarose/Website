/* Le Monde Magique de Célia — noyau : utilitaires, stockage, sons, voix, particules, navigation.
   Aucune donnée n'est envoyée sur Internet. Tout reste sur l'appareil. */
(function () {
  'use strict';
  var C = window.C = {};
  var NAME = (window.CELIA_CUSTOM && window.CELIA_CUSTOM.name) || 'Célia';
  C.NAME = NAME;

  /* ---------- utilitaires ---------- */
  C.$ = function (s, r) { return (r || document).querySelector(s); };
  C.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  C.el = function (html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  C.rnd = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  C.rint = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
  C.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  C.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  C.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  C.uid = (function () { var n = 0; return function (p) { return (p || 'u') + (++n); }; })();
  C.day = function () { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  /* ---------- stockage léger (localStorage, avec repli mémoire) ---------- */
  var mem = {};
  C.store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('celia.' + k); if (v != null) return JSON.parse(v); } catch (e) { }
      return (k in mem) ? mem[k] : d;
    },
    set: function (k, v) {
      mem[k] = v;
      try { localStorage.setItem('celia.' + k, JSON.stringify(v)); return true; } catch (e) { C.storeError = true; return false; }
    },
    del: function (k) { delete mem[k]; try { localStorage.removeItem('celia.' + k); } catch (e) { } }
  };
  C.settings = Object.assign({ sound: true, voice: true, music: true }, C.store.get('settings', {}));
  C.saveSettings = function () { C.store.set('settings', C.settings); };

  /* ---------- stockage des créations (IndexedDB, repli mémoire) ---------- */
  var DBNAME = 'celia-db', STORE = 'creations';
  var memCreations = [];
  var dbp = null;
  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise(function (res) {
      try {
        if (!window.indexedDB) return res(null);
        var rq = indexedDB.open(DBNAME, 1);
        rq.onupgradeneeded = function () { var db = rq.result; if (!db.objectStoreNames.contains(STORE)) { var s = db.createObjectStore(STORE, { keyPath: 'id' }); s.createIndex('kind', 'kind', { unique: false }); } };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = function () { res(null); };
        rq.onblocked = function () { res(null); };
      } catch (e) { res(null); }
    });
    return dbp;
  }
  function tx(db, mode, fn) {
    return new Promise(function (res, rej) {
      try {
        var t = db.transaction(STORE, mode), s = t.objectStore(STORE), out = fn(s);
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { rej(t.error || new Error('db')); };
        t.onabort = function () { rej(t.error || new Error('abort')); };
      } catch (e) { rej(e); }
    });
  }
  C.db = {
    /* enregistre ; renvoie {ok, full} */
    put: function (rec) {
      rec.id = rec.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
      rec.t = rec.t || Date.now();
      return openDB().then(function (db) {
        if (!db) { memCreations.push(rec); return { ok: true, mem: true }; }
        return tx(db, 'readwrite', function (s) { return s.put(rec); }).then(function () { return { ok: true }; });
      }).catch(function (e) {
        var full = e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e.message)));
        if (!full) { memCreations.push(rec); return { ok: true, mem: true }; }
        return { ok: false, full: true };
      });
    },
    all: function (kind) {
      return openDB().then(function (db) {
        if (!db) return memCreations.filter(function (r) { return !kind || r.kind === kind; });
        return new Promise(function (res) {
          var out = [];
          try {
            var rq = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
            rq.onsuccess = function () { var c = rq.result; if (c) { if (!kind || c.value.kind === kind) out.push(c.value); c.continue(); } else res(out); };
            rq.onerror = function () { res(out); };
          } catch (e) { res(out); }
        });
      }).then(function (a) { return (a || []).sort(function (x, y) { return y.t - x.t; }); }).catch(function () { return []; });
    },
    del: function (id) {
      memCreations = memCreations.filter(function (r) { return r.id !== id; });
      return openDB().then(function (db) { if (db) return tx(db, 'readwrite', function (s) { return s.delete(id); }); }).catch(function () { });
    },
    clear: function () {
      memCreations = [];
      return openDB().then(function (db) { if (db) return tx(db, 'readwrite', function (s) { return s.clear(); }); }).catch(function () { });
    }
  };
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () { }); } catch (e) { }

  /* ---------- sons (Web Audio, tout est synthétisé : aucun fichier) ---------- */
  var A = C.audio = { ctx: null, master: null, noise: null };
  var SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98];
  C.SCALE = SCALE;
  A.init = function () {
    if (A.ctx) return A.ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      A.ctx = new AC();
      A.master = A.ctx.createGain(); A.master.gain.value = 0.55;
      var comp = A.ctx.createDynamicsCompressor();
      A.master.connect(comp); comp.connect(A.ctx.destination);
      var len = A.ctx.sampleRate, buf = A.ctx.createBuffer(1, len, A.ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.noise = buf;
    } catch (e) { A.ctx = null; }
    return A.ctx;
  };
  A.unlock = function () {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { }
    var c = A.init();
    if (c && c.state !== 'running') { try { c.resume(); } catch (e) { } }
    if (c && !A.unlocked) {
      A.unlocked = true;
      try { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) { }
    }
  };
  function ok() { return C.settings.sound && A.ctx && A.ctx.state !== 'closed'; }
  A.ok = ok;
  function tone(f, d, o) {
    if (!ok()) return;
    o = o || {};
    var c = A.ctx, t0 = c.currentTime + (o.at || 0);
    var osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + d);
    var v = (o.vol == null ? 0.22 : o.vol), at = o.attack || 0.012;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + at);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    var last = osc;
    if (o.lp) { var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; osc.connect(lp); last = lp; }
    if (o.bp) { var bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = o.bp; bp.Q.value = o.q || 1.5; last.connect(bp); last = bp; }
    if (o.vib) { var lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = o.vib; lg.gain.value = o.vibAmt || f * 0.04; lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t0); lfo.stop(t0 + d + 0.05); }
    last.connect(g); g.connect(A.master);
    osc.start(t0); osc.stop(t0 + d + 0.05);
  }
  function noise(d, o) {
    if (!ok() || !A.noise) return;
    o = o || {};
    var c = A.ctx, t0 = c.currentTime + (o.at || 0);
    var s = c.createBufferSource(); s.buffer = A.noise; s.loop = true;
    var f = c.createBiquadFilter(); f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1200, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    f.Q.value = o.q || 0.8;
    var g = c.createGain(), v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    s.connect(f); f.connect(g); g.connect(A.master);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + d + 0.05);
  }
  A.tone = tone; A.noise_ = noise;
  var S = C.sfx = {
    pop: function () { tone(520, 0.09, { slide: 880, vol: 0.2 }); },
    tap: function (i) { tone(SCALE[(i == null ? C.rint(0, 6) : i) % SCALE.length], 0.35, { type: 'sine', vol: 0.18 }); tone(SCALE[(i || 0) % SCALE.length] * 2, 0.2, { vol: 0.05, at: 0.01 }); },
    sparkle: function () { for (var i = 0; i < 4; i++) tone(SCALE[C.rint(3, 8)], 0.18, { type: 'triangle', vol: 0.1, at: i * 0.055 }); },
    boing: function () { tone(220, 0.28, { slide: 620, vol: 0.2, type: 'triangle' }); tone(620, 0.2, { slide: 300, vol: 0.12, at: 0.18, type: 'triangle' }); },
    plop: function () { tone(420, 0.14, { slide: 150, vol: 0.28 }); },
    whoosh: function () { noise(0.4, { type: 'bandpass', f: 400, f2: 2400, q: 1, vol: 0.12, attack: 0.15 }); },
    splash: function () { noise(0.5, { f: 3000, f2: 500, vol: 0.18, attack: 0.03 }); },
    bubble: function () { tone(500 + Math.random() * 400, 0.12, { slide: 1100, vol: 0.12 }); },
    munch: function () { for (var i = 0; i < 3; i++) noise(0.07, { f: 900, f2: 400, vol: 0.2, at: i * 0.12 }); tone(180, 0.1, { vol: 0.08 }); },
    squish: function () { tone(260, 0.16, { slide: 110, vol: 0.2, type: 'triangle' }); noise(0.12, { f: 600, vol: 0.08 }); },
    ding: function () { tone(1318.5, 0.9, { vol: 0.2 }); tone(2637, 0.5, { vol: 0.05 }); },
    chime: function () { [0, 2, 4].forEach(function (n, i) { tone(SCALE[n + 2], 0.5, { vol: 0.14, at: i * 0.1 }); }); },
    yay: function () { [0, 2, 3, 5].forEach(function (n, i) { tone(SCALE[n], 0.4, { type: 'triangle', vol: 0.17, at: i * 0.11 }); }); setTimeout(S.sparkle, 480); },
    magic: function () { for (var i = 0; i < 8; i++) tone(SCALE[i] * (i % 2 ? 1 : 1.0), 0.25, { type: 'sine', vol: 0.1, at: i * 0.06 }); },
    ok: function () { tone(659, 0.12, { vol: 0.16 }); tone(880, 0.2, { vol: 0.16, at: 0.09 }); },
    oops: function () { tone(330, 0.2, { slide: 262, vol: 0.12, type: 'triangle' }); },
    shutter: function () { noise(0.05, { type: 'highpass', f: 2000, vol: 0.2 }); noise(0.07, { type: 'highpass', f: 1500, vol: 0.18, at: 0.09 }); },
    mix: function () { noise(0.12, { f: 500, f2: 900, vol: 0.08 }); },
    sizzle: function () { noise(0.6, { type: 'highpass', f: 5000, vol: 0.04, attack: 0.2 }); },
    page: function () { noise(0.25, { type: 'bandpass', f: 1500, f2: 3500, vol: 0.08, attack: 0.08 }); },
    giggle: function () { for (var i = 0; i < 5; i++) tone(700 + (i % 2) * 220 + i * 30, 0.08, { type: 'triangle', vol: 0.12, at: i * 0.09 }); },
    purr: function () { tone(70, 0.9, { type: 'sawtooth', vol: 0.12, lp: 220, vib: 22, vibAmt: 12 }); },
    sleep: function () { tone(440, 0.6, { slide: 330, vol: 0.1 }); },
    drum: function () { tone(160, 0.2, { slide: 60, vol: 0.3 }); },
    animal: function (a) {
      var m = {
        chat: function () { tone(520, 0.55, { type: 'triangle', vol: 0.2, slide: 820, vib: 6, vibAmt: 20, lp: 2400 }); tone(820, 0.4, { type: 'triangle', vol: 0.14, slide: 480, at: 0.25, lp: 2400 }); },
        chien: function () { tone(260, 0.14, { type: 'sawtooth', vol: 0.22, slide: 170, lp: 1100 }); tone(250, 0.16, { type: 'sawtooth', vol: 0.22, slide: 150, at: 0.22, lp: 1100 }); },
        vache: function () { tone(150, 1.0, { type: 'sawtooth', vol: 0.22, slide: 120, lp: 520, vib: 5, vibAmt: 8 }); },
        canard: function () { tone(620, 0.12, { type: 'square', vol: 0.1, slide: 420, bp: 1300 }); tone(600, 0.12, { type: 'square', vol: 0.1, slide: 400, at: 0.18, bp: 1300 }); },
        cochon: function () { tone(200, 0.22, { type: 'sawtooth', vol: 0.2, slide: 110, lp: 700 }); noise(0.1, { f: 700, vol: 0.1, at: 0.2 }); tone(220, 0.2, { type: 'sawtooth', vol: 0.2, slide: 100, lp: 700, at: 0.3 }); },
        mouton: function () { tone(380, 0.8, { type: 'sawtooth', vol: 0.16, lp: 1100, vib: 28, vibAmt: 40 }); },
        lion: function () { noise(1.0, { f: 500, f2: 250, vol: 0.28, attack: 0.15 }); tone(110, 1.0, { type: 'sawtooth', vol: 0.18, slide: 60, lp: 400, vib: 17, vibAmt: 10 }); },
        grenouille: function () { tone(330, 0.1, { type: 'square', vol: 0.1, lp: 900, vib: 40, vibAmt: 60 }); tone(300, 0.14, { type: 'square', vol: 0.1, lp: 900, vib: 40, vibAmt: 60, at: 0.15 }); },
        poule: function () { for (var i = 0; i < 4; i++) tone(520 - i * 20, 0.07, { type: 'square', vol: 0.08, bp: 1000, at: i * 0.1 }); },
        licorne: function () { S.magic(); },
        panda: function () { tone(180, 0.5, { type: 'triangle', vol: 0.18, slide: 260 }); },
        lapin: function () { tone(800, 0.08, { vol: 0.12 }); tone(900, 0.08, { vol: 0.12, at: 0.1 }); },
        dragon: function () { noise(0.7, { f: 700, f2: 300, vol: 0.2 }); tone(140, 0.6, { type: 'sawtooth', vol: 0.12, slide: 90, lp: 500 }); },
        fluff: function () { S.giggle(); }
      };
      (m[a] || S.pop)();
    }
  };

  /* musique douce (boîte à musique, « Au clair de la lune »), uniquement sur l'accueil */
  var MELODY = [[261.6, 1], [261.6, 1], [261.6, 1], [293.7, 1], [329.6, 2], [293.7, 2], [261.6, 1], [329.6, 1], [293.7, 1], [293.7, 1], [261.6, 4]];
  var musicTimer = null, musicOn = false;
  C.music = {
    start: function () {
      if (musicOn) return; musicOn = true;
      var i = 0;
      (function step() {
        if (!musicOn) return;
        if (C.settings.sound && C.settings.music && A.ctx && A.ctx.state === 'running') {
          var n = MELODY[i % MELODY.length];
          tone(n[0], 1.1, { vol: 0.045 }); tone(n[0] * 2, 0.5, { vol: 0.02 }); tone(n[0] * 3, 0.25, { vol: 0.008 });
          i++;
          musicTimer = setTimeout(step, n[1] * 640 + (i % MELODY.length === 0 ? 2400 : 0));
        } else { musicTimer = setTimeout(step, 1200); }
      })();
    },
    stop: function () { musicOn = false; clearTimeout(musicTimer); }
  };

  /* ---------- voix (synthèse du navigateur, avec repli : bulle + petits sons) ---------- */
  var V = C.voice = { voice: null, ok: false };
  function pickVoice() {
    try {
      if (!window.speechSynthesis) return;
      var vs = speechSynthesis.getVoices() || [];
      var fr = vs.filter(function (v) { return /^fr/i.test(v.lang.replace('_', '-')); });
      if (!fr.length) { V.voice = null; V.ok = false; return; }
      /* on note chaque voix : qualité (premium / améliorée / neurale) > voix féminine douce > français de France */
      function score(v) {
        var n = v.name + ' ' + (v.voiceURI || ''), sc = 0;
        if (/premium|enhanced|am[ée]lior|neural|natural|online/i.test(n)) sc += 100;
        if (/siri/i.test(n)) sc += 60;
        if (/am[ée]lie|audrey|aur[ée]lie|marie|julie|c[ée]line|virginie|chantal|denise|elo[iî]se|google fran/i.test(n)) sc += 40;
        if (/thomas|daniel|jacques|henri|paul|claude|antoine|mathieu|bruno/i.test(n)) sc -= 40;
        if (/compact|eloquence|espeak|novelty|whisper|zarvox|bells|trinoids|fred|albert/i.test(n)) sc -= 80;
        if (/^fr[-_]fr/i.test(v.lang)) sc += 15; else if (/^fr[-_]ca/i.test(v.lang)) sc += 8;
        if (v.localService) sc += 3;
        return sc;
      }
      fr.sort(function (a, b) { return score(b) - score(a); });
      V.voice = fr[0]; V.ok = true;
      V.premium = /premium|enhanced|am[ée]lior|neural|natural|siri/i.test(fr[0].name);
    } catch (e) { V.ok = false; }
  }
  try { if (window.speechSynthesis) { pickVoice(); speechSynthesis.addEventListener ? speechSynthesis.addEventListener('voiceschanged', pickVoice) : (speechSynthesis.onvoiceschanged = pickVoice); } } catch (e) { }
  var bubbleTimer = null;
  function showBubble(text) {
    var b = C.$('#bubble');
    if (!b) return;
    b.innerHTML = '<span class="bwave"><i></i><i></i><i></i></span><span class="btxt"></span>';
    b.lastChild.textContent = text;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { b.classList.remove('show'); }, Math.max(2600, text.length * 75));
  }
  function babble(text) {
    var n = Math.min(24, Math.max(4, Math.round(text.length / 2.2)));
    for (var i = 0; i < n; i++) tone(480 + Math.random() * 420, 0.07, { type: 'triangle', vol: 0.09, at: i * 0.095 });
  }
  /* Dire une phrase. Toujours courte. text = phrase ; o.bubble=false pour ne pas afficher la bulle. */
  C.say = function (text, o) {
    o = o || {};
    if (o.bubble !== false) showBubble(text);
    if (!C.settings.sound || !C.settings.voice) return;
    try {
      if (window.speechSynthesis && V.ok && window.SpeechSynthesisUtterance) {
        speechSynthesis.cancel();
        /* phrases courtes, lues doucement, avec une petite respiration entre les morceaux */
        var parts = text.match(/[^.!?…]+[.!?…]*/g) || [text];
        C._utt = [];
        parts.forEach(function (part) {
          part = part.trim(); if (!part) return;
          var u = new SpeechSynthesisUtterance(part);
          u.lang = V.voice.lang; u.voice = V.voice;
          u.rate = V.premium ? 0.9 : 0.84; u.pitch = V.premium ? 1.04 : 1.1; u.volume = 1;
          C._utt.push(u); speechSynthesis.speak(u);
        });
        return;
      }
    } catch (e) { }
    babble(text);
  };
  C.say.stop = function () { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { } };
  C.sayRnd = function (a, o) { C.say(C.rnd(a), o); };

  /* déverrouillage du son à la première interaction + pause quand l'appli est cachée */
  var firstTouch = false;
  C.onFirstTouch = [];
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () {
      A.unlock();
      if (!firstTouch) { firstTouch = true; C.onFirstTouch.forEach(function (f) { try { f(); } catch (e) { } }); }
    }, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { C.say.stop(); try { if (A.ctx) A.ctx.suspend(); } catch (e) { } }
    else { try { if (A.ctx && C.settings.sound) A.ctx.resume(); } catch (e) { } }
  });

  /* ---------- gestes iOS : pas de zoom, pas de menu contextuel, pas de défilement parasite ---------- */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('touchmove', function (e) {
    var t = e.target;
    while (t && t !== document.body) { if (t.classList && t.classList.contains('scrollable')) return; t = t.parentNode; }
    if (e.touches && e.touches.length > 1) e.preventDefault();
    else e.preventDefault();
  }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  /* ---------- particules ---------- */
  var SH = {
    star: '<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z"/>',
    heart: '<path d="M12 21s-8-5.2-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.8-8 11-8 11z"/>',
    sparkle: '<path d="M12 1c.8 6 3 9.2 11 11-8 1.8-10.2 5-11 11-.8-6-3-9.2-11-11 8-1.8 10.2-5 11-11z"/>',
    dot: '<circle cx="12" cy="12" r="8"/>'
  };
  C.PASTELS = ['#ff8fb8', '#ffd84d', '#8de8b5', '#8fd3ff', '#c4a8ff', '#ffb98a', '#ff6fa5', '#4fd8d0'];
  var live = 0;
  C.fx = {
    burst: function (x, y, o) {
      o = o || {};
      var layer = C.$('#fx'); if (!layer) return;
      var n = Math.min(o.n || 12, Math.max(0, 140 - live));
      var cols = o.colors || C.PASTELS, shapes = o.shapes || ['star', 'sparkle', 'heart', 'dot'];
      for (var i = 0; i < n; i++) {
        var sh = C.rnd(shapes), col = C.rnd(cols), sz = (o.size || 22) * (0.6 + Math.random() * 0.8);
        var p = document.createElement('div');
        p.className = 'p';
        p.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + sz + 'px;height:' + sz + 'px;margin:' + (-sz / 2) + 'px 0 0 ' + (-sz / 2) + 'px';
        p.innerHTML = '<svg viewBox="0 0 24 24" fill="' + col + '" stroke="#fff" stroke-width="1.4" stroke-linejoin="round">' + SH[sh] + '</svg>';
        layer.appendChild(p); live++;
        var a = Math.random() * Math.PI * 2, d = (o.dist || 90) * (0.4 + Math.random() * 0.8), up = o.up || 0;
        var dur = (o.dur || 900) * (0.8 + Math.random() * 0.5);
        var an = p.animate([
          { transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 1 },
          { transform: 'translate(' + Math.cos(a) * d * 0.7 + 'px,' + (Math.sin(a) * d * 0.7 - up * 0.5) + 'px) scale(1) rotate(' + (Math.random() * 120 - 60) + 'deg)', opacity: 1, offset: 0.45 },
          { transform: 'translate(' + Math.cos(a) * d + 'px,' + (Math.sin(a) * d - up + (o.fall || 20)) + 'px) scale(.3) rotate(' + (Math.random() * 200 - 100) + 'deg)', opacity: 0 }
        ], { duration: dur, easing: 'cubic-bezier(.2,.8,.3,1)' });
        (function (p) { an.onfinish = function () { p.remove(); live--; }; })(p);
      }
    },
    burstEl: function (el, o) { var r = el.getBoundingClientRect(); C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, o); },
    confetti: function (n) {
      var layer = C.$('#fx'); if (!layer) return;
      n = Math.min(n || 40, 70);
      var W = window.innerWidth, shapes = ['star', 'heart', 'dot', 'sparkle'];
      for (var i = 0; i < n; i++) {
        var sh = C.rnd(shapes), col = C.rnd(C.PASTELS), sz = 14 + Math.random() * 16;
        var p = document.createElement('div'); p.className = 'p';
        var x = Math.random() * W;
        p.style.cssText = 'left:' + x + 'px;top:-30px;width:' + sz + 'px;height:' + sz + 'px';
        p.innerHTML = '<svg viewBox="0 0 24 24" fill="' + col + '" stroke="#fff" stroke-width="1.2">' + SH[sh] + '</svg>';
        layer.appendChild(p);
        var sway = (Math.random() * 120 - 60), dur = 2600 + Math.random() * 1800, dl = Math.random() * 900;
        var an = p.animate([
          { transform: 'translate(0,0) rotate(0)', opacity: 0 },
          { transform: 'translate(' + sway * 0.3 + 'px,' + window.innerHeight * 0.15 + 'px) rotate(90deg)', opacity: 1, offset: 0.1 },
          { transform: 'translate(' + sway + 'px,' + (window.innerHeight + 60) + 'px) rotate(' + (Math.random() * 360) + 'deg)', opacity: 1 }
        ], { duration: dur, delay: dl, easing: 'ease-in', fill: 'backwards' });
        (function (p) { an.onfinish = function () { p.remove(); }; })(p);
      }
    },
    rise: function (x, y, kind, col) {
      var layer = C.$('#fx'); if (!layer) return;
      var p = document.createElement('div'); p.className = 'p';
      var sz = 26 + Math.random() * 12;
      p.style.cssText = 'left:' + (x - sz / 2) + 'px;top:' + (y - sz / 2) + 'px;width:' + sz + 'px;height:' + sz + 'px';
      p.innerHTML = '<svg viewBox="0 0 24 24" fill="' + (col || '#ff6fa5') + '" stroke="#fff" stroke-width="1.4" stroke-linejoin="round">' + SH[kind || 'heart'] + '</svg>';
      layer.appendChild(p);
      var dx = Math.random() * 40 - 20;
      var an = p.animate([{ transform: 'translate(0,0) scale(.4)', opacity: 0 }, { transform: 'translate(' + dx * 0.4 + 'px,-30px) scale(1.1)', opacity: 1, offset: 0.25 }, { transform: 'translate(' + dx + 'px,-110px) scale(.9)', opacity: 0 }], { duration: 1300, easing: 'ease-out' });
      an.onfinish = function () { p.remove(); };
    }
  };
  C.bounce = function (el, k) {
    if (!el || !el.animate) return;
    k = k || 1.22;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(' + k + ',' + (2 - k) + ')', offset: 0.25 }, { transform: 'scale(' + (2 - k) + ',' + k + ')', offset: 0.5 }, { transform: 'scale(1.04)', offset: 0.75 }, { transform: 'scale(1)' }], { duration: 480, easing: 'ease-out' });
  };
  C.wiggle = function (el) {
    if (!el || !el.animate) return;
    el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-7deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(-4deg)' }, { transform: 'rotate(0)' }], { duration: 500, easing: 'ease-in-out' });
  };
  C.pointOf = function (e) { return { x: e.clientX, y: e.clientY }; };

  /* bouton : son + rebond, appelle fn au clic */
  C.tap = function (el, fn, quiet) {
    el.addEventListener('click', function (e) {
      if (!quiet) { C.sfx.pop(); }
      C.bounce(el, 1.12);
      var r = el.getBoundingClientRect();
      if (!quiet) C.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 5, dist: 40, size: 14 });
      fn && fn(e);
    });
  };

  /* ---------- fenêtres (confirmation, célébration) ---------- */
  C.modal = function (html, cls) {
    var ov = C.$('#overlay');
    var m = C.el('<div class="modal ' + (cls || '') + '"><div class="card">' + html + '</div></div>');
    ov.appendChild(m);
    requestAnimationFrame(function () { m.classList.add('in'); });
    m.close = function () { m.classList.remove('in'); setTimeout(function () { m.remove(); }, 250); };
    return m;
  };
  /* confirmation sans texte : une grosse icône + coche verte / croix rouge */
  C.confirm = function (iconHtml) {
    return new Promise(function (res) {
      var m = C.modal('<div class="cicon">' + iconHtml + '</div><div class="row"><button class="btn big green" data-y aria-label="oui">' + Art.ui.check + '</button><button class="btn big red" data-n aria-label="non">' + Art.ui.cross + '</button></div>', 'confirm');
      C.sfx.chime();
      C.$('[data-y]', m).onclick = function () { C.sfx.pop(); m.close(); res(true); };
      C.$('[data-n]', m).onclick = function () { C.sfx.pop(); m.close(); res(false); };
    });
  };
  /* célébration d'une création terminée */
  C.celebrate = function (o) {
    var gift = o.gift;
    var html = '<div class="rays"></div>' +
      (o.img ? '<div class="polaroid"><img alt="" src="' + o.img + '"></div>' : (o.svg ? '<div class="polaroid svg">' + o.svg + '</div>' : '')) +
      (gift ? '<div class="gift"><div class="giftart">' + gift.art + '</div><div class="giftbadge">' + Art.ui.gift + '</div></div>' : '') +
      '<div class="row"></div>';
    var m = C.modal(html, 'celebrate');
    var row = C.$('.row', m);
    (o.buttons || []).forEach(function (b) {
      var bt = C.el('<button class="btn big ' + (b.cls || 'pink') + '" aria-label="' + (b.label || '') + '">' + b.icon + '</button>');
      bt.onclick = function () { C.sfx.pop(); m.close(); b.fn && b.fn(); };
      row.appendChild(bt);
    });
    C.sfx.yay();
    setTimeout(function () { C.fx.confetti(45); }, 150);
    if (o.say) setTimeout(function () { C.say(o.say); }, 500);
    return m;
  };

  /* ---------- récompenses douces : étoiles et cadeaux pour la chambre, plafonnés par jour ---------- */
  var R = C.rewards = {
    s: Object.assign({ stars: 0, day: '', gifts: 0, unlocked: [] }, C.store.get('rewards', {})),
    save: function () { C.store.set('rewards', R.s); },
    isUnlocked: function (item) { return item.base || R.s.unlocked.indexOf(item.id) >= 0; },
    /* un petit cadeau par création terminée, au plus 3 par jour : jamais de pression pour rejouer */
    grant: function () {
      if (R.s.day !== C.day()) { R.s.day = C.day(); R.s.gifts = 0; }
      R.s.stars++;
      var gift = null;
      if (R.s.gifts < 3 && Art.roomItems) {
        var locked = Art.roomItems.filter(function (i) { return !R.isUnlocked(i); });
        if (locked.length) { var it = C.rnd(locked); R.s.unlocked.push(it.id); R.s.gifts++; gift = { id: it.id, art: Art.roomItemSvg(it, 90) }; }
      }
      R.save();
      if (C.hud && C.hud.setStars) C.hud.setStars(R.s.stars);
      return gift;
    }
  };

  /* ---------- navigation ---------- */
  var screens = {}, cur = null, curName = null, going = false, backFn = null;
  C.register = function (name, mod) { screens[name] = mod; };
  C.current = function () { return curName; };
  C.setBack = function (fn) { backFn = fn; if (C.hud && C.hud.update) C.hud.update(); };
  C.hasBack = function () { return !!backFn; };
  C.doBack = function () { if (backFn) backFn(); };
  C.go = function (name, params, from) {
    if (going || !screens[name]) return;
    going = true;
    C.say.stop();
    var host = C.$('#screens'), old = cur, oldMod = screens[curName];
    var sec = document.createElement('section');
    sec.className = 'screen enter ' + name;
    sec.dataset.screen = name;
    host.appendChild(sec);
    backFn = null;
    var prev = curName;
    cur = sec; curName = name;
    C.$$('.modal', C.$('#overlay')).forEach(function (m) { m.remove(); });
    C.$$('.hinthand').forEach(function (h) { h.remove(); });
    try { screens[name].enter(sec, params || {}, prev); } catch (e) { console.error(e); }
    if (C.hud && C.hud.update) C.hud.update();
    if (from) C.fx.burst(from.x, from.y, { n: 14, dist: 120 });
    C.sfx.whoosh();
    requestAnimationFrame(function () { requestAnimationFrame(function () { sec.classList.remove('enter'); }); });
    setTimeout(function () {
      if (old) { try { oldMod && oldMod.leave && oldMod.leave(old); } catch (e) { console.error(e); } old.remove(); }
      going = false;
    }, 420);
  };
  C.home = function () { if (curName !== 'home') C.go('home'); };

  /* Les erreurs ne doivent jamais bloquer Célia : on les journalise seulement. */
  window.addEventListener('error', function (e) { try { console.warn('celia:', e.message); } catch (x) { } });

  /* ---------- enregistrement d'une image (SVG ou canvas) en miniature ---------- */
  C.svgToImage = function (svgString, w, h) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('svg')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    });
  };
  /* svgEl: élément <svg> à fixer en image, bg: couleur ou dégradé simple ; renvoie une dataURL JPEG */
  C.rasterSvg = function (svgEl, w, h, bg) {
    var clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', w); clone.setAttribute('height', h);
    clone.removeAttribute('class');
    C.$$('[class]', clone).forEach(function (n) { n.removeAttribute('class'); });
    var s = new XMLSerializer().serializeToString(clone);
    return C.svgToImage(s).then(function (img) {
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var cx = cv.getContext('2d');
      if (bg) { if (typeof bg === 'function') bg(cx, w, h); else { cx.fillStyle = bg; cx.fillRect(0, 0, w, h); } }
      cx.drawImage(img, 0, 0, w, h);
      return cv.toDataURL('image/jpeg', 0.86);
    });
  };
  /* enregistre une création ; gère le manque de place sans drame */
  C.saveCreation = function (kind, dataUrl) {
    return C.db.put({ kind: kind, img: dataUrl }).then(function (r) {
      if (!r.ok && r.full) {
        C.say('Oups, l’album est plein !');
        return C.db.all(kind).then(function (all) {
          var old = all[all.length - 1]; if (!old) return r;
          return C.db.del(old.id).then(function () { return C.db.put({ kind: kind, img: dataUrl }); });
        });
      }
      return r;
    });
  };
})();
