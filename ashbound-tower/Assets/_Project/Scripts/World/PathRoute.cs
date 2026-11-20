using UnityEngine;

namespace AshboundTower
{
    /// <summary>Chemin suivi par les ennemis : polyligne dense (générée avec le sol, donc alignée sur le chemin visible).</summary>
    public class PathRoute : MonoBehaviour
    {
        public static PathRoute Instance { get; private set; }

        public Vector3[] points = new Vector3[0];
        float[] cumulative = new float[0];
        public float Length { get; private set; }

        void Awake() { Instance = this; Rebuild(); }
        void OnDestroy() { if (Instance == this) Instance = null; }

        public void SetPoints(Vector3[] p) { points = p; Rebuild(); }

        public void Rebuild()
        {
            cumulative = new float[points.Length];
            Length = 0f;
            for (int i = 1; i < points.Length; i++)
            {
                Length += Vector3.Distance(points[i - 1], points[i]);
                cumulative[i] = Length;
            }
        }

        public Vector3 Start { get { return points.Length > 0 ? points[0] : Vector3.zero; } }
        public Vector3 End { get { return points.Length > 0 ? points[points.Length - 1] : Vector3.zero; } }

        /// <summary>Position et direction (unitaire) à la distance d le long du chemin (bornée).</summary>
        public Vector3 Evaluate(float d, out Vector3 direction)
        {
            direction = Vector3.right;
            if (points.Length == 0) return Vector3.zero;
            if (points.Length == 1) return points[0];
            d = Mathf.Clamp(d, 0f, Length);
            int lo = 1, hi = points.Length - 1;
            while (lo < hi)
            {
                int mid = (lo + hi) / 2;
                if (cumulative[mid] < d) lo = mid + 1; else hi = mid;
            }
            float segLen = cumulative[lo] - cumulative[lo - 1];
            float t = segLen > 1e-5f ? (d - cumulative[lo - 1]) / segLen : 0f;
            Vector3 a = points[lo - 1], b = points[lo];
            direction = (b - a).sqrMagnitude > 1e-8f ? (b - a).normalized : Vector3.right;
            return Vector3.Lerp(a, b, t);
        }

        /// <summary>Distance minimale d'un point (plan XZ) au chemin – sert aux contrôles de validité.</summary>
        public float DistanceToPath(Vector3 p)
        {
            float best = float.MaxValue;
            for (int i = 0; i < points.Length; i++)
            {
                float dx = p.x - points[i].x, dz = p.z - points[i].z;
                float d = dx * dx + dz * dz;
                if (d < best) best = d;
            }
            return Mathf.Sqrt(best);
        }

        void OnDrawGizmos()
        {
            Gizmos.color = Color.cyan;
            for (int i = 1; i < points.Length; i++) Gizmos.DrawLine(points[i - 1], points[i]);
        }
    }
}
