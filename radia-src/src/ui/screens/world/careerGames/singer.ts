/** Interface du mini-jeu « Chanteuse » : jeu de rythme tactile (3–4 pistes, notes qui tombent). */
import { h, tap } from '../../../dom';
import { audio, reducedFx, save } from '../../../../core/app';
import { SONGS, type SongDef } from '../../../../data/world/careers';
import { drawConcertStage } from '../../../../game/art/world/careers';
import { heartPath } from '../../../../game/art/kit';
import { LEAD_IN, RhythmEngine, makeChart, singerTags, songDuration, stepDuration, unlockedSongs, type Judgement } from '../../../../game/world/careerGames/singer';
import { avatarInto, bigButton, gameShell, sizedCanvas, stageWidth, stars, tip, wait, type GameCtx, type GameResult } from './shared';

const LANE_COLORS = ['#F5B5C8', '#B9A5E8', '#F3C86B', '#A9D4F5'];
const JUDGE_TXT: Record<Judgement, string> = { perfect: 'Parfait !', good: 'Bien', miss: 'Raté' };
const JUDGE_COL: Record<Judgement, string> = { perfect: '#FFE27A', good: '#FFFFFF', miss: '#C9B6E8' };

export function playSinger(g: GameCtx): Promise<GameResult | null> {
  return new Promise((resolve) => {
    let finished = false;
    let raf = 0;
    let master: GainNode | null = null;
    const stopAudio = () => { try { master?.disconnect(); } catch { /* déjà coupé */ } master = null; };
    const end = (r: GameResult | null) => { if (finished) return; finished = true; cancelAnimationFrame(raf); stopAudio(); document.removeEventListener('visibilitychange', onHide); resolve(r); };
    const onHide = () => { if (document.hidden) end(null); };
    document.addEventListener('visibilitychange', onHide);
    const sh = gameShell('Concert', 'Choisis ta chanson.', () => end(null));
    sh.onQuit(() => { cancelAnimationFrame(raf); stopAudio(); });
    tip('singer', 'Concert', 'Les notes tombent : touche la piste quand elles arrivent sur la ligne. Pas de panique, on peut recommencer !');

    const avail = unlockedSongs(g.difficulty);
    const list = h('div.sg-songs');
    for (const s of SONGS) {
      const ok = avail.includes(s);
      const b = h(`button.sg-song${ok ? '' : '.locked'}`, h('b', `${s.id}. ${s.name}`), h('small', ok ? `${s.bpm} pulsations · ${s.lanes} pistes` : `Débloquée au palier ${s.id - 1}`));
      b.addEventListener('click', tap(() => { if (ok) start(s); else sh.sub.textContent = `« ${s.name} » s'ouvre au palier ${s.id - 1}.`; }));
      list.append(b);
    }
    sh.body.append(list);

    function start(song: SongDef) {
      audio.unlock();
      const W = stageWidth();
      const H = Math.max(380, Math.min(560, (document.getElementById('ui')?.clientHeight || 852) - 160));
      const { cv, ctx } = sizedCanvas(W, H, 'sg-cv');
      const wrap = h('div.cg-stage.sg-stage', cv);
      sh.body.replaceChildren(wrap);
      sh.sub.textContent = `${song.name} · touche les pistes !`;
      const chart = makeChart(song, (Date.now() & 0xfffff) + song.id);
      const eng = new RhythmEngine(chart);
      const lanes = song.lanes;
      const laneW = W / lanes;
      const hitY = H - 84;
      const speed = hitY / song.fall; // pixels / s
      const pops: { text: string; x: number; t: number; c: string }[] = [];
      const flash = new Array<number>(lanes).fill(-9);
      let lastJudge: Judgement | null = null;
      // Radia sur scène : dessinée une seule fois, puis simplement recopiée (léger)
      const ah = Math.round(H * 0.5), aw = Math.round(ah * 0.4);
      const sprite = sizedCanvas(aw, ah);
      avatarInto(sprite.ctx, g.look, aw, ah, { expr: 'laugh', arms: 'open' });

      // ---- audio synthétisé (Web Audio simple)
      const ac = audio.ctx;
      let tone: (f: number, when: number, dur: number, type?: OscillatorType, vol?: number) => void = () => undefined;
      if (ac) {
        master = ac.createGain();
        const s = save.data.settings;
        master.gain.value = s.sfxOn ? 0.55 * s.sfx : 0;
        master.connect(ac.destination);
        const m = master;
        tone = (f, when, dur, type = 'triangle', vol = 0.3) => {
          const o = ac.createOscillator(); const gn = ac.createGain();
          o.type = type; o.frequency.setValueAtTime(f, when);
          gn.gain.setValueAtTime(0.0001, when); gn.gain.exponentialRampToValueAtTime(vol, when + 0.012); gn.gain.exponentialRampToValueAtTime(0.0001, when + dur);
          o.connect(gn).connect(m); o.start(when); o.stop(when + dur + 0.05);
        };
        // accompagnement : pulsation douce + basse (programmé d'avance, aligné sur l'horloge du jeu)
        const t0a = ac.currentTime + 0.08;
        const beat = 60 / song.bpm;
        const total = songDuration(song);
        for (let b = 0; b * beat < total; b++) {
          const t = t0a + b * beat;
          tone(120, t, 0.14, 'sine', 0.22);
          if (b >= LEAD_IN / beat) {
            tone(song.notes[0] / 2, t, beat * 0.9, 'sine', b % 4 === 0 ? 0.2 : 0.11);
            if (b % 2 === 1) tone(song.notes[Math.min(2, lanes - 1)] * 2, t + beat / 2, 0.08, 'sine', 0.05);
          }
        }
      }
      const startAt = performance.now() + 80;
      const now = () => (performance.now() - startAt) / 1000;

      const press = (e: PointerEvent) => {
        e.preventDefault();
        if (finished) return;
        const r = cv.getBoundingClientRect();
        const lane = Math.max(0, Math.min(lanes - 1, Math.floor(((e.clientX - r.left) / r.width) * lanes)));
        const t = now();
        flash[lane] = t;
        const res = eng.hit(lane, t);
        if (ac) tone(song.notes[lane] * (res ? 1 : 0.5), ac.currentTime, res ? 0.45 : 0.08, res ? 'triangle' : 'sine', res ? 0.34 : 0.05);
        if (res) { pops.push({ text: JUDGE_TXT[res.judgement], x: (lane + 0.5) * laneW, t, c: JUDGE_COL[res.judgement] }); lastJudge = res.judgement; if (res.judgement === 'perfect') audio.play('sparkle', 1 + lane * 0.1); }
      };
      cv.addEventListener('pointerdown', press);

      let last = 0;
      let endAt = 0;
      const loop = (nowMs: number) => {
        if (finished) return;
        const t = now();
        for (const n of eng.update(t)) { pops.push({ text: JUDGE_TXT.miss, x: (n.lane + 0.5) * laneW, t, c: JUDGE_COL.miss }); lastJudge = 'miss'; }
        if (nowMs - last > 33) {
          last = nowMs;
          draw(t);
        }
        if (!endAt && eng.finished(t)) { endAt = nowMs; }
        if (endAt && nowMs - endAt > 900) { void finish(); return; }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      function draw(t: number) {
        drawConcertStage(ctx, W, H, t, reducedFx() ? 0 : Math.max(0, 1 - ((t % (60 / song.bpm)) / (60 / song.bpm)) * 3));
        // Radia sur scène (derrière les pistes)
        const bounce = reducedFx() ? 0 : Math.abs(Math.sin((t * Math.PI * song.bpm) / 60)) * -7;
        ctx.save(); ctx.globalAlpha = 0.7; ctx.drawImage(sprite.cv, (W - aw) / 2, H * 0.9 - ah + 6 + bounce, aw, ah); ctx.restore();
        // pistes
        for (let l = 0; l < lanes; l++) {
          const x = l * laneW;
          ctx.fillStyle = l % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)';
          ctx.fillRect(x, 0, laneW, H);
          const f = Math.max(0, 1 - (t - flash[l]) * 5);
          if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${0.25 * f})`; ctx.fillRect(x, 0, laneW, H); }
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
        for (let l = 1; l < lanes; l++) { ctx.beginPath(); ctx.moveTo(l * laneW, 0); ctx.lineTo(l * laneW, H); ctx.stroke(); }
        // ligne et cibles
        for (let l = 0; l < lanes; l++) {
          const cx = (l + 0.5) * laneW;
          ctx.beginPath(); ctx.arc(cx, hitY, laneW * 0.3, 0, Math.PI * 2);
          ctx.strokeStyle = LANE_COLORS[l]; ctx.lineWidth = 4; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
        }
        // notes
        const r = laneW * 0.3;
        for (const n of chart) {
          if (n.judged === 'perfect' || n.judged === 'good') continue;
          const y = hitY - (n.t - t) * speed;
          if (y < -30 || y > H + 30) continue;
          const cx = (n.lane + 0.5) * laneW;
          ctx.globalAlpha = n.judged === 'miss' ? 0.3 : 1;
          heartPath(ctx, cx, y, r * 2.1);
          ctx.fillStyle = LANE_COLORS[n.lane]; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = '#58433F'; ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(cx - r * 0.35, y - r * 0.4, r * 0.28, r * 0.14, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
        // annonces
        for (let i = pops.length - 1; i >= 0; i--) {
          const p = pops[i]; const a = (t - p.t) / 0.7;
          if (a > 1) { pops.splice(i, 1); continue; }
          ctx.save(); ctx.globalAlpha = 1 - a; ctx.font = '700 20px Fredoka, sans-serif'; ctx.textAlign = 'center';
          ctx.lineWidth = 5; ctx.strokeStyle = '#3B3152'; ctx.strokeText(p.text, p.x, hitY - 44 - a * 26); ctx.fillStyle = p.c; ctx.fillText(p.text, p.x, hitY - 44 - a * 26); ctx.restore();
        }
        // HUD
        ctx.save(); ctx.textAlign = 'left'; ctx.font = '700 17px Fredoka, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#3B3152'; ctx.fillStyle = '#FFF4E8';
        const done = eng.judged;
        const pct = chart.length ? Math.round((done / chart.length) * 100) : 0;
        ctx.strokeText(`Combo ${eng.combo}`, 12, 26); ctx.fillText(`Combo ${eng.combo}`, 12, 26);
        ctx.textAlign = 'right'; ctx.strokeText(`${eng.score()} %`, W - 12, 26); ctx.fillText(`${eng.score()} %`, W - 12, 26);
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(12, 36, W - 24, 5);
        ctx.fillStyle = '#F3C86B'; ctx.fillRect(12, 36, (W - 24) * (pct / 100), 5);
        // compte à rebours
        if (t < LEAD_IN - 0.2) {
          const c = Math.ceil((LEAD_IN - 0.2 - t) / stepDuration(song) / 2);
          if (c <= 3 && c > 0) { ctx.save(); ctx.font = '700 80px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.globalAlpha = 0.85; ctx.lineWidth = 8; ctx.strokeStyle = '#3B3152'; ctx.strokeText(String(c), W / 2, H * 0.4); ctx.fillStyle = '#FFF'; ctx.fillText(String(c), W / 2, H * 0.4); ctx.restore(); }
        }
        void lastJudge;
      }

      async function finish() {
        cv.removeEventListener('pointerdown', press);
        stopAudio();
        const score = eng.score();
        audio.play(score >= 60 ? 'victory' : 'reward');
        sh.sub.textContent = 'Merci, Paris !';
        sh.body.replaceChildren(h('div.ac-intro', h('h3', score >= 90 ? 'Standing ovation !' : score >= 60 ? 'Le public chante avec toi !' : 'Belle répétition !'),
          stars(score >= 90 ? 3 : score >= 70 ? 2 : score >= 40 ? 1 : 0),
          h('p', `Parfait ${eng.perfect} · Bien ${eng.good} · Raté ${eng.miss}`), h('small', `Meilleur combo : ${eng.maxCombo}`),
          bigButton('Continuer', () => end({ score, tags: singerTags(song, score), combo: eng.maxCombo, lines: [song.name, `Parfait ${eng.perfect} · Bien ${eng.good} · Raté ${eng.miss}`, `Combo max ${eng.maxCombo}`] }))));
        await wait(0);
      }
    }
  });
}
