using System.Collections.Generic;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Tourelle électrique « Orbe foudroyant » : éclairs sur les ennemis les plus avancés à portée, multi-éclairs et chaînes selon les améliorations.
    /// Construite par code (Create). Les statistiques viennent entièrement du TowerDefinition.</summary>
    public class Tower : MonoBehaviour
    {
        public TowerDefinition Def { get; private set; }
        public BuildSlot Slot { get; private set; }
        public int Tier { get; private set; }               // nombre d'améliorations achetées
        public TowerStats Stats { get; private set; }

        float cooldown;
        float punch;
        SpriteRenderer sr;
        Transform visual;
        static readonly List<Enemy> targets = new List<Enemy>();
        static readonly HashSet<Enemy> chainHit = new HashSet<Enemy>();

        public static Tower Create(TowerDefinition def, BuildSlot slot)
        {
            GameObject go = new GameObject("Tower_" + def.id);
            go.transform.position = slot.transform.position;
            Tower t = go.AddComponent<Tower>();
            t.Init(def, slot);
            return t;
        }

        void Init(TowerDefinition def, BuildSlot slot)
        {
            Def = def; Slot = slot;
            slot.Occupant = this;
            GameObject sh = GameAssets.FlatSprite("Shadow", transform, GameAssets.Shadow, GameAssets.OrderShadow);
            sh.transform.localScale = new Vector3(2.2f, 2.2f, 1f);
            GameObject v = new GameObject("Visual");
            visual = v.transform;
            visual.SetParent(transform, false);
            sr = v.AddComponent<SpriteRenderer>();
            v.AddComponent<BillboardSprite>();
            Recompute();
        }

        TowerBranch Branch { get { return Def.branches != null && Def.branches.Length > 0 ? Def.branches[0] : null; } }

        void Recompute()
        {
            TowerStats s = Def.baseStats.Clone();
            Sprite sprite = Def.baseSprite;
            TowerBranch b = Branch;
            if (b != null)
            {
                for (int i = 0; i < Tier && i < b.tiers.Length; i++)
                {
                    s = b.tiers[i].modifier.ApplyTo(s);
                    if (b.tiers[i].towerSprite != null) sprite = b.tiers[i].towerSprite;
                }
            }
            s.Sanitize();
            Stats = s;
            sr.sprite = sprite;
        }

        public bool HasNextUpgrade { get { TowerBranch b = Branch; return b != null && Tier < b.tiers.Length; } }
        public TowerUpgrade NextUpgrade { get { return HasNextUpgrade ? Branch.tiers[Tier] : null; } }

        /// <summary>Achète l'amélioration suivante. Le coût n'est débité que si l'achat réussit.</summary>
        public bool TryUpgrade()
        {
            if (!HasNextUpgrade || Economy.Instance == null) return false;
            TowerUpgrade up = NextUpgrade;
            if (!Economy.Instance.TrySpend(up.cost))
            {
                AudioManager.Play("error", 0.6f);
                Notifier.ShowToast("Pas assez d'or", new Color(1f, 0.5f, 0.5f));
                return false;
            }
            Tier++;
            Recompute();
            punch = 1f;
            AudioManager.Play("upgrade", 0.9f);
            FxPool.Burst(MuzzlePosition, new Color(0.4f, 0.9f, 1f), 24, 6f, 0.8f, 0.8f);
            Notifier.ShowToast(up.displayName + " !", new Color(0.5f, 0.95f, 1f));
            return true;
        }

        public Vector3 MuzzlePosition { get { return visual.TransformPoint(new Vector3(0f, Def.muzzleHeight, 0f)); } }

        void Update()
        {
            if (punch > 0f)
            {
                punch = Mathf.Max(0f, punch - Time.deltaTime * 6f);
                visual.localScale = Vector3.one * (1f + 0.1f * punch);
            }
            if (GameManager.Instance != null && !GameManager.Instance.Simulating) return;

            cooldown -= Time.deltaTime;
            if (cooldown > 0f) return;
            cooldown = Fire() ? 1f / Stats.attacksPerSecond : 0.08f;
        }

        /// <summary>Tire une salve de `zapCount` éclairs sur les ennemis les plus avancés à portée. Chaque éclair vise une cible différente ;
        /// s'il y a moins de cibles que d'éclairs, les éclairs en surplus retombent sur les cibles déjà visées (un boss isolé reçoit toute la salve).
        /// Retourne vrai si au moins un éclair est parti.</summary>
        bool Fire()
        {
            // la portée est mesurée depuis le pied de la tourelle (sur le plan du sol)
            EnemyRegistry.GetInRange(transform.position, Stats.range, targets);
            if (targets.Count == 0) return false;

            Vector3 muzzle = MuzzlePosition;
            int distinct = Mathf.Min(Stats.zapCount, targets.Count);
            for (int z = 0; z < Stats.zapCount; z++)
            {
                Enemy primary = targets[z % distinct];
                if (primary == null || primary.IsDead) continue;      // tué par un éclair précédent de la même salve
                Zap(muzzle, primary);
            }
            punch = 0.6f;
            AudioManager.Play("zap", 0.55f);
            return true;
        }

        /// <summary>Un éclair : touche la cible puis rebondit vers l'ennemi vivant le plus proche non encore touché PAR CET ÉCLAIR (jamais deux fois le même ennemi dans une chaîne).</summary>
        void Zap(Vector3 from, Enemy primary)
        {
            chainHit.Clear();
            float dmg = Stats.damage;
            Enemy current = primary;
            Vector3 origin = from;
            for (int jump = 0; jump <= Stats.chainJumps; jump++)
            {
                chainHit.Add(current);
                Vector3 aim = current.AimPoint;
                Vector3 pos = current.transform.position;
                ZapVfx.Play(origin, aim);
                current.TakeDamage(new DamageInfo(dmg, Def.element, this));
                if (jump == Stats.chainJumps) break;
                Enemy next = EnemyRegistry.Nearest(pos, Stats.chainRadius, chainHit);
                if (next == null) break;
                dmg *= Stats.chainFalloff;
                origin = aim;
                current = next;
            }
        }
    }
}
