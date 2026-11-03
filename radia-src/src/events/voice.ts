/**
 * Le vrai message vocal d'Auguste (fichier original M4A, jamais une voix synthétique).
 * Il est chiffré comme les photos (clé du lien) : voice_m4a.bin = original, voice_mp3.bin = version
 * de compatibilité (même enregistrement) pour les navigateurs sans AAC. Safari iPhone lit le M4A.
 * Facultatif : voice.bin = transcription [{t, text}] pour des sous-titres synchronisés.
 */
import { audio } from '../core/app';
import { decryptAsset, hasPhotos } from '../core/photos';

export interface VoiceClip { url: string; format: 'm4a' | 'mp3'; transcript: { t: number; text: string }[] | null }

let cache: VoiceClip | null | undefined;
let loading: Promise<VoiceClip | null> | null = null;

/** Choisit le format lisible : M4A (original) si possible, sinon la version de compatibilité. */
export function preferredFormats(canM4a: boolean): ('m4a' | 'mp3')[] { return canM4a ? ['m4a', 'mp3'] : ['mp3', 'm4a']; }

export function loadVoice(): Promise<VoiceClip | null> {
  if (cache !== undefined) return Promise.resolve(cache);
  if (loading) return loading;
  loading = (async () => {
    if (!hasPhotos()) return (cache = null);
    const probe = document.createElement('audio');
    const canM4a = probe.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '' || probe.canPlayType('audio/aac') !== '';
    for (const fmt of preferredFormats(canM4a)) {
      const bytes = await decryptAsset(`voice_${fmt}`);
      if (!bytes) continue;
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: fmt === 'm4a' ? 'audio/mp4' : 'audio/mpeg' }));
      let transcript: VoiceClip['transcript'] = null;
      try {
        const t = await decryptAsset('voice');
        if (t) {
          const j = JSON.parse(new TextDecoder().decode(t)) as { lines?: { t: number; text: string }[] };
          if (Array.isArray(j.lines)) transcript = j.lines.filter((l) => typeof l.t === 'number' && typeof l.text === 'string').slice(0, 60);
        }
      } catch { /* pas de sous-titres */ }
      return (cache = { url, format: fmt, transcript });
    }
    return (cache = null);
  })();
  return loading;
}

export interface VoicePlayer { el: HTMLAudioElement; analyser: AnalyserNode | null; stop(): void; ended: Promise<'ended' | 'stopped' | 'error'> }

/** À appeler DANS le geste tactile (iOS) : crée l'élément, démarre aussitôt, route par Web Audio. */
export function playVoice(clip: VoiceClip): VoicePlayer {
  const el = new Audio();
  el.src = clip.url;
  el.preload = 'auto';
  el.setAttribute('playsinline', '');
  const analyser = audio.routeVoice(el, 2);
  let settle: (v: 'ended' | 'stopped' | 'error') => void = () => undefined;
  const ended = new Promise<'ended' | 'stopped' | 'error'>((r) => { settle = r; });
  el.addEventListener('ended', () => settle('ended'));
  el.addEventListener('error', () => settle('error'));
  void el.play().catch(() => settle('error'));
  return { el, analyser, ended, stop: () => { el.pause(); settle('stopped'); } };
}
