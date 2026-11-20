/* Génère les fichiers vocaux du jeu avec ElevenLabs, UNE SEULE FOIS, sur VOTRE ordinateur (jamais depuis le jeu).
   - La clé API reste dans votre terminal (variable d'environnement). Elle n'est écrite nulle part dans le dépôt.
   - Les fichiers sont normalisés à −16 LUFS (ffmpeg) : même volume perçu pour toutes les répliques, au-dessus de la musique (−20 LUFS).
   - Écrit celia/voix/<clé>.mp3 + celia/voix/index.json, puis il suffit de passer « voices: true » dans celia/custom/custom.js.

   Usage :
     export ELEVENLABS_API_KEY=...        # votre clé
     export ELEVENLABS_VOICE_ID=...       # la voix choisie après écoute des échantillons
     node _celia/voix/generate.mjs [--enable]      (Node 18+, ffmpeg installé)

   NB : non testé dans l'environnement de développement (aucun accès réseau vers ElevenLabs). */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, '..', '..', 'celia', 'voix');
const KEY = process.env.ELEVENLABS_API_KEY, VOICE = process.env.ELEVENLABS_VOICE_ID;
if (!KEY || !VOICE) { console.error('Définissez ELEVENLABS_API_KEY et ELEVENLABS_VOICE_ID.'); process.exit(1); }
const phrases = JSON.parse(fs.readFileSync(path.join(here, 'phrases.json'), 'utf8'));
fs.mkdirSync(out, { recursive: true });
const files = {};
for (const { key, text } of phrases) {
  const f = key + '.mp3', dest = path.join(out, f);
  files[key] = f;
  if (fs.existsSync(dest)) continue;
  /* intonation : conteuse douce et expressive (réglages modifiables) */
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + VOICE + '?output_format=mp3_44100_128', {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', language_code: 'fr', voice_settings: { stability: 0.42, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true, speed: 0.92 } })
  });
  if (!r.ok) { console.error('Échec « ' + text + ' » : ' + r.status + ' ' + (await r.text()).slice(0, 200)); process.exit(1); }
  const raw = path.join(out, key + '.raw.mp3'); fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7,apad=pad_dur=0.15', '-ar', '44100', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', dest]);
  fs.unlinkSync(raw); console.log('✓ ' + text);
}
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ generated: new Date().toISOString(), files }, null, 1) + '\n');
if (process.argv.includes('--enable')) {
  const c = path.join(out, '..', 'custom', 'custom.js'); fs.writeFileSync(c, fs.readFileSync(c, 'utf8').replace(/voices:\s*false/, 'voices: true'));
  console.log('voices: true activé dans celia/custom/custom.js');
}
console.log(phrases.length + ' phrases prêtes dans celia/voix/. Pensez à changer VERSION dans celia/sw.js, puis commitez.');
