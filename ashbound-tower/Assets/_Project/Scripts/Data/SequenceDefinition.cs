using System;
using UnityEngine;

namespace AshboundTower
{
    [CreateAssetMenu(menuName = "Ashbound Tower/Séquence", fileName = "Sequence_")]
    public class SequenceDefinition : ScriptableObject
    {
        public string displayName = "Séquence 1";
        [Tooltip("Durée nominale affichée par le chronomètre (300 s = 5 min).")]
        public float nominalDuration = 300f;
        public int randomSeed = 1234;
        public WaveDefinition[] waves = new WaveDefinition[0];
        public TrickleDefinition[] trickles = new TrickleDefinition[0];
    }
}
