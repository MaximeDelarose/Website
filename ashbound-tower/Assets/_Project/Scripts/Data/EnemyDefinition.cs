using System;
using UnityEngine;

namespace AshboundTower
{
    [CreateAssetMenu(menuName = "Ashbound Tower/Ennemi", fileName = "Enemy_")]
    public class EnemyDefinition : ScriptableObject
    {
        public string id = "enemy";
        public string displayName = "Ennemi";
        public EnemyKind kind = EnemyKind.Standard;
        public float maxHealth = 40f;
        [Tooltip("Unités monde par seconde le long du chemin.")]
        public float moveSpeed = 2.2f;
        [Tooltip("Stabilité retirée au Cœur à l'arrivée.")]
        public float heartDamage = 4f;
        public int goldReward = 5;
        [Tooltip("Expérience lâchée à la mort (progression, étape 5).")]
        public int xpReward = 1;
        public Element element = Element.Tenebre;
        public Sprite[] walkFrames = new Sprite[0];
        public float frameRate = 4f;
        public float visualScale = 1f;
        public float shadowSize = 1.4f;
        [Tooltip("Barre de vie toujours visible (élites, boss). Sinon : visible seulement si blessé.")]
        public bool alwaysShowHealthBar = false;
        public float healthBarWidth = 1.1f;
    }
}
