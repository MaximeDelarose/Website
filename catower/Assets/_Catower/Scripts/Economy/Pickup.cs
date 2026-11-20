using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    public enum PickupKind { Croquette, Xp }

    /// <summary>Croquettes (or, poisson, à ramasser) et orbes d'XP (violet, automatiques).</summary>
    public class Pickup : MonoBehaviour
    {
        public static readonly List<Pickup> All = new List<Pickup>();
        static float lastPick; static int combo;

        public PickupKind kind;
        public int value;
        float life = 12f, t, groundY = 0.3f, phase;
        Vector3 vel;
        bool onGround;
        Renderer[] rends;
        float scaleMul = 1f;

        public static void Drop(Vector3 pos, int croquettes, int xp, bool big)
        {
            int c = croquettes;
            if (big && c > 0)
            {
                int bigV = Mathf.RoundToInt(c * 0.6f);
                Make(PickupKind.Croquette, bigV, pos, 1.8f);
                c -= bigV;
            }
            if (c > 0)
            {
                int n = Mathf.Clamp(Mathf.CeilToInt(c / 5f), 1, big ? 5 : 4);
                for (int i = 0; i < n; i++)
                {
                    int v = i == n - 1 ? c - (c / n) * (n - 1) : c / n;
                    Make(PickupKind.Croquette, v, pos, 1f);
                }
            }
            if (xp > 0)
            {
                int n = xp >= 30 ? 5 : 1;
                for (int i = 0; i < n; i++)
                    Make(PickupKind.Xp, i == n - 1 ? xp - (xp / n) * (n - 1) : xp / n, pos, 1f);
            }
        }

        static void Make(PickupKind kind, int value, Vector3 pos, float scale)
        {
            var g = new GameObject(kind == PickupKind.Croquette ? "Croquette" : "XP");
            g.transform.SetParent(Bootstrap.World, false);
            g.transform.position = pos + Vector3.up * 0.6f;
            var p = g.AddComponent<Pickup>();
            p.kind = kind; p.value = value; p.scaleMul = scale;
            p.phase = Random.value * 6f;
            Vector2 r = Random.insideUnitCircle.normalized * Random.Range(2f, 4f);
            p.vel = new Vector3(r.x, Random.Range(4f, 6f), r.y);
            if (kind == PickupKind.Croquette)
            {
                // Petit poisson doré
                Gfx.Prim(PrimitiveType.Sphere, g.transform, Vector3.zero, new Vector3(0.7f, 0.4f, 0.45f), Pal.Gold, "body");
                var tail = Gfx.Prim(PrimitiveType.Cube, g.transform, new Vector3(-0.42f, 0, 0), new Vector3(0.3f, 0.3f, 0.08f), Pal.Gold, "tail");
                tail.transform.localRotation = Quaternion.Euler(0, 0, 45);
                Gfx.Prim(PrimitiveType.Sphere, g.transform, new Vector3(0.2f, 0.1f, 0.2f), 0.09f, Pal.Ink, "eye");
                g.transform.localScale = Vector3.one * scale;
                p.groundY = 0.35f * scale;
            }
            else
            {
                Gfx.Prim(PrimitiveType.Cube, g.transform, Vector3.zero, new Vector3(0.4f, 0.4f, 0.12f), Pal.Violet, "starA");
                var b = Gfx.Prim(PrimitiveType.Cube, g.transform, Vector3.zero, new Vector3(0.4f, 0.4f, 0.12f), Pal.Violet, "starB");
                b.transform.localRotation = Quaternion.Euler(0, 0, 45);
                p.groundY = 0.5f;
            }
            p.rends = g.GetComponentsInChildren<Renderer>();
            All.Add(p);
        }

        void OnDestroy() { All.Remove(this); }

        void SetVisible(bool v) { for (int i = 0; i < rends.Length; i++) rends[i].enabled = v; }

        void Update()
        {
            float dt = Time.deltaTime;
            t += dt;
            var hero = Game.I.hero;
            if (hero == null) return;
            Vector3 pos = transform.position;

            if (!onGround)
            {
                vel.y -= 18f * dt;
                pos += vel * dt;
                pos.x = Mathf.Clamp(pos.x, -Map.Half.x + 1, Map.Half.x - 1);
                pos.z = Mathf.Clamp(pos.z, -Map.Half.y + 1, Map.Half.y - 1);
                if (pos.y <= groundY && vel.y < 0f) { pos.y = groundY; onGround = true; }
                transform.position = pos;
                return;
            }

            Vector3 hp = hero.transform.position;
            float d = Enemy.Flat(pos, hp);

            if (kind == PickupKind.Xp)
            {
                // L'XP est automatique : elle vole vers le héros
                if (t > 0.5f)
                {
                    Vector3 target = hp + Vector3.up * 0.8f;
                    float sp = 8f + (t - 0.5f) * 14f;
                    transform.position = Vector3.MoveTowards(pos, target, sp * dt);
                    if (Vector3.Distance(transform.position, target) < 0.4f) { Game.I.AddXp(value); Sfx.Play("xp", 1.2f); Destroy(gameObject); }
                }
                else transform.position = new Vector3(pos.x, groundY + Mathf.Sin(t * 8f) * 0.1f, pos.z);
                transform.Rotate(0, 0, 200f * dt, Space.Self);
                return;
            }

            // Croquette : à ramasser, aimant très court, disparaît au bout de 12 s
            life -= dt;
            if (life <= 0f) { Fx.Burst(pos, Pal.Gold, 4, 0.15f); Destroy(gameObject); return; }
            if (life < 3f) SetVisible(Mathf.Sin(t * 28f) > -0.2f);

            float magnet = 2.6f * scaleMul, collect = 1.0f * scaleMul + 0.3f;
            if (d < magnet) pos = Vector3.MoveTowards(pos, new Vector3(hp.x, groundY, hp.z), 10f * dt);
            else pos.y = groundY + 0.08f * Mathf.Sin(t * 4f + phase);
            transform.position = pos;
            transform.Rotate(0, 90f * dt, 0, Space.World);

            if (d < collect)
            {
                Game.I.croquettes += value;
                combo = (Time.time - lastPick < 0.6f) ? Mathf.Min(combo + 1, 8) : 0;
                lastPick = Time.time;
                Fx.Text(pos + Vector3.up, "+" + value, Pal.Gold, value >= 20 ? 26 : 20);
                Fx.Burst(pos, Pal.Gold, 5, 0.15f, 3f);
                Sfx.Play("pick", 1f + combo * 0.06f);
                Destroy(gameObject);
            }
        }
    }
}
