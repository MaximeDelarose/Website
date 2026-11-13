using UnityEngine;

namespace Catower
{
    /// <summary>Caméra de dessus inclinée (style LoL) qui suit le héros. Espace : recentrer.</summary>
    public class CameraRig : MonoBehaviour
    {
        public Camera cam;
        public Transform target;
        public Vector3 offset = new Vector3(0f, 15f, -10.5f);
        float shake;
        Vector3 focus;

        public void Shake(float s) { shake = Mathf.Max(shake, s); }

        Vector3 Clamped(Vector3 p)
        {
            return new Vector3(Mathf.Clamp(p.x, -Map.Half.x + 12f, Map.Half.x - 12f), 0f, Mathf.Clamp(p.z, -Map.Half.y + 4f, Map.Half.y - 4f));
        }

        void LateUpdate()
        {
            if (target == null) return;
            Vector3 want = Clamped(target.position);
            if (Input.GetKeyDown(KeyCode.Space)) focus = want;
            focus = Vector3.Lerp(focus, want, 1f - Mathf.Exp(-8f * Time.unscaledDeltaTime));
            Vector3 s = shake > 0.001f ? new Vector3(Random.Range(-1f, 1f), Random.Range(-1f, 1f), 0f) * shake : Vector3.zero;
            shake = Mathf.Max(0f, shake - Time.unscaledDeltaTime * 1.2f);
            cam.transform.position = focus + offset + s;
            cam.transform.rotation = Quaternion.LookRotation(-offset);
        }

        public void Snap() { if (target != null) focus = Clamped(target.position); }
    }
}
