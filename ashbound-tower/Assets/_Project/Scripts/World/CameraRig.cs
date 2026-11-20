using UnityEngine;

namespace AshboundTower
{
    /// <summary>Caméra trois-quarts fixe, cadrée automatiquement pour contenir toute l'arène quel que soit le ratio d'écran.</summary>
    [RequireComponent(typeof(Camera))]
    public class CameraRig : MonoBehaviour
    {
        public static CameraRig Instance { get; private set; }

        public Vector2 arenaSize = new Vector2(36f, 20f);
        public Vector3 focus = new Vector3(0f, 0f, -0.5f);
        [Range(30f, 80f)] public float pitch = 55f;
        public float fieldOfView = 30f;
        public float padding = 1.04f;

        Camera cam;
        float shakeTime, shakeDuration, shakeAmount;

        void Awake() { Instance = this; cam = GetComponent<Camera>(); }
        void OnDestroy() { if (Instance == this) Instance = null; }

        public void Shake(float amount, float duration)
        {
            if (amount >= shakeAmount || shakeTime <= 0f) { shakeAmount = amount; shakeDuration = duration; shakeTime = duration; }
        }

        void LateUpdate()
        {
            cam.fieldOfView = fieldOfView;
            float tanHalf = Mathf.Tan(fieldOfView * 0.5f * Mathf.Deg2Rad);
            float distH = (arenaSize.x * 0.5f * padding) / (tanHalf * Mathf.Max(0.5f, cam.aspect));
            float distV = (arenaSize.y * 0.5f * Mathf.Sin(pitch * Mathf.Deg2Rad) * padding + 1.5f) / tanHalf;
            float dist = Mathf.Max(distH, distV);

            Quaternion rot = Quaternion.Euler(pitch, 0f, 0f);
            Vector3 pos = focus - rot * Vector3.forward * dist;
            if (shakeTime > 0f)
            {
                shakeTime -= Time.unscaledDeltaTime;
                float k = Mathf.Clamp01(shakeTime / Mathf.Max(0.01f, shakeDuration));
                pos += new Vector3(Random.Range(-1f, 1f), Random.Range(-1f, 1f), 0f) * shakeAmount * k;
                if (shakeTime <= 0f) shakeAmount = 0f;
            }
            transform.SetPositionAndRotation(pos, rot);
        }
    }
}
