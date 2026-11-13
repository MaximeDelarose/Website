using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    public class Puff : MonoBehaviour
    {
        public Vector3 vel;
        public float life = 0.5f, startScale = 0.25f, gravity = 8f;
        float t;
        void Update()
        {
            t += Time.deltaTime;
            vel.y -= gravity * Time.deltaTime;
            transform.position += vel * Time.deltaTime;
            float k = 1f - t / life;
            if (k <= 0f) { Destroy(gameObject); return; }
            transform.localScale = Vector3.one * startScale * k;
        }
    }

    public class RingGrow : MonoBehaviour
    {
        public float maxRadius = 3f, life = 0.35f;
        float t;
        LineRenderer lr;
        void Awake() { lr = GetComponent<LineRenderer>(); }
        void Update()
        {
            t += Time.deltaTime;
            float k = t / life;
            if (k >= 1f) { Destroy(gameObject); return; }
            float r = Mathf.Lerp(0.3f, maxRadius, 1f - (1f - k) * (1f - k));
            transform.localScale = new Vector3(r, 1, r);
            var c = lr.startColor; c.a = 1f - k;
            lr.startColor = c; lr.endColor = c;
        }
    }

    public class Floater
    {
        public Vector3 pos; public string text; public Color color; public float t; public float life = 0.9f; public int size = 20;
    }

    public static class Fx
    {
        public static readonly List<Floater> Floaters = new List<Floater>();

        public static void Burst(Vector3 p, Color c, int n = 8, float size = 0.25f, float speed = 4f)
        {
            for (int i = 0; i < n; i++)
            {
                var g = Gfx.Prim(PrimitiveType.Sphere, Bootstrap.World, p, size, c, "puff");
                var pf = g.AddComponent<Puff>();
                pf.vel = Random.onUnitSphere * speed + Vector3.up * 2f;
                pf.startScale = size;
                pf.life = Random.Range(0.3f, 0.6f);
            }
        }

        public static void Ring(Vector3 p, float radius, Color c, float time = 0.35f)
        {
            var lr = Gfx.Circle(Bootstrap.World, 1f, c, 0.22f);
            lr.transform.position = new Vector3(p.x, 0.1f, p.z);
            var rg = lr.gameObject.AddComponent<RingGrow>();
            rg.maxRadius = radius; rg.life = time;
        }

        public static void Text(Vector3 p, string s, Color c, int size = 20)
        {
            if (Floaters.Count > 60) Floaters.RemoveAt(0);
            Floaters.Add(new Floater { pos = p + new Vector3(Random.Range(-0.3f, 0.3f), 0, 0), text = s, color = c, size = size });
        }

        public static void Tick(float dt)
        {
            for (int i = Floaters.Count - 1; i >= 0; i--)
            {
                Floaters[i].t += dt;
                if (Floaters[i].t >= Floaters[i].life) Floaters.RemoveAt(i);
            }
        }
    }

    /// <summary>Sons provisoires générés par code (bips doux).</summary>
    public static class Sfx
    {
        static AudioSource src;
        static readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        static readonly Dictionary<string, float> last = new Dictionary<string, float>();

        public static void Init(GameObject host)
        {
            src = host.AddComponent<AudioSource>();
            src.spatialBlend = 0f;
            clips.Clear(); last.Clear();
            clips["hit"] = Tone(500, 0.05f, 0.22f, -250);
            clips["pick"] = Tone(900, 0.1f, 0.3f, 500);
            clips["xp"] = Tone(600, 0.08f, 0.18f, 300);
            clips["shoot"] = Tone(300, 0.07f, 0.2f, 400);
            clips["build"] = Tone(300, 0.2f, 0.3f, 300);
            clips["upgrade"] = Tone(500, 0.3f, 0.3f, 600);
            clips["splash"] = Tone(220, 0.15f, 0.25f, -100);
            clips["core"] = Tone(110, 0.35f, 0.4f, -60);
            clips["level"] = Tone(660, 0.4f, 0.3f, 500);
            clips["e"] = Tone(180, 0.3f, 0.35f, 200);
            clips["q"] = Tone(700, 0.1f, 0.25f, -300);
            clips["w"] = Tone(400, 0.12f, 0.25f, 500);
            clips["error"] = Tone(160, 0.12f, 0.25f, -40);
        }

        static AudioClip Tone(float freq, float dur, float vol, float slide)
        {
            int rate = 22050;
            int n = Mathf.Max(1, (int)(rate * dur));
            var d = new float[n];
            float ph = 0f;
            for (int i = 0; i < n; i++)
            {
                float t = i / (float)n;
                ph += 2f * Mathf.PI * (freq + slide * t) / rate;
                d[i] = Mathf.Sin(ph) * vol * (1f - t) * (1f - t);
            }
            var c = AudioClip.Create("tone", n, 1, rate, false);
            c.SetData(d, 0);
            return c;
        }

        public static void Play(string key, float pitch = 1f)
        {
            AudioClip c;
            if (src == null || !clips.TryGetValue(key, out c)) return;
            float now = Time.unscaledTime, prev;
            if (last.TryGetValue(key, out prev) && now - prev < 0.04f) return;
            last[key] = now;
            src.pitch = pitch;
            src.PlayOneShot(c);
        }
    }
}
