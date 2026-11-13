using System.Collections.Generic;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Liste des ennemis vivants + requêtes de ciblage (les tourelles visent le plus avancé sur le chemin).</summary>
    public static class EnemyRegistry
    {
        static readonly List<Enemy> active = new List<Enemy>();
        public static int Count { get { return active.Count; } }
        public static List<Enemy> All { get { return active; } }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.SubsystemRegistration)]
        static void ResetStatics() { active.Clear(); }

        public static void Register(Enemy e) { if (!active.Contains(e)) active.Add(e); }
        public static void Unregister(Enemy e) { active.Remove(e); }

        /// <summary>Remplit `results` (vidé avant) avec les ennemis vivants à portée, du plus avancé au moins avancé.</summary>
        public static void GetInRange(Vector3 center, float range, List<Enemy> results)
        {
            results.Clear();
            float r2 = range * range;
            for (int i = 0; i < active.Count; i++)
            {
                Enemy e = active[i];
                if (e == null || e.IsDead) continue;
                float dx = e.transform.position.x - center.x, dz = e.transform.position.z - center.z;
                if (dx * dx + dz * dz <= r2) results.Add(e);
            }
            results.Sort((a, b) => b.Distance.CompareTo(a.Distance));
        }

        /// <summary>Ennemi vivant le plus proche de `center` dans `radius`, hors ceux de `exclude`.</summary>
        public static Enemy Nearest(Vector3 center, float radius, HashSet<Enemy> exclude)
        {
            Enemy best = null;
            float bestD = radius * radius;
            for (int i = 0; i < active.Count; i++)
            {
                Enemy e = active[i];
                if (e == null || e.IsDead || (exclude != null && exclude.Contains(e))) continue;
                float dx = e.transform.position.x - center.x, dz = e.transform.position.z - center.z;
                float d = dx * dx + dz * dz;
                if (d <= bestD) { bestD = d; best = e; }
            }
            return best;
        }
    }
}
