using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    public class Enemy : MonoBehaviour
    {
        public static readonly List<Enemy> All = new List<Enemy>();

        public EnemyDef def;
        public float hp, maxHp, traveled;
        float slowMul = 1f, slowT, stunT, markT, lane, flash;
        Transform visual, bar, barFill, markIcon;
        float barWidth;

        public Vector3 Pos { get { return transform.position; } }
        public float Radius { get { return def.radius; } }
        public bool Marked { get { return markT > 0f; } }

        public static float Flat(Vector3 a, Vector3 b)
        {
            float dx = a.x - b.x, dz = a.z - b.z;
            return Mathf.Sqrt(dx * dx + dz * dz);
        }

        public static List<Enemy> InRange(Vector3 p, float r)
        {
            var list = new List<Enemy>();
            for (int i = 0; i < All.Count; i++)
                if (All[i] != null && All[i].hp > 0 && Flat(All[i].Pos, p) <= r + All[i].Radius) list.Add(All[i]);
            return list;
        }

        public static Enemy Spawn(EnemyDef d, float hpScale)
        {
            var g = new GameObject(d.name);
            g.transform.SetParent(Bootstrap.World, false);
            var e = g.AddComponent<Enemy>();
            e.def = d;
            e.maxHp = e.hp = d.hp * hpScale;
            e.lane = Random.Range(-0.8f, 0.8f) * (d.boss ? 0.2f : 1f);
            e.visual = EnemyView.Build(d, g.transform);

            var col = g.AddComponent<SphereCollider>();
            col.radius = d.radius;
            col.center = Vector3.up * d.radius * 0.8f;
            var rb = g.AddComponent<Rigidbody>();
            rb.isKinematic = true;

            // Barre de vie + icône de marque
            e.bar = new GameObject("bar").transform;
            e.bar.SetParent(g.transform, false);
            e.bar.localPosition = Vector3.up * (d.radius * 2.4f + 0.4f);
            e.barWidth = 1.2f * Mathf.Max(1f, d.scale * 0.8f);
            Gfx.Prim(PrimitiveType.Cube, e.bar, Vector3.zero, new Vector3(e.barWidth + 0.1f, 0.2f, 0.02f), Pal.Ink, "back");
            e.barFill = Gfx.Prim(PrimitiveType.Cube, e.bar, new Vector3(0, 0, -0.02f), new Vector3(e.barWidth, 0.12f, 0.02f), Pal.Pink, "fill").transform;
            e.bar.gameObject.SetActive(d.boss);
            e.markIcon = Gfx.Prim(PrimitiveType.Sphere, g.transform, Vector3.up * (d.radius * 2.8f + 0.9f), 0.35f, Pal.Violet, "mark").transform;
            e.markIcon.gameObject.SetActive(false);

            All.Add(e);
            e.Place();
            return e;
        }

        void Place()
        {
            Vector3 dir;
            Vector3 p = Map.PointAt(traveled, out dir);
            Vector3 perp = new Vector3(-dir.z, 0, dir.x);
            transform.position = p + perp * lane;
            transform.rotation = Quaternion.LookRotation(dir);
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (slowT > 0f) { slowT -= dt; if (slowT <= 0f) slowMul = 1f; }
            if (stunT > 0f) stunT -= dt;
            if (markT > 0f) markT -= dt;
            if (flash > 0f) flash = Mathf.Max(0f, flash - dt * 6f);

            float spd = stunT > 0f ? 0f : def.speed * slowMul;
            traveled += spd * dt;
            if (traveled >= Map.Length)
            {
                Game.I.DamageCore(def.coreDmg);
                Fx.Burst(Pos + Vector3.up, Pal.Coral, 10, 0.3f);
                All.Remove(this);
                Destroy(gameObject);
                return;
            }
            Place();

            float hover = def.shape == EnemyShape.Sparrow ? 0.4f : 0f;
            float bob = Mathf.Abs(Mathf.Sin(Time.time * (2f + def.speed * 2f) + lane * 7f)) * (def.boss ? 0.05f : 0.15f);
            visual.localPosition = Vector3.up * (hover + (stunT > 0f ? 0f : bob));
            visual.localScale = Vector3.one * def.scale * (1f + flash * 0.25f);

            markIcon.gameObject.SetActive(markT > 0f);
            if (markT > 0f) markIcon.localPosition = Vector3.up * (def.radius * 2.8f + 0.9f + Mathf.Sin(Time.time * 6f) * 0.1f);
            if (slowT > 0f || stunT > 0f) visual.localRotation = Quaternion.Euler(0, 0, Mathf.Sin(Time.time * 20f) * 3f);
            else visual.localRotation = Quaternion.identity;
        }

        void LateUpdate()
        {
            if (bar != null && bar.gameObject.activeSelf && Game.I != null && Game.I.rig != null)
                bar.rotation = Game.I.rig.cam.transform.rotation;
        }

        void OnDestroy() { All.Remove(this); }

        public void ApplySlow(float mul, float t)
        {
            if (mul <= slowMul || slowT <= 0f) { slowMul = mul; slowT = Mathf.Max(slowT, t); }
        }
        public void Stun(float t) { stunT = Mathf.Max(stunT, t); }
        public void Mark(float t) { markT = Mathf.Max(markT, t); }
        public void Push(float d) { traveled = Mathf.Max(0f, traveled - d); }

        public void Hit(float dmg, bool fromTower, bool pop = true)
        {
            if (hp <= 0f) return;
            if (fromTower && markT > 0f) dmg *= 1.25f;
            hp -= dmg;
            flash = 1f;
            if (pop)
            {
                Fx.Text(Pos + Vector3.up * (def.radius * 2.2f), Mathf.RoundToInt(dmg).ToString(), markT > 0f ? Pal.Violet : Color.white);
                Sfx.Play("hit", Random.Range(0.9f, 1.15f));
            }
            if (bar != null && hp > 0f)
            {
                bar.gameObject.SetActive(true);
                float f = Mathf.Clamp01(hp / maxHp);
                barFill.localScale = new Vector3(barWidth * f, 0.12f, 0.02f);
                barFill.localPosition = new Vector3(-(barWidth - barWidth * f) * 0.5f, 0, -0.02f);
            }
            if (hp <= 0f) Die();
        }

        void Die()
        {
            All.Remove(this);
            Fx.Burst(Pos + Vector3.up * 0.6f, Pal.Coral, def.boss ? 24 : 8, def.boss ? 0.5f : 0.25f, def.boss ? 7f : 4f);
            Pickup.Drop(Pos, def.croquettes, def.xp, def.boss);
            if (def.boss)
            {
                Game.I.rig.Shake(0.5f);
                Game.I.Banner(def.name + " vaincu !", 3f);
            }
            Destroy(gameObject);
        }
    }

    public static class EnemyView
    {
        public static Transform Build(EnemyDef d, Transform parent)
        {
            var v = new GameObject("visual").transform;
            v.SetParent(parent, false);
            Color body = Pal.Coral;
            switch (d.shape)
            {
                case EnemyShape.Mouse:
                case EnemyShape.RatChef:
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 0.5f, 0), new Vector3(0.95f, 0.85f, 1.1f), body, "body");
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 0.45f, 0.55f), new Vector3(0.6f, 0.55f, 0.55f), body, "snout");
                    for (int s = -1; s <= 1; s += 2)
                    {
                        Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(s * 0.42f, 1.0f, -0.1f), new Vector3(0.5f, 0.5f, 0.14f), body, "ear");
                        Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(s * 0.42f, 1.0f, -0.03f), new Vector3(0.32f, 0.32f, 0.1f), Pal.PinkSoft, "earIn");
                        Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(s * 0.22f, 0.7f, 0.45f), 0.17f, Pal.Ink, "eye");
                        Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(s * 0.2f, 0.74f, 0.55f), 0.05f, Color.white, "shine");
                        var brow = Gfx.Prim(PrimitiveType.Cube, v, new Vector3(s * 0.22f, 0.9f, 0.45f), new Vector3(0.28f, 0.06f, 0.06f), Pal.Ink, "brow");
                        brow.transform.localRotation = Quaternion.Euler(0, 0, s * -22);
                    }
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 0.5f, 0.82f), 0.14f, Pal.Pink, "nose");
                    var tail = Gfx.Prim(PrimitiveType.Cylinder, v, new Vector3(0, 0.3f, -0.7f), new Vector3(0.07f, 0.4f, 0.07f), Pal.PinkSoft, "tail");
                    tail.transform.localRotation = Quaternion.Euler(70, 0, 0);
                    if (d.shape == EnemyShape.RatChef)
                    {
                        Gfx.Prim(PrimitiveType.Cylinder, v, new Vector3(0, 1.3f, 0), new Vector3(0.65f, 0.25f, 0.65f), Pal.Milk, "hat");
                        Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 1.75f, 0), new Vector3(0.9f, 0.6f, 0.9f), Pal.Milk, "puff");
                        Gfx.Prim(PrimitiveType.Cylinder, v, new Vector3(0, 1.08f, 0), new Vector3(0.68f, 0.04f, 0.68f), Pal.Gold, "band");
                    }
                    break;

                case EnemyShape.Sparrow:
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 0.8f, 0), new Vector3(0.8f, 0.7f, 1.0f), body, "body");
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 1.1f, 0.4f), 0.55f, body, "head");
                    var beak = Gfx.Prim(PrimitiveType.Cube, v, new Vector3(0, 1.05f, 0.8f), new Vector3(0.14f, 0.14f, 0.34f), Pal.Gold, "beak");
                    for (int s = -1; s <= 1; s += 2)
                    {
                        var wing = Gfx.Prim(PrimitiveType.Cube, v, new Vector3(s * 0.65f, 0.95f, -0.05f), new Vector3(0.7f, 0.08f, 0.45f), Pal.Coral * 0.85f, "wing");
                        wing.transform.localRotation = Quaternion.Euler(0, 0, s * 25);
                        Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(s * 0.2f, 1.18f, 0.7f), 0.1f, Pal.Ink, "eye");
                        var brow = Gfx.Prim(PrimitiveType.Cube, v, new Vector3(s * 0.2f, 1.3f, 0.68f), new Vector3(0.2f, 0.05f, 0.05f), Pal.Ink, "brow");
                        brow.transform.localRotation = Quaternion.Euler(0, 0, s * -22);
                    }
                    break;

                case EnemyShape.Turtle:
                    Color shell = Color.Lerp(Pal.Coral, Pal.Ink, 0.25f);
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 0.55f, 0), new Vector3(1.5f, 0.9f, 1.6f), shell, "shell");
                    for (int i = 0; i < 3; i++)
                        Gfx.Prim(PrimitiveType.Sphere, v, new Vector3((i - 1) * 0.45f, 1.0f, (i == 1 ? 0.1f : -0.1f)), 0.3f, Pal.Pink, "spot");
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 0.55f, 0.95f), 0.5f, body, "head");
                    for (int s = -1; s <= 1; s += 2)
                    {
                        Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(s * 0.2f, 0.65f, 1.28f), 0.09f, Pal.Ink, "eye");
                        Gfx.Prim(PrimitiveType.Cube, v, new Vector3(s * 0.55f, 0.12f, 0.5f), new Vector3(0.3f, 0.24f, 0.3f), body, "foot");
                        Gfx.Prim(PrimitiveType.Cube, v, new Vector3(s * 0.55f, 0.12f, -0.5f), new Vector3(0.3f, 0.24f, 0.3f), body, "foot");
                    }
                    break;

                case EnemyShape.Vacuum:
                    Gfx.Prim(PrimitiveType.Cylinder, v, new Vector3(0, 0.45f, 0), new Vector3(1.9f, 0.4f, 1.9f), Pal.Ink, "base");
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 0.85f, 0), new Vector3(1.9f, 1.0f, 1.9f), body, "dome");
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 1.0f, 0.75f), new Vector3(0.7f, 0.7f, 0.3f), Color.white, "eyeWhite");
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 1.0f, 0.9f), 0.3f, Pal.Ink, "eye");
                    var brow2 = Gfx.Prim(PrimitiveType.Cube, v, new Vector3(0, 1.42f, 0.8f), new Vector3(1.0f, 0.1f, 0.1f), Pal.Ink, "brow");
                    brow2.transform.localRotation = Quaternion.Euler(0, 0, 8);
                    var brush = Gfx.Prim(PrimitiveType.Cube, v, new Vector3(0, 0.12f, 0.95f), new Vector3(1.8f, 0.1f, 0.2f), Pal.Gold, "brush");
                    brush.AddComponent<Spin>().axis = Vector3.up;
                    Gfx.Prim(PrimitiveType.Sphere, v, new Vector3(0, 1.5f, -0.2f), 0.25f, Pal.Gold, "button");
                    break;
            }
            return v;
        }
    }
}
