using System;
using System.Collections.Generic;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Planifie et déclenche les apparitions d'ennemis d'une séquence (10 vagues ≈ 5 min + petits ennemis réguliers).
    /// Toutes les apparitions sont précalculées à partir des données (SequenceDefinition) et déclenchées selon le chronomètre de la partie.</summary>
    [DefaultExecutionOrder(-50)]
    public class WaveDirector : MonoBehaviour
    {
        public static WaveDirector Instance { get; private set; }

        struct SpawnEvent
        {
            public float time; public EnemyDefinition enemy; public float lateral;
        }

        public SequenceDefinition sequence;
        public PathRoute route;

        readonly List<SpawnEvent> events = new List<SpawnEvent>();
        int next;
        bool began;

        public int CurrentWave { get; private set; }           // 0 = pas commencée, 1..N
        public int TotalWaves { get { return sequence != null ? sequence.waves.Length : 0; } }
        public int RemainingToSpawn { get { return events.Count - next; } }
        public event Action<int, WaveDefinition> WaveStarted;

        void Awake() { Instance = this; }
        void OnDestroy() { if (Instance == this) Instance = null; }

        public void Begin()
        {
            events.Clear(); next = 0; CurrentWave = 0; began = true;
            if (sequence == null) return;
            System.Random rng = new System.Random(sequence.randomSeed);

            for (int w = 0; w < sequence.waves.Length; w++)
            {
                WaveDefinition wave = sequence.waves[w];
                for (int g = 0; g < wave.groups.Length; g++)
                {
                    SpawnGroup grp = wave.groups[g];
                    if (grp.enemy == null) continue;
                    for (int k = 0; k < grp.count; k++)
                        events.Add(new SpawnEvent { time = wave.startTime + grp.delay + k * grp.spacing, enemy = grp.enemy, lateral = Lateral(rng, grp.enemy) });
                }
            }
            for (int i = 0; i < sequence.trickles.Length; i++)
            {
                TrickleDefinition tr = sequence.trickles[i];
                if (tr.enemy == null || tr.interval <= 0.05f) continue;
                for (float t = tr.startTime; t <= tr.endTime; t += tr.interval)
                {
                    int pack = rng.Next(Mathf.Max(1, tr.packMin), Mathf.Max(tr.packMin, tr.packMax) + 1);
                    for (int k = 0; k < pack; k++)
                        events.Add(new SpawnEvent { time = t + k * tr.packSpacing, enemy = tr.enemy, lateral = Lateral(rng, tr.enemy) });
                }
            }
            events.Sort((a, b) => a.time.CompareTo(b.time));
        }

        static float Lateral(System.Random rng, EnemyDefinition e)
        {
            // les grosses unités restent au centre, les petites se dispersent légèrement (effet de groupe)
            float amp = e.kind == EnemyKind.Standard || e.kind == EnemyKind.Rapide ? 0.45f : 0f;
            return ((float)rng.NextDouble() * 2f - 1f) * amp;
        }

        void Update()
        {
            GameManager gm = GameManager.Instance;
            if (!began || gm == null || gm.State != GameState.Playing) return;
            float t = gm.SequenceTime;

            while (next < events.Count && events[next].time <= t)
            {
                Enemy.Spawn(events[next].enemy, route, events[next].lateral);
                if (events[next].enemy.kind == EnemyKind.Boss) AudioManager.Play("boss", 1f);
                next++;
            }

            int wave = 0;
            for (int i = 0; i < sequence.waves.Length; i++) if (sequence.waves[i].startTime <= t) wave = i + 1;
            if (wave != CurrentWave)
            {
                CurrentWave = wave;
                if (wave > 0)
                {
                    AudioManager.Play("wave", 0.7f);
                    if (WaveStarted != null) WaveStarted(wave, sequence.waves[wave - 1]);
                }
            }

            // victoire provisoire : tout est apparu et tout est éliminé
            if (events.Count > 0 && next >= events.Count && EnemyRegistry.Count == 0) gm.Victory();
        }
    }
}
