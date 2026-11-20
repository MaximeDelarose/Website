/* QUELLE VIE ! — effets sonores synthétisés (Web Audio, aucun fichier) */
(function (root) {
  "use strict";
  var ctx = null, muted = false;
  try { muted = localStorage.getItem("qv-mute") === "1"; } catch (e) {}
  function ac() {
    if (!ctx) { var C = root.AudioContext || root.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(f0, f1, dur, type, vol, delay, vib) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vib) { var l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib; lg.gain.value = f0 * 0.04; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, delay, hp) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (delay || 0), n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = hp || 800; s.buffer = b; g.gain.value = vol || 0.3;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start(t);
  }
  var SFX = {
    card: function () { noise(0.12, 0.18, 0, 2500); tone(500, 900, 0.08, "triangle", 0.06); },
    tap: function () { tone(700, 600, 0.05, "triangle", 0.08); },
    coin: function () { tone(988, 0, 0.08, "square", 0.07); tone(1319, 0, 0.18, "square", 0.07, 0.07); },
    ding: function () { tone(1568, 0, 0.5, "sine", 0.18); },
    ping: function () { tone(1200, 1500, 0.09, "sine", 0.14); },
    pop: function () { tone(300, 900, 0.08, "sine", 0.2); },
    boing: function () { tone(180, 520, 0.35, "sine", 0.22, 0, 14); },
    whoosh: function () { noise(0.35, 0.25, 0, 1200); },
    slam: function () { noise(0.2, 0.5, 0, 100); tone(90, 50, 0.2, "square", 0.2); },
    thud: function () { tone(120, 50, 0.18, "sine", 0.35); noise(0.08, 0.2, 0, 200); },
    squeak: function () { tone(1400, 1800, 0.12, "sine", 0.08); tone(1800, 1300, 0.1, "sine", 0.06, 0.12); },
    door: function () { tone(220, 160, 0.3, "sawtooth", 0.05); },
    drip: function () { tone(900, 300, 0.12, "sine", 0.15); },
    shield: function () { tone(400, 0, 0.3, "triangle", 0.12); tone(800, 0, 0.4, "triangle", 0.08, 0.05); },
    clap: function () { noise(0.07, 0.35, 0, 1500); },
    whistle: function () { tone(1600, 1600, 0.3, "sine", 0.08, 0, 6); tone(1200, 1100, 0.5, "sine", 0.07, 0.35, 6); },
    kazoo: function () { [392, 440, 392, 330, 392].forEach(function (f, i) { tone(f, 0, 0.22, "sawtooth", 0.05, i * 0.22, 9); }); },
    sad: function () { [392, 370, 349, 311].forEach(function (f, i) { tone(f, i === 3 ? 280 : 0, i === 3 ? 0.9 : 0.32, "sawtooth", 0.06, i * 0.34, i === 3 ? 6 : 0); }); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0, i === 3 ? 0.5 : 0.14, "square", 0.06, i * 0.12); }); },
    drum: function () { for (var i = 0; i < 10; i++) noise(0.05, 0.2, i * 0.08, 300); },
    crowd: function () { noise(1.2, 0.18, 0, 400); tone(300, 380, 0.8, "sawtooth", 0.03, 0, 5); },
    gainB: function () { tone(880, 1320, 0.12, "sine", 0.12); tone(1320, 0, 0.12, "triangle", 0.06, 0.08); },
    gainR: function () { tone(1568, 2093, 0.1, "sine", 0.1); tone(2637, 0, 0.18, "sine", 0.06, 0.07); },
    lose: function () { tone(420, 220, 0.22, "triangle", 0.14); },
    unlock: function () { [660, 880, 1320].forEach(function (f, i) { tone(f, 0, 0.14, "square", 0.06, i * 0.08); }); noise(0.15, 0.08, 0.2, 3000); },
    tick: function () { tone(1000, 0, 0.06, "square", 0.08); },
    turn: function () { tone(660, 0, 0.1, "triangle", 0.1); tone(880, 0, 0.16, "triangle", 0.1, 0.1); },
    alarm: function () { tone(880, 0, 0.12, "square", 0.08); tone(660, 0, 0.12, "square", 0.08, 0.14); tone(880, 0, 0.12, "square", 0.08, 0.28); },
    win: function () { [523, 659, 784, 659, 784, 1047].forEach(function (f, i) { tone(f, 0, 0.2, "square", 0.06, i * 0.15); }); },
  };
  root.QV_AUDIO = {
    play: function (n, delay) { if (muted || !SFX[n]) return; if (delay) setTimeout(function () { if (!muted) SFX[n](); }, delay * 1000); else SFX[n](); },
    unlock: function () { ac(); },
    muted: function () { return muted; },
    toggle: function () { muted = !muted; try { localStorage.setItem("qv-mute", muted ? "1" : "0"); } catch (e) {} return muted; },
  };
})(window);
