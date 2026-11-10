/* =========================================================================
   GameKit : briques communes à tous les jeux du site (chargé sur chaque page de jeu).
   - Plein écran universel (API Fullscreen, repli CSS « is-max » pour iPhone) compatible
     avec le code de chaque jeu : mêmes classes (is-max / is-full) et même évènement
     « fullscreenchange » (émis aussi pour le repli CSS).
   - Réglages globaux : volume maître / muet (appliqué à TOUS les jeux sans toucher à leur
     code : le nœud « destination » de Web Audio est remplacé par un gain maître), vibration,
     sons d'interface, effets réduits, écran toujours allumé.
   - Mobile : débloque l'audio au premier toucher, coupe le son quand on quitte l'onglet,
     garde l'écran allumé, bloque le zoom par pincement et le menu contextuel sur les scènes.
   - UI : feuille de réglages, toasts, confirmation, changement de jeu en un tap.
   - Journal de jeu (dernier lancé, temps passé) + favoris, utilisés par la page Jeux.
   API : window.GameKit (voir la fin du fichier). Aucune dépendance.
   ========================================================================= */
(function () {
  "use strict";
  if (window.GameKit) return;
  var doc = document, root = doc.documentElement;
  var VERSION = "1.0";

  /* ---------- petits outils ---------- */
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function safe(fn) { try { return fn(); } catch (e) { if (window.console) console.warn("[GameKit]", e); } }
  function readJSON(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function h(tag, attrs, kids) {
    var el = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === "string" ? doc.createTextNode(c) : c); });
    return el;
  }
  var listeners = {};
  function on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); }
  function emit(evt, data) { (listeners[evt] || []).forEach(function (fn) { safe(function () { fn(data); }); }); }

  /* ---------- registre des jeux (pour changer de jeu, le journal et les favoris) ---------- */
  var GAMES = [
    { id: "jeu", title: "Écureuil Survivor", ico: "🐿️" },
    { id: "merger", title: "Merger", ico: "🟣" },
    { id: "suika", title: "Suika", ico: "🍉" },
    { id: "dice", title: "Écureuil Dice", ico: "🎲" },
    { id: "king-dice", title: "King Dice", ico: "👑" },
    { id: "ages", title: "Age of Defense", ico: "🏰" },
    { id: "arcane", title: "Arcane Tactics", ico: "🪄" },
    { id: "echecs", title: "Échecs", ico: "♞" },
    { id: "billard", title: "Billard", ico: "🎱" },
    { id: "golf", title: "Mini-golf", ico: "⛳" },
    { id: "golfaventure", title: "Golfaventure", ico: "🏌️" },
    { id: "grimpe", title: "Grimpe-Chêne", ico: "🌳" },
    { id: "idle", title: "Le Grand Chêne", ico: "🌰" }
  ];
  var BY_ID = {};
  GAMES.forEach(function (g) { g.href = g.id + ".html"; BY_ID[g.id] = g; });
  function idOf(href) { return String(href || "").split("#")[0].split("?")[0].split("/").pop().replace(/\.html$/, ""); }
  var CURRENT = idOf(location.pathname);
  var IS_GAME = !!BY_ID[CURRENT];

  /* ---------- réglages globaux ---------- */
  var PREF_KEY = "gk-prefs-v1";
  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var DEFAULTS = { volume: 1, muted: false, uiSounds: true, haptics: true, reduceFx: reduced, keepAwake: true };
  var prefs = {};
  (function () {
    var saved = readJSON(PREF_KEY, {});
    Object.keys(DEFAULTS).forEach(function (k) { prefs[k] = saved && saved[k] != null ? saved[k] : DEFAULTS[k]; });
  })();
  function getPref(k) { return prefs[k]; }
  function setPref(k, v) {
    if (!(k in DEFAULTS) || prefs[k] === v) return;
    prefs[k] = v;
    writeJSON(PREF_KEY, prefs);
    applyPrefs();
    emit("prefs", { key: k, value: v });
  }
  function resetPrefs() {
    Object.keys(DEFAULTS).forEach(function (k) { prefs[k] = DEFAULTS[k]; });
    writeJSON(PREF_KEY, prefs);
    applyPrefs();
    emit("prefs", { key: "*", value: null });
  }
  function applyPrefs() {
    root.classList.toggle("gk-reduce-fx", !!prefs.reduceFx);
    applyMaster();
    if (prefs.keepAwake) acquireWake(); else releaseWake();
  }

  /* ---------- audio maître : un seul volume / muet pour tous les jeux ---------- */
  var masters = [], ctxs = [], suspendedByUs = [];
  function level() { return prefs.muted ? 0 : Math.pow(Math.max(0, Math.min(1, prefs.volume)), 1.6); }
  function applyMaster() {
    masters.forEach(function (m) {
      safe(function () { m.gain.setTargetAtTime(level(), m.context.currentTime, 0.03); });
    });
  }
  safe(function () {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var BASE = window.BaseAudioContext || AC;
    var desc = Object.getOwnPropertyDescriptor(BASE.prototype, "destination") || Object.getOwnPropertyDescriptor(AC.prototype, "destination");
    if (!desc || !desc.get) return;
    Object.defineProperty(AC.prototype, "destination", {
      configurable: true,
      get: function () {
        if (!this.__gkMaster) {
          var real = desc.get.call(this);
          var g = this.createGain();
          g.gain.value = level();
          g.connect(real);
          this.__gkMaster = g;
          masters.push(g); ctxs.push(this);
        }
        return this.__gkMaster;
      }
    });
  });
  function unlockAudio() {
    ctxs.forEach(function (c) { if (c.state === "suspended" || c.state === "interrupted") safe(function () { c.resume(); }); });
  }

  /* ---------- sons d'interface + vibration ---------- */
  var uiCtx = null;
  function uiBlip(freq, dur, vol) {
    if (!prefs.uiSounds || level() <= 0) return;
    safe(function () {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!uiCtx) uiCtx = new AC();
      if (uiCtx.state === "suspended") uiCtx.resume();
      var t = uiCtx.currentTime, o = uiCtx.createOscillator(), g = uiCtx.createGain();
      o.type = "square"; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.72, t + dur);
      g.gain.setValueAtTime(vol || 0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(uiCtx.destination); o.start(t); o.stop(t + dur + 0.02);
    });
  }
  var HAPTICS = { tick: 6, tap: 12, hit: 22, success: [18, 40, 28], fail: [60, 40, 60] };
  function haptic(kind) {
    if (!prefs.haptics || !navigator.vibrate) return;
    safe(function () { navigator.vibrate(HAPTICS[kind || "tap"] || kind); });
  }
  // sons + tick sur les boutons de menu (pas sur les commandes de jeu tenues)
  var MENU_BTN = ".game-overlay button, .game-card button, .panel button, .game-head button, .gk-sheet button, .gk-sheet label, .chip, .btn";
  function isMenuControl(el) {
    var b = el && el.closest && el.closest(MENU_BTN);
    if (!b || b.closest("[data-gk-quiet], .fl-btn") || b.disabled) return null;
    return b;
  }
  doc.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (isMenuControl(e.target)) { uiBlip(760, 0.05, 0.03); haptic("tick"); }
  }, true);

  /* ---------- effets visuels génériques ---------- */
  function pop(el) {
    if (!el || !el.animate || prefs.reduceFx) return;
    safe(function () { el.animate([{ scale: 1 }, { scale: 1.22 }, { scale: 1 }], { duration: 220, easing: "cubic-bezier(.2,1.4,.4,1)" }); });
  }
  function shake(el) {
    if (!el || !el.animate || prefs.reduceFx) return;
    safe(function () { el.animate([{ translate: "0" }, { translate: "-6px" }, { translate: "6px" }, { translate: "-4px" }, { translate: "0" }], { duration: 260 }); });
  }

  /* ---------- plein écran universel ---------- */
  var ROOT_SEL = ".game-stage, .pool, .fl, .gr, .chess, .idle-stage";
  function visible(el) { return !!(el && (el.offsetParent !== null || getComputedStyle(el).position === "fixed")); }
  function fsEl() { return doc.fullscreenElement || doc.webkitFullscreenElement || null; }
  function primaryRoot() {
    var explicit = $("[data-gk-stage]");
    if (explicit) return explicit;
    return $$(ROOT_SEL).filter(visible)[0] || null;
  }
  function nudgeResize() {
    [0, 120, 400].forEach(function (ms) { setTimeout(function () { window.dispatchEvent(new Event("resize")); }, ms); });
  }
  function isFull(el) { return !!el && (fsEl() === el || el.classList.contains("is-max")); }
  function anyFull() { return !!fsEl() || !!$(".is-max"); }
  function ensureExitButton(el) {
    if (el.querySelector(".fs-exit, .gk-fs-exit")) return;
    var b = h("button", { class: "gk-fs-exit", type: "button", "aria-label": "Quitter le plein écran", text: "✕", onclick: function () { fullscreen.exit(el); } });
    el.appendChild(b);
  }
  function syncFull() {
    var full = anyFull();
    root.classList.toggle("gk-full", full);
    $$(ROOT_SEL).forEach(function (el) { el.classList.toggle("gk-fs", isFull(el)); });
    emit("fullscreen", { full: full });
    if (full) acquireWake();
  }
  var fullscreen = {
    is: isFull,
    supported: function () { return !!primaryRoot(); },
    enter: function (el) {
      el = el || primaryRoot(); if (!el || isFull(el)) return;
      ensureExitButton(el);
      var fallback = function () { el.classList.add("is-max"); window.scrollTo(0, 0); doc.dispatchEvent(new Event("fullscreenchange")); syncFull(); nudgeResize(); };
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (!req) return fallback();
      var p; try { p = req.call(el, { navigationUI: "hide" }); } catch (e) { return fallback(); }
      if (p && p.then) p.then(function () { syncFull(); nudgeResize(); }, fallback); else { syncFull(); nudgeResize(); }
    },
    exit: function (el) {
      el = el || primaryRoot();
      var wasMax = !!el && el.classList.contains("is-max");
      if (el) el.classList.remove("is-max");
      if (fsEl()) { var ex = doc.exitFullscreen || doc.webkitExitFullscreen; try { var p = ex.call(doc); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
      if (wasMax) doc.dispatchEvent(new Event("fullscreenchange"));
      syncFull(); nudgeResize();
    },
    toggle: function (el) { el = el || primaryRoot(); if (!el) return; if (isFull(el)) fullscreen.exit(el); else fullscreen.enter(el); }
  };
  doc.addEventListener("fullscreenchange", function () { syncFull(); nudgeResize(); });
  doc.addEventListener("webkitfullscreenchange", function () { syncFull(); nudgeResize(); });
  // les jeux qui gèrent eux-mêmes leur plein écran changent la classe is-max : on suit
  function watchRoots() {
    if (!window.MutationObserver) return;
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        // une secousse d'écran déclenchée par le jeu (classe « …shake… ») = petite vibration
        var was = " " + (m.oldValue || "") + " ", now = " " + m.target.className + " ";
        var hit = /\s([\w-]*shake[\w-]*)\s/.exec(now);
        if (hit && was.indexOf(" " + hit[1] + " ") < 0) haptic(/(-l|big|heavy)$/.test(hit[1]) ? "hit" : "tap");
      });
      syncFull();
    });
    $$(ROOT_SEL).forEach(function (el) { mo.observe(el, { attributes: true, attributeFilter: ["class"], attributeOldValue: true }); });
  }

  /* ---------- écran toujours allumé ---------- */
  var wake = null;
  function acquireWake() {
    if (!IS_GAME || !prefs.keepAwake || wake || !navigator.wakeLock || doc.visibilityState !== "visible") return;
    safe(function () {
      navigator.wakeLock.request("screen").then(function (s) {
        wake = s; s.addEventListener("release", function () { wake = null; });
        if (!prefs.keepAwake) releaseWake();
      }, function () {});
    });
  }
  function releaseWake() { if (wake) { safe(function () { wake.release(); }); wake = null; } }

  /* ---------- onglet masqué : on coupe le son, on le rend au retour ---------- */
  doc.addEventListener("visibilitychange", function () {
    if (doc.visibilityState === "hidden") {
      suspendedByUs = ctxs.filter(function (c) { return c.state === "running"; });
      suspendedByUs.forEach(function (c) { safe(function () { c.suspend(); }); });
      logFlush();
    } else {
      suspendedByUs.forEach(function (c) { safe(function () { c.resume(); }); });
      suspendedByUs = [];
      unlockAudio(); acquireWake();
    }
  });
  ["pointerdown", "touchend", "keydown"].forEach(function (t) {
    doc.addEventListener(t, function () { unlockAudio(); acquireWake(); markActive(); }, { passive: true, capture: true });
  });

  /* ---------- durcissement mobile ---------- */
  doc.addEventListener("gesturestart", function (e) { if (e.target.closest && e.target.closest(ROOT_SEL)) e.preventDefault(); }, { passive: false });
  doc.addEventListener("contextmenu", function (e) { if (e.target.tagName === "CANVAS") e.preventDefault(); });

  /* ---------- UI : toasts, feuilles, confirmation ---------- */
  function host() { return fsEl() || doc.body; }
  var toastBox = null, openSheet = null;
  function ensureToastBox() {
    if (!toastBox) toastBox = h("div", { class: "gk-toasts", "aria-live": "polite", role: "status" });
    if (toastBox.parentNode !== host()) host().appendChild(toastBox);
    return toastBox;
  }
  function toast(msg, opts) {
    opts = opts || {};
    var t = h("div", { class: "gk-toast" }, [opts.icon ? h("span", { class: "gk-toast-ico", text: opts.icon, "aria-hidden": "true" }) : null, h("span", { text: msg })]);
    ensureToastBox().appendChild(t);
    setTimeout(function () { t.classList.add("gk-out"); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260); }, opts.ms || 2200);
  }
  function sheet(opts) {
    if (openSheet) openSheet.close();
    var lastFocus = doc.activeElement;
    var closeBtn = h("button", { class: "gk-x", type: "button", "aria-label": "Fermer", text: "✕" });
    var body = h("div", { class: "gk-sheet-body" });
    if (typeof opts.body === "string") body.innerHTML = opts.body; else if (opts.body) body.appendChild(opts.body);
    var title = h("h2", { class: "gk-sheet-title", id: "gk-sheet-title" }, [opts.icon ? h("span", { "aria-hidden": "true", text: opts.icon + " " }) : null, opts.title || ""]);
    var box = h("div", { class: "gk-sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "gk-sheet-title" }, [h("header", { class: "gk-sheet-head" }, [title, closeBtn]), body]);
    var actions = opts.actions && opts.actions.length ? h("footer", { class: "gk-sheet-foot" }) : null;
    if (actions) {
      opts.actions.forEach(function (a) {
        actions.appendChild(h("button", { class: "btn btn-small" + (a.kind === "ghost" ? " btn-ghost" : ""), type: "button", text: a.label, onclick: function () { if (a.onClick) a.onClick(); if (a.close !== false) api.close(); } }));
      });
      box.appendChild(actions);
    }
    var back = h("div", { class: "gk-backdrop" }, [box]);
    var api = {
      el: box, body: body, backdrop: back,
      close: function () {
        if (openSheet !== api) return;
        openSheet = null; doc.removeEventListener("keydown", onKey, true);
        back.classList.add("gk-out");
        setTimeout(function () { if (back.parentNode) back.parentNode.removeChild(back); }, 180);
        if (lastFocus && lastFocus.focus) safe(function () { lastFocus.focus({ preventScroll: true }); });
        if (opts.onClose) opts.onClose();
      }
    };
    function onKey(e) {
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); api.close(); return; }
      if (e.key !== "Tab") return;
      var f = $$("button, a[href], input, select, [tabindex]:not([tabindex='-1'])", box).filter(function (x) { return !x.disabled; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && doc.activeElement === last) { first.focus(); e.preventDefault(); }
    }
    closeBtn.addEventListener("click", api.close);
    back.addEventListener("pointerdown", function (e) { if (e.target === back) api.close(); });
    doc.addEventListener("keydown", onKey, true);
    host().appendChild(back);
    openSheet = api;
    safe(function () { (box.querySelector("[data-gk-focus]") || closeBtn).focus({ preventScroll: true }); });
    return api;
  }
  function confirmBox(opts) {
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (!done) { done = true; resolve(v); } }
      var s = sheet({
        title: opts.title || "Confirmer", icon: opts.icon || "❓",
        body: h("p", { class: "gk-confirm-text", text: opts.text || "" }),
        actions: [{ label: opts.cancel || "Annuler", kind: "ghost", onClick: function () { fin(false); } }, { label: opts.ok || "OK", onClick: function () { fin(true); } }],
        onClose: function () { fin(false); }
      });
      shake(s.el);
    });
  }
  // un élément ouvert doit suivre le plein écran (seul l'élément plein écran est affiché)
  function reparent() {
    var hst = host();
    if (toastBox && toastBox.parentNode && toastBox.parentNode !== hst) hst.appendChild(toastBox);
    if (openSheet && openSheet.backdrop.parentNode !== hst) hst.appendChild(openSheet.backdrop);
  }
  doc.addEventListener("fullscreenchange", reparent);
  doc.addEventListener("webkitfullscreenchange", reparent);

  /* ---------- journal de jeu (dernier lancé, temps passé) + favoris ---------- */
  var LOG_KEY = "gk-playlog-v1", FAV_KEY = "gk-favs-v1";
  var lastAct = Date.now(), logDirty = false, log = readJSON(LOG_KEY, {});
  function markActive() { lastAct = Date.now(); }
  function logFlush() { if (logDirty) { writeJSON(LOG_KEY, log); logDirty = false; } }
  function readLog() { return readJSON(LOG_KEY, {}); }
  function startLog() {
    if (!IS_GAME) return;
    var e = log[CURRENT] = log[CURRENT] || { last: 0, secs: 0, plays: 0 };
    e.plays++; e.last = Date.now(); logDirty = true; logFlush();
    setInterval(function () {
      if (doc.visibilityState !== "visible" || Date.now() - lastAct > 60000) return;
      e.secs += 5; e.last = Date.now(); logDirty = true;
      if (e.secs % 20 === 0) logFlush();
    }, 5000);
    window.addEventListener("pagehide", logFlush);
  }
  function favs() { var f = readJSON(FAV_KEY, []); return Array.isArray(f) ? f : []; }
  function toggleFav(id) {
    var f = favs(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    writeJSON(FAV_KEY, f);
    return i < 0;
  }
  function ago(ts) {
    var s = (Date.now() - ts) / 1000;
    if (s < 90) return "à l'instant";
    var m = s / 60; if (m < 60) return "il y a " + Math.round(m) + " min";
    var hr = m / 60; if (hr < 24) return "il y a " + Math.round(hr) + " h";
    var d = hr / 24; if (d < 2) return "hier";
    return "il y a " + Math.round(d) + " j";
  }
  function dur(sec) {
    var m = Math.round(sec / 60);
    if (m < 1) return "moins d'1 min";
    if (m < 60) return m + " min";
    var hh = Math.floor(m / 60), mm = m % 60;
    return hh + " h" + (mm ? " " + (mm < 10 ? "0" : "") + mm : "");
  }

  /* ---------- feuille de réglages ---------- */
  function sw(label, desc, key, extra) {
    var input = h("input", { type: "checkbox", "data-pref": key });
    input.checked = key === "muted" ? !prefs.muted : !!prefs[key];
    if (extra && extra.disabled) { input.disabled = true; }
    input.addEventListener("change", function () {
      var v = key === "muted" ? !input.checked : input.checked;
      setPref(key, v);
      pop(input.nextSibling);
      if (key === "haptics" && v) haptic("success");
    });
    return h("label", { class: "gk-switch" + (input.disabled ? " is-off" : "") }, [input, h("span", { class: "gk-switch-ui", "aria-hidden": "true" }), h("span", { class: "gk-switch-text" }, [label, desc ? h("small", { text: desc }) : null])]);
  }
  function openSettings() {
    var body = h("div", { class: "gk-settings" });
    var vol = h("input", { type: "range", min: "0", max: "100", step: "5", "aria-label": "Volume général", "data-gk-quiet": "" });
    vol.value = String(Math.round(prefs.volume * 100));
    var volOut = h("output", { text: vol.value + " %" });
    vol.addEventListener("input", function () {
      volOut.textContent = vol.value + " %";
      setPref("volume", Number(vol.value) / 100);
      if (prefs.muted && Number(vol.value) > 0) { setPref("muted", false); var m = $("[data-pref=muted]", body); if (m) m.checked = true; }
    });
    vol.addEventListener("change", function () { uiBlip(660, 0.08, 0.05); haptic("tick"); });
    body.appendChild(h("section", { class: "gk-sec" }, [
      h("h3", { text: "Son" }),
      sw("Son activé", "Coupe ou remet le son de tous les jeux", "muted"),
      h("label", { class: "gk-slider" }, [h("span", { text: "Volume général" }), vol, volOut]),
      sw("Sons de menus", "Petit clic sur les boutons", "uiSounds")
    ]));
    body.appendChild(h("section", { class: "gk-sec" }, [
      h("h3", { text: "Confort" }),
      sw("Vibrations", navigator.vibrate ? "Retour tactile sur les menus et les temps forts" : "Pas disponible sur cet appareil", "haptics", { disabled: !navigator.vibrate }),
      sw("Effets réduits", "Moins de secousses et d'animations", "reduceFx"),
      sw("Écran toujours allumé", navigator.wakeLock ? "L'écran ne s'éteint pas en jouant" : "Pas disponible sur ce navigateur", "keepAwake", { disabled: !navigator.wakeLock })
    ]));
    var rootEl = primaryRoot();
    if (rootEl) {
      var fsBtn = h("button", { class: "btn btn-small gk-wide", type: "button", "data-gk-focus": "" });
      var setLbl = function () { fsBtn.textContent = isFull(rootEl) ? "✕ Quitter le plein écran" : "⛶ Passer en plein écran"; };
      setLbl();
      fsBtn.addEventListener("click", function () { var s = openSheet; if (s) s.close(); setTimeout(function () { fullscreen.toggle(rootEl); }, 60); });
      body.appendChild(h("section", { class: "gk-sec" }, [h("h3", { text: "Affichage" }), fsBtn]));
    }
    if (IS_GAME && log[CURRENT]) {
      var e = log[CURRENT];
      body.appendChild(h("p", { class: "gk-stat", text: "Sur ce jeu : " + dur(e.secs) + " de jeu · lancé " + e.plays + " fois" }));
    }
    // changer de jeu
    var f = favs();
    var ordered = GAMES.slice().sort(function (a, b) { return (f.indexOf(b.id) >= 0) - (f.indexOf(a.id) >= 0); });
    var grid = h("div", { class: "gk-tiles" });
    ordered.forEach(function (g) {
      grid.appendChild(h("a", { class: "gk-tile" + (g.id === CURRENT ? " is-current" : ""), href: g.href, "aria-current": g.id === CURRENT ? "page" : null }, [
        h("span", { class: "gk-tile-ico", "aria-hidden": "true", text: g.ico }),
        h("span", { class: "gk-tile-name", text: g.title }),
        f.indexOf(g.id) >= 0 ? h("span", { class: "gk-tile-fav", "aria-label": "Favori", text: "★" }) : null
      ]));
    });
    body.appendChild(h("section", { class: "gk-sec" }, [h("h3", { text: "Changer de jeu" }), grid, h("div", { class: "gk-row" }, [
      h("button", { class: "btn btn-small btn-ghost", type: "button", text: "🎲 Au hasard", onclick: function () { randomGame(); } }),
      h("a", { class: "btn btn-small btn-ghost", href: "jeux.html", text: "Tous les jeux" })
    ])]));
    sheet({
      title: "Réglages", icon: "⚙️", body: body,
      actions: [{ label: "↺ Réinitialiser", kind: "ghost", close: false, onClick: function () { resetPrefs(); toast("Réglages remis par défaut", { icon: "↺" }); var s = openSheet; if (s) { s.close(); setTimeout(openSettings, 200); } } }, { label: "Fermer" }]
    });
  }
  function randomGame() {
    var pool = GAMES.filter(function (g) { return g.id !== CURRENT; });
    var g = pool[Math.floor(Math.random() * pool.length)];
    toast("Direction : " + g.title, { icon: g.ico });
    setTimeout(function () { location.href = g.href; }, 450);
  }

  /* ---------- installation dans la page ---------- */
  function installHeader() {
    var head = $(".game-head");
    var gear = h("button", { class: "btn btn-ghost btn-small gk-gear", type: "button", "aria-label": "Réglages du jeu", title: "Réglages (son, vibrations, changer de jeu)" }, [h("span", { "aria-hidden": "true", text: "⚙" }), h("span", { class: "gk-btn-label", text: " Réglages" })]);
    gear.addEventListener("click", openSettings);
    if (head) {
      var wrap = $("[class$='-head-btns']", head);
      if (!wrap) {
        wrap = h("div", { class: "gk-head-actions" });
        Array.prototype.slice.call(head.children).forEach(function (c) { if (c.tagName === "BUTTON" || c.classList.contains("btn")) wrap.appendChild(c); });
        head.appendChild(wrap);
      }
      var rootEl = primaryRoot();
      if (rootEl && !$("[data-game-fullscreen], [data-gk-fs]", head)) {
        var fsb = h("button", { class: "btn btn-ghost btn-small gk-fsbtn", type: "button", "data-gk-fs": "", "aria-label": "Plein écran" }, [h("span", { "aria-hidden": "true", text: "⛶" }), h("span", { class: "gk-btn-label", text: " Plein écran" })]);
        fsb.addEventListener("click", function () { fullscreen.toggle(primaryRoot()); });
        wrap.appendChild(fsb);
      }
      wrap.appendChild(gear);
    } else {
      var stage = $(".idle-stage");
      if (stage) {
        gear.className = "gk-fab"; gear.textContent = "⚙"; gear.setAttribute("aria-label", "Réglages du jeu");
        stage.appendChild(gear);
      }
    }
  }

  /* ---------- page Jeux : favoris, reprendre, au hasard ---------- */
  function initJeuxPage() {
    var grid = $(".games-grid");
    if (!grid) return;
    var cards = $$(".card", grid);
    function reorder() {
      var f = favs();
      cards.slice().sort(function (a, b) {
        var fa = f.indexOf(a.dataset.gameId), fb = f.indexOf(b.dataset.gameId);
        if ((fa >= 0) !== (fb >= 0)) return fa >= 0 ? -1 : 1;
        return Number(a.dataset.order) - Number(b.dataset.order);
      }).forEach(function (c) { grid.appendChild(c); });
    }
    cards.forEach(function (card, i) {
      var a = $(".card-title a", card); if (!a) return;
      var id = idOf(a.getAttribute("href")); card.dataset.gameId = id; card.dataset.order = i;
      var title = a.textContent.trim();
      var star = h("button", { class: "gk-star", type: "button", "aria-pressed": favs().indexOf(id) >= 0 ? "true" : "false", "aria-label": "Mettre " + title + " en favori", text: "★" });
      star.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var now = toggleFav(id);
        star.setAttribute("aria-pressed", now ? "true" : "false");
        pop(star); haptic("tap");
        toast(now ? title + " ajouté aux favoris" : title + " retiré des favoris", { icon: now ? "★" : "☆" });
        reorder();
      });
      var media = $(".card-media", card); if (media) media.appendChild(star);
    });
    reorder();

    var lg = readLog();
    var ids = Object.keys(lg).filter(function (id) { return BY_ID[id] && lg[id].last; }).sort(function (a, b) { return lg[b].last - lg[a].last; }).slice(0, 3);
    var total = Object.keys(lg).reduce(function (s, id) { return s + (lg[id].secs || 0); }, 0);
    var items = ids.map(function (id) {
      var g = BY_ID[id];
      return h("a", { class: "gk-resume-item", href: g.href }, [h("span", { class: "gk-resume-ico", "aria-hidden": "true", text: g.ico }), h("span", { class: "gk-resume-txt" }, [h("strong", { text: g.title }), h("small", { text: ago(lg[id].last) + (lg[id].secs ? " · " + dur(lg[id].secs) : "") })])]);
    });
    var rand = h("button", { class: "btn btn-small btn-ghost gk-rand", type: "button", text: "🎲 Au hasard", onclick: randomGame });
    var sec = h("section", { class: "gk-resume", "aria-label": "Reprendre" }, [
      h("div", { class: "gk-resume-head" }, [h("h2", { text: ids.length ? "Reprendre" : "Pas envie de choisir ?" }), total >= 60 ? h("span", { class: "gk-resume-total", text: "Temps de jeu : " + dur(total) }) : null]),
      h("div", { class: "gk-resume-row" }, items.concat([rand]))
    ]);
    grid.parentNode.insertBefore(sec, grid);
  }

  function init() {
    doc.body.classList.add("gk");
    applyPrefs();
    if (IS_GAME) {
      safe(installHeader);
      safe(watchRoots);
      safe(startLog);
    }
    if (doc.body.dataset.page === "games" || $(".games-grid")) safe(initJeuxPage);
    syncFull();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();

  /* ---------- API publique ---------- */
  window.GameKit = {
    version: VERSION,
    games: GAMES, current: CURRENT,
    prefs: { get: getPref, set: setPref, reset: resetPrefs },
    on: on,
    fullscreen: fullscreen,
    haptic: haptic,
    sound: { blip: uiBlip, level: level },
    ui: { toast: toast, sheet: sheet, confirm: confirmBox, settings: openSettings, pop: pop, shake: shake },
    log: { read: readLog },
    favs: { list: favs, toggle: toggleFav },
    randomGame: randomGame
  };
})();
