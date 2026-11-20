using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    // ---- Définitions de données (à migrer vers des ScriptableObjects quand le contenu grossit) ----

    public enum EnemyShape { Mouse, Sparrow, Turtle, RatChef, Vacuum }
    public enum TowerKind { Cannon, Fountain, Laser }

    public class EnemyDef
    {
        public string id, name;
        public EnemyShape shape;
        public float hp, speed, scale = 1f, radius = 0.55f;
        public int coreDmg = 1, croquettes, xp;
        public bool boss;
    }

    public class TowerStats
    {
        public float damage, range, cooldown, splash, slowMul = 1f, slowTime, dps, ramp, projSpeed = 16f;
        public int beams = 1;
        public bool pierce, freeze;
        public TowerStats Clone() { return (TowerStats)MemberwiseClone(); }
    }

    public class UpgradeStep
    {
        public string name, desc;
        public int cost;
        public System.Action<TowerStats> apply;
        public UpgradeStep(string n, string d, int c, System.Action<TowerStats> a) { name = n; desc = d; cost = c; apply = a; }
    }

    public class TowerDef
    {
        public string id, name, role;
        public TowerKind kind;
        public int cost;
        public Color color;
        public TowerStats stats;
        public string[] pathNames;
        public UpgradeStep[][] paths; // 2 branches x 5 paliers
    }

    public class AbilityDef
    {
        public string name, desc;
        public KeyCode key;
        public float cooldown;
        public int unlockLevel;
        public System.Action<HeroController> cast;
    }

    public class HeroDef
    {
        public string id, name;
        public Color fur, furLight;
        public float moveSpeed = 6.5f, attackRange = 2.3f, attackCooldown = 0.55f, attackDamage = 14f;
        public AbilityDef[] abilities;
    }

    public static class Database
    {
        public static readonly Dictionary<string, EnemyDef> Enemies = new Dictionary<string, EnemyDef>();
        public static readonly TowerDef[] Towers;
        public static readonly HeroDef Mochi;

        static void E(string id, string name, EnemyShape shape, float hp, float speed, float scale, float radius, int core, int croq, int xp, bool boss = false)
        {
            Enemies[id] = new EnemyDef { id = id, name = name, shape = shape, hp = hp, speed = speed, scale = scale, radius = radius, coreDmg = core, croquettes = croq, xp = xp, boss = boss };
        }

        static UpgradeStep S(string n, string d, int c, System.Action<TowerStats> a) { return new UpgradeStep(n, d, c, a); }

        static Database()
        {
            //  id        nom                forme                 PV     vit   éch   rayon coeur croq xp
            E("mouse", "Souris", EnemyShape.Mouse, 30, 2.6f, 1.0f, 0.55f, 1, 5, 2);
            E("sparrow", "Moineau", EnemyShape.Sparrow, 18, 4.6f, 0.9f, 0.5f, 1, 4, 2);
            E("turtle", "Tortue", EnemyShape.Turtle, 140, 1.5f, 1.2f, 0.8f, 2, 12, 4);
            E("ratchef", "Gros Rat Chef", EnemyShape.RatChef, 900, 1.6f, 1.7f, 1.1f, 5, 80, 40, true);
            E("vacuum", "Robot-aspirateur", EnemyShape.Vacuum, 3200, 1.3f, 2.3f, 1.7f, 12, 200, 100, true);

            Towers = new[]
            {
                new TowerDef
                {
                    id = "cannon", name = "Canon à pelotes", role = "Mono-cible", kind = TowerKind.Cannon, cost = 60, color = Pal.Pink,
                    stats = new TowerStats { damage = 12, range = 8, cooldown = 0.7f, projSpeed = 16 },
                    pathNames = new[] { "Rafale", "Lourd" },
                    paths = new[]
                    {
                        new[]
                        {
                            S("Tir rapide", "Cadence +25 %", 40, s => s.cooldown *= 0.8f),
                            S("Ressorts", "Cadence +25 %", 70, s => s.cooldown *= 0.8f),
                            S("Mitrailleuse", "Cadence +40 %, portée +1", 140, s => { s.cooldown *= 0.7f; s.range += 1; }),
                            S("Turbo-pelote", "Cadence +40 %, dégâts +30 %", 260, s => { s.cooldown *= 0.7f; s.damage *= 1.3f; }),
                            S("Pelote perforante", "Traverse tous les ennemis", 700, s => { s.pierce = true; s.damage *= 1.5f; s.range += 2; }),
                        },
                        new[]
                        {
                            S("Pelote lourde", "Dégâts +60 %", 50, s => s.damage *= 1.6f),
                            S("Impact", "Dégâts de zone", 90, s => s.splash = 2f),
                            S("Gros calibre", "Dégâts +60 %, zone plus large", 170, s => { s.damage *= 1.6f; s.splash += 0.8f; }),
                            S("Boule de bowling", "Dégâts +60 %, zone plus large", 320, s => { s.damage *= 1.6f; s.splash += 0.8f; }),
                            S("Boulet géant", "Dégâts x2.5, énorme zone", 800, s => { s.damage *= 2.5f; s.splash += 1.5f; s.cooldown *= 1.3f; }),
                        },
                    },
                },
                new TowerDef
                {
                    id = "fountain", name = "Fontaine à lait", role = "Zone, ralentit", kind = TowerKind.Fountain, cost = 110, color = Pal.Water,
                    stats = new TowerStats { damage = 4, range = 6, cooldown = 1.4f, slowMul = 0.6f, slowTime = 1.5f },
                    pathNames = new[] { "Gel", "Jet" },
                    paths = new[]
                    {
                        new[]
                        {
                            S("Lait glacé", "Ralentit 50 %", 60, s => s.slowMul = 0.5f),
                            S("Grande flaque", "Portée +1.5", 100, s => s.range += 1.5f),
                            S("Crème collante", "Ralentit 65 %, plus longtemps", 190, s => { s.slowMul = 0.35f; s.slowTime = 2.5f; }),
                            S("Banquise", "Ralentit 75 %, portée +1.5", 340, s => { s.slowMul = 0.25f; s.range += 1.5f; }),
                            S("Lac de lait gelé", "Fige les ennemis 1 s", 750, s => { s.freeze = true; s.cooldown *= 0.8f; }),
                        },
                        new[]
                        {
                            S("Pression", "Dégâts x2.5", 70, s => s.damage *= 2.5f),
                            S("Jet rapide", "Cadence +40 %", 110, s => s.cooldown *= 0.7f),
                            S("Geyser", "Dégâts x2.5", 200, s => s.damage *= 2.5f),
                            S("Tsunami", "Dégâts x2, cadence +25 %", 360, s => { s.damage *= 2f; s.cooldown *= 0.8f; }),
                            S("Raz-de-marée", "Dégâts x3, portée +2", 800, s => { s.damage *= 3f; s.range += 2f; }),
                        },
                    },
                },
                new TowerDef
                {
                    id = "laser", name = "Pointeur laser", role = "Rayon, longue portée", kind = TowerKind.Laser, cost = 200, color = Pal.Lilac,
                    stats = new TowerStats { dps = 14, range = 11, beams = 1 },
                    pathNames = new[] { "Faisceaux", "Chauffe" },
                    paths = new[]
                    {
                        new[]
                        {
                            S("Lentille", "Dégâts +30 %, portée +1.5", 100, s => { s.dps *= 1.3f; s.range += 1.5f; }),
                            S("Double lentille", "Dégâts +40 %", 160, s => s.dps *= 1.4f),
                            S("Prisme", "2 faisceaux", 300, s => s.beams = 2),
                            S("Prisme rubis", "Dégâts +50 %", 520, s => s.dps *= 1.5f),
                            S("Triple faisceau", "3 faisceaux, dégâts +40 %", 1100, s => { s.beams = 3; s.dps *= 1.4f; }),
                        },
                        new[]
                        {
                            S("Surchauffe", "Dégâts qui montent sur une même cible", 110, s => s.ramp = 0.4f),
                            S("Cristal chaud", "Dégâts +50 %", 170, s => s.dps *= 1.5f),
                            S("Fournaise", "Montée en chaleur plus forte", 320, s => s.ramp = 0.9f),
                            S("Soleil", "Dégâts +60 %", 540, s => s.dps *= 1.6f),
                            S("Rayon du soleil", "Chaleur extrême, portée +2", 1100, s => { s.ramp = 1.8f; s.dps *= 1.5f; s.range += 2f; }),
                        },
                    },
                },
            };

            Mochi = new HeroDef
            {
                id = "mochi", name = "Mochi", fur = Pal.Fur, furLight = Pal.FurLight,
                abilities = new[]
                {
                    new AbilityDef
                    {
                        name = "Pelote filée", desc = "Traverse les ennemis, les ralentit et les marque (+25 % des tourelles).",
                        key = KeyCode.Q, cooldown = 4f, unlockLevel = 1,
                        cast = h =>
                        {
                            int lv = Game.I.level;
                            var p = Projectile.Create(h.transform.position + Vector3.up * 0.9f, Pal.Pink, 0.5f);
                            p.dir = h.AimDir; p.speed = 18f; p.life = 0.8f; p.pierce = true; p.fromTower = false;
                            p.damage = 20 + 8 * (lv - 1); p.slowMul = 0.6f; p.slowTime = 3f; p.markTime = 5f;
                            Sfx.Play("q");
                        }
                    },
                    new AbilityDef
                    {
                        name = "Bond de chat", desc = "Saut rapide vers le curseur.",
                        key = KeyCode.W, cooldown = 5f, unlockLevel = 2,
                        cast = h => { h.Dash(h.AimDir * 7f); Fx.Burst(h.transform.position + Vector3.up * 0.3f, Pal.FurLight, 8); Sfx.Play("w"); }
                    },
                    new AbilityDef
                    {
                        name = "Miaou-choc", desc = "Repousse et étourdit. Tourelles proches : cadence +35 % pendant 4 s.",
                        key = KeyCode.E, cooldown = 12f, unlockLevel = 3,
                        cast = h =>
                        {
                            int lv = Game.I.level;
                            Vector3 p = h.transform.position;
                            float r = 5f + 0.25f * lv;
                            foreach (var e in Enemy.InRange(p, r)) { e.Hit(10 + 4 * lv, false); e.Stun(0.8f); e.Push(2.5f); }
                            foreach (var t in Tower.All) if (Enemy.Flat(t.transform.position, p) <= 9f) t.Boost(4f);
                            Fx.Ring(p, r, Pal.Pink); Fx.Ring(p, 9f, Pal.MintDark, 0.6f);
                            Game.I.rig.Shake(0.15f); Sfx.Play("e");
                        }
                    },
                }
            };
        }
    }
}
