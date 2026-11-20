using System;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Ressources du run (or). Garantit qu'on ne peut jamais descendre sous zéro.</summary>
    [DefaultExecutionOrder(-190)]
    public class Economy : MonoBehaviour
    {
        public static Economy Instance { get; private set; }
        public int Gold { get; private set; }
        public event Action<int> GoldChanged;

        void Awake() { Instance = this; }
        void OnDestroy() { if (Instance == this) Instance = null; }

        public void SetGold(int v)
        {
            Gold = Mathf.Max(0, v);
            if (GoldChanged != null) GoldChanged(Gold);
        }

        public void Add(int amount)
        {
            if (amount <= 0) return;
            Gold += amount;
            if (GoldChanged != null) GoldChanged(Gold);
        }

        public bool CanAfford(int cost) { return cost >= 0 && Gold >= cost; }

        /// <summary>Débite le montant si possible. Retourne faux (sans rien débiter) sinon.</summary>
        public bool TrySpend(int cost)
        {
            if (cost < 0 || Gold < cost) return false;
            Gold -= cost;
            if (GoldChanged != null) GoldChanged(Gold);
            return true;
        }
    }
}
