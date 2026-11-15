import { useRef, useState, type ReactNode } from 'react';
import { useApp } from '../store';
import { AVAIL_LABEL, EMPTY_ME, INTENTIONS, INTERESTS, TRAITS, VALUES, ageFromBirth, slotsFromAvail } from '../data';
import type { Avail, Me } from '../types';
import { Chip, Icon, Portrait } from '../ui';

const TITLES: [string, string, string][] = [
  ['Faisons ', 'connaissance', 'Quelques mots pour te présenter. Tu pourras tout modifier plus tard.'],
  ['Ta vie de ', 'parent', 'Tout est facultatif. Tu choisis ce que tu partages, et rien de plus.'],
  ['Tes ', 'intentions', 'Pour ne croiser que des personnes qui cherchent la même chose.'],
  ['Tes ', 'disponibilités', 'Des repères généraux, jamais un agenda détaillé.'],
  ['Ce qui te ', 'ressemble', 'Quelques touches pour donner envie de te répondre.'],
];

const toggle = <T,>(a: T[], v: T, max = 99) => (a.includes(v) ? a.filter((x) => x !== v) : a.length >= max ? a : [...a, v]);

function Opt({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button type="button" className={`opt ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on}>
      <span><b>{title}</b>{sub && <small>{sub}</small>}</span><i className="dot" />
    </button>
  );
}
const Field = ({ label, children }: { label: string; children: ReactNode }) => <div className="field"><label>{label}</label>{children}</div>;

async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
  const k = Math.min(1, 560 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg', .8);
}

export default function Onboarding() {
  const { set } = useApp();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Me>({ ...EMPTY_ME });
  const [tried, setTried] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const up = (p: Partial<Me>) => setD((x) => ({ ...x, ...p }));
  const age = ageFromBirth(d.birth);

  const errors: string[] = [];
  if (step === 0) {
    if (!d.name.trim()) errors.push('name');
    if (!d.birth) errors.push('birth'); else if (age < 18) errors.push('minor');
    if (!d.gender) errors.push('gender');
    if (!d.city.trim()) errors.push('city');
  }
  if (step === 3 && !d.avail.length) errors.push('avail');
  if (step === 4 && !d.interests.length) errors.push('interests');

  const next = () => {
    if (errors.length) { setTried(true); return; }
    setTried(false);
    if (step < 4) { setStep(step + 1); body.current?.scrollTo({ top: 0 }); return; }
    setWelcome(true);
    setTimeout(() => set((s) => ({ ...s, stage: 'app', me: d, slots: slotsFromAvail(d.avail) })), 2200);
  };
  const back = () => (step === 0 ? set((s) => ({ ...s, stage: 'welcome' })) : (setStep(step - 1), setTried(false)));
  const [a, b, c] = TITLES[step];

  return (
    <div className="screen" key="ob">
      <div className="ob-top">
        <button className="icon-btn" onClick={back} aria-label="Retour"><Icon n="back" /></button>
        <div className="progress" aria-label={`Étape ${step + 1} sur 5`}>{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i <= step ? 'done' : ''} />)}</div>
        <span className="ob-step">{step + 1}/5</span>
      </div>
      <div className="scroll" ref={body}>
        <div className="ob-body" key={step} style={{ animation: 'enter .5s var(--ease) both' }}>
          <div className="kicker">Étape {step + 1}</div>
          <h1 className="h1">{a}<em>{b}</em>.</h1>
          <p className="lead">{c}</p>

          {step === 0 && <>
            <Field label="Prénom ou pseudo">
              <input className="input" value={d.name} maxLength={24} placeholder="Comment dois-je t'appeler ?" autoComplete="given-name" onChange={(e) => up({ name: e.target.value })} />
              {tried && errors.includes('name') && <p className="err">Dis-nous au moins un prénom ou un pseudo.</p>}
            </Field>
            <Field label="Date de naissance">
              <input className="input" type="date" value={d.birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => up({ birth: e.target.value })} />
              {age >= 18 && <p className="small" style={{ marginTop: 8 }}>{age} ans · seul l'âge sera affiché.</p>}
              {(tried || age > 0) && errors.includes('minor') && <p className="err">Cette application est réservée aux personnes majeures.</p>}
              {tried && errors.includes('birth') && <p className="err">Indique ta date de naissance pour continuer.</p>}
            </Field>
            <Field label="Genre">
              <div className="seg">{(['femme', 'homme', 'autre'] as const).map((g) => <Chip key={g} on={d.gender === g} onClick={() => up({ gender: g })}>{g[0].toUpperCase() + g.slice(1)}</Chip>)}</div>
              {tried && errors.includes('gender') && <p className="err">Choisis une option.</p>}
            </Field>
            <Field label="Ville">
              <input className="input" value={d.city} placeholder="Lyon" autoComplete="address-level2" onChange={(e) => up({ city: e.target.value })} />
              <p className="small" style={{ marginTop: 8 }}>Les autres ne verront qu'une zone approximative, jamais ta position exacte.</p>
              {tried && errors.includes('city') && <p className="err">Indique ta ville.</p>}
            </Field>
            <Field label="Photos personnelles">
              <div className="photo-drop">
                <label className="photo-slot" style={{ cursor: 'pointer' }}>
                  {d.photo ? <Portrait src={d.photo} /> : <Icon n="plus" size={26} />}
                  <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) up({ photo: await shrink(f) }); }} />
                </label>
                <p className="small">{d.photo ? 'Superbe. Tu pourras en ajouter d\'autres plus tard.' : 'Ajoute une photo de toi, seul·e. Facultatif pour l\'essai.'}</p>
              </div>
              <div className="note rule"><Icon n="shield" size={18} /><span>Aucune photo d'enfant, jamais : elles sont refusées sur les profils.</span></div>
            </Field>
          </>}

          {step === 1 && <>
            <Field label="Nombre d'enfants · facultatif">
              <div className="seg">{['1', '2', '3+'].map((k) => <Chip key={k} on={d.kids === k} onClick={() => up({ kids: d.kids === k ? '' : k })}>{k}</Chip>)}</div>
            </Field>
            <Field label="Tranches d'âge · facultatif">
              <div className="chips">{['0-2', '3-5', '6-10', '11-15', '16+'].map((k) => <Chip key={k} on={d.kidsAges.includes(k)} onClick={() => up({ kidsAges: toggle(d.kidsAges, k) })}>{k} ans</Chip>)}</div>
            </Field>
            <Field label="Situation familiale">
              {['Parent solo, garde principale', 'Garde alternée', 'Garde partagée occasionnelle', 'Je préfère ne pas préciser'].map((x) => <Opt key={x} on={d.situation === x} onClick={() => up({ situation: x })} title={x} />)}
            </Field>
            <Field label="Temps pour rencontrer quelqu'un">
              {['Quelques soirées par semaine', 'Un ou deux moments par semaine', 'Plutôt rare, mais j\'ai envie'].map((x) => <Opt key={x} on={d.time === x} onClick={() => up({ time: x })} title={x} />)}
            </Field>
            <div className="note rule"><Icon n="lock" size={18} /><span>Nous ne demandons jamais le nom, la photo, l'école ou l'adresse de tes enfants.</span></div>
          </>}

          {step === 2 && <>
            <Field label="Ce que tu cherches">
              {(Object.keys(INTENTIONS) as (keyof typeof INTENTIONS)[]).map((k) => <Opt key={k} on={d.intention === k} onClick={() => up({ intention: k as Me['intention'] })} title={INTENTIONS[k]} sub={k === 'serieuse' ? 'Construire quelque chose de durable' : k === 'doucement' ? 'Laisser le temps faire son œuvre' : 'Voir ce que la vie propose'} />)}
            </Field>
            <Field label="Je souhaite rencontrer">
              <div className="seg">{([['femmes', 'Des femmes'], ['hommes', 'Des hommes'], ['tous', 'Tout le monde']] as const).map(([k, l]) => <Chip key={k} on={d.meet === k} onClick={() => up({ meet: k })}>{l}</Chip>)}</div>
            </Field>
          </>}

          {step === 3 && <>
            <Field label="Quand es-tu disponible ?">
              {(Object.keys(AVAIL_LABEL) as Avail[]).map((k) => <Opt key={k} on={d.avail.includes(k)} onClick={() => up({ avail: toggle(d.avail, k) })} title={AVAIL_LABEL[k]} sub={k === 'soiree' ? 'Quand la maison est calme' : k === 'journee' ? 'Un café, une balade' : undefined} />)}
              {tried && errors.includes('avail') && <p className="err">Choisis au moins une option.</p>}
            </Field>
            <div className="note"><Icon n="cal" size={18} /><span>Ces repères servent à trouver des personnes compatibles. Ils ne sont jamais affichés comme un calendrier.</span></div>
          </>}

          {step === 4 && <>
            <Field label="Centres d'intérêt"><div className="chips">{INTERESTS.map((k) => <Chip key={k} on={d.interests.includes(k)} onClick={() => up({ interests: toggle(d.interests, k) })}>{k}</Chip>)}</div>{tried && errors.includes('interests') && <p className="err">Choisis au moins un centre d'intérêt.</p>}</Field>
            <Field label="Personnalité · 3 max"><div className="chips">{TRAITS.map((k) => <Chip key={k} on={d.traits.includes(k)} onClick={() => up({ traits: toggle(d.traits, k, 3) })}>{k}</Chip>)}</div></Field>
            <Field label="Important dans une relation · 3 max"><div className="chips">{VALUES.map((k) => <Chip key={k} on={d.values.includes(k)} onClick={() => up({ values: toggle(d.values, k, 3) })}>{k}</Chip>)}</div></Field>
            <Field label="Une phrase personnelle">
              <textarea className="input" maxLength={140} value={d.phrase} placeholder="Ce qui te ferait sourire en lisant ton profil…" onChange={(e) => up({ phrase: e.target.value })} />
              <p className="small" style={{ textAlign: 'right', marginTop: 4 }}>{d.phrase.length}/140</p>
            </Field>
          </>}
        </div>
      </div>
      <div className="ob-foot">
        <button className="btn amber" onClick={next}>{step === 4 ? 'Terminer' : 'Continuer'}</button>
      </div>
      {welcome && (
        <div className="splash"><div>
          <p className="kicker rise">Bienvenue</p>
          <h1 className="h1 glow-in" style={{ marginTop: 12, animationDelay: '.3s' }}>Content·e de te voir,<br /><em>{d.name}</em>.</h1>
        </div></div>
      )}
    </div>
  );
}
