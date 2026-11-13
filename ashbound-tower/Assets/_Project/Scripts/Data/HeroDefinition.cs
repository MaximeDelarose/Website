using System;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Squelette de héros : les 3 éléments et les 3 familles de tourelles (étapes suivantes).</summary>
    [CreateAssetMenu(menuName = "Ashbound Tower/Héros", fileName = "Hero_")]
    public class HeroDefinition : ScriptableObject
    {
        public string id = "hero";
        public string displayName = "Héros";
        public Element[] elements = new Element[3];
        public TowerDefinition[] towerFamilies = new TowerDefinition[3];
        public float moveSpeed = 6f;
        public float maxHealth = 100f;
    }
}
