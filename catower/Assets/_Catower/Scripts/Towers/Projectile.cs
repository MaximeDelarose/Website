using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    /// <summary>Projectile générique : pelotes du héros et des tourelles.</summary>
    public class Projectile : MonoBehaviour
    {
        public Enemy target;
        public Vector3 dir = Vector3.forward;
        public float speed = 14f, life = 3f, damage, splash, slowMul = 1f, slowTime, markTime, size = 0.35f;
        public bool pierce, fromTower;
        public Color color = Color.white;
        readonly HashSet<Enemy> hit = new HashSet<Enemy>();

        public static Projectile Create(Vector3 pos, Color c, float size)
        {
            var g = Gfx.Prim(PrimitiveType.Sphere, Bootstrap.World, pos, size, c, "projectile");
            var p = g.AddComponent<Projectile>();
            p.color = c; p.size = size;
            g.AddComponent<Spin>().speed = 400f;
            return p;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            life -= dt;
            if (life <= 0f) { Destroy(gameObject); return; }

            if (target != null && !pierce)
            {
                Vector3 to = target.Pos + Vector3.up * 0.5f - transform.position;
                if (to.sqrMagnitude > 0.0001f) dir = to.normalized;
            }
            transform.position += dir * speed * dt;

            Vector3 pos = transform.position;
            var snapshot = Enemy.All.ToArray();
            for (int i = 0; i < snapshot.Length; i++)
            {
                var e = snapshot[i];
                if (e == null || e.hp <= 0f || hit.Contains(e)) continue;
                float r = e.Radius + size * 0.5f;
                Vector3 d = e.Pos + Vector3.up * 0.5f - pos;
                if (d.sqrMagnitude < r * r)
                {
                    Impact(e);
                    if (!pierce) { Destroy(gameObject); return; }
                }
            }
        }

        void Impact(Enemy e)
        {
            hit.Add(e);
            Vector3 center = e.Pos;
            Apply(e);
            if (splash > 0f)
            {
                foreach (var o in Enemy.InRange(center, splash)) if (o != e) Apply(o);
                Fx.Ring(center, splash, color);
            }
            Fx.Burst(transform.position, color, 6, 0.2f, 3.5f);
        }

        void Apply(Enemy e)
        {
            e.Hit(damage, fromTower);
            if (slowTime > 0f) e.ApplySlow(slowMul, slowTime);
            if (markTime > 0f) e.Mark(markTime);
        }
    }
}
