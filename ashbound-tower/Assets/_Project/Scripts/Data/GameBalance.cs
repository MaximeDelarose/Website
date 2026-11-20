using System;
using UnityEngine;

namespace AshboundTower
{
    [CreateAssetMenu(menuName = "Ashbound Tower/Équilibrage", fileName = "GameBalance")]
    public class GameBalance : ScriptableObject
    {
        public int startingGold = 150;
        public float heartMaxStability = 100f;
        public SequenceDefinition sequence;
        public TowerDefinition[] towers = new TowerDefinition[0];
    }
}
