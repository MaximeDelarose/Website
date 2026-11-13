using UnityEngine;

namespace AshboundTower
{
    public class SpriteFrameAnimator : MonoBehaviour
    {
        Sprite[] frames;
        SpriteRenderer sr;
        float fps = 4f;
        float t;

        public void Setup(SpriteRenderer renderer, Sprite[] spriteFrames, float framesPerSecond, float phase)
        {
            sr = renderer; frames = spriteFrames; fps = framesPerSecond; t = phase;
            if (frames != null && frames.Length > 0) sr.sprite = frames[0];
        }

        void Update()
        {
            if (frames == null || frames.Length < 2 || sr == null) return;
            t += Time.deltaTime * fps;
            sr.sprite = frames[((int)t) % frames.Length];
        }
    }
}
