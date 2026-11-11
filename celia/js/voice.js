/* Voix préenregistrées (facultatif).
   Si le dossier celia/voix/ contient des fichiers générés (voir _celia/voix/README.md) et que custom/custom.js a « voices: true »,
   chaque phrase fixe est jouée depuis un fichier (même conteuse partout, aucun appel réseau, aucune clé dans le jeu).
   Sinon, ou si une phrase n'a pas de fichier, le jeu retombe sur la voix française du navigateur. */
(function () {
  'use strict';
  var A = C.audio, manifest = null, cache = {}, cur = null, loading = false, playTok = 0;
  var ON = !!(window.CELIA_CUSTOM && window.CELIA_CUSTOM.voices);

  /* empreinte FNV-1a 32 bits du texte normalisé : sert de nom de fichier (identique côté générateur) */
  C.voiceKey = function (text) {
    var t = String(text).replace(/\s+/g, ' ').trim(), h = 0x811c9dc5;
    for (var i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  };
  function loadManifest() {
    if (!ON || loading || manifest) return; loading = true;
    fetch('voix/index.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { manifest = j && j.files ? j.files : null; }).catch(function () { }).then(function () { loading = false; });
  }
  loadManifest();

  C.stopVoiceFile = function () { playTok++; if (cur) { try { cur.onended = null; cur.stop(); } catch (e) { } cur = null; } };
  /* renvoie true si un fichier existe pour cette phrase (et le joue) ; fallback() si le fichier est illisible */
  C.playVoiceFile = function (text, done, fallback) {
    if (!manifest) return false;
    var key = C.voiceKey(text), file = manifest[key];
    if (!file) return false;
    var ctx = A.init(); if (!ctx) return false;
    var tok = ++playTok;
    function go(buf) {
      if (tok !== playTok) return;   /* une phrase plus récente a pris la place */
      C.stopVoiceFile();
      var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = 0.75; s.connect(g); g.connect(ctx.destination);
      s.onended = function () { if (cur === s) cur = null; done && done(); };
      cur = s; s.start(0);
    }
    if (cache[key]) { go(cache[key]); return true; }
    fetch('voix/' + file).then(function (r) { if (!r.ok) throw new Error('voix'); return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); })
      .then(function (buf) { cache[key] = buf; go(buf); })
      .catch(function () { fallback && fallback(); });
    return true;
  };
})();
