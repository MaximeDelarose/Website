using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    /// <summary>Palette CATOWER : décor doux, gameplay saturé, contours prune.</summary>
    public static class Pal
    {
        public static Color H(string hex) { Color c; ColorUtility.TryParseHtmlString("#" + hex, out c); return c; }
        public static readonly Color Ink = H("4A3553");
        public static readonly Color Pink = H("FF8FB4");
        public static readonly Color PinkSoft = H("FFD9E6");
        public static readonly Color Gold = H("F4A62A");
        public static readonly Color GoldDark = H("B87408");
        public static readonly Color Violet = H("7C6BFF");
        public static readonly Color Coral = H("F0566E");
        public static readonly Color Mint = H("CFEFE3");
        public static readonly Color MintDark = H("8FD1B5");
        public static readonly Color Grass = H("BDE8D0");
        public static readonly Color Road = H("FFE3C7");
        public static readonly Color Fur = H("FFB86B");
        public static readonly Color FurLight = H("FFE6C4");
        public static readonly Color Milk = H("F4F8FF");
        public static readonly Color Sky = H("FFF3F7");
        public static readonly Color Water = H("8FD3FF");
        public static readonly Color Lilac = H("C9B8FF");
    }

    /// <summary>Petites aides pour construire des visuels à partir de primitives (art provisoire).</summary>
    public static class Gfx
    {
        static readonly Dictionary<Color, Material> mats = new Dictionary<Color, Material>();
        static readonly Dictionary<Color, Material> lineMats = new Dictionary<Color, Material>();
        static Shader lit;

        public static Material Mat(Color c)
        {
            Material m;
            if (mats.TryGetValue(c, out m) && m != null) return m;
            if (lit == null)
            {
                lit = Shader.Find("Standard");
                if (lit == null) lit = Shader.Find("Universal Render Pipeline/Lit");
                if (lit == null) lit = Shader.Find("Sprites/Default");
            }
            m = new Material(lit);
            m.color = c;
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            if (m.HasProperty("_Glossiness")) m.SetFloat("_Glossiness", 0.12f);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", 0f);
            mats[c] = m;
            return m;
        }

        public static Material LineMat(Color c)
        {
            Material m;
            if (lineMats.TryGetValue(c, out m) && m != null) return m;
            m = new Material(Shader.Find("Sprites/Default"));
            m.color = c;
            lineMats[c] = m;
            return m;
        }

        public static GameObject Prim(PrimitiveType t, Transform parent, Vector3 pos, Vector3 scale, Color c, string name = "p")
        {
            var g = GameObject.CreatePrimitive(t);
            g.name = name;
            var col = g.GetComponent<Collider>();
            if (col != null) Object.Destroy(col);
            if (parent != null) g.transform.SetParent(parent, false);
            g.transform.localPosition = pos;
            g.transform.localScale = scale;
            g.GetComponent<Renderer>().sharedMaterial = Mat(c);
            return g;
        }

        public static GameObject Prim(PrimitiveType t, Transform parent, Vector3 pos, float scale, Color c, string name = "p")
        {
            return Prim(t, parent, pos, Vector3.one * scale, c, name);
        }

        /// <summary>Cercle plat (rayon 1 si on met ensuite localScale = rayon).</summary>
        public static LineRenderer Circle(Transform parent, float radius, Color c, float width, float y = 0.08f, int seg = 48)
        {
            var g = new GameObject("circle");
            if (parent != null) g.transform.SetParent(parent, false);
            var lr = g.AddComponent<LineRenderer>();
            lr.useWorldSpace = false;
            lr.loop = true;
            lr.positionCount = seg;
            lr.widthMultiplier = width;
            lr.material = LineMat(c);
            lr.startColor = c;
            lr.endColor = c;
            lr.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            for (int i = 0; i < seg; i++)
            {
                float a = i * Mathf.PI * 2f / seg;
                lr.SetPosition(i, new Vector3(Mathf.Cos(a) * radius, y, Mathf.Sin(a) * radius));
            }
            return lr;
        }

        /// <summary>Deux oreilles de chat (losanges aplatis) avec intérieur rose.</summary>
        public static void Ears(Transform parent, Vector3 center, float size, Color outer, Color inner)
        {
            for (int s = -1; s <= 1; s += 2)
            {
                var e = Prim(PrimitiveType.Cube, parent, center + new Vector3(s * size * 1.3f, 0, 0), new Vector3(size, size, size * 0.5f), outer, "ear");
                e.transform.localRotation = Quaternion.Euler(0, 0, 45 + s * -8);
                var i = Prim(PrimitiveType.Cube, parent, center + new Vector3(s * size * 1.3f, -size * 0.05f, size * 0.2f), new Vector3(size * 0.6f, size * 0.6f, size * 0.4f), inner, "earIn");
                i.transform.localRotation = e.transform.localRotation;
            }
        }
    }

    public class Spin : MonoBehaviour
    {
        public Vector3 axis = Vector3.up;
        public float speed = 90f;
        void Update() { transform.Rotate(axis, speed * Time.deltaTime, Space.Self); }
    }

    /// <summary>Le chat chibi : grosse tête, petit corps, clochette.</summary>
    public static class CatView
    {
        public static Transform Build(Transform parent, Color fur, Color light, out Transform tail)
        {
            var root = new GameObject("cat").transform;
            root.SetParent(parent, false);
            Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(0, 0.45f, 0), new Vector3(0.75f, 0.65f, 0.85f), fur, "body");
            Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(0, 0.38f, 0.22f), new Vector3(0.45f, 0.4f, 0.4f), light, "belly");
            Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(0, 1.15f, 0.05f), new Vector3(1.3f, 1.1f, 1.15f), fur, "head");
            Gfx.Ears(root, new Vector3(0, 1.68f, 0f), 0.3f, fur, Pal.Pink);
            for (int s = -1; s <= 1; s += 2)
            {
                Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(s * 0.27f, 1.2f, 0.52f), new Vector3(0.2f, 0.3f, 0.1f), Pal.Ink, "eye");
                Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(s * 0.24f, 1.29f, 0.58f), 0.08f, Color.white, "shine");
                Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(s * 0.31f, 1.1f, 0.57f), 0.04f, Color.white, "shine2");
                Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(s * 0.45f, 1.0f, 0.45f), new Vector3(0.22f, 0.13f, 0.08f), Pal.Pink, "cheek");
                Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(s * 0.24f, 0.1f, 0.3f), new Vector3(0.24f, 0.18f, 0.3f), light, "paw");
            }
            Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(0, 1.06f, 0.6f), 0.08f, Pal.Pink, "nose");
            Gfx.Prim(PrimitiveType.Cylinder, root, new Vector3(0, 0.78f, 0.12f), new Vector3(0.6f, 0.04f, 0.6f), Pal.Coral, "collar");
            Gfx.Prim(PrimitiveType.Sphere, root, new Vector3(0, 0.7f, 0.46f), 0.14f, Pal.Gold, "bell");
            var pivot = new GameObject("tail").transform;
            pivot.SetParent(root, false);
            pivot.localPosition = new Vector3(0, 0.4f, -0.4f);
            var t = Gfx.Prim(PrimitiveType.Capsule, pivot, new Vector3(0, 0.3f, -0.1f), new Vector3(0.18f, 0.35f, 0.18f), fur, "tailMesh");
            t.transform.localRotation = Quaternion.Euler(-25, 0, 0);
            tail = pivot;
            return root;
        }
    }
}
