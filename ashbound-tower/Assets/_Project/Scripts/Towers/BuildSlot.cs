using UnityEngine;

namespace AshboundTower
{
    /// <summary>Emplacement libre pour une tourelle (plaque de pierre peinte dans le sol). Ce composant ajoute le surlignage interactif.</summary>
    public class BuildSlot : MonoBehaviour
    {
        public Tower Occupant { get; set; }
        public bool IsFree { get { return Occupant == null; } }
        SpriteRenderer marker;

        void Awake()
        {
            GameObject m = GameAssets.FlatSprite("Marker", transform, GameAssets.SlotOutline, GameAssets.OrderSlotMarker);
            m.transform.localScale = Vector3.one * 1.12f;
            marker = m.GetComponent<SpriteRenderer>();
            marker.enabled = false;
        }

        /// <summary>mode : 0 = caché, 1 = visible (mode construction), 2 = survolé valide, 3 = survolé invalide.</summary>
        public void SetHighlight(int mode)
        {
            if (marker == null) return;
            marker.enabled = mode > 0 && IsFree || mode >= 2;
            switch (mode)
            {
                case 1: marker.color = new Color(0.4f, 0.9f, 1f, 0.35f); break;
                case 2: marker.color = new Color(0.4f, 1f, 0.6f, 0.95f); break;
                case 3: marker.color = new Color(1f, 0.3f, 0.35f, 0.95f); break;
            }
        }
    }
}
