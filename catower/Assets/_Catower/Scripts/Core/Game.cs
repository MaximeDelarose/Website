using System.Collections.Generic;
using UnityEngine;

namespace Catower
{
    public enum Phase { Prep, Waves, Victory, Defeat }

    /// <summary>Boucle principale : Préparation → Vagues → Boss → Séquence suivante. Victoire après toutes les séquences.</summary>
    public class Game : MonoBehaviour
    {
        public static Game I;

        // Valeurs à ajuster après les tests (le GDD ne les fixe pas)
        public const int SequencesToWin = 3;
        public const int WavesPerSequence = 10;
        public const float WaveGap = 22f;
        public static readonly int[] XpThresholds = { 30, 80, 150, 260 }; // XP cumulée pour atteindre les niveaux 2..5

        public Phase phase = Phase.Prep;
        public int sequence, wave;
        public int croquettes = 150;
        public int coreMax = 30, coreHp = 30;
        public int xp, level = 1;
        public HeroController hero;
        public CameraRig rig;
        public string banner = "";
        public float bannerT;
        float nextWaveAt;

        struct Spawn { public float at; public EnemyDef def; public float hpScale; }
        readonly List<Spawn> pending = new List<Spawn>();

        public int MaxLevel { get { return XpThresholds.Length + 1; } }
        public int XpPrev { get { return level <= 1 ? 0 : XpThresholds[level - 2]; } }
        public int XpNext { get { return level >= MaxLevel ? XpThresholds[XpThresholds.Length - 1] : XpThresholds[level - 1]; } }
        public float NextWaveIn { get { return Mathf.Max(0f, nextWaveAt - Time.time); } }

        void Awake() { I = this; Time.timeScale = 1f; }

        public void Banner(string s, float dur = 3f) { banner = s; bannerT = dur; }

        public void AddXp(int v)
        {
            xp += v;
            while (level < MaxLevel && xp >= XpThresholds[level - 1])
            {
                level++;
                string unlock = "";
                foreach (var a in hero.def.abilities) if (a.unlockLevel == level) unlock = "  ·  " + a.name + " débloqué !";
                Banner("Niveau " + level + " !" + unlock, 3f);
                Sfx.Play("level");
                Fx.Burst(hero.transform.position + Vector3.up, Pal.Violet, 16, 0.25f, 6f);
                Fx.Ring(hero.transform.position, 4f, Pal.Violet, 0.5f);
            }
        }

        public void DamageCore(int n)
        {
            if (phase == Phase.Victory || phase == Phase.Defeat) return;
            coreHp = Mathf.Max(0, coreHp - n);
            if (Map.Heart != null) Map.Heart.Hurt();
            rig.Shake(0.3f);
            Sfx.Play("core");
            if (coreHp <= 0)
            {
                phase = Phase.Defeat;
                Time.timeScale = 0f;
            }
        }

        public void Ready()
        {
            if (phase == Phase.Prep) { phase = Phase.Waves; wave = 0; StartNextWave(); }
            else if (phase == Phase.Waves && wave < WavesPerSequence) StartNextWave();
        }

        void StartNextWave()
        {
            wave++;
            nextWaveAt = Time.time + WaveGap;
            BuildWave();
            string name = wave == 5 ? "MINI-BOSS !" : wave == WavesPerSequence ? "BOSS !" : "";
            Banner("Vague " + wave + (name != "" ? "  ·  " + name : ""), 2.5f);
            if (wave == 5 || wave == WavesPerSequence) rig.Shake(0.2f);
        }

        void BuildWave()
        {
            float t = Time.time;
            float sc = 1f + 0.3f * sequence;
            float hpScale = (1f + 0.6f * sequence) * (1f + 0.04f * (wave - 1));
            int w = wave;
            System.Action<string, int, float, float> add = (id, n, interval, delay) =>
            {
                var d = Database.Enemies[id];
                for (int i = 0; i < n; i++) pending.Add(new Spawn { at = t + delay + i * interval, def = d, hpScale = hpScale });
            };
            if (w <= 4)
            {
                add("mouse", Mathf.RoundToInt((6 + 2 * w) * sc), 0.9f, 0f);
                if (w >= 2) add("sparrow", Mathf.RoundToInt(3 * (w - 1) * sc), 0.7f, 3f);
                if (w >= 3) add("turtle", Mathf.RoundToInt((w - 2) * sc), 2f, 6f);
            }
            else if (w == 5)
            {
                add("ratchef", 1, 0f, 1f);
                add("mouse", Mathf.RoundToInt(8 * sc), 0.8f, 3f);
            }
            else if (w <= 9)
            {
                add("mouse", Mathf.RoundToInt((10 + w) * sc), 0.6f, 0f);
                add("sparrow", Mathf.RoundToInt((4 + w) * sc), 0.5f, 2f);
                add("turtle", Mathf.RoundToInt((w - 3) * sc + 1), 1.5f, 5f);
            }
            else
            {
                add("vacuum", 1, 0f, 1f);
                add("turtle", Mathf.RoundToInt(4 * sc), 1.5f, 4f);
                add("sparrow", Mathf.RoundToInt(8 * sc), 0.5f, 3f);
            }
        }

        void EndSequence()
        {
            sequence++;
            if (sequence >= SequencesToWin) { phase = Phase.Victory; Time.timeScale = 0f; return; }
            phase = Phase.Prep;
            wave = 0;
            coreHp = Mathf.Min(coreMax, coreHp + 6);
            croquettes += 100;
            Banner("Séquence " + sequence + " terminée ! Construis, améliore, puis Entrée.", 5f);
            Sfx.Play("level");
        }

        void Update()
        {
            if (bannerT > 0f) bannerT -= Time.unscaledDeltaTime;
            Fx.Tick(Time.unscaledDeltaTime);
            if (Input.GetKeyDown(KeyCode.Return) || Input.GetKeyDown(KeyCode.KeypadEnter)) Ready();
            if (Input.GetKeyDown(KeyCode.P) && (phase == Phase.Prep || phase == Phase.Waves)) Time.timeScale = Time.timeScale > 0f ? 0f : 1f;
            if (phase != Phase.Waves) return;

            for (int i = pending.Count - 1; i >= 0; i--)
                if (pending[i].at <= Time.time)
                {
                    var s = pending[i];
                    pending.RemoveAt(i);
                    Enemy.Spawn(s.def, s.hpScale);
                }

            if (wave < WavesPerSequence && Time.time >= nextWaveAt) StartNextWave();
            else if (wave >= WavesPerSequence && pending.Count == 0 && Enemy.All.Count == 0) EndSequence();
        }
    }
}
