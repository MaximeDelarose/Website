using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    public class Tower : MonoBehaviour
    {
        public static readonly List<Tower> All = new List<Tower>();

        public TowerDef def;
        public TowerStats stats;
        public Pad pad;
        public int[] tiers = new int[2];
        public int invested;
        float boostT, cd, focusT;
        Enemy focus;
        Transform head, muzzle, pips;
        LineRenderer[] beams;
        LineRenderer rangeRing;

        public static Tower Create(TowerDef d, Pad p)
        {
            var g = new GameObject(d.name);
            g.transform.SetParent(Bootstrap.World, false);
            g.transform.position = p.Pos;
            var t = g.AddComponent<Tower>();
            t.def = d; t.stats = d.stats.Clone(); t.pad = p; t.invested = d.cost;
            p.tower = t;
            t.BuildBody();
            All.Add(t);
            Fx.Burst(p.Pos + Vector3.up * 0.5f, d.color, 12, 0.3f, 4f);
            Fx.Ring(p.Pos, 2.2f, d.color);
            Sfx.Play("build");
            return t;
        }

        void OnDestroy() { All.Remove(this); }

        public int SellValue { get { return Mathf.RoundToInt(invested * 0.7f); } }
        public UpgradeStep NextStep(int path) { return tiers[path] < 5 ? def.paths[path][tiers[path]] : null; }
        public void Boost(float t) { boostT = Mathf.Max(boostT, t); }

        public bool CanUpgrade(int path, out string why)
        {
            why = "";
            if (tiers[path] >= 5) { why = "Maximum atteint"; return false; }
            int other = tiers[1 - path];
            if (tiers[path] + 1 > 2 && other > 2) { why = "Verrouillé : l'autre branche est trop avancée"; return false; }
            return true;
        }

        public bool TryUpgrade(int path)
        {
            string why;
            if (!CanUpgrade(path, out why)) { Game.I.Banner(why, 2f); Sfx.Play("error"); return false; }
            var step = NextStep(path);
            if (Game.I.croquettes < step.cost) { Game.I.Banner("Pas assez de croquettes", 1.5f); Sfx.Play("error"); return false; }
            Game.I.croquettes -= step.cost;
            invested += step.cost;
            step.apply(stats);
            tiers[path]++;
            RefreshPips();
            Fx.Burst(transform.position + Vector3.up * 1.5f, path == 0 ? Pal.Pink : Pal.MintDark, 14, 0.25f, 5f);
            Fx.Ring(transform.position, 2.5f, Pal.Gold);
            Sfx.Play("upgrade", 1f + 0.1f * (tiers[0] + tiers[1]));
            if (tiers[path] == 5) Game.I.Banner("Amélioration ultime : " + step.name + " !", 3f);
            if (rangeRing != null) rangeRing.transform.localScale = new Vector3(stats.range, 1, stats.range);
            return true;
        }

        public void Sell()
        {
            Game.I.croquettes += SellValue;
            Fx.Text(transform.position + Vector3.up * 2f, "+" + SellValue, Pal.Gold);
            Fx.Burst(transform.position + Vector3.up, def.color, 10);
            if (pad != null) pad.tower = null;
            Destroy(gameObject);
        }

        public void ShowRange(bool on)
        {
            if (rangeRing == null)
            {
                rangeRing = Gfx.Circle(transform, 1f, def.color, 0.18f, 0.15f, 64);
            }
            rangeRing.gameObject.SetActive(on);
            rangeRing.transform.localScale = new Vector3(stats.range, 1, stats.range);
        }

        // ---------- Visuel ----------
        void BuildBody()
        {
            var c = def.color;
            Gfx.Prim(PrimitiveType.Cylinder, transform, new Vector3(0, 0.15f, 0), new Vector3(1.8f, 0.15f, 1.8f), Pal.Ink, "plinth");
            head = new GameObject("head").transform;
            head.SetParent(transform, false);
            switch (def.kind)
            {
                case TowerKind.Cannon:
                    Gfx.Prim(PrimitiveType.Sphere, transform, new Vector3(0, 0.9f, 0), new Vector3(1.4f, 1.3f, 1.4f), c, "body");
                    head.localPosition = new Vector3(0, 1.0f, 0);
                    var barrel = Gfx.Prim(PrimitiveType.Cylinder, head, new Vector3(0, 0, 0.6f), new Vector3(0.4f, 0.4f, 0.4f), Pal.Ink, "barrel");
                    barrel.transform.localRotation = Quaternion.Euler(90, 0, 0);
                    muzzle = new GameObject("muzzle").transform; muzzle.SetParent(head, false); muzzle.localPosition = new Vector3(0, 0, 1.1f);
                    Gfx.Ears(transform, new Vector3(0, 1.75f, 0), 0.28f, c, Pal.PinkSoft);
                    break;
                case TowerKind.Fountain:
                    Gfx.Prim(PrimitiveType.Cylinder, transform, new Vector3(0, 0.45f, 0), new Vector3(1.9f, 0.3f, 1.9f), c, "bowl");
                    Gfx.Prim(PrimitiveType.Sphere, transform, new Vector3(0, 0.7f, 0), new Vector3(1.6f, 0.5f, 1.6f), Pal.Milk, "milk");
                    Gfx.Prim(PrimitiveType.Cylinder, transform, new Vector3(0, 1.2f, 0), new Vector3(0.35f, 0.45f, 0.35f), c, "spout");
                    Gfx.Prim(PrimitiveType.Sphere, transform, new Vector3(0, 1.8f, 0), 0.45f, Pal.Milk, "drop");
                    Gfx.Ears(transform, new Vector3(0, 1.45f, -0.5f), 0.22f, c, Pal.PinkSoft);
                    break;
                case TowerKind.Laser:
                    Gfx.Prim(PrimitiveType.Cylinder, transform, new Vector3(0, 0.9f, 0), new Vector3(0.45f, 0.75f, 0.45f), c, "pole");
                    head.localPosition = new Vector3(0, 2.0f, 0);
                    Gfx.Prim(PrimitiveType.Sphere, head, Vector3.zero, 1.3f, c, "headBall");
                    Gfx.Prim(PrimitiveType.Sphere, head, new Vector3(0, 0, 0.55f), 0.42f, Pal.Coral, "eye");
                    Gfx.Prim(PrimitiveType.Sphere, head, new Vector3(0.1f, 0.1f, 0.78f), 0.1f, Color.white, "shine");
                    Gfx.Ears(head, new Vector3(0, 0.75f, 0), 0.26f, c, Pal.PinkSoft);
                    muzzle = new GameObject("muzzle").transform; muzzle.SetParent(head, false); muzzle.localPosition = new Vector3(0, 0, 0.7f);
                    beams = new LineRenderer[4];
                    for (int i = 0; i < beams.Length; i++)
                    {
                        var go = new GameObject("beam");
                        go.transform.SetParent(transform, false);
                        var lr = go.AddComponent<LineRenderer>();
                        lr.positionCount = 2; lr.widthMultiplier = 0.18f; lr.useWorldSpace = true;
                        lr.material = Gfx.LineMat(Pal.Coral); lr.startColor = Pal.Coral; lr.endColor = Pal.Pink;
                        lr.enabled = false;
                        beams[i] = lr;
                    }
                    break;
            }
            pips = new GameObject("pips").transform;
            pips.SetParent(transform, false);
        }

        void RefreshPips()
        {
            foreach (Transform ch in pips) Destroy(ch.gameObject);
            for (int path = 0; path < 2; path++)
                for (int i = 0; i < tiers[path]; i++)
                {
                    float a = (path == 0 ? 200f : -20f) + i * 28f;
                    var pos = new Vector3(Mathf.Cos(a * Mathf.Deg2Rad), 0.4f, Mathf.Sin(a * Mathf.Deg2Rad)) * 1.05f;
                    bool ultimate = i == 4;
                    Gfx.Prim(PrimitiveType.Sphere, pips, pos, ultimate ? 0.34f : 0.2f, ultimate ? Pal.Gold : (path == 0 ? Pal.Pink : Pal.MintDark), "pip");
                }
            if (tiers[0] == 5 || tiers[1] == 5)
            {
                var crown = Gfx.Prim(PrimitiveType.Cube, pips, new Vector3(0, 2.7f, 0), 0.4f, Pal.Gold, "crown");
                crown.AddComponent<Spin>().axis = new Vector3(0.3f, 1, 0.2f);
            }
        }

        // ---------- Comportement ----------
        Enemy Pick(float range)
        {
            Enemy best = null;
            Vector3 p = transform.position;
            for (int i = 0; i < Enemy.All.Count; i++)
            {
                var e = Enemy.All[i];
                if (e == null || e.hp <= 0f) continue;
                if (Enemy.Flat(e.Pos, p) > range + e.Radius) continue;
                if (best == null || e.traveled > best.traveled) best = e;
            }
            return best;
        }

        void Aim(Vector3 at)
        {
            Vector3 d = at - transform.position; d.y = 0;
            if (d.sqrMagnitude < 0.01f) return;
            head.rotation = Quaternion.Slerp(head.rotation, Quaternion.LookRotation(d), 1f - Mathf.Exp(-14f * Time.deltaTime));
        }

        void Update()
        {
            float dt = Time.deltaTime;
            float boost = 1f;
            if (boostT > 0f) { boostT -= dt; boost = 1.35f; }
            switch (def.kind)
            {
                case TowerKind.Cannon: UpdateCannon(dt * boost); break;
                case TowerKind.Fountain: UpdateFountain(dt * boost); break;
                case TowerKind.Laser: UpdateLaser(dt, boost); break;
            }
        }

        void UpdateCannon(float dt)
        {
            cd -= dt;
            var t = Pick(stats.range);
            if (t == null) return;
            Aim(t.Pos);
            if (cd > 0f) return;
            cd = stats.cooldown;
            var p = Projectile.Create(muzzle.position, def.color, 0.4f);
            p.fromTower = true; p.damage = stats.damage; p.splash = stats.splash; p.speed = stats.projSpeed;
            if (stats.pierce)
            {
                Vector3 d = t.Pos + Vector3.up * 0.5f - muzzle.position;
                p.dir = d.normalized; p.pierce = true; p.life = (stats.range + 2f) / p.speed;
            }
            else { p.target = t; p.life = 3f; }
            Fx.Burst(muzzle.position, def.color, 3, 0.15f, 2f);
            Sfx.Play("shoot", Random.Range(0.9f, 1.1f));
        }

        void UpdateFountain(float dt)
        {
            cd -= dt;
            if (cd > 0f) return;
            var list = Enemy.InRange(transform.position, stats.range);
            if (list.Count == 0) return;
            cd = stats.cooldown;
            foreach (var e in list)
            {
                e.Hit(stats.damage, true);
                e.ApplySlow(stats.slowMul, stats.slowTime);
                if (stats.freeze) e.Stun(1f);
            }
            Fx.Ring(transform.position, stats.range, def.color, 0.5f);
            Sfx.Play("splash");
        }

        void UpdateLaser(float dt, float boost)
        {
            var targets = new List<Enemy>();
            Vector3 p = transform.position;
            for (int i = 0; i < Enemy.All.Count; i++)
            {
                var e = Enemy.All[i];
                if (e != null && e.hp > 0f && Enemy.Flat(e.Pos, p) <= stats.range + e.Radius) targets.Add(e);
            }
            targets.Sort((a, b) => b.traveled.CompareTo(a.traveled));
            var primary = targets.Count > 0 ? targets[0] : null;
            if (primary != focus) { focus = primary; focusT = 0f; }
            else if (focus != null) focusT += dt;
            if (primary != null) Aim(primary.Pos);

            float rampMul = 1f + stats.ramp * Mathf.Min(focusT, 5f);
            for (int i = 0; i < beams.Length; i++)
            {
                bool on = i < stats.beams && i < targets.Count;
                beams[i].enabled = on;
                if (!on) continue;
                var e = targets[i];
                beams[i].SetPosition(0, muzzle.position);
                beams[i].SetPosition(1, e.Pos + Vector3.up * 0.6f);
                e.Hit(stats.dps * rampMul * boost * dt, true, false);
            }
        }
    }
}
