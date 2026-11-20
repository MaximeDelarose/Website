using System;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Statistiques d'une tourelle offensive électrique (toutes configurables dans l'inspecteur).</summary>
    [Serializable]
    public class TowerStats
    {
        public float damage = 8f;
        public float attacksPerSecond = 1.6f;
        public float range = 5.5f;
        [Tooltip("Nombre d'éclairs par salve, chacun sur une cible différente.")]
        public int zapCount = 1;
        [Tooltip("Nombre de rebonds d'un éclair vers un ennemi proche.")]
        public int chainJumps = 0;
        public float chainRadius = 2.8f;
        [Range(0f, 1f)] public float chainFalloff = 0.7f;

        public TowerStats Clone() { return (TowerStats)MemberwiseClone(); }

        public void Sanitize()
        {
            damage = Mathf.Max(0f, damage);
            attacksPerSecond = Mathf.Max(0.05f, attacksPerSecond);
            range = Mathf.Max(0.5f, range);
            zapCount = Mathf.Max(1, zapCount);
            chainJumps = Mathf.Max(0, chainJumps);
            chainRadius = Mathf.Max(0f, chainRadius);
        }
    }

    [Serializable]
    public class TowerStatModifier
    {
        public float damageMultiplier = 1f;
        public float attackRateMultiplier = 1f;
        public float rangeBonus = 0f;
        public int zapCountBonus = 0;
        public int chainJumpsBonus = 0;
        public float chainRadiusBonus = 0f;

        public TowerStats ApplyTo(TowerStats s)
        {
            TowerStats r = s.Clone();
            r.damage *= damageMultiplier;
            r.attacksPerSecond *= attackRateMultiplier;
            r.range += rangeBonus;
            r.zapCount += zapCountBonus;
            r.chainJumps += chainJumpsBonus;
            r.chainRadius += chainRadiusBonus;
            r.Sanitize();
            return r;
        }
    }

    /// <summary>Un palier (tier) d'une voie d'évolution.</summary>
    [Serializable]
    public class TowerUpgrade
    {
        public string displayName = "Amélioration";
        [TextArea] public string description = "";
        public int cost = 50;
        public TowerStatModifier modifier = new TowerStatModifier();
        [Tooltip("Sprite de la tourelle une fois ce palier acheté (silhouette modifiée).")]
        public Sprite towerSprite;
        [Tooltip("Valeur non définie dans les documents : à valider par le game design.")]
        public bool provisional = true;
    }

    /// <summary>Une voie de spécialisation. Cible finale : 3 voies × 5 paliers, le palier 5 étant unique.
    /// Le prototype n'utilise qu'une voie de 3 paliers.</summary>
    [Serializable]
    public class TowerBranch
    {
        public string branchName = "Voie";
        [TextArea] public string description = "";
        public TowerUpgrade[] tiers = new TowerUpgrade[0];
        [Tooltip("Si vrai, le dernier palier ne peut être acheté qu'une fois (règle du Google Doc, à préciser).")]
        public bool lastTierUnique = false;
    }

    [CreateAssetMenu(menuName = "Ashbound Tower/Tourelle", fileName = "Tower_")]
    public class TowerDefinition : ScriptableObject
    {
        public string id = "tower";
        public string displayName = "Tourelle";
        public TowerFamily family = TowerFamily.OrbeFoudroyant;
        public Element element = Element.Neutre;
        [TextArea] public string description = "";
        public int buildCost = 50;
        [Tooltip("Faux = emplacement d'architecture réservé, non constructible (ex. 3e tourelle de l'Épéiste).")]
        public bool implemented = true;
        [Tooltip("Niveau de héros requis (progression, étape 5). 0 = toujours disponible.")]
        public int unlockLevel = 0;
        [Tooltip("Nombre maximum de tourelles de ce type (0 = illimité). Cf. limites par tier du Google Doc.")]
        public int maxBuilt = 0;
        public TowerStats baseStats = new TowerStats();
        public Sprite baseSprite;
        [Tooltip("Hauteur (unités monde) de la source des éclairs au-dessus du sol.")]
        public float muzzleHeight = 1.6f;
        public TowerBranch[] branches = new TowerBranch[0];
    }
}
