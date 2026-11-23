/* Fin de session « C'est l'heure du dodo » : petite scène animée. Lumi bâille, la sorcière arrive sur son balai, fâchée mais drôle (jamais effrayante),
   puis repart en grommelant. Les expressions et les bouches suivent les phrases. Parent : sorcière désactivable (Lumi seule, version calme). */
(function () {
  'use strict';
  var N = C.NAME;

  /* texte affiché (pour les adultes) / texte prononcé (pour la synthèse vocale) */
  C.CINE = {
    lumi: [
      { who: 'narr', cap: 'Oh là là, ' + N + '… Moi, je suis fatiguée ! Je dois aller me coucher. Et je crois que toi aussi !', say: 'Oh là là, ' + N + '… Moi, je suis fatiguée ! Je dois aller me coucher. Et je crois que toi aussi !' },
      { who: 'narr', cap: 'Parce que sinon… la SORCIÈRE pourrait arriver !', say: 'Parce que sinon… la sorcière pourrait arriver !' }
    ],
    witch: [
      { who: 'witch', ex: 'laugh', arm: 'hips', cap: 'WAH AH AH AH ! ' + N.toUpperCase() + 'AAAA !', say: 'Wah ah ah ah ! ' + N + ' !' },
      { who: 'witch', ex: 'angry', arm: 'point', cap: 'EH OH ! MOI, JE NE SUIS PAS CONTENTE !', say: 'Eh oh ! Moi, je ne suis pas contente !', stamp: true },
      { who: 'witch', ex: 'grumpy', arm: 'cross', cap: 'Le château doit dormir maintenant ! Tout le monde au lit !', say: 'Le château doit dormir maintenant ! Tout le monde au lit !', dim: true },
      { who: 'witch', ex: 'soft', arm: 'hips', cap: 'Allez, petite princesse ! On ferme les yeux et on fait de beaux rêves !', say: 'Allez, petite princesse ! On ferme les yeux et on fait de beaux rêves !', near: true },
      { who: 'witch', ex: 'wink', arm: 'wave', cap: 'Grrr… Bonne nuit quand même ! Hihihi !', say: 'Grrr… Bonne nuit quand même ! Hihihi !', leave: true }
    ],
    night: { who: 'narr', cap: 'Bonne nuit, petite princesse ! Fais de beaux rêves !', say: 'Bonne nuit, petite princesse ! Fais de beaux rêves !' }
  };

  C.register('bedtime', {
    enter: function (el, params) {
      var mode = (params && params.mode) === 'calm' ? 'calm' : 'witch', alive = true, myTok = ++cineTok;
      var stars = ''; for (var i = 0; i < 22; i++) stars += '<i style="left:' + ((i * 41) % 100) + '%;top:' + ((i * 17) % 46) + '%;animation-delay:' + ((i % 7) * 0.45) + 's"></i>';
      el.innerHTML = '<div class="cine">' +
        '<div class="csky"></div><div class="cstars">' + stars + '</div><div class="cmoon">' + Art.item('moon') + '</div>' +
        '<div class="ccastle">' + Art.castle() + '</div>' +
        '<div class="clumi"><div class="clumi-in">' + Art.lumi() + '</div></div>' +
        '<div class="cwitch"><div class="cw-in">' + Art.witch() + '</div><div class="cexcl"></div></div>' +
        '<div class="csmoke"></div><div class="ctrail"></div>' +
        '<div class="ccap" aria-live="polite"><span></span></div></div>';
      var scene = C.$('.cine', el), lumi = C.$('.clumi', el), lsvg = C.$('.clumi svg', el), wit = C.$('.cwitch', el), wsvg = C.$('.cwitch svg.witch', el), cap = C.$('.ccap span', el), smoke = C.$('.csmoke', el), excl = C.$('.cexcl', el);
      Art.witchSet(wsvg, { ex: 'laugh', arm: 'hips' });
      var sleep = C.sleep, ok = function () { return alive && cineTok === myTok && C.current() === 'bedtime'; };
      el._stop = function () { alive = false; };
      function say(step, mouthFn) {
        cap.textContent = step.cap; cap.parentNode.classList.add('on');
        return C.speak(step.who, step.say, { mouth: mouthFn, keepDuck: true });
      }
      var lumiMouth = function (o) { Art.lumiMood(lsvg, o ? 'open' : 'smile'); };
      var witchMouth = function (o) { Art.witchMouth(wsvg, o); };
      function puff() {
        smoke.innerHTML = ''; for (var k = 0; k < 9; k++) { var p = C.el('<i style="left:' + (8 + Math.random() * 84) + '%;top:' + (10 + Math.random() * 70) + '%;--d:' + (Math.random() * 0.25).toFixed(2) + 's;--s:' + (0.9 + Math.random() * 1.1).toFixed(2) + '"></i>'); smoke.appendChild(p); }
        smoke.classList.remove('go'); void smoke.offsetWidth; smoke.classList.add('go');
      }
      function thump() { scene.classList.remove('shake'); void scene.offsetWidth; scene.classList.add('shake'); try { C.sfx.oops && C.sfx.pop(); C.sfx.boing && C.sfx.boing(); } catch (e) { } }
      function excls() { excl.innerHTML = '<svg viewBox="0 0 120 80"><g fill="#ffd84d" stroke="#e0a21a" stroke-width="3" stroke-linejoin="round"><path d="M14 40 L40 34 40 46z"/><path d="M26 10 L48 26 40 34z"/><path d="M60 4 L66 28 54 28z"/><path d="M96 10 L76 26 84 34z"/></g></svg>'; excl.classList.remove('go'); void excl.offsetWidth; excl.classList.add('go'); }

      (async function () {
        try { C.music && C.music.slow && C.music.slow(6); } catch (e) { }
        await sleep(500); if (!ok()) return;
        lumi.classList.add('in'); C.sfx.chime();
        await sleep(700); if (!ok()) return;
        /* 1. Lumi bâille : « Moi, je suis fatiguée ! » */
        Art.lumiMood(lsvg, 'yawn'); lumi.classList.add('yawn'); try { C.sfx.pop(); } catch (e) { }
        await sleep(1100); Art.lumiMood(lsvg, 'smile'); lumi.classList.remove('yawn');
        await say(C.CINE.lumi[0], lumiMouth); if (!ok()) return;
        /* 2. elle regarde autour d'elle */
        lumi.classList.add('look'); await sleep(1300); if (!ok()) return; lumi.classList.remove('look');
        await say(C.CINE.lumi[1], lumiMouth); if (!ok()) return;
        if (mode === 'calm') { await sleep(500); await finish(); return; }
        /* 3. fumée violette, la sorcière arrive sur son balai */
        await sleep(700); if (!ok()) return;
        puff(); try { C.sfx.magic(); } catch (e) { } scene.classList.add('dusk');
        await sleep(500); lumi.classList.add('shy'); wit.classList.add('in');
        await sleep(1100); if (!ok()) return;
        for (var i = 0; i < C.CINE.witch.length; i++) {
          var s = C.CINE.witch[i]; if (!ok()) return;
          Art.witchSet(wsvg, { ex: s.ex, arm: s.arm });
          if (s.stamp) { thump(); excls(); }
          if (s.dim) scene.classList.add('lights-off');
          if (s.near) wit.classList.add('near');
          wit.classList.add('talk');
          await say(s, witchMouth); wit.classList.remove('talk');
          if (!ok()) return;
          if (s.leave) { wit.classList.add('out'); puff(); try { C.sfx.sparkle(); } catch (e) { } await sleep(1300); }
          else await sleep(i === 1 ? 700 : 450);
        }
        if (!ok()) return;
        await finish();
      })();

      async function finish() {
        cap.parentNode.classList.remove('on');
        lumi.classList.remove('shy'); lumi.classList.add('bye');
        await sleep(600); if (!ok()) return;
        Art.lumiMood(lsvg, 'sleep');
        try { C.music && C.music.fadeOut && C.music.fadeOut(4); } catch (e) { }
        await sleep(500); if (!ok()) return;
        C.go('sleep', { fresh: true, cine: true });
      }
    },
    leave: function (el) { if (el && el._stop) el._stop(); }
  });
  var cineTok = 0;
})();
