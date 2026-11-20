using UnityEngine;

namespace AshboundTower
{
    /// <summary>Effets de statut d'un ennemi : ralentissement et étourdissement (utilisés par l'Épéiste dès l'étape 2).
    /// Les effets ne s'empilent pas : on garde le plus fort et la durée la plus longue.</summary>
    public class StatusReceiver : MonoBehaviour
    {
        float stunUntil;
        float slowUntil;
        float slowFactor = 1f;

        public bool IsStunned { get { return Time.time < stunUntil; } }
        public bool IsSlowed { get { return Time.time < slowUntil; } }

        public float SpeedMultiplier
        {
            get
            {
                if (IsStunned) return 0f;
                return IsSlowed ? slowFactor : 1f;
            }
        }

        public void ApplyStun(float seconds)
        {
            if (seconds <= 0f) return;
            stunUntil = Mathf.Max(stunUntil, Time.time + seconds);
        }

        /// <param name="factor">Multiplicateur de vitesse (0.65 = -35 %).</param>
        public void ApplySlow(float factor, float seconds)
        {
            if (seconds <= 0f) return;
            factor = Mathf.Clamp(factor, 0.05f, 1f);
            if (!IsSlowed || factor < slowFactor) slowFactor = factor;
            slowUntil = Mathf.Max(slowUntil, Time.time + seconds);
        }
    }
}
