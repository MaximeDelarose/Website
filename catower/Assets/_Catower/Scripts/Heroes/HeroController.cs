using UnityEngine;

namespace Catower
{
    /// <summary>Contrôle du héros : clic droit pour bouger/attaquer, Q W E pour les capacités (données dans HeroDef).</summary>
    public class HeroController : MonoBehaviour
    {
        public HeroDef def;
        public float[] cd;
        public Vector3 Aim { get; private set; }
        public Vector3 AimDir { get; private set; }

        Camera cam;
        readonly Plane ground = new Plane(Vector3.up, 0f);
        Vector3 moveTarget;
        bool hasMove;
        Enemy attackTarget;
        float atkCd, dashT;
        Vector3 dashVel;
        Transform model, tail;
        float walkPhase;

        public static HeroController Create(HeroDef d, Vector3 pos, Camera cam)
        {
            var g = new GameObject(d.name);
            g.transform.SetParent(Bootstrap.World, false);
            g.transform.position = pos;
            var h = g.AddComponent<HeroController>();
            h.def = d; h.cam = cam; h.cd = new float[d.abilities.Length];
            h.model = CatView.Build(g.transform, d.fur, d.furLight, out h.tail);
            h.model.localScale = Vector3.one * 0.9f;
            // Ombre douce
            Gfx.Prim(PrimitiveType.Cylinder, g.transform, new Vector3(0, 0.13f, 0), new Vector3(1.1f, 0.01f, 1.1f), Pal.Ink * 0.5f, "shadow");
            h.AimDir = Vector3.forward;
            return h;
        }

        public void Dash(Vector3 v)
        {
            dashVel = v / 0.15f;
            dashT = 0.15f;
            hasMove = false; attackTarget = null;
        }

        Vector3 MouseGround()
        {
            Ray r = cam.ScreenPointToRay(Input.mousePosition);
            float d;
            return ground.Raycast(r, out d) ? r.GetPoint(d) : transform.position;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            int level = Game.I.level;

            // Visée
            Aim = MouseGround();
            Vector3 toAim = Aim - transform.position; toAim.y = 0;
            if (toAim.sqrMagnitude > 0.01f) AimDir = toAim.normalized;

            // Ordres au clic droit
            bool overUi = Hud.OverUi(Input.mousePosition);
            if (!overUi && Input.GetMouseButtonDown(1))
            {
                Ray r = cam.ScreenPointToRay(Input.mousePosition);
                RaycastHit hit;
                Enemy e = null;
                if (Physics.Raycast(r, out hit, 200f)) e = hit.collider.GetComponentInParent<Enemy>();
                if (e != null) { attackTarget = e; hasMove = false; }
                else { attackTarget = null; moveTarget = Aim; hasMove = true; Fx.Burst(Aim + Vector3.up * 0.1f, Pal.Pink, 4, 0.12f, 2f); }
            }
            else if (!overUi && Input.GetMouseButton(1) && attackTarget == null) { moveTarget = Aim; hasMove = true; }

            // Capacités
            for (int i = 0; i < def.abilities.Length; i++)
            {
                var a = def.abilities[i];
                if (cd[i] > 0f) cd[i] -= dt;
                if (Input.GetKeyDown(a.key) && level >= a.unlockLevel && cd[i] <= 0f)
                {
                    cd[i] = a.cooldown;
                    a.cast(this);
                }
            }

            // Déplacement
            Vector3 move = Vector3.zero;
            float attackRange = def.attackRange;
            if (dashT > 0f)
            {
                dashT -= dt;
                move = dashVel * dt;
            }
            else
            {
                if (attackTarget != null && (attackTarget.hp <= 0f)) attackTarget = null;
                if (attackTarget != null)
                {
                    float d = Enemy.Flat(attackTarget.Pos, transform.position);
                    if (d > attackRange) move = (attackTarget.Pos - transform.position).normalized * def.moveSpeed * dt;
                }
                else if (hasMove)
                {
                    Vector3 to = moveTarget - transform.position; to.y = 0;
                    if (to.magnitude < 0.15f) hasMove = false;
                    else move = Vector3.ClampMagnitude(to, def.moveSpeed * dt);
                }
            }
            move.y = 0;
            Vector3 np = transform.position + move;
            np.x = Mathf.Clamp(np.x, -Map.Half.x + 1, Map.Half.x - 1);
            np.z = Mathf.Clamp(np.z, -Map.Half.y + 1, Map.Half.y - 1);
            transform.position = np;
            if (move.sqrMagnitude > 0.0001f)
                transform.rotation = Quaternion.RotateTowards(transform.rotation, Quaternion.LookRotation(move), 900f * dt);

            // Attaque (cible ordonnée, sinon ennemi proche en attendant)
            atkCd -= dt;
            if (atkCd <= 0f && dashT <= 0f)
            {
                Enemy tgt = null;
                if (attackTarget != null && Enemy.Flat(attackTarget.Pos, transform.position) <= attackRange + attackTarget.Radius) tgt = attackTarget;
                else if (attackTarget == null && !hasMove)
                {
                    float best = float.MaxValue;
                    foreach (var e in Enemy.InRange(transform.position, attackRange))
                    {
                        float dd = Enemy.Flat(e.Pos, transform.position);
                        if (dd < best) { best = dd; tgt = e; }
                    }
                }
                if (tgt != null)
                {
                    atkCd = def.attackCooldown;
                    float dmg = def.attackDamage * (1f + 0.2f * (level - 1));
                    tgt.Hit(dmg, false);
                    Fx.Burst(tgt.Pos + Vector3.up * 0.8f, Pal.Pink, 5, 0.18f, 3f);
                    Vector3 face = tgt.Pos - transform.position; face.y = 0;
                    if (face.sqrMagnitude > 0.01f) transform.rotation = Quaternion.LookRotation(face);
                    model.localPosition = Vector3.forward * 0.25f; // petit coup de patte
                }
            }

            // Animation : rebond, étirement, queue
            bool moving = move.sqrMagnitude > 0.0001f;
            walkPhase += dt * (moving ? 14f : 3f);
            float bounce = moving ? Mathf.Abs(Mathf.Sin(walkPhase)) * 0.14f : Mathf.Sin(walkPhase) * 0.02f;
            model.localPosition = Vector3.Lerp(model.localPosition, new Vector3(0, bounce, 0), 1f - Mathf.Exp(-18f * dt));
            float squash = moving ? 1f + Mathf.Sin(walkPhase * 2f) * 0.05f : 1f + Mathf.Sin(walkPhase) * 0.02f;
            model.localScale = new Vector3(0.9f / squash, 0.9f * squash, 0.9f / squash);
            tail.localRotation = Quaternion.Euler(0, Mathf.Sin(Time.time * (moving ? 10f : 4f)) * 25f, 0);
        }
    }
}
