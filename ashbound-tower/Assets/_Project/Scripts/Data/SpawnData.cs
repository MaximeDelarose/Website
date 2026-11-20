using System;
using UnityEngine;

namespace AshboundTower
{
    [Serializable]
    public class SpawnGroup
    {
        public EnemyDefinition enemy;
        public int count = 5;
        [Tooltip("Secondes entre deux ennemis du groupe.")]
        public float spacing = 0.5f;
        [Tooltip("Décalage (s) après le début de la vague.")]
        public float delay = 0f;
    }

    [Serializable]
    public class WaveDefinition
    {
        public string label = "Vague";
        [Tooltip("Instant de départ (s) depuis le début de la séquence. 10 vagues ≈ 5 minutes.")]
        public float startTime = 10f;
        public SpawnGroup[] groups = new SpawnGroup[0];
    }

    /// <summary>Petits ennemis réguliers entre les gros assauts.</summary>
    [Serializable]
    public class TrickleDefinition
    {
        public EnemyDefinition enemy;
        public float startTime = 2f;
        public float endTime = 270f;
        public float interval = 6f;
        public int packMin = 1;
        public int packMax = 3;
        public float packSpacing = 0.4f;
    }
}
