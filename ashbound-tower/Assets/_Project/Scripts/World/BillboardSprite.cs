using UnityEngine;

namespace AshboundTower
{
    /// <summary>Sprite 2D orienté vers la caméra dans un monde 3D (billboard), trié par profondeur.
    /// Le pivot du sprite doit être en bas : le point de pose au sol est la position du parent.</summary>
    public class BillboardSprite : MonoBehaviour
    {
        public int sortOffset = 0;
        public bool depthSort = true;
        SpriteRenderer sr;
        Transform cam;

        void Awake() { sr = GetComponent<SpriteRenderer>(); }

        void LateUpdate()
        {
            if (cam == null)
            {
                Camera c = Camera.main;
                if (c == null) return;
                cam = c.transform;
            }
            transform.rotation = cam.rotation;
            if (depthSort && sr != null)
                sr.sortingOrder = 1000 - Mathf.RoundToInt(transform.parent != null ? transform.parent.position.z * 50f : transform.position.z * 50f) + sortOffset;
        }
    }
}
