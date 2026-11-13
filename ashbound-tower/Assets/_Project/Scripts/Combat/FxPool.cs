using System.Collections.Generic;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Petites particules-sprites (étincelles, débris, poussière) recyclées : aucun objet créé en cours de partie une fois la réserve remplie.</summary>
    public class FxPool : MonoBehaviour
    {
        class P
        {
            public SpriteRenderer sr; public Vector3 vel; public float life, maxLife, size; public Color color; public bool active;
        }

        public static FxPool Instance { get; private set; }
        const int Max = 400;
        readonly List<P> pool = new List<P>();
        int cursor;
        Transform cam;

        void Awake() { Instance = this; }
        void OnDestroy() { if (Instance == this) Instance = null; }

        P Acquire()
        {
            if (pool.Count < Max)
            {
                GameObject go = new GameObject("fx");
                go.transform.SetParent(transform, false);
                SpriteRenderer sr = go.AddComponent<SpriteRenderer>();
                sr.sprite = GameAssets.Spark;
                sr.sortingOrder = GameAssets.OrderFx;
                P np = new P { sr = sr };
                pool.Add(np);
                return np;
            }
            P p = pool[cursor];
            cursor = (cursor + 1) % pool.Count;
            return p;
        }

        public static void Burst(Vector3 pos, Color color, int count, float speed, float life, float size)
        {
            if (Instance == null) return;
            for (int i = 0; i < count; i++)
            {
                P p = Instance.Acquire();
                p.active = true;
                p.life = p.maxLife = life * Random.Range(0.6f, 1.2f);
                p.size = size * Random.Range(0.6f, 1.2f);
                p.color = Color.Lerp(color, Color.white, Random.Range(0f, 0.5f));
                Vector3 dir = Random.onUnitSphere; dir.y = Mathf.Abs(dir.y) * 0.8f + 0.2f;
                p.vel = dir * speed * Random.Range(0.4f, 1f);
                p.sr.transform.position = pos;
                p.sr.gameObject.SetActive(true);
            }
        }

        void Update()
        {
            if (cam == null) { Camera c = Camera.main; if (c != null) cam = c.transform; }
            float dt = Time.deltaTime;
            for (int i = 0; i < pool.Count; i++)
            {
                P p = pool[i];
                if (!p.active) continue;
                p.life -= dt;
                if (p.life <= 0f) { p.active = false; p.sr.gameObject.SetActive(false); continue; }
                p.vel.y -= 9f * dt;
                Transform t = p.sr.transform;
                t.position += p.vel * dt;
                if (cam != null) t.rotation = cam.rotation;
                float k = p.life / p.maxLife;
                t.localScale = Vector3.one * p.size * (0.4f + k * 0.8f);
                Color c = p.color; c.a = Mathf.Clamp01(k * 1.6f);
                p.sr.color = c;
            }
        }
    }
}
