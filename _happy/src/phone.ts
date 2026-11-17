// Le téléphone : toujours là, discret. Messages en pictogrammes, appels, petite boutique.
import { FEEL_COLOR, FEEL_WORD, PEOPLE, readMsg, unread } from "./people";
import { DECOR, Msg, State } from "./sim";

export interface PhoneHost {
  state: () => State;
  canAct: () => boolean;
  onOpen: () => void; onClose: () => void;
  onReply: (id: number, idx: number) => void;
  onCall: (who: string) => void;
  onBuy: (id: string) => void;
  tick: () => void;
}

const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
const el = (tag: string, cls = "", text = ""): HTMLElement => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const dots = (n: number) => { const c = el("span", "cost"); for (let i = 0; i < n; i++) c.appendChild(el("i")); return c; };

export class Phone {
  isOpen = false;
  private btn = document.getElementById("phone-btn")!;
  private panel = document.getElementById("phone")!;
  private body = document.getElementById("phone-body")!;
  private tab: "msg" | "shop" = "msg";
  private thread: string | null = null;

  constructor(private host: PhoneHost) {
    this.btn.addEventListener("click", (e) => { e.stopPropagation(); if (this.isOpen) this.close(); else this.open(); });
    this.panel.addEventListener("click", (e) => e.stopPropagation());
    document.getElementById("phone-tabs")!.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      this.tab = b.dataset.tab as "msg" | "shop"; this.thread = null; this.host.tick(); this.render();
    }));
  }

  open(): void {
    if (this.isOpen || !this.host.canAct()) return;
    this.isOpen = true;
    this.thread = null;
    this.host.onOpen();
    this.render();
    this.panel.classList.add("on");
    this.btn.classList.add("active");
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.panel.classList.remove("on");
    this.btn.classList.remove("active");
    this.host.onClose();
  }

  /** Petite vibration quand un message arrive. */
  nudge(): void {
    this.btn.classList.remove("nudge");
    void this.btn.offsetWidth;
    this.btn.classList.add("nudge");
  }

  refresh(): void {
    const n = unread(this.host.state());
    this.btn.classList.toggle("badge", n > 0);
    this.btn.classList.toggle("off", !this.host.canAct() && !this.isOpen);
    if (this.isOpen) this.render();
  }

  private render(): void {
    const s = this.host.state();
    document.getElementById("phone-tabs")!.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.tab === this.tab));
    this.body.innerHTML = "";
    if (this.tab === "shop") return this.renderShop(s);
    if (this.thread) return this.renderThread(s, this.thread);
    for (const who of ["lou", "sam", "ines"]) {
      const p = s.people[who], last = [...s.inbox].reverse().find((m) => m.from === who);
      const row = el("button", "row");
      const av = el("span", "avatar"); av.style.background = hex(FEEL_COLOR[p.feel]);
      const mid = el("span", "who");
      mid.append(el("b", "", PEOPLE[who].name), el("small", "", last ? last.text : FEEL_WORD[p.feel]));
      row.append(av, mid);
      if (last && last.answer < 0) row.appendChild(el("span", "dot"));
      row.addEventListener("click", () => { this.thread = who; this.host.tick(); this.render(); });
      this.body.appendChild(row);
    }
    this.body.appendChild(el("p", "hint", "Répondre prend un moment. Ne pas répondre est aussi un choix."));
  }

  private renderThread(s: State, who: string): void {
    const p = s.people[who];
    const head = el("div", "thread-head");
    const back = el("button", "back", "‹");
    back.addEventListener("click", () => { this.thread = null; this.host.tick(); this.render(); });
    const av = el("span", "avatar"); av.style.background = hex(FEEL_COLOR[p.feel]);
    const name = el("span", "who"); name.append(el("b", "", PEOPLE[who].name), el("small", "", FEEL_WORD[p.feel]));
    head.append(back, av, name);
    this.body.appendChild(head);

    const msgs = s.inbox.filter((m) => m.from === who).slice(-4);
    const list = el("div", "bubbles");
    let pending: Msg | null = null;
    for (const m of msgs) {
      readMsg(s, m.id);
      list.appendChild(el("div", "in", m.text));
      if (m.answer >= 0 && m.answer < 3) list.appendChild(el("div", "out", m.replies[m.answer].t));
      else if (m.answer === 4) list.appendChild(el("div", "out", "📞"));
      else if (m.answer === 3) list.appendChild(el("div", "gone", "resté sans réponse"));
      else pending = m;
    }
    if (!msgs.length) list.appendChild(el("div", "gone", "Pas de nouvelles pour l'instant."));
    this.body.appendChild(list);

    if (pending) {
      const m = pending as Msg, opts = el("div", "replies");
      m.replies.forEach((r, i) => {
        const b = el("button", "", r.t);
        b.appendChild(dots(1));
        if (s.units < 1) b.classList.add("no");
        b.addEventListener("click", () => { if (s.units >= 1 && this.host.canAct()) this.host.onReply(m.id, i); });
        opts.appendChild(b);
      });
      this.body.appendChild(opts);
    }
    const callBtn = el("button", "call", p.called === s.day ? "Déjà appelé·e aujourd'hui" : "Appeler");
    if (p.called !== s.day) callBtn.appendChild(dots(2));
    if (s.units < 2 || p.called === s.day) callBtn.classList.add("no");
    callBtn.addEventListener("click", () => { if (s.units >= 2 && p.called !== s.day && this.host.canAct()) this.host.onCall(who); });
    this.body.appendChild(callBtn);
  }

  private renderShop(s: State): void {
    const grid = el("div", "shop");
    for (const d of DECOR) {
      const state = s.decor.includes(d.id) ? "Installé" : s.parcels.includes(d.id) ? "Dans le hall" : s.orders.includes(d.id) ? "En route" : "";
      const b = el("button", "item");
      b.append(el("b", "", d.name), el("small", state ? "state" : "price", state || String(d.price)));
      if (state || s.money < d.price) b.classList.add("no");
      b.addEventListener("click", () => { if (!state && s.money >= d.price) this.host.onBuy(d.id); });
      grid.appendChild(b);
    }
    this.body.append(grid, el("p", "hint", "Les commandes arrivent le lendemain, en bas, dans le hall."));
  }
}
