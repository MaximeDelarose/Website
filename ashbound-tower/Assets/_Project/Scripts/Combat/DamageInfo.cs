using UnityEngine;

namespace AshboundTower
{
    public struct DamageInfo
    {
        public float amount;
        public Element element;
        public Object source;

        public DamageInfo(float amount, Element element, Object source)
        {
            this.amount = amount; this.element = element; this.source = source;
        }
    }
}
