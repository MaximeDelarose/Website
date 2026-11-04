import { describe, it, expect } from 'vitest';
import { createSuspender, type ElLike, type SuspendEnv } from '../src/ui/rewards/suspend';

function fakeEl(vis = '', attrs: Record<string, string> = {}): ElLike & { attrs: Record<string, string> } {
  const a = { ...attrs };
  return { attrs: a, style: { visibility: vis }, getAttribute: (n) => (n in a ? a[n] : null), setAttribute: (n, v) => { a[n] = v; }, removeAttribute: (n) => { delete a[n]; } };
}
function env(over: { els?: ElLike[]; appEl?: ElLike | null } = {}) {
  const calls = { open: [] as boolean[], focus: 0, blur: 0 };
  const focus = { focus: () => { calls.focus++; }, blur: () => { calls.blur++; }, isConnected: true };
  const e: SuspendEnv = {
    hideable: () => over.els ?? [], app: () => over.appEl ?? null, setOpen: (on) => { calls.open.push(on); }, active: () => focus,
  };
  return { e, calls, focus };
}

describe('suspension de l\'interface', () => {
  it('masque sans détruire, puis restitue exactement l\'état d\'avant', () => {
    const modal = fakeEl('', {});
    const toast = fakeEl('visible', { 'aria-hidden': 'false' });
    const app = fakeEl('', { 'aria-hidden': 'false' });
    const { e, calls } = env({ els: [modal, toast], appEl: app });
    const s = createSuspender(e);
    s.acquire();
    expect(modal.style.visibility).toBe('hidden');
    expect(toast.style.visibility).toBe('hidden');
    expect(app.attrs.inert).toBe('');
    expect(calls.blur).toBe(1);
    expect(calls.open).toEqual([true]);
    s.release();
    expect(modal.style.visibility).toBe('');
    expect(modal.attrs['aria-hidden']).toBeUndefined();
    expect(toast.style.visibility).toBe('visible');
    expect(toast.attrs['aria-hidden']).toBe('false');
    expect(app.attrs.inert).toBeUndefined();
    expect(app.attrs['aria-hidden']).toBe('false');
    expect(calls.focus).toBe(1);
    expect(calls.open).toEqual([true, false]);
  });

  it('acquisitions imbriquées : restitution seulement à la dernière', () => {
    const modal = fakeEl();
    const { e, calls } = env({ els: [modal] });
    const s = createSuspender(e);
    s.acquire(); s.acquire();
    expect(s.depth()).toBe(2);
    s.release();
    expect(modal.style.visibility).toBe('hidden');
    s.release();
    expect(modal.style.visibility).toBe('');
    expect(calls.open).toEqual([true, false]);
  });

  it('release en trop : sans effet, jamais de profondeur négative', () => {
    const { e, calls } = env({ els: [fakeEl()] });
    const s = createSuspender(e);
    s.release(); s.release();
    expect(s.depth()).toBe(0);
    s.acquire();
    expect(s.depth()).toBe(1);
    expect(calls.open).toEqual([true]);
  });

  it('un attribut inert d\'origine est conservé', () => {
    const app = fakeEl('', { inert: '' });
    const { e } = env({ appEl: app });
    const s = createSuspender(e);
    s.acquire(); s.release();
    expect(app.attrs.inert).toBe('');
  });

  it('ne refocalise pas un élément retiré du document', () => {
    const calls = { focus: 0 };
    const gone = { focus: () => { calls.focus++; }, isConnected: false };
    const s = createSuspender({ hideable: () => [], app: () => null, setOpen: () => undefined, active: () => gone });
    s.acquire(); s.release();
    expect(calls.focus).toBe(0);
  });

  it('un élément apparu pendant la suspension est masqué puis restitué', () => {
    const { e } = env({ els: [] });
    const s = createSuspender(e);
    const late = fakeEl('');
    s.add(late); // hors suspension : sans effet
    expect(late.style.visibility).toBe('');
    s.acquire();
    s.add(late); s.add(late);
    expect(late.style.visibility).toBe('hidden');
    s.release();
    expect(late.style.visibility).toBe('');
    expect(late.attrs['aria-hidden']).toBeUndefined();
  });

  it('ne réécrase pas une visibilité modifiée par l\'appelant pendant l\'ouverture', () => {
    const back = fakeEl('hidden'); // l'appelant l'avait déjà masquée lui-même
    const { e } = env({ els: [back] });
    const s = createSuspender(e);
    s.acquire();
    back.style.visibility = ''; // il la réaffiche à la fin de sa promesse
    s.release();
    expect(back.style.visibility).toBe('');
  });
});
