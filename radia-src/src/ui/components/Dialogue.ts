/**
 * Boîte de dialogue : portrait animé (respiration, clignement), nom,
 * texte qui s'écrit progressivement. Toucher = tout afficher, puis suivant.
 * Aucune vitesse de lecture imposée.
 */
import { h, tap } from '../dom';
import { ui } from '../ui';
import { canvasUrl } from '../../game/art/kit';
import { portraitCanvas, type Outfit } from '../../game/art/characters';
import { radiaBustCanvas, lookKey } from '../../game/art/world/radiaNow';
import { DIALOGUES, type DialogueDef, type DialogueLine, type Expr } from '../../data/dialogue';
import { save, audio } from '../../core/app';
import { hasPhotos, photoUrlNow } from '../../core/photos';

const NAMES = { auguste: 'Auguste', radia: 'Radia', narrator: '' } as const;

/**
 * Buste détouré de l'illustration d'Auguste et Radia (disponible avec le lien
 * secret, une fois chargé). Radia porte sa couronne à partir du chapitre 4.
 */
export function bustUrl(who: 'radia' | 'auguste', _outfit: Outfit, expr: Expr = 'neutral'): string | null {
  // Radia : toujours son avatar, avec la tenue choisie au dressing (donc la même partout).
  if (who === 'radia') return canvasUrl(`rb:${expr}:${lookKey()}`, () => radiaBustCanvas(expr, 420));
  if (!hasPhotos()) return null;
  return photoUrlNow('bust-auguste');
}

export function portraitUrl(who: 'radia' | 'auguste', expr: Expr = 'neutral', outfit: Outfit = 'hoodie', blink = false): string {
  return canvasUrl(`p:${who}:${expr}:${outfit}:${blink ? 1 : 0}`, () => portraitCanvas(who, { expr, outfit, blink }, 540));
}

/** Tenue actuelle de Radia selon l'avancement (couronne après le chapitre 4). */
export function currentOutfit(): Outfit {
  return save.data.memories.includes('royaume') ? 'royal' : 'hoodie';
}

function speed(): number {
  const s = save.data.settings.textSpeed;
  return s === 'instant' ? 0 : s === 'fast' ? 12 : 28; // ms par caractère
}

interface PlayOpts { skippable?: boolean; record?: string }

/**
 * Joue une suite de répliques. Renvoie la valeur du choix éventuel.
 */
export function playLines(lines: DialogueLine[], choice?: DialogueDef['choice'], opts: PlayOpts = {}): Promise<string | undefined> {
  return new Promise((resolve) => {
    const layer = h('div.dialog-layer');
    const portraitWrap = h('div.dialog-portrait');
    const img = h('img', { alt: '' });
    portraitWrap.append(img);
    const nameEl = h('div.dialog-name');
    const textEl = h('div.dialog-text', { 'aria-live': 'polite' });
    const nextEl = h('div.dialog-next', '▼');
    const choicesEl = h('div.dialog-choices');
    const box = h('div.dialog-box', nameEl, textEl, nextEl, choicesEl);
    layer.append(portraitWrap, box);
    if (opts.skippable !== false) {
      layer.append(h('button.btn.small.secondary.dialog-skip', { on: { click: tap((e) => { e.stopPropagation(); skipAll(); }) } }, 'Passer ⏭'));
    }
    ui.root.append(layer);

    let queue = [...lines];
    let typing = false;
    let full = '';
    let timer: number | undefined;
    let blinkTimer: number | undefined;
    let current: DialogueLine | null = null;
    let choosing = false;
    let finished = false;
    let picked: string | undefined;

    const setPortrait = (l: DialogueLine) => {
      if (l.who === 'narrator') {
        portraitWrap.style.visibility = 'hidden';
        return;
      }
      portraitWrap.style.visibility = 'visible';
      const right = l.who === 'auguste';
      portraitWrap.classList.toggle('right', right);
      nameEl.classList.toggle('right', right);
      const outfit = l.who === 'radia' ? l.outfit ?? currentOutfit() : 'hoodie';
      const expr = l.expr ?? 'neutral';
      const bust = bustUrl(l.who, outfit, expr);
      portraitWrap.dataset.expr = expr;
      portraitWrap.classList.toggle('bust', !!bust);
      const src = bust ?? portraitUrl(l.who, expr, outfit);
      if (img.getAttribute('src') !== src) {
        img.src = src;
        portraitWrap.style.animation = 'none';
        void portraitWrap.offsetWidth;
        portraitWrap.style.animation = '';
      }
      window.clearInterval(blinkTimer);
      if (expr !== 'laugh' && !bust) {
        const closed = portraitUrl(l.who, expr, outfit, true);
        blinkTimer = window.setInterval(() => {
          img.src = closed;
          window.setTimeout(() => { if (current === l) img.src = src; }, 130);
        }, 2800 + Math.random() * 1800);
      }
    };

    const show = (l: DialogueLine) => {
      current = l;
      setPortrait(l);
      nameEl.textContent = NAMES[l.who];
      nameEl.className = `dialog-name ${l.who}${l.who === 'auguste' ? ' right' : ''}`;
      nameEl.style.display = l.who === 'narrator' ? 'none' : '';
      textEl.style.fontStyle = l.who === 'narrator' ? 'italic' : '';
      textEl.style.textAlign = l.who === 'narrator' ? 'center' : '';
      full = l.text;
      nextEl.style.visibility = 'hidden';
      const sp = speed();
      if (!sp) { finishTyping(); return; }
      typing = true;
      textEl.textContent = '';
      // Les caractères sont posés d'avance (invisibles) pour éviter que le texte ne saute.
      const spans = [...full].map((ch) => h('span.hidden-char', ch));
      textEl.append(...spans);
      let i = 0;
      const step = () => {
        if (!typing) return;
        const n = Math.max(1, Math.round(16 / sp));
        for (let k = 0; k < n && i < spans.length; k++, i++) spans[i].classList.remove('hidden-char');
        if (i % 6 === 0) audio.play('page');
        if (i >= spans.length) finishTyping();
        else timer = window.setTimeout(step, sp);
      };
      step();
    };

    const finishTyping = () => {
      typing = false;
      window.clearTimeout(timer);
      textEl.textContent = full;
      nextEl.style.visibility = 'visible';
    };

    const showChoices = () => {
      const ch = choice;
      if (!ch) return end();
      choosing = true;
      nextEl.style.visibility = 'hidden';
      if (ch.prompt) {
        portraitWrap.style.visibility = 'hidden';
        nameEl.style.display = 'none';
        textEl.textContent = ch.prompt;
        textEl.style.fontStyle = 'italic';
        textEl.style.textAlign = 'center';
      }
      choicesEl.append(...ch.options.map((o) =>
        h('button.btn.secondary', { on: { click: tap((e) => {
          e.stopPropagation();
          picked = o.value;
          choicesEl.textContent = '';
          choosing = false;
          queue = [...o.reply, ...ch.after];
          choice = undefined;
          advance();
        }) } }, o.label)));
    };

    const advance = () => {
      if (finished) return;
      const next = queue.shift();
      if (next) { show(next); audio.play('pickup'); }
      else if (choice) showChoices();
      else end();
    };

    const skipAll = () => {
      if (choosing) return;
      finishTyping();
      queue = [];
      if (choice) showChoices();
      else end();
    };

    const end = () => {
      if (finished) return;
      finished = true;
      window.clearInterval(blinkTimer);
      window.clearTimeout(timer);
      layer.classList.add('leaving');
      window.setTimeout(() => layer.remove(), 200);
      if (opts.record) {
        const hist = save.data.story.history;
        if (!hist.includes(opts.record)) { hist.push(opts.record); save.save(); }
      }
      resolve(picked);
    };

    layer.addEventListener('click', () => {
      if (choosing || finished) return;
      if (typing) finishTyping();
      else advance();
    });
    advance();
  });
}

/** Joue un dialogue de l'histoire par son identifiant. */
export async function playDialogue(id: string, opts: PlayOpts = {}): Promise<string | undefined> {
  const d = DIALOGUES[id];
  if (!d) return undefined;
  const v = await playLines(d.lines, d.choice, { ...opts, record: id });
  if (v !== undefined) {
    save.data.story.choices[id] = v;
    save.save();
  }
  return v;
}
