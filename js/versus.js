/* =========================================================================
   Versus : salon de la party (section Versus de jeux.html).
   Créer / rejoindre, joueurs et points, règles, format et équipes, choix du
   mode (ou roulette), manche en cours, historique. Toute la logique réseau
   est dans js/party.js ; ici on ne fait que l'interface.
   ========================================================================= */
(function () {
  "use strict";
  var P = window.Party;
  var app = document.querySelector("[data-vs-app]");
  if (!P || !app) return;
  var GAMES = window.PARTY_GAMES || [], MODES = window.PARTY_MODES || [];
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var ui = { format: "ffa", teams: null, teamKey: "", rolling: false, err: "", copied: false, launching: null };
  var m = /#p=([A-Za-z]{4})/.exec(location.hash);
  if (m) { var cur = (function () { try { return JSON.parse(sessionStorage.getItem("party-v1") || "null"); } catch (e) { return null; } })(); if (!cur || cur.code !== m[1].toUpperCase()) P.join(m[1]); try { history.replaceState(null, "", location.pathname); } catch (e) {} }
  if (P.code) P.ensureUi();

  /* ---------- joueurs présents / équipes ---------- */
  function present() {
    var ids = [];
    P.roster.forEach(function (x) { if (ids.indexOf(x.id) < 0 && (!P.st || P.st.members[x.id] || x.id === P.me.id)) ids.push(x.id); });
    if (P.st) Object.keys(P.st.members).forEach(function (id) { if (P.st.members[id].bot && ids.indexOf(id) < 0) ids.push(id); });
    return ids.slice(0, 4);
  }
  function syncTeams() {
    var ids = present(), key = ids.slice().sort().join(",") + "|" + ui.format;
    var formats = P.formatsFor(ids.length).map(function (f) { return f.id; });
    if (formats.indexOf(ui.format) < 0) ui.format = "ffa";
    key = ids.slice().sort().join(",") + "|" + ui.format;
    if (key !== ui.teamKey || !ui.teams) { ui.teamKey = key; ui.teams = P.makeTeams(ids, ui.format, false); }
  }
  function fits(mode) { return ui.teams && present().length >= 2 && P.modeFits(mode, ui.teams); }

  /* ---------- rendu ---------- */
  var dirty = false;
  function render() {
    var ae = document.activeElement;
    if (ae && app.contains(ae) && ae.tagName === "INPUT") { dirty = true; return; }
    dirty = false;
    app.innerHTML = P.code ? partyHtml() : homeHtml();
  }
  app.addEventListener("focusout", function () { setTimeout(function () { if (dirty) render(); }, 0); });

  function profileHtml() {
    var pr = P.profile();
    return '<div class="vs-profile">' +
      '<label class="vs-field"><span>Ton pseudo</span><input type="text" maxlength="16" value="' + esc(pr.name) + '" data-vs-name autocomplete="nickname"></label>' +
      '<div class="vs-pick" role="group" aria-label="Avatar">' + P.AVATARS.map(function (a) { return '<button type="button" class="vs-av' + (a === pr.av ? " is-on" : "") + '" data-vs-av="' + a + '" aria-label="Avatar ' + a + '">' + a + "</button>"; }).join("") + "</div>" +
      '<div class="vs-pick" role="group" aria-label="Couleur">' + P.COLORS.map(function (c) { return '<button type="button" class="vs-col' + (c === pr.color ? " is-on" : "") + '" data-vs-col="' + c + '" style="--pc:' + c + '" aria-label="Couleur ' + c + '"></button>'; }).join("") + "</div></div>";
  }
  function homeHtml() {
    return '<div class="vs-home">' +
      '<section class="panel vs-box"><h2>Ton écureuil</h2>' + profileHtml() + "</section>" +
      '<section class="panel vs-box"><h2>Jouer</h2>' +
      '<p>Crée une party puis partage le code (ou le lien) à tes amis.</p>' +
      '<button class="btn" type="button" data-vs="create">Créer une party</button>' +
      '<div class="vs-join"><label class="vs-field"><span>Code d\'une party</span><input type="text" maxlength="4" placeholder="ABCD" data-vs-code autocomplete="off" autocapitalize="characters"></label>' +
      '<button class="btn btn-alt" type="button" data-vs="join">Rejoindre</button></div>' +
      (ui.err ? '<p class="vs-err">' + esc(ui.err) + "</p>" : "") + "</section>" +
      '<section class="panel vs-box vs-how"><h2>Comment ça marche</h2><ol>' +
      "<li>Le <b>chef</b> de la party (👑) choisit le format : 1 contre 1, chacun pour soi, 2 contre 2, 1 contre 2…</li>" +
      "<li>Il choisit un <b>mode</b> parmi les jeux du site, ou lance la <b>roulette</b>.</li>" +
      "<li>Tout le monde part dans le jeu, connecté automatiquement. Chrono, scores en direct, et le meilleur marque un point.</li>" +
      "<li>Envoie des <b>émotes</b> avec le bouton 😀 ou la touche <kbd>T</kbd>.</li></ol></section>" +
      modesCatalog(true) + "</div>";
  }

  function partyHtml() {
    var st = P.st, lead = P.isLeader();
    if (!st) return '<section class="panel vs-box"><h2>Party ' + esc(P.code) + '</h2><p class="vs-status">Connexion au salon… (' + esc(P.status) + ')</p><button class="btn btn-ghost btn-small" type="button" data-vs="leave">Annuler</button></section>';
    syncTeams();
    var match = st.match, mm = match && P.modeById(match.mode);
    var h = '<div class="vs-grid">';
    // ---- colonne gauche : joueurs
    h += '<aside class="vs-side">';
    h += '<section class="panel vs-box vs-code"><p class="vs-kicker">Code de la party</p><p class="vs-big">' + esc(P.code) + '</p>' +
      '<div class="btn-row"><button class="btn btn-small" type="button" data-vs="copy">' + (ui.copied ? "Lien copié ✓" : "Copier le lien") + '</button><button class="btn btn-ghost btn-small" type="button" data-vs="leave">Quitter</button></div>' +
      (P.status !== "on" ? '<p class="vs-status">Connexion : ' + esc(P.status) + "</p>" : "") + "</section>";
    h += '<section class="panel vs-box vs-players-box"><h2>Joueurs</h2><ul class="vs-players">';
    var ids = Object.keys(st.members).sort(function (a, b) { return (st.pts[b] || 0) - (st.pts[a] || 0) || st.members[a].ts - st.members[b].ts; });
    ids.forEach(function (id) {
      var mb = st.members[id], on = P.present(id), you = id === P.me.id, bot = !!mb.bot;
      h += '<li class="vs-player' + (on ? "" : " is-off") + '" style="--pc:' + esc(mb.c) + '" data-vs-pl="' + esc(id) + '"><span class="vs-pav">' + esc(mb.a) + "</span>" +
        '<span class="vs-pname">' + esc(mb.n) + (id === st.leader ? ' <span title="Chef de la party">👑</span>' : "") + (you ? ' <small>(toi)</small>' : "") + (on ? "" : ' <small>· absent</small>') + "</span>" +
        '<span class="vs-pts">' + (st.pts[id] || 0) + "<small>/" + st.goal + "</small></span>" +
        (lead && bot ? '<span class="vs-pact"><button type="button" class="vs-mini" data-vs="unbot" data-id="' + esc(id) + '" title="Retirer le bot">✕</button></span>' :
         lead && !you ? '<span class="vs-pact"><button type="button" class="vs-mini" data-vs="lead" data-id="' + esc(id) + '" title="Passer chef">👑</button>' + (on ? "" : '<button type="button" class="vs-mini" data-vs="kick" data-id="' + esc(id) + '" title="Retirer">✕</button>') + "</span>" : "") +
        '<span class="vs-bubble" data-vs-bubble="' + esc(id) + '"></span></li>';
    });
    h += "</ul>";
    if (lead) {
      var full = present().length >= 4;
      h += '<div class="vs-bots"><span>🤖 Ajouter un bot</span>' + [1, 2, 3].map(function (lv) { return '<button type="button" class="vs-chipbtn" data-vs-bot="' + lv + '"' + (full ? " disabled" : "") + ">" + P.BOT_LV[lv].n + "</button>"; }).join("") + "</div>" +
        '<p class="vs-note">Les bots jouent les modes « chacun sa partie » (pas ceux en ligne). Pratique pour jouer seul ou compléter une équipe.</p>';
    }
    h += "</section>";
    h += '<section class="panel vs-box"><h2>Ton écureuil</h2>' + profileHtml() + "</section>";
    h += rulesHtml(lead);
    h += "</aside>";

    // ---- colonne droite
    h += '<div class="vs-main">';
    if (st.champ) {
      h += '<section class="panel vs-box vs-champ"><p class="vs-trophy">🏆</p><h2>' + st.champ.map(function (id) { return esc((st.members[id] || {}).n || "?"); }).join(" & ") + " remporte la party !</h2>" +
        (lead ? '<button class="btn" type="button" data-vs="reset">Nouvelle party (scores à zéro)</button>' : "<p>Le chef peut relancer une nouvelle party.</p>") + "</section>";
    }
    if (match && match.status !== "done") {
      h += '<section class="panel vs-box vs-live"><p class="vs-kicker">Manche ' + (st.round + 1) + " en cours · " + esc(P.gameById(mm.game).name) + "</p><h2>" + esc(mm.name) + "</h2>" + P.teamsHtml(match) +
        '<p class="vs-status">' + ({ launch: "Les joueurs chargent le jeu…", play: "Ça joue !", stop: "Fin de la manche…" }[match.status] || "") + "</p>" +
        liveHtml(match, mm) +
        (P.participants().indexOf(P.me.id) >= 0 ? '<a class="btn btn-small" href="' + esc(P.gameById(mm.game).page) + '#party">Rejoindre la manche</a>' : "") +
        (lead ? ' <button class="btn btn-ghost btn-small" type="button" data-vs="cancel">Annuler la manche</button>' : "") + "</section>";
    } else {
      h += nextHtml(lead);
    }
    h += historyHtml();
    h += "</div></div>";
    return h;
  }
  function rulesHtml(lead) {
    var st = P.st, dis = lead ? "" : " disabled";
    return '<section class="panel vs-box"><h2>Règles</h2>' +
      '<label class="vs-field"><span>Points pour gagner</span><select data-vs-rule="goal"' + dis + ">" + [3, 5, 7, 10, 15].map(function (n) { return "<option" + (n === st.goal ? " selected" : "") + ">" + n + "</option>"; }).join("") + "</select></label>" +
      '<label class="vs-field"><span>Points par manche</span><select data-vs-rule="scoring"' + dis + '><option value="winner"' + (st.scoring === "winner" ? " selected" : "") + '>1 point au vainqueur</option><option value="podium"' + (st.scoring === "podium" ? " selected" : "") + ">Selon le classement (3-2-1)</option></select></label>" +
      '<label class="vs-field"><span>Formule</span><select data-vs-rule="flow"' + dis + '><option value="free"' + (st.flow === "free" ? " selected" : "") + '>Le chef choisit chaque manche</option><option value="roulette"' + (st.flow === "roulette" ? " selected" : "") + ">Roulette (mode au hasard)</option><option disabled>Plateau façon jeu de société (bientôt)</option></select></label>" +
      (lead ? '<button class="btn btn-ghost btn-small" type="button" data-vs="reset">Remettre les scores à zéro</button>' : '<p class="vs-note">Seul le chef 👑 peut changer les règles.</p>') + "</section>";
  }
  function nextHtml(lead) {
    var n = present().length, st = P.st;
    var h = '<section class="panel vs-box vs-next"><h2>Prochaine manche' + (st.round ? " (" + (st.round + 1) + ")" : "") + "</h2>";
    if (n < 2) h += '<p class="vs-status">En attente d\'un deuxième joueur… Envoie le code <b>' + esc(P.code) + "</b> à un ami, ou ajoute un bot 🤖.</p>";
    if (n >= 2) {
      h += '<div class="vs-formats" role="group" aria-label="Format">' + P.formatsFor(n).map(function (f) {
        return '<button type="button" class="vs-chipbtn' + (f.id === ui.format ? " is-on" : "") + '" data-vs-format="' + f.id + '"' + (lead ? "" : " disabled") + ">" + esc(f.name) + "</button>";
      }).join("") + "</div>";
      h += '<div class="vs-teamedit">' + ui.teams.map(function (t, i) {
        return (i ? '<span class="pt-vs">VS</span>' : "") + '<div class="vs-team" data-vs-team="' + i + '">' + (ui.teams.length > 1 && t.length > 1 || ui.format !== "ffa" ? '<small>Équipe ' + (i + 1) + "</small>" : "") + t.map(function (id) {
          var mb = st.members[id] || P.memberOf(id);
          return '<button type="button" class="pt-chip vs-tchip" style="--pc:' + esc(mb.c) + '" data-vs-swap="' + esc(id) + '"' + (lead && ui.format !== "ffa" ? "" : " disabled") + ">" + esc(mb.a) + " " + esc(mb.n) + "</button>";
        }).join("") + "</div>";
      }).join("") + "</div>";
      if (lead && ui.format !== "ffa") h += '<p class="vs-note">Clique sur un joueur pour l\'échanger avec l\'équipe d\'à côté. <button type="button" class="vs-link" data-vs="shuffle">Mélanger</button></p>';
      if (lead) h += '<div class="btn-row"><button class="btn btn-alt" type="button" data-vs="roulette"' + (ui.rolling ? " disabled" : "") + ">🎰 Roulette</button></div>";
      else h += '<p class="vs-note">Le chef 👑 choisit la manche.</p>';
    }
    h += '<div class="vs-roulette" data-vs-roll hidden></div>';
    h += "</section>";
    h += modesCatalog(false, lead && n >= 2);
    return h;
  }
  function modesCatalog(info, canLaunch) {
    var h = '<section class="vs-catalog"><h2 class="vs-cat-title">' + (info ? "Les modes" : "Choisir un mode") + "</h2>";
    GAMES.forEach(function (g) {
      var list = MODES.filter(function (m) { return m.game === g.id; }); if (!list.length) return;
      h += '<div class="vs-game" style="--gc:' + esc(g.color) + '"><h3><span>' + g.icon + "</span> " + esc(g.name) + '</h3><div class="vs-modes">';
      list.forEach(function (m) {
        var ok = !info && fits(m);
        h += '<article class="vs-mode' + (ok ? "" : " is-off") + '"><h4>' + esc(m.name) + "</h4><p>" + esc(m.desc) + '</p><p class="vs-meta">' +
          (m.min === m.max ? m.min + " joueurs" : m.min + " à " + m.max + " joueurs") + " · " + fmtList(m) + " · " + Math.round(m.dur / 60) + " min" + (m.room ? " · en ligne" : "") + "</p>" +
          (canLaunch ? '<button class="btn btn-small" type="button" data-vs-launch="' + m.id + '"' + (ok ? "" : " disabled") + ">Lancer</button>" : "") + "</article>";
      });
      h += "</div></div>";
    });
    return h + "</section>";
  }
  function fmtList(m) {
    var f = m.formats || ["ffa"], out = [];
    if (f.indexOf("ffa") >= 0) out.push("chacun pour soi");
    if (f.indexOf("teams") >= 0) out.push("équipes");
    f.forEach(function (x) { if (/^\d-\d$/.test(x)) out.push(x.replace("-", "v")); });
    return out.join(", ");
  }
  function liveHtml(match, mode) {
    var ids = P.participants();
    return '<ul class="vs-livelist">' + ids.map(function (id) {
      var mb = P.st.members[id] || P.memberOf(id), l = P.live[id], r = match.res[id];
      var txt = r ? (r.al ? "terminé · " : "☠ ") + P.scoreText(mode, r.s) : l ? P.scoreText(mode, l.s) : "…";
      return '<li style="--pc:' + esc(mb.c) + '"><span>' + esc(mb.a) + " " + esc(mb.n) + "</span><b>" + esc(txt) + "</b></li>";
    }).join("") + "</ul>";
  }
  function historyHtml() {
    var hist = P.st.hist || []; if (!hist.length) return "";
    return '<section class="panel vs-box"><h2>Manches jouées</h2><ol class="vs-hist">' + hist.map(function (x) {
      var mode = P.modeById(x.mode) || { name: x.mode };
      var win = x.rows.filter(function (r) { return r.place === 1; }).map(function (r) { return r.ids.map(function (id) { return esc((P.st.members[id] || {}).n || "?"); }).join(" & "); }).join(", ");
      return "<li><b>" + esc(mode.name) + "</b> — 🥇 " + win + "</li>";
    }).join("") + "</ol></section>";
  }

  /* ---------- actions ---------- */
  app.addEventListener("click", function (e) {
    var b = e.target.closest("button, [data-vs]"); if (!b || b.disabled) return;
    var a = b.dataset.vs;
    if (b.dataset.vsAv) { P.setProfile({ av: b.dataset.vsAv }); render(); return; }
    if (b.dataset.vsCol) { P.setProfile({ color: b.dataset.vsCol }); render(); return; }
    if (b.dataset.vsFormat) { ui.format = b.dataset.vsFormat; ui.teams = null; render(); return; }
    if (b.dataset.vsSwap) { swapTeam(b.dataset.vsSwap); render(); return; }
    if (b.dataset.vsLaunch) { launch(b.dataset.vsLaunch); return; }
    if (b.dataset.vsBot) { P.addBot(+b.dataset.vsBot); return; }
    if (a === "create") { saveName(); P.create(); P.ensureUi(); ui.err = ""; render(); }
    else if (a === "join") {
      saveName();
      var inp = app.querySelector("[data-vs-code]");
      if (!P.join(inp && inp.value)) { ui.err = "Le code fait 4 lettres."; render(); return; }
      P.ensureUi(); ui.err = ""; render();
    }
    else if (a === "leave") { if (confirm("Quitter la party ?")) { P.leave(); render(); } }
    else if (a === "copy") {
      var link = P.inviteLink();
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(function () { ui.copied = true; render(); setTimeout(function () { ui.copied = false; render(); }, 2000); }, function () { prompt("Lien à partager :", link); });
    }
    else if (a === "reset") { if (confirm("Remettre tous les scores à zéro ?")) P.resetScores(); }
    else if (a === "cancel") P.cancelMatch();
    else if (a === "shuffle") { ui.teams = P.makeTeams(present(), ui.format, true); render(); }
    else if (a === "roulette") roulette();
    else if (a === "kick") P.kick(b.dataset.id);
    else if (a === "unbot") P.removeBot(b.dataset.id);
    else if (a === "lead") { if (confirm("Passer le rôle de chef ?")) P.giveLead(b.dataset.id); }
  });
  app.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset.vsRule) { var o = {}; o[t.dataset.vsRule] = t.dataset.vsRule === "goal" ? +t.value : t.value; P.setRules(o); }
    if (t.hasAttribute("data-vs-name")) saveName();
  });
  app.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.hasAttribute("data-vs-code")) { e.preventDefault(); var b = app.querySelector('[data-vs="join"]'); if (b) b.click(); }
    if (e.key === "Enter" && e.target.hasAttribute("data-vs-name")) { e.target.blur(); }
  });
  function saveName() { var i = app.querySelector("[data-vs-name]"); if (i && i.value.trim()) P.setProfile({ name: i.value }); }
  function swapTeam(id) {
    var t = ui.teams, ti = t.findIndex(function (x) { return x.indexOf(id) >= 0; }); if (ti < 0 || t.length < 2) return;
    var to = (ti + 1) % t.length, sizes = t.map(function (x) { return x.length; });
    // échange avec le premier joueur de l'équipe suivante (les tailles du format restent)
    var other = t[to][0];
    t[ti][t[ti].indexOf(id)] = other; t[to][0] = id;
    ui.teams = t.map(function (x, i) { return x.slice(0, sizes[i]); });
  }
  function launch(id) {
    if (!P.isLeader()) return;
    var mode = P.modeById(id); syncTeams();
    if (!mode || !fits(mode)) return;
    P.launch(id, ui.teams.map(function (t) { return t.slice(); }));
  }
  function roulette() {
    syncTeams();
    var ok = MODES.filter(fits);
    if (!ok.length) return;
    ui.rolling = true; render();
    var box = app.querySelector("[data-vs-roll]"); if (box) box.hidden = false;
    var pick = ok[Math.floor(Math.random() * ok.length)], n = 0, total = 18 + Math.floor(Math.random() * 6);
    (function spin() {
      var m = n >= total ? pick : ok[n % ok.length];
      var b = app.querySelector("[data-vs-roll]");
      if (b) { b.hidden = false; b.innerHTML = '<span>' + P.gameById(m.game).icon + "</span> " + esc(m.name); b.classList.toggle("is-final", n >= total); }
      if (n++ < total) { setTimeout(spin, 60 + n * n * 0.6); return; }
      setTimeout(function () { ui.rolling = false; if (ui.format !== "ffa") ui.teams = P.makeTeams(present(), ui.format, true); launch(pick.id); render(); }, 1200);
    })();
  }

  /* ---------- écoute de la party ---------- */
  P.on("state", render);
  P.on("roster", render);
  P.on("status", render);
  var liveT = 0;
  P.on("live", function () { if (Date.now() - liveT > 800) { liveT = Date.now(); render(); } });
  P.on("launching", function (m) {
    var mode = P.modeById(m.mode); if (!mode) return;
    P.banner && P.banner("");
    var ov = document.createElement("div"); ov.className = "vs-launch";
    ov.innerHTML = '<div><p>' + P.gameById(mode.game).icon + "</p><h2>" + esc(mode.name) + "</h2><p>C'est parti !</p></div>";
    document.body.appendChild(ov);
  });
  P.on("emote", function (d) {
    var b = app.querySelector('[data-vs-bubble="' + d.id + '"]'); if (!b) return;
    b.textContent = d.e; b.classList.remove("is-on"); void b.offsetWidth; b.classList.add("is-on");
  });
  // le chef en roulette : lance la manche suivante tout seul quand tout le monde est revenu
  setInterval(function () {
    var st = P.st;
    if (!st || !P.isLeader() || st.flow !== "roulette" || st.champ || ui.rolling) return;
    if (st.match && st.match.status !== "done") return;
    if (st.match && Date.now() - (st.match.endAt || 0) < 20000) return;
    if (present().length < 2) return;
    var back = present().filter(function (id) { return !P.isBot(id); }).every(function (id) { return P.roster.some(function (x) { return x.id === id && x.pg === "jeux.html"; }); });
    if (back) roulette();
  }, 2000);
  render();
})();
