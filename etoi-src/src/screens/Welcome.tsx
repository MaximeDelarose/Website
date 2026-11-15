import { useState } from 'react';
import { useApp } from '../store';
import { Sheet } from '../ui';

export default function Welcome() {
  const { set, startDemo } = useApp();
  const [login, setLogin] = useState(false);
  return (
    <div className="screen welcome">
      <div className="kicker rise" style={{ animationDelay: '.2s', position: 'relative' }}>[ Et toi ? ] · Parents solos</div>
      <div className="center">
        <div className="halo" />
        <div className="l1 rise" style={{ animationDelay: '.7s' }}>Les enfants<br />dorment.</div>
        <div className="l2 glow-in" style={{ animationDelay: '1.9s' }}>Et toi ?</div>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <p className="sub rise" style={{ animationDelay: '3s' }}>L'app de rencontre pour parents solos qui sortent enfin.</p>
        <div className="actions rise" style={{ animationDelay: '3.4s' }}>
          <button className="btn amber block" onClick={() => set((s) => ({ ...s, stage: 'onboarding' }))}>Découvrir</button>
          <button className="btn quiet block" onClick={() => setLogin(true)}>J'ai déjà un compte</button>
        </div>
        <p className="small foot rise" style={{ animationDelay: '3.8s' }}>Réservée aux personnes majeures. Version de démonstration : tous les profils sont fictifs.</p>
      </div>
      {login && (
        <Sheet title="Se connecter" onClose={() => setLogin(false)}>
          <p className="lead" style={{ margin: '6px 0 18px' }}>La connexion sécurisée (e-mail, lien magique, double authentification) arrive avec le backend. En démo, vous pouvez entrer avec un profil d'essai.</p>
          <button className="btn amber block" onClick={startDemo}>Entrer avec le profil démo</button>
          <p className="small" style={{ textAlign: 'center', marginTop: 14 }}>Profil d'essai : « Alex », parent solo fictif à Lyon.</p>
        </Sheet>
      )}
    </div>
  );
}
