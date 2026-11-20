using System;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Le Cœur : source d'énergie à défendre. Sa stabilité tombe à 0 = défaite.</summary>
    public class HeartCore : MonoBehaviour
    {
        public static HeartCore Instance { get; private set; }

        public Sprite[] frames = new Sprite[0];
        public float Stability { get; private set; }
        public float MaxStability { get; private set; }
        public event Action<float, float> Changed;   // (stabilité, max)

        SpriteRenderer sr;
        float flash, anim;

        void Awake() { Instance = this; }
        void OnDestroy() { if (Instance == this) Instance = null; }

        void Start()
        {
            MaxStability = GameManager.Instance != null && GameManager.Instance.balance != null ? GameManager.Instance.balance.heartMaxStability : 100f;
            Stability = MaxStability;
            GameObject vis = new GameObject("Visual");
            vis.transform.SetParent(transform, false);
            sr = vis.AddComponent<SpriteRenderer>();
            if (frames.Length > 0) sr.sprite = frames[0];
            BillboardSprite b = vis.AddComponent<BillboardSprite>();
            b.sortOffset = 40;
            if (Changed != null) Changed(Stability, MaxStability);
        }

        public void TakeDamage(float amount)
        {
            if (amount <= 0f || Stability <= 0f) return;
            if (GameManager.Instance != null && GameManager.Instance.State != GameState.Playing) return;
            Stability = Mathf.Max(0f, Stability - amount);
            flash = 0.35f;
            AudioManager.Play("heart_hit", 1f);
            if (CameraRig.Instance != null) CameraRig.Instance.Shake(Mathf.Lerp(0.15f, 0.5f, Mathf.Clamp01(amount / 30f)), 0.3f);
            FxPool.Burst(transform.position + Vector3.up * 1.5f, new Color(0.7f, 0.4f, 1f), 14, 5f, 0.6f, 0.6f);
            if (Changed != null) Changed(Stability, MaxStability);
            if (Stability <= 0f && GameManager.Instance != null) GameManager.Instance.Defeat();
        }

        void Update()
        {
            if (sr == null) return;
            float low = MaxStability > 0f ? 1f - Stability / MaxStability : 0f;
            anim += Time.deltaTime * Mathf.Lerp(1.5f, 4.5f, low);
            if (frames.Length > 1) sr.sprite = frames[((int)anim) % frames.Length];
            flash = Mathf.Max(0f, flash - Time.deltaTime);
            Color calm = Color.Lerp(Color.white, new Color(1f, 0.55f, 0.65f), low * 0.8f);
            sr.color = Color.Lerp(calm, new Color(1f, 0.35f, 0.35f), flash / 0.35f);
        }
    }
}
