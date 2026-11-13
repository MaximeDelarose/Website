using System.Collections.Generic;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Éclairs électriques (LineRenderer en zigzag, recyclés) + étincelle à l'impact. Aucun projectile persistant : les éclairs sont instantanés.</summary>
    public class ZapVfx : MonoBehaviour
    {
        class Bolt
        {
            public LineRenderer glow, core; public float life; public Vector3 a, b; public bool active;
        }

        public static ZapVfx Instance { get; private set; }
        public Material lineMaterial;
        readonly List<Bolt> bolts = new List<Bolt>();
        const float Life = 0.14f;

        void Awake() { Instance = this; }
        void OnDestroy() { if (Instance == this) Instance = null; }

        LineRenderer MakeLine(string n, Transform parent, float width, Color c, int order)
        {
            GameObject go = new GameObject(n);
            go.transform.SetParent(parent, false);
            LineRenderer lr = go.AddComponent<LineRenderer>();
            lr.sharedMaterial = lineMaterial != null ? lineMaterial : new Material(Shader.Find("Sprites/Default"));
            lr.useWorldSpace = true;
            lr.positionCount = 8;
            lr.startWidth = lr.endWidth = width;
            lr.startColor = lr.endColor = c;
            lr.sortingOrder = order;
            lr.numCapVertices = 2;
            return lr;
        }

        Bolt Get()
        {
            for (int i = 0; i < bolts.Count; i++) if (!bolts[i].active) return bolts[i];
            GameObject go = new GameObject("Bolt");
            go.transform.SetParent(transform, false);
            Bolt b = new Bolt();
            b.glow = MakeLine("Glow", go.transform, 0.34f, new Color(0.2f, 0.75f, 1f, 0.45f), GameAssets.OrderFx + 10);
            b.core = MakeLine("Core", go.transform, 0.1f, new Color(0.9f, 1f, 1f, 1f), GameAssets.OrderFx + 11);
            bolts.Add(b);
            return b;
        }

        public static void Play(Vector3 from, Vector3 to)
        {
            if (Instance == null) return;
            Bolt b = Instance.Get();
            b.a = from; b.b = to; b.life = Life; b.active = true;
            b.glow.gameObject.SetActive(true); b.core.gameObject.SetActive(true);
            Instance.Jag(b);
            FxPool.Burst(to, new Color(0.6f, 0.95f, 1f), 4, 4f, 0.25f, 0.45f);
        }

        void Jag(Bolt b)
        {
            Vector3 dir = b.b - b.a;
            Vector3 side = Vector3.Cross(dir, Vector3.up).normalized;
            if (side.sqrMagnitude < 0.01f) side = Vector3.right;
            int n = b.core.positionCount;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)(n - 1);
                Vector3 p = Vector3.Lerp(b.a, b.b, t);
                if (i != 0 && i != n - 1)
                    p += side * Random.Range(-0.3f, 0.3f) + Vector3.up * Random.Range(-0.2f, 0.2f);
                b.core.SetPosition(i, p);
                b.glow.SetPosition(i, p);
            }
        }

        void Update()
        {
            for (int i = 0; i < bolts.Count; i++)
            {
                Bolt b = bolts[i];
                if (!b.active) continue;
                float before = b.life;
                b.life -= Time.deltaTime;
                if (b.life <= 0f)
                {
                    b.active = false;
                    b.glow.gameObject.SetActive(false); b.core.gameObject.SetActive(false);
                    continue;
                }
                if (before > Life * 0.5f && b.life <= Life * 0.5f) Jag(b);   // scintillement
            }
        }
    }
}
