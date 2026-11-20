/* Produit 3 échantillons de voix françaises féminines (ElevenLabs) qui disent tous la même phrase,
   pour choisir la conteuse AVANT de générer tout le jeu.
   Usage :
     export ELEVENLABS_API_KEY=...
     node _celia/voix/samples.mjs                       # cherche 3 voix féminines françaises dans la bibliothèque
     VOICE_IDS=id1,id2,id3 node _celia/voix/samples.mjs # ou imposez vos 3 voix
   Résultat : _celia/voix/echantillons/voix-1-….mp3, voix-2-….mp3, voix-3-….mp3

   NB : non testé dans l'environnement de développement (aucun accès réseau vers ElevenLabs). */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, 'echantillons');
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('Définissez ELEVENLABS_API_KEY.'); process.exit(1); }
const TEXT = 'Coucou Celia ! Bienvenue dans ton monde magique !';
const H = { 'xi-api-key': KEY, 'Content-Type': 'application/json' };
fs.mkdirSync(out, { recursive: true });
let voices = [];
if (process.env.VOICE_IDS) voices = process.env.VOICE_IDS.split(',').map((id, i) => ({ voice_id: id.trim(), name: 'voix' + (i + 1) }));
else {
  const r = await fetch('https://api.elevenlabs.io/v1/shared-voices?language=fr&gender=female&age=young&page_size=40&sort=trending', { headers: H });
  if (!r.ok) { console.error('Recherche impossible : ' + r.status + ' ' + (await r.text()).slice(0, 200)); process.exit(1); }
  const j = await r.json();
  /* on privilégie les voix « chaleureuses / narration / jeunesse » et on garde 3 timbres différents */
  const score = (v) => (/warm|soft|gentle|calm|story|narrat|child|kids|friendly|chaleureu|doux/i.test((v.description || '') + ' ' + (v.descriptive || '') + ' ' + (v.use_case || '') + ' ' + (v.name || '')) ? 2 : 0) + (v.accent === 'standard' || /france|french/i.test(v.accent || '') ? 1 : 0);
  voices = (j.voices || []).sort((a, b) => score(b) - score(a)).filter((v, i, a) => a.findIndex((w) => w.name === v.name) === i).slice(0, 3);
}
let n = 0;
for (const v of voices) {
  n++;
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + v.voice_id + '?output_format=mp3_44100_128', {
    method: 'POST', headers: H,
    body: JSON.stringify({ text: TEXT, model_id: 'eleven_multilingual_v2', language_code: 'fr', voice_settings: { stability: 0.42, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true, speed: 0.92 } })
  });
  if (!r.ok) { console.error('Voix ' + v.name + ' : ' + r.status + ' ' + (await r.text()).slice(0, 200)); continue; }
  const raw = path.join(out, 'raw.mp3'); fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
  const file = path.join(out, 'voix-' + n + '-' + String(v.name).replace(/[^\w-]+/g, '_') + '.mp3');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-c:a', 'libmp3lame', '-b:a', '128k', file]); fs.unlinkSync(raw);
  console.log('✓ ' + file + '   (voice_id = ' + v.voice_id + ')');
}
console.log('\nÉcoutez les 3 fichiers, puis lancez generate.mjs avec ELEVENLABS_VOICE_ID = l’identifiant de votre préférée.');
