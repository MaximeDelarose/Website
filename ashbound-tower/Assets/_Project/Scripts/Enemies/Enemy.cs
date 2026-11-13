using UnityEngine;

namespace AshboundTower
{
    /// <summary>Ennemi : suit automatiquement le chemin jusqu'au Cœur. Construit entièrement par code (Spawn) à partir d'un EnemyDefinition.</summary>
    [RequireComponent(typeof(StatusReceiver))]
    public class Enemy : MonoBehaviour
    {
        public EnemyDefinition Def { get; private set; }
        public float Health { get; private set; }
        public float Distance { get; private set; }
        public bool IsDead { get; private set; }
        public StatusReceiver Status { get; private set; }

        PathRoute route;
        float lateral;
        float age, maxAge;
        float flash;
        float spriteHeight;
        SpriteRenderer sr;
        Transform visual;
        Transform barRoot, barFill;
        SpriteRenderer barBack, barFillSr;
        float barWidth;
        Vector3 lastDir = Vector3.right;

        public static Enemy Spawn(EnemyDefinition def, PathRoute route, float lateralOffset)
        {
            GameObject go = new GameObject("Enemy_" + def.id);
            Enemy e = go.AddComponent<Enemy>();
            e.Init(def, route, lateralOffset);
            return e;
        }

        void Init(EnemyDefinition def, PathRoute r, float lateralOffset)
        {
            Def = def; route = r; lateral = lateralOffset;
            Health = def.maxHealth;
            Status = GetComponent<StatusReceiver>();
            // sécurité anti-ennemi bloqué : durée de vie maximale = 4 × le temps théorique de traversée
            maxAge = 4f * r.Length / Mathf.Max(0.2f, def.moveSpeed) + 5f;

            Vector3 dir;
            transform.position = r.Evaluate(0f, out dir);

            GameObject sh = GameAssets.FlatSprite("Shadow", transform, GameAssets.Shadow, GameAssets.OrderShadow);
            sh.transform.localScale = new Vector3(def.shadowSize, def.shadowSize, 1f);

            GameObject v = new GameObject("Visual");
            visual = v.transform;
            visual.SetParent(transform, false);
            visual.localScale = Vector3.one * def.visualScale;
            sr = v.AddComponent<SpriteRenderer>();
            v.AddComponent<BillboardSprite>();
            SpriteFrameAnimator anim = v.AddComponent<SpriteFrameAnimator>();
            anim.Setup(sr, def.walkFrames, def.frameRate, Random.value * 4f);
            spriteHeight = def.walkFrames.Length > 0 && def.walkFrames[0] != null ? def.walkFrames[0].bounds.size.y * def.visualScale : 1.5f;

            BuildHealthBar(def);
            EnemyRegistry.Register(this);
        }

        void BuildHealthBar(EnemyDefinition def)
        {
            barWidth = def.healthBarWidth;
            GameObject root = new GameObject("HealthBar");
            barRoot = root.transform;
            barRoot.SetParent(visual, false);
            barRoot.localScale = Vector3.one / Mathf.Max(0.01f, def.visualScale);
            barRoot.localPosition = new Vector3(0f, (spriteHeight + 0.25f) / Mathf.Max(0.01f, def.visualScale), 0f);

            GameObject back = new GameObject("Back");
            back.transform.SetParent(barRoot, false);
            back.transform.localScale = new Vector3(barWidth + 0.1f, 0.2f, 1f);
            barBack = back.AddComponent<SpriteRenderer>();
            barBack.sprite = SpriteUtil.White; barBack.color = new Color(0.05f, 0.02f, 0.1f, 0.9f);
            barBack.sortingOrder = GameAssets.OrderHealthBar;

            GameObject fill = new GameObject("Fill");
            barFill = fill.transform;
            barFill.SetParent(barRoot, false);
            barFill.localPosition = new Vector3(-barWidth * 0.5f, 0f, -0.01f);
            barFill.localScale = new Vector3(barWidth, 0.12f, 1f);
            barFillSr = fill.AddComponent<SpriteRenderer>();
            barFillSr.sprite = SpriteUtil.WhiteLeft;
            barFillSr.color = def.kind == EnemyKind.Boss || def.kind == EnemyKind.MiniBoss ? new Color(0.9f, 0.2f, 0.9f) : new Color(0.3f, 1f, 0.55f);
            barFillSr.sortingOrder = GameAssets.OrderHealthBar + 1;
            RefreshBar();
        }

        void RefreshBar()
        {
            bool show = !IsDead && (Def.alwaysShowHealthBar || Health < Def.maxHealth - 0.001f);
            barRoot.gameObject.SetActive(show);
            if (!show) return;
            float k = Mathf.Clamp01(Health / Def.maxHealth);
            barFill.localScale = new Vector3(barWidth * k, 0.12f, 1f);
        }

        /// <summary>Point de visée (milieu du sprite) pour les éclairs.</summary>
        public Vector3 AimPoint { get { return visual != null ? visual.TransformPoint(new Vector3(0f, spriteHeight * 0.5f / Mathf.Max(0.01f, Def.visualScale), 0f)) : transform.position; } }

        void Update()
        {
            if (IsDead) return;
            GameManager gm = GameManager.Instance;
            if (gm != null && gm.State != GameState.Playing) return;

            age += Time.deltaTime;
            if (age > maxAge) { Despawn(); return; }   // filet de sécurité

            Distance += Def.moveSpeed * Status.SpeedMultiplier * Time.deltaTime;
            Vector3 dir;
            Vector3 p = route.Evaluate(Distance, out dir);
            Vector3 perp = new Vector3(-dir.z, 0f, dir.x);
            transform.position = p + perp * lateral;
            if (Mathf.Abs(dir.x) > 0.2f) lastDir = dir;
            sr.flipX = lastDir.x < 0f;

            if (flash > 0f)
            {
                flash -= Time.deltaTime;
                sr.color = Color.Lerp(Color.white, new Color(1f, 0.4f, 0.55f), Mathf.Clamp01(flash / 0.12f));
            }
            else if (Status.IsStunned) sr.color = new Color(0.65f, 0.9f, 1f);
            else if (Status.IsSlowed) sr.color = new Color(0.75f, 0.8f, 1f);
            else sr.color = Color.white;

            if (Distance >= route.Length) ReachHeart();
        }

        /// <summary>Applique des dégâts. Retourne vrai si l'ennemi meurt de ce coup. Ignoré s'il est déjà mort (pas de double mort / double récompense).</summary>
        public bool TakeDamage(DamageInfo info)
        {
            if (IsDead || info.amount <= 0f) return false;
            Health -= info.amount;
            flash = 0.12f;
            AudioManager.Play("hit", 0.5f);
            FxPool.Burst(AimPoint, new Color(0.5f, 0.9f, 1f), 3, 3f, 0.3f, 0.5f);
            if (Health <= 0f) { Die(); return true; }
            RefreshBar();
            return false;
        }

        void Die()
        {
            IsDead = true;
            EnemyRegistry.Unregister(this);
            if (Economy.Instance != null) Economy.Instance.Add(Def.goldReward);
            AudioManager.Play("death", 0.7f);
            FxPool.Burst(AimPoint, new Color(0.7f, 0.4f, 1f), 12 + (int)Def.kind * 6, 5f, 0.7f, 0.8f);
            Notifier.ReportKill(this);
            Destroy(gameObject);
        }

        void ReachHeart()
        {
            IsDead = true;
            EnemyRegistry.Unregister(this);
            if (HeartCore.Instance != null) HeartCore.Instance.TakeDamage(Def.heartDamage);
            Destroy(gameObject);
        }

        void Despawn()
        {
            IsDead = true;
            EnemyRegistry.Unregister(this);
            Destroy(gameObject);
        }

        void OnDestroy() { EnemyRegistry.Unregister(this); }
    }
}
