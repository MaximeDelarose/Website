using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    public class Pad : MonoBehaviour
    {
        public Tower tower;
        public LineRenderer ring;
        public Vector3 Pos { get { return transform.position; } }
    }

    public class HeartView : MonoBehaviour
    {
        float pulse;
        public void Hurt() { pulse = 1f; }
        void Update()
        {
            pulse = Mathf.Max(0f, pulse - Time.deltaTime * 2.5f);
            float s = 1f + 0.06f * Mathf.Sin(Time.time * 3f) + pulse * 0.35f;
            transform.localScale = Vector3.one * s;
        }
    }

    /// <summary>Carte du prototype : jardin de Mochi. Un seul chemin en S, un Cœur, 14 emplacements.</summary>
    public static class Map
    {
        static Vector3 V(float x, float z) { return new Vector3(x, 0, z); }

        public static readonly Vector3[] Path =
        {
            V(-27, 10), V(-12, 10), V(-12, -8), V(4, -8), V(4, 8), V(18, 8), V(18, -6), V(24, -6)
        };

        static readonly Vector2[] PadPositions =
        {
            new Vector2(-20, 6.5f), new Vector2(-20, 13.5f), new Vector2(-8.5f, 1), new Vector2(-15.5f, 1),
            new Vector2(-8, -4.5f), new Vector2(-8, -11.5f), new Vector2(0, -4.5f), new Vector2(0.5f, 0),
            new Vector2(7.5f, 0), new Vector2(0.5f, -11.5f), new Vector2(10, 11.5f), new Vector2(10, 4.5f),
            new Vector2(14.5f, 0), new Vector2(21.5f, 0)
        };

        public static readonly Vector2 Half = new Vector2(28, 17);
        public static readonly List<Pad> Pads = new List<Pad>();
        public const float RoadWidth = 3f;
        static float[] cum;
        public static float Length;
        public static HeartView Heart;

        public static Vector3 HeartPos { get { return Path[Path.Length - 1]; } }

        public static void Init()
        {
            cum = new float[Path.Length];
            for (int i = 1; i < Path.Length; i++) cum[i] = cum[i - 1] + Vector3.Distance(Path[i - 1], Path[i]);
            Length = cum[Path.Length - 1];
        }

        public static Vector3 PointAt(float d, out Vector3 dir)
        {
            d = Mathf.Clamp(d, 0f, Length);
            for (int i = 1; i < Path.Length; i++)
            {
                if (d <= cum[i] || i == Path.Length - 1)
                {
                    dir = (Path[i] - Path[i - 1]).normalized;
                    return Path[i - 1] + dir * (d - cum[i - 1]);
                }
            }
            dir = Vector3.forward;
            return Path[0];
        }

        public static float DistToPath(Vector3 p)
        {
            float best = float.MaxValue;
            for (int i = 1; i < Path.Length; i++)
            {
                Vector3 a = Path[i - 1], b = Path[i], ab = b - a;
                float t = Mathf.Clamp01(Vector3.Dot(p - a, ab) / ab.sqrMagnitude);
                Vector3 c = a + ab * t;
                best = Mathf.Min(best, Mathf.Sqrt((p.x - c.x) * (p.x - c.x) + (p.z - c.z) * (p.z - c.z)));
            }
            return best;
        }

        public static void Build(Transform root)
        {
            Init();
            Pads.Clear();
            var map = new GameObject("Map").transform;
            map.SetParent(root, false);

            // Sol : herbe douce
            Gfx.Prim(PrimitiveType.Cube, map, new Vector3(0, -0.5f, 0), new Vector3(Half.x * 2 + 10, 1, Half.y * 2 + 10), Pal.Grass, "ground");

            // Chemin crème
            for (int i = 1; i < Path.Length; i++)
            {
                Vector3 a = Path[i - 1], b = Path[i];
                Vector3 mid = (a + b) * 0.5f;
                float len = Vector3.Distance(a, b);
                bool horizontal = Mathf.Abs(b.x - a.x) > Mathf.Abs(b.z - a.z);
                Vector3 size = horizontal ? new Vector3(len + RoadWidth, 0.12f, RoadWidth) : new Vector3(RoadWidth, 0.12f, len + RoadWidth);
                Gfx.Prim(PrimitiveType.Cube, map, new Vector3(mid.x, 0.02f, mid.z), size, Pal.Road, "road");
            }
            // Petites pattes le long du chemin : indiquent le sens
            for (float d = 2f; d < Length - 1f; d += 3f)
            {
                Vector3 dir;
                Vector3 p = PointAt(d, out dir);
                var paw = Gfx.Prim(PrimitiveType.Sphere, map, p + Vector3.up * 0.1f, new Vector3(0.45f, 0.05f, 0.45f), Pal.PinkSoft, "paw");
                Gfx.Prim(PrimitiveType.Sphere, paw.transform, new Vector3(0, 0, 0.9f), new Vector3(0.5f, 0.6f, 0.5f), Pal.PinkSoft, "toe");
                paw.transform.rotation = Quaternion.LookRotation(dir);
            }

            // Décor doux : buissons, fleurs, pelotes de laine
            var rnd = new System.Random(7);
            for (int i = 0; i < 90; i++)
            {
                float x = (float)(rnd.NextDouble() * 2 - 1) * (Half.x + 3);
                float z = (float)(rnd.NextDouble() * 2 - 1) * (Half.y + 3);
                var p = new Vector3(x, 0, z);
                if (DistToPath(p) < 3.2f) continue;
                bool nearPad = false;
                foreach (var pp in PadPositions) if (Vector2.Distance(pp, new Vector2(x, z)) < 2.6f) nearPad = true;
                if (nearPad) continue;
                int kind = rnd.Next(4);
                if (kind == 0) Gfx.Prim(PrimitiveType.Sphere, map, new Vector3(x, 0.4f, z), new Vector3(1.4f, 0.9f, 1.4f), Pal.MintDark, "bush");
                else if (kind == 1)
                {
                    Gfx.Prim(PrimitiveType.Cylinder, map, new Vector3(x, 0.25f, z), new Vector3(0.05f, 0.25f, 0.05f), Pal.MintDark, "stem");
                    Gfx.Prim(PrimitiveType.Sphere, map, new Vector3(x, 0.55f, z), 0.4f, rnd.Next(2) == 0 ? Pal.Pink : Pal.Lilac, "flower");
                }
                else if (kind == 2) Gfx.Prim(PrimitiveType.Sphere, map, new Vector3(x, 0.35f, z), 0.7f, Pal.Lilac, "yarn");
                else Gfx.Prim(PrimitiveType.Sphere, map, new Vector3(x, 0.2f, z), new Vector3(0.9f, 0.5f, 0.8f), Pal.Milk, "pebble");
            }

            // Entrée : trou de souris
            Vector3 s = Path[0];
            Gfx.Prim(PrimitiveType.Cylinder, map, new Vector3(s.x - 2f, 0.1f, s.z), new Vector3(3.2f, 0.1f, 3.2f), Pal.Ink, "hole");

            // Emplacements de construction
            foreach (var pp in PadPositions)
            {
                var g = new GameObject("Pad");
                g.transform.SetParent(map, false);
                g.transform.position = new Vector3(pp.x, 0.02f, pp.y);
                Gfx.Prim(PrimitiveType.Cylinder, g.transform, new Vector3(0, 0.05f, 0), new Vector3(2.6f, 0.05f, 2.6f), Pal.PinkSoft, "disc");
                var pad = g.AddComponent<Pad>();
                pad.ring = Gfx.Circle(g.transform, 1.3f, Pal.Pink, 0.14f, 0.14f);
                Pads.Add(pad);
            }

            // Le Cœur : gros coussin en forme de cœur
            Vector3 h = HeartPos;
            var heart = new GameObject("Heart");
            heart.transform.SetParent(map, false);
            heart.transform.position = new Vector3(h.x + 2.2f, 0, h.z);
            Gfx.Prim(PrimitiveType.Cylinder, heart.transform, new Vector3(0, 0.15f, 0), new Vector3(4.5f, 0.15f, 4.5f), Pal.Mint, "base");
            var body = new GameObject("body");
            body.transform.SetParent(heart.transform, false);
            body.transform.localPosition = new Vector3(0, 1.8f, 0);
            Gfx.Prim(PrimitiveType.Sphere, body.transform, new Vector3(-0.65f, 0.4f, 0), 1.7f, Pal.Coral, "lobeL");
            Gfx.Prim(PrimitiveType.Sphere, body.transform, new Vector3(0.65f, 0.4f, 0), 1.7f, Pal.Coral, "lobeR");
            var tip = Gfx.Prim(PrimitiveType.Cube, body.transform, new Vector3(0, -0.4f, 0), new Vector3(1.55f, 1.55f, 1.6f), Pal.Coral, "tip");
            tip.transform.localRotation = Quaternion.Euler(0, 0, 45);
            Gfx.Prim(PrimitiveType.Sphere, body.transform, new Vector3(-0.8f, 0.8f, 0.7f), 0.35f, Color.white, "shine");
            Heart = body.AddComponent<HeartView>();
        }
    }
}
