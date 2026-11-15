import { useState } from 'react';
import { useApp } from '../store';
import { AVAIL_LABEL, INTENTIONS, INTERESTS, ageFromBirth } from '../data';
import type { Avail, Me as MeT } from '../types';
import { Chip, DemoPill, Icon, Portrait, Sheet, Toggle } from '../ui';
import { SlotGrid } from './Messages';

export default function Me() {
  const { s, set, toast, reset, byId } = useApp();
  const { me } = s;
  const [sheet, setSheet] = useState<null | 'edit' | 'slots' | 'delete' | 'blocked'>(null);
  const st = (p: Partial<typeof s.settings>) => set((x) => ({ ...x, settings: { ...x.settings, ...p } }));
  const up = (p: Partial<MeT>) => set((x) => ({ ...x, me: { ...x.me, ...p } }));
  const tg = <T,>(a: T[], v: T) => (a.includes(v) ? a.filter((y) => y !== v) : [...a, v]);

  return (
    <div className="screen with-tabs">
      <div className="top"><div><div className="kicker">Mon espace</div><h1 className="h2">Moi</h1></div><DemoPill /></div>
      <div className="scroll">
        <div className="me-hero">
          <Portrait src={me.photo} hue={34} />
          <div><h2>{me.name}, <span style={{ color: 'var(--ivory-2)', fontSize: 28 }}>{ageFromBirth(me.birth)}</span></h2>
            <p className="small">{me.city} · {INTENTIONS[me.intention]}</p>
            <button className="btn quiet sm" style={{ marginTop: 10 }} onClick={() => setSheet('edit')}>Modifier</button></div>
        </div>
        {me.phrase && <p className="quote" style={{ padding: '16px 22px 0' }}>« {me.phrase} »</p>}

        <div className="group">
          <button className="row" onClick={() => setSheet('slots')}><span><b>Mes créneaux</b><small>Utilisés pour « Notre moment », jamais affichés</small></span><span className="val">{s.slots.length}</span></button>
        </div>

        <div className="group"><div className="gt kicker">Ma recherche</div>
          <div className="row" style={{ display: 'block' }}><b>Âge : {me.ageMin} – {me.ageMax} ans</b>
            <input className="range" type="range" min={18} max={70} value={me.ageMin} onChange={(e) => up({ ageMin: Math.min(+e.target.value, me.ageMax - 1) })} aria-label="Âge minimum" />
            <input className="range" type="range" min={18} max={70} value={me.ageMax} onChange={(e) => up({ ageMax: Math.max(+e.target.value, me.ageMin + 1) })} aria-label="Âge maximum" /></div>
          <div className="row" style={{ display: 'block' }}><b>Distance : {me.maxKm} km</b>
            <input className="range" type="range" min={2} max={60} value={me.maxKm} onChange={(e) => up({ maxKm: +e.target.value })} aria-label="Distance maximale" /></div>
        </div>

        <div className="group"><div className="gt kicker">Confidentialité</div>
          <Toggle on={s.settings.readReceipts} onChange={(v) => st({ readReceipts: v })} label="Confirmations de lecture" hint="Optionnel, et réciproque" />
          <Toggle on={s.settings.showDistance} onChange={(v) => st({ showDistance: v })} label="Afficher la distance approximative" hint="Jamais de position précise" />
          <Toggle on={s.settings.hideFromTonight} onChange={(v) => st({ hideFromTonight: v })} label="Me masquer de « Ce soir »" />
          <Toggle on={s.settings.notifications} onChange={(v) => { st({ notifications: v }); if (v && 'Notification' in window) Notification.requestPermission?.(); toast(v ? 'Notifications activées avec ton accord.' : 'Notifications désactivées.'); }} label="Notifications" hint="Uniquement avec ton consentement" />
        </div>

        <div className="group"><div className="gt kicker">Sécurité</div>
          <div className="row"><span><b>Vérification du profil</b><small>À venir : selfie de contrôle via un prestataire</small></span><span className="val">Phase 4</span></div>
          <button className="row" onClick={() => setSheet('blocked')}><span><b>Personnes bloquées</b></span><span className="val">{s.blocked.length}</span></button>
          <div className="row"><span><b>Pas de photo d'enfant · pas d'agenda de garde</b><small>Règles appliquées partout dans l'app</small></span><Icon n="shield" /></div>
        </div>

        <div className="group"><div className="gt kicker">Mes données</div>
          <div className="row"><span><b>Télécharger mes données</b><small>Droit d'accès RGPD, à brancher avec le backend</small></span><span className="val">Phase 4</span></div>
          <button className="row" onClick={() => setSheet('delete')}><span><b style={{ color: '#e8a59d' }}>Supprimer mon compte et mes données</b></span><Icon n="trash" /></button>
          <button className="row" onClick={() => { reset(); }}><span><b>Réinitialiser la démo</b><small>Revenir à l'écran d'accueil</small></span></button>
        </div>
        <p className="fine">Version de démonstration : profils, messages et réponses sont fictifs et stockés uniquement sur cet appareil. Une interface ne rend pas à elle seule l'app conforme au RGPD : base légale, registre, DPO éventuel, mentions et contrats restent à traiter avant publication.</p>
        <div style={{ height: 20 }} />
      </div>

      {sheet === 'edit' && (
        <Sheet title="Mon profil" onClose={() => setSheet(null)}>
          <div className="field"><label>Phrase personnelle</label><textarea className="input" maxLength={140} value={me.phrase} onChange={(e) => up({ phrase: e.target.value })} /></div>
          <div className="field"><label>Intention</label><div className="chips">{Object.entries(INTENTIONS).map(([k, l]) => <Chip key={k} on={me.intention === k} onClick={() => up({ intention: k as MeT['intention'] })}>{l}</Chip>)}</div></div>
          <div className="field"><label>Disponibilités</label><div className="chips">{(Object.keys(AVAIL_LABEL) as Avail[]).map((k) => <Chip key={k} on={me.avail.includes(k)} onClick={() => up({ avail: tg(me.avail, k) })}>{AVAIL_LABEL[k]}</Chip>)}</div></div>
          <div className="field"><label>Centres d'intérêt</label><div className="chips">{INTERESTS.map((k) => <Chip key={k} on={me.interests.includes(k)} onClick={() => up({ interests: tg(me.interests, k) })}>{k}</Chip>)}</div></div>
          <button className="btn amber block" style={{ marginTop: 22 }} onClick={() => { setSheet(null); toast('Profil mis à jour.'); }}>Enregistrer</button>
        </Sheet>
      )}
      {sheet === 'slots' && (
        <Sheet title="Mes créneaux" onClose={() => setSheet(null)}>
          <p className="lead" style={{ marginBottom: 16 }}>Touche les moments où tu pourrais voir quelqu'un. Seuls les créneaux communs seront proposés.</p>
          <SlotGrid />
          <button className="btn amber block" style={{ marginTop: 22 }} onClick={() => { setSheet(null); toast('Créneaux enregistrés.'); }}>Enregistrer</button>
        </Sheet>
      )}
      {sheet === 'blocked' && (
        <Sheet title="Personnes bloquées" onClose={() => setSheet(null)}>
          {s.blocked.length ? s.blocked.map((id) => <div key={id} className="row"><b>{byId(id)?.name}</b><button className="link" onClick={() => set((x) => ({ ...x, blocked: x.blocked.filter((b) => b !== id) }))}>Débloquer</button></div>) : <p className="lead">Personne pour l'instant.</p>}
        </Sheet>
      )}
      {sheet === 'delete' && (
        <Sheet title="Supprimer mon compte" onClose={() => setSheet(null)}>
          <p className="lead" style={{ marginBottom: 18 }}>Ton profil, tes connexions et tes messages seront effacés. En démo, cela efface les données de cet appareil.</p>
          <button className="btn danger block" onClick={reset}>Supprimer définitivement</button>
          <button className="btn quiet block" style={{ marginTop: 10 }} onClick={() => setSheet(null)}>Annuler</button>
        </Sheet>
      )}
    </div>
  );
}
