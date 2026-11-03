/* =========================================================================
   King Dice — sons et musique, 100 % Web Audio (aucun fichier audio)
   KD_AUDIO.init(SET, () => bool « vague en cours »), puis KD_AUDIO.SFX.xxx()
   ========================================================================= */
(function (root) {
  "use strict";
  /* ====================== SON (Web Audio, aucun fichier) ====================== */
  var SET = { sfx: 0.8, music: 0.35, mute: false }, intenseFn = function () { return false; };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var AC = null, master, sfxBus, musicBus, noiseBuf, delayNode, lastSnd = {};
  function audio() {
    if (AC) { if (AC.state === "suspended") AC.resume(); return AC; }
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.connect(AC.destination);
      var comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(master);
      sfxBus = AC.createGain(); sfxBus.connect(comp);
      musicBus = AC.createGain(); musicBus.connect(comp);
      delayNode = AC.createDelay(1); delayNode.delayTime.value = 0.36;
      var fb = AC.createGain(); fb.gain.value = 0.28; var dl = AC.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 2000;
      delayNode.connect(dl); dl.connect(fb); fb.connect(delayNode); dl.connect(sfxBus);
      noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      applyVolumes();
    } catch (e) { AC = null; }
    return AC;
  }
  function applyVolumes() {
    if (!AC) return;
    master.gain.value = SET.mute ? 0 : 1;
    sfxBus.gain.value = SET.sfx * 0.85;
    musicBus.gain.value = SET.music * 0.5;
  }
  function gate(name, gap) { if (!AC) return false; var t = AC.currentTime; if (lastSnd[name] && t - lastSnd[name] < gap) return false; lastSnd[name] = t; return true; }
  function tone(f, d, o) {
    if (!AC || SET.mute) return;
    o = o || {};
    var t = AC.currentTime + (o.delay || 0), osc = AC.createOscillator(), g = AC.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || d));
    var v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + (o.att || 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(g);
    var out = o.bus || sfxBus;
    if (o.filter) { var fl = AC.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = o.filter; g.connect(fl); fl.connect(out); }
    else g.connect(out);
    if (o.echo && delayNode) g.connect(delayNode);
    osc.start(t); osc.stop(t + d + 0.05);
  }
  function noise(d, o) {
    if (!AC || SET.mute) return;
    o = o || {};
    var t = AC.currentTime + (o.delay || 0), src = AC.createBufferSource(), g = AC.createGain(), fl = AC.createBiquadFilter();
    src.buffer = noiseBuf; fl.type = o.type || "lowpass"; fl.frequency.setValueAtTime(o.f || 1200, t);
    if (o.fTo) fl.frequency.exponentialRampToValueAtTime(o.fTo, t + d);
    fl.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(fl); fl.connect(g); g.connect(sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + d + 0.05);
  }
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31];
  function note(i, base) { return (base || 392) * Math.pow(2, PENTA[clamp(i, 0, PENTA.length - 1)] / 12); }
  function det() { return 1 + (Math.random() - 0.5) * 0.06; }

  var SFX = {
    summon: function () { var b = 523 * det(); [0, 2, 4, 6].forEach(function (k, i) { tone(note(k, b), 0.22, { type: "triangle", vol: 0.07, delay: i * 0.045 }); }); tone(b * 2, 0.35, { type: "sine", vol: 0.05, delay: 0.16, echo: true }); noise(0.18, { type: "highpass", f: 5000, vol: 0.03 }); },
    land: function () { tone(180 * det(), 0.09, { to: 110, vol: 0.12 }); },
    select: function () { tone(740 * det(), 0.07, { to: 980, type: "sine", vol: 0.08 }); },
    deselect: function () { tone(820, 0.07, { to: 560, type: "sine", vol: 0.06 }); },
    move: function () { if (gate("move", 0.04)) tone(1250 * det(), 0.025, { type: "sine", vol: 0.025 }); },
    deny: function () { tone(240, 0.1, { to: 190, type: "triangle", vol: 0.09 }); tone(200, 0.12, { to: 160, type: "triangle", vol: 0.07, delay: 0.07 }); },
    fuseStart: function () { tone(300, 0.3, { to: 900, type: "sine", vol: 0.06, glide: 0.28 }); noise(0.3, { f: 600, fTo: 4000, vol: 0.04, type: "bandpass", q: 2 }); },
    fuse: function (lvl) {
      var b = 392 * Math.pow(2, (lvl - 2) * 3 / 12);
      tone(b / 2, 0.25, { to: b, vol: 0.14 });
      [0, 2, 4, 5].forEach(function (k, i) { tone(note(k + lvl, b), 0.4, { type: "triangle", vol: 0.08, delay: 0.02 + i * 0.05, echo: true }); });
      noise(0.08, { type: "highpass", f: 3000, vol: 0.06 });
      if (lvl >= 3) [7, 9, 11].forEach(function (k, i) { tone(note(k, b), 0.5, { type: "sine", vol: 0.06, delay: 0.25 + i * 0.07, echo: true }); });
    },
    rook: function () { if (!gate("rook", 0.05)) return; tone(620 * det(), 0.05, { to: 300, type: "square", vol: 0.025, filter: 2200 }); noise(0.04, { f: 2600, vol: 0.04 }); },
    bishop: function () { if (!gate("bishop", 0.07)) return; var f = 990 * det(); tone(f, 0.18, { to: f * 1.5, type: "sine", vol: 0.045 }); tone(f * 2, 0.12, { type: "sine", vol: 0.02, delay: 0.02 }); },
    knight: function () { if (!gate("knight", 0.08)) return; tone(330 * det(), 0.12, { to: 520, type: "triangle", vol: 0.06 }); },
    hitRook: function () { if (gate("hitR", 0.045)) noise(0.05, { f: 1800 * det(), vol: 0.06 }); },
    hitBishop: function () { if (!gate("hitB", 0.06)) return; tone(1320 * det(), 0.16, { type: "sine", vol: 0.04, echo: true }); noise(0.06, { type: "highpass", f: 4000, vol: 0.025 }); },
    hitKnight: function () { if (!gate("hitK", 0.06)) return; tone(160 * det(), 0.16, { to: 70, vol: 0.2 }); noise(0.09, { f: 900, vol: 0.09 }); },
    pop: function (n) { if (!gate("pop", 0.03)) return; var f = 520 * det() * Math.pow(2, Math.min(5, n - 1) * 2 / 12); tone(f, 0.12, { to: f * 2.1, vol: 0.16, glide: 0.06 }); noise(0.07, { type: "highpass", f: 2600, vol: 0.06 }); },
    multi: function (n) { [0, 2, 4, 7, 9].slice(0, Math.min(5, n + 1)).forEach(function (k, i) { tone(note(k + 3, 523), 0.2, { type: "triangle", vol: 0.07, delay: i * 0.05 }); }); },
    coop: function (chain) {
      var b = 523 * Math.pow(2, Math.min(6, chain - 1) / 12);
      tone(b, 0.5, { type: "triangle", vol: 0.09, echo: true }); tone(b * 1.25, 0.5, { type: "triangle", vol: 0.08, delay: 0.06, echo: true });
      tone(b * 1.5, 0.6, { type: "triangle", vol: 0.08, delay: 0.12, echo: true }); tone(b * 2, 0.7, { type: "sine", vol: 0.07, delay: 0.2, echo: true });
      noise(0.4, { type: "highpass", f: 6000, vol: 0.03, delay: 0.1 });
    },
    coopSmall: function () { if (gate("coopS", 0.1)) { tone(880 * det(), 0.15, { type: "triangle", vol: 0.05 }); tone(1320 * det(), 0.18, { type: "triangle", vol: 0.04, delay: 0.05 }); } },
    mana: function () { if (gate("mana", 0.06)) tone(1760 * det(), 0.06, { type: "sine", vol: 0.025 }); },
    spawn: function () { if (gate("spawn", 0.15)) tone(220 * det(), 0.14, { to: 160, type: "triangle", vol: 0.035 }); },
    step: function () { if (gate("step", 0.09)) tone(130 * det(), 0.05, { to: 90, vol: 0.04 }); },
    leak: function () { tone(150, 0.35, { to: 60, vol: 0.25 }); noise(0.25, { f: 500, vol: 0.12 }); tone(330, 0.18, { to: 220, type: "triangle", vol: 0.08, delay: 0.05 }); },
    waveStart: function () { [0, 4, 7].forEach(function (k, i) { tone(392 * Math.pow(2, k / 12), 0.3, { type: "sawtooth", vol: 0.03, filter: 1400, delay: i * 0.09 }); }); tone(784, 0.5, { type: "triangle", vol: 0.06, delay: 0.27, echo: true }); },
    waveEnd: function (big) { [0, 2, 4, 7, 9, 12].forEach(function (k, i) { tone(note(k > 9 ? 5 : k / 2 + 2 | 0, 523), 0.35, { type: "triangle", vol: 0.075, delay: i * 0.08, echo: true }); }); tone(1046, 0.8, { type: "sine", vol: 0.06, delay: 0.5, echo: true }); if (big) [0, 4, 7, 12].forEach(function (k, i) { tone(523 * Math.pow(2, k / 12), 0.9, { type: "triangle", vol: 0.06, delay: 0.75 + i * 0.03 }); }); },
    over: function () { [7, 5, 4, 2, 0].forEach(function (k, i) { tone(note(k, 330), 0.6, { type: "triangle", vol: 0.1, delay: i * 0.2, echo: true }); }); tone(110, 1.2, { to: 55, vol: 0.12, delay: 0.9 }); },
    upgrade: function () { [0, 3, 5].forEach(function (k, i) { tone(note(k + 2, 523), 0.18, { type: "square", vol: 0.03, filter: 2500, delay: i * 0.05 }); }); tone(1568, 0.3, { type: "sine", vol: 0.05, delay: 0.16, echo: true }); },
    power: function () { [0, 4, 7, 11].forEach(function (k, i) { tone(note(k, 659), 0.25, { type: "triangle", vol: 0.06, delay: i * 0.06, echo: true }); }); },
    boom: function () { noise(0.7, { f: 1200, fTo: 70, vol: 0.4 }); tone(120, 0.6, { to: 40, vol: 0.3 }); tone(240, 0.15, { to: 80, type: "triangle", vol: 0.1 }); },
    whoosh: function () { noise(0.35, { type: "bandpass", f: 500, fTo: 2500, vol: 0.08, q: 1.5 }); },
    freeze: function () { for (var k = 0; k < 7; k++) tone(note(12 - k, 1046), 0.3, { type: "sine", vol: 0.04, delay: k * 0.035, echo: true }); noise(0.6, { type: "highpass", f: 6000, fTo: 3000, vol: 0.06 }); },
    rainbow: function () { for (var k = 0; k < 9; k++) tone(note(k + 2, 523), 0.25, { type: "triangle", vol: 0.05, delay: k * 0.04, echo: true }); },
    ui: function () { tone(880, 0.05, { type: "sine", vol: 0.05 }); },
    hover: function () { if (gate("hover", 0.05)) tone(1400, 0.03, { type: "sine", vol: 0.02 }); },
    pause: function () { tone(660, 0.1, { to: 440, vol: 0.06 }); },
  };

  // musique douce générée en direct (accords lents + notes pentatoniques éparses)
  var music = { on: false, timer: null, next: 0, beat: 0 };
  var CHORDS = [[48, 55, 59, 64], [45, 52, 57, 60], [41, 48, 55, 57], [43, 50, 55, 59]];   // Cmaj7 Am7 Fmaj9 G
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function startMusic() {
    if (SET.music <= 0 || !audio() || music.on) return;
    music.on = true; music.next = AC.currentTime + 0.1; music.beat = 0;
    music.timer = setInterval(scheduleMusic, 120);
  }
  function stopMusic() { music.on = false; if (music.timer) clearInterval(music.timer); music.timer = null; }
  function scheduleMusic() {
    if (!AC || !music.on) return;
    var spb = 60 / 76 / 2;
    while (music.next < AC.currentTime + 0.4) {
      var b = music.beat, bar = Math.floor(b / 8), chord = CHORDS[Math.floor(bar / 2) % 4], t = music.next - AC.currentTime;
      var intense = intenseFn();
      if (b % 16 === 0) chord.forEach(function (m) { tone(midi(m), spb * 16, { type: "triangle", vol: 0.03, att: 0.8, filter: 800, bus: musicBus, delay: t }); });
      if (b % 8 === 0) tone(midi(chord[0] - 12), spb * 7, { type: "sine", vol: 0.07, att: 0.04, bus: musicBus, delay: t });
      if (intense && b % 4 === 2) tone(midi(chord[0]), spb * 1.5, { type: "sine", vol: 0.03, bus: musicBus, delay: t });
      if (b % 2 === 0 && Math.random() < (intense ? 0.5 : 0.32)) {
        var m = chord[Math.floor(Math.random() * 4)] + 12 + (Math.random() < 0.3 ? 12 : 0);
        tone(midi(m), 0.8, { type: "sine", vol: 0.04, att: 0.01, bus: musicBus, delay: t });
      }
      music.next += spb; music.beat++;
    }
  }


  // nouveaux sons : pièces, pouvoirs, versus
  SFX.pawn = function () { if (!gate("pawn", 0.05)) return; tone(880 * det(), 0.05, { to: 520, type: "square", vol: 0.018, filter: 2600 }); };
  SFX.queen = function () { if (!gate("queen", 0.08)) return; var f = 660 * det(); tone(f, 0.2, { to: f * 1.5, type: "triangle", vol: 0.05 }); tone(f * 2, 0.3, { type: "sine", vol: 0.03, delay: 0.03, echo: true }); noise(0.05, { type: "highpass", f: 5000, vol: 0.02 }); };
  SFX.hitPawn = function () { if (gate("hitP", 0.04)) noise(0.03, { f: 2600 * det(), vol: 0.035 }); };
  SFX.hitQueen = function () { if (!gate("hitQ", 0.06)) return; tone(1100 * det(), 0.14, { type: "triangle", vol: 0.05, echo: true }); noise(0.05, { f: 2000, vol: 0.05 }); };
  SFX.meteorFall = function () { tone(900, 0.45, { to: 90, type: "sawtooth", vol: 0.05, filter: 1500 }); noise(0.45, { type: "bandpass", f: 3000, fTo: 300, vol: 0.1, q: 1 }); };
  SFX.lightning = function () { noise(0.5, { type: "highpass", f: 3000, vol: 0.2 }); tone(2000, 0.35, { to: 90, type: "sawtooth", vol: 0.08, glide: 0.3 }); tone(160, 0.5, { to: 50, vol: 0.22, delay: 0.05 }); };
  SFX.zapHit = function () { if (gate("zapHit", 0.05)) tone(1500 * det(), 0.08, { to: 300, type: "square", vol: 0.04 }); };
  SFX.heal = function () { [0, 4, 7, 12, 16].forEach(function (k, i) { tone(523 * Math.pow(2, k / 12), 0.5, { type: "sine", vol: 0.08, delay: i * 0.07, echo: true }); }); };
  SFX.frenzy = function () { tone(120, 0.6, { to: 520, type: "sawtooth", vol: 0.06, filter: 1800, glide: 0.5 }); for (var k = 0; k < 6; k++) tone(300 + k * 90, 0.12, { type: "square", vol: 0.03, delay: 0.08 * k, filter: 2400 }); };
  SFX.send = function () { tone(300, 0.25, { to: 110, type: "sawtooth", vol: 0.07, filter: 1100 }); tone(220, 0.35, { to: 90, type: "triangle", vol: 0.08, delay: 0.1 }); };
  SFX.incoming = function () { if (gate("incoming", 0.3)) { tone(180, 0.18, { to: 140, type: "square", vol: 0.04, filter: 900 }); tone(150, 0.22, { to: 110, type: "square", vol: 0.04, delay: 0.14, filter: 900 }); } };
  SFX.ready = function () { tone(660, 0.1, { type: "triangle", vol: 0.06 }); tone(990, 0.14, { type: "triangle", vol: 0.05, delay: 0.07 }); };
  SFX.win = function () { [0, 4, 7, 12, 7, 12, 16].forEach(function (k, i) { tone(523 * Math.pow(2, k / 12), 0.4, { type: "triangle", vol: 0.09, delay: i * 0.11, echo: true }); }); tone(1046, 1, { type: "sine", vol: 0.06, delay: 0.8, echo: true }); };
  SFX.join = function () { tone(587, 0.12, { type: "sine", vol: 0.07 }); tone(880, 0.2, { type: "sine", vol: 0.06, delay: 0.1 }); };

  root.KD_AUDIO = {
    SFX: SFX, audio: audio, applyVolumes: applyVolumes, startMusic: startMusic, stopMusic: stopMusic,
    init: function (set, intense) { SET = set; if (intense) intenseFn = intense; },
  };
})(window);
