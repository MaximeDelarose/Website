using System.Collections.Generic;
using UnityEngine;

namespace AshboundTower
{
    /// <summary>Sons 2D joués depuis Resources/Ashbound/Audio. Anti-spam par clé (intervalle minimal).</summary>
    public class AudioManager : MonoBehaviour
    {
        public static AudioManager Instance { get; private set; }
        public float masterVolume = 0.8f;
        public float ambientVolume = 0.22f;

        readonly Dictionary<string, AudioClip> clips = new Dictionary<string, AudioClip>();
        readonly Dictionary<string, float> lastPlayed = new Dictionary<string, float>();
        AudioSource[] pool;
        int next;

        void Awake()
        {
            Instance = this;
            pool = new AudioSource[12];
            for (int i = 0; i < pool.Length; i++)
            {
                pool[i] = gameObject.AddComponent<AudioSource>();
                pool[i].playOnAwake = false;
                pool[i].spatialBlend = 0f;
            }
            AudioClip amb = Get("ambient");
            if (amb != null)
            {
                AudioSource a = gameObject.AddComponent<AudioSource>();
                a.clip = amb; a.loop = true; a.volume = ambientVolume; a.spatialBlend = 0f; a.Play();
            }
        }

        void OnDestroy() { if (Instance == this) Instance = null; }

        AudioClip Get(string key)
        {
            AudioClip c;
            if (!clips.TryGetValue(key, out c))
            {
                c = Resources.Load<AudioClip>("Ashbound/Audio/" + key);
                clips[key] = c;
            }
            return c;
        }

        public static void Play(string key, float volume = 1f, float pitchVariance = 0.06f)
        {
            if (Instance != null) Instance.PlayInternal(key, volume, pitchVariance);
        }

        void PlayInternal(string key, float volume, float pitchVariance)
        {
            AudioClip c = Get(key);
            if (c == null) return;
            float now = Time.unscaledTime, last;
            if (lastPlayed.TryGetValue(key, out last) && now - last < 0.04f) return;
            lastPlayed[key] = now;
            AudioSource s = pool[next];
            next = (next + 1) % pool.Length;
            s.pitch = 1f + Random.Range(-pitchVariance, pitchVariance);
            s.volume = Mathf.Clamp01(volume * masterVolume);
            s.clip = c;
            s.Play();
        }
    }
}
