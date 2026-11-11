// Teste les politiques d'accès RÉELLES de la migration sur un vrai PostgreSQL (PGlite), avec des stubs minimaux
// des schémas Supabase (auth, storage, rôles). Couvre les scénarios F, G, H et la simultanéité côté base de données.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b', C = '00000000-0000-0000-0000-00000000000c'
let db: PGlite

const as = async (uid: string | null, fn: () => Promise<any>) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'}`)
  try { return await fn() } finally { await db.exec('reset role') }
}
const q = (sql: string, p: any[] = []) => db.query<any>(sql, p)
const rpc = (name: string, ...args: any[]) => q(`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args).then((r) => r.rows[0].r)
const fails = async (fn: () => Promise<any>, re: RegExp) => { await expect(fn()).rejects.toThrow(re) }

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    grant usage on schema storage to anon, authenticated; grant select, insert, update, delete on storage.objects to authenticated;
    alter table storage.objects enable row level security;
    grant usage on schema public to anon, authenticated;
    insert into auth.users values ('${A}'), ('${B}'), ('${C}');`)
  await db.exec(readFileSync('supabase/migrations/0001_adeux_init.sql', 'utf8'))
  await db.exec(`insert into public.invite_codes(code_hash, max_uses) values (encode(sha256(convert_to('sesame','UTF8')),'hex'), 10)`)
  for (const u of [A, B, C]) await as(u, () => rpc('redeem_invite', 'sesame'))
  const prof = (u: string, name: string, gender: string, seeks: string[]) => as(u, () => q(
    `insert into public.profiles(user_id, pseudo, birthdate, gender, seeks, age_min, age_max, region, scope, adult_declared, onboarded) values ($1,$2,'1995-01-01',$3,$4,20,50,'Bretagne','country',true,true)`, [u, name, gender, seeks]))
  await prof(A, 'Alex', 'woman', ['man']); await prof(B, 'Basile', 'man', ['woman']); await prof(C, 'Chloé', 'woman', ['man'])
})

// Une rencontre A↔B menée jusqu'au bout du parcours, avec les actions réciproques constatées côté serveur.
async function readyEncounter() {
  const id = await as(A, () => rpc('propose_match'))
  expect(id).toBeTruthy()
  await as(A, () => rpc('respond_proposal', id, true)); await as(B, () => rpc('respond_proposal', id, true))
  const move = (u: string, game: string, rk: string) => as(u, () => q(`insert into public.game_moves(encounter_id,user_id,game,round_key) values ($1,$2,$3,$4)`, [id, u, game, rk]))
  await move(A, 'intro', 'i'); await move(B, 'intro', 'i'); await move(A, 'mirror', 'm1'); await move(B, 'mirror', 'm1'); await move(A, 'call', 'c'); await move(B, 'call', 'c')
  return id as string
}
const resetEncounters = async () => { await db.exec('reset role; delete from public.encounters; delete from public.blocks; delete from public.proposals; delete from public.consents; delete from storage.objects') }

describe('accès aux données', () => {
  it('les profils et réponses d’autrui sont invisibles', async () => {
    expect((await as(A, () => q('select user_id from public.profiles'))).rows.map((r: any) => r.user_id)).toEqual([A])
    expect((await as(null, () => q('select 1 from public.profiles').catch(() => ({ rows: 'denied' })))).rows).toBe('denied')
  })
  it('invitation : sans code valide, impossible de créer un profil', async () => {
    const D = '00000000-0000-0000-0000-00000000000d'
    await db.exec(`insert into auth.users values ('${D}')`)
    await fails(() => as(D, () => q(`insert into public.profiles(user_id,pseudo,birthdate,gender,seeks,age_min,age_max,region,scope,adult_declared) values ($1,'Dan','1990-01-01','man',array['woman'],20,40,'x','country',true)`, [D])), /row-level security/)
    await fails(() => as(D, () => rpc('redeem_invite', 'mauvais')), /invalid_invite/)
  })
  it('la majorité est imposée par la base (mineur refusé, déclaration obligatoire)', async () => {
    const mineur = `${new Date().getFullYear() - 16}-01-01`
    await fails(() => as(A, () => q(`update public.profiles set birthdate = $1 where user_id = $2`, [mineur, A])), /adult_only/)
    await fails(() => as(A, () => q(`update public.profiles set adult_declared = false where user_id = $1`, [A])), /adult_declaration_required|check|violates/)
  })
  it('tables sensibles fermées : encounters, reports, invite_codes', async () => {
    for (const t of ['encounters', 'reports', 'invite_codes', 'rate_events', 'proposals']) await fails(() => as(A, () => q(`select * from public.${t}`)), /permission denied/)
  })
})

describe('matching côté serveur', () => {
  it('propose une seule personne compatible ; limite d’une proposition par jour ; une rencontre active à la fois', async () => {
    await resetEncounters()
    const id = await as(A, () => rpc('propose_match'))
    const enc = await as(A, () => rpc('get_my_encounter'))
    expect(enc.id).toBe(id); expect(enc.partner.pseudo).toBe('Basile')   // Chloé (femme) n’est pas compatible avec Alex (femme → homme)
    await fails(() => as(A, () => rpc('propose_match')), /busy/)
    await as(A, () => rpc('respond_proposal', id, false))
    await fails(() => as(A, () => rpc('propose_match')), /daily_limit/)
  })
  it('personne de disponible → null (jamais de faux match)', async () => {
    await resetEncounters()
    const E = '00000000-0000-0000-0000-00000000000e'
    await db.exec(`insert into auth.users values ('${E}')`)
    await as(E, () => rpc('redeem_invite', 'sesame'))
    await as(E, () => q(`insert into public.profiles(user_id,pseudo,birthdate,gender,seeks,age_min,age_max,region,scope,adult_declared,onboarded) values ($1,'Eli','1990-01-01','man',array['nonbinary'],20,40,'Bretagne','country',true,true)`, [E]))
    expect(await as(E, () => rpc('propose_match'))).toBeNull() // personne de compatible : état « personne pour l'instant »
  })
})

describe('F · un refus : aucune photo, refus non divulgué', () => {
  it('oui + non → closed ; personne ne peut lire la photo ; l’autre ne voit que l’issue neutre', async () => {
    await resetEncounters()
    const id = await readyEncounter()
    await db.exec(`insert into storage.objects(bucket_id,name,owner) values ('photos','${B}/me.jpg','${B}')`)
    expect(await as(A, () => rpc('submit_consent', id, true))).toBe('waiting')
    expect(await as(B, () => rpc('submit_consent', id, false))).toBe('kind_end')
    const eA = await as(A, () => rpc('get_my_encounter')), eB = await as(B, () => rpc('get_my_encounter'))
    expect(eA.outcome).toBe('kind_end'); expect(eB.outcome).toBe('kind_end')
    expect(eA.partner.user_id).toBeNull()                       // pas d’identifiant donc pas de chemin de photo
    expect(JSON.stringify(eA)).not.toContain('"my_consent":false') // A a dit oui ; rien sur la réponse de B
    expect((await as(A, () => q(`select name from storage.objects where bucket_id='photos'`))).rows).toEqual([])
    expect((await as(A, () => q(`select * from public.consents`))).rows.map((r: any) => r.user_id)).toEqual([A]) // je ne lis que MA réponse
  })
  it('avant tout consentement : photos de l’autre inaccessibles', async () => {
    await resetEncounters()
    await readyEncounter()
    await db.exec(`insert into storage.objects(bucket_id,name,owner) values ('photos','${B}/me.jpg','${B}')`)
    expect((await as(A, () => q(`select name from storage.objects where bucket_id='photos'`))).rows).toEqual([])
    expect((await as(B, () => q(`select name from storage.objects where bucket_id='photos'`))).rows).toHaveLength(1) // le propriétaire voit la sienne
    await fails(() => as(A, () => q(`insert into storage.objects(bucket_id,name,owner) values ('photos','${B}/fake.jpg','${A}')`)), /row-level security/) // on ne peut pas écrire chez l’autre
  })
  it('consentement refusé tant que le parcours n’est pas terminé', async () => {
    await resetEncounters()
    const id = await as(A, () => rpc('propose_match'))
    await as(A, () => rpc('respond_proposal', id, true)); await as(B, () => rpc('respond_proposal', id, true))
    await fails(() => as(A, () => rpc('submit_consent', id, true)), /not_ready/)
  })
})

describe('G · deux accords : photos accessibles uniquement après validation', () => {
  it('oui + oui → revealed ; chacun lit la photo de l’autre ; un tiers n’y a pas accès', async () => {
    await resetEncounters()
    const id = await readyEncounter()
    await db.exec(`insert into storage.objects(bucket_id,name,owner) values ('photos','${B}/me.jpg','${B}'), ('photos','${A}/me.jpg','${A}')`)
    await as(A, () => rpc('submit_consent', id, true))
    expect((await as(A, () => q(`select name from storage.objects where bucket_id='photos'`))).rows).toHaveLength(1) // pas encore
    expect(await as(B, () => rpc('submit_consent', id, true))).toBe('revealed')
    expect((await as(A, () => q(`select name from storage.objects where bucket_id='photos'`))).rows).toHaveLength(2)
    expect((await as(B, () => q(`select name from storage.objects where bucket_id='photos'`))).rows).toHaveLength(2)
    expect((await as(C, () => q(`select name from storage.objects where bucket_id='photos'`))).rows).toEqual([])
    expect((await as(A, () => rpc('get_my_encounter'))).partner.user_id).toBe(B)
  })
  it('simultanéité : quel que soit l’ordre d’arrivée, une seule issue cohérente', async () => {
    // PGlite n’a qu’une connexion : on teste les deux ordres d’arrivée. L’atomicité réelle repose sur le verrou
    // de ligne (select … for update) dans submit_consent, à valider sur une vraie instance Postgres/Supabase.
    for (const [first, second] of [[A, B], [B, A]] as const) {
      await resetEncounters()
      const id = await readyEncounter()
      expect(await as(first, () => rpc('submit_consent', id, true))).toBe('waiting')
      expect(await as(second, () => rpc('submit_consent', id, true))).toBe('revealed')
      expect((await q(`select status from public.encounters where id = $1`, [id])).rows[0].status).toBe('revealed')
      expect((await q(`select count(*)::int n from public.consents where encounter_id = $1`, [id])).rows[0].n).toBe(2)
    }
  })
  it('une réponse déjà donnée ne peut pas être modifiée', async () => {
    await resetEncounters()
    const id = await readyEncounter()
    await as(A, () => rpc('submit_consent', id, false))
    await as(A, () => rpc('submit_consent', id, true)) // ignoré (on conflict do nothing)
    expect((await q(`select answer from public.consents where encounter_id = $1 and user_id = $2`, [id, A])).rows[0].answer).toBe(false)
  })
})

describe('H · blocage', () => {
  it('bloquer coupe messages, jeux et photos, même après révélation', async () => {
    await resetEncounters()
    const id = await readyEncounter()
    await db.exec(`insert into storage.objects(bucket_id,name,owner) values ('photos','${B}/me.jpg','${B}')`)
    await as(A, () => rpc('submit_consent', id, true)); await as(B, () => rpc('submit_consent', id, true))
    await as(A, () => q(`insert into public.messages(encounter_id,sender,body) values ($1,$2,'salut')`, [id, A]))
    expect((await as(B, () => q(`select body from public.messages`))).rows).toHaveLength(1)
    expect((await as(A, () => q(`select name from storage.objects`))).rows).toHaveLength(1)
    await as(B, () => rpc('block_user', id))
    await fails(() => as(A, () => q(`insert into public.messages(encounter_id,sender,body) values ($1,$2,'encore ?')`, [id, A])), /row-level security/)
    await fails(() => as(A, () => q(`insert into public.game_moves(encounter_id,user_id,game,round_key) values ($1,$2,'mirror','zz')`, [id, A])), /row-level security/)
    expect((await as(A, () => q(`select body from public.messages`))).rows).toEqual([])
    expect((await as(A, () => q(`select name from storage.objects`))).rows).toEqual([])
    await fails(() => as(A, () => rpc('submit_consent', id, true)), /not_ready|forbidden/)
  })
  it('un utilisateur bloqué n’est plus jamais reproposé', async () => {
    await resetEncounters()
    const id = await readyEncounter()
    await as(A, () => rpc('block_user', id))
    await db.exec('delete from public.proposals')
    await as(B, () => rpc('propose_match'))
    expect((await as(B, () => rpc('get_my_encounter'))).partner.pseudo).toBe('Chloé') // jamais Alex (bloquée)
  })
  it('signalement enregistré mais illisible côté client', async () => {
    await resetEncounters()
    const id = await readyEncounter()
    await as(A, () => rpc('report_user', id, 'Propos déplacés'))
    expect((await q('select count(*)::int n from public.reports')).rows[0].n).toBe(1)
    await fails(() => as(A, () => q('select * from public.reports')), /permission denied/)
  })
})

describe('secret des jeux et messages', () => {
  it('Le Miroir : la réponse de l’autre reste invisible tant que je n’ai pas répondu', async () => {
    await resetEncounters()
    const id = await as(A, () => rpc('propose_match'))
    await as(A, () => rpc('respond_proposal', id, true)); await as(B, () => rpc('respond_proposal', id, true))
    await as(B, () => q(`insert into public.game_moves(encounter_id,user_id,game,round_key,payload) values ($1,$2,'mirror','m9','{"opt":"a"}')`, [id, B]))
    expect((await as(A, () => q(`select * from public.game_moves where game='mirror'`))).rows).toEqual([])
    await as(A, () => q(`insert into public.game_moves(encounter_id,user_id,game,round_key,payload) values ($1,$2,'mirror','m9','{"opt":"b"}')`, [id, A]))
    expect((await as(A, () => q(`select * from public.game_moves where game='mirror'`))).rows).toHaveLength(2)
  })
  it('un tiers ne peut ni lire ni écrire dans la conversation', async () => {
    await resetEncounters()
    const id = await readyEncounter()
    await as(A, () => q(`insert into public.messages(encounter_id,sender,body) values ($1,$2,'privé')`, [id, A]))
    expect((await as(C, () => q('select * from public.messages'))).rows).toEqual([])
    await fails(() => as(C, () => q(`insert into public.messages(encounter_id,sender,body) values ($1,$2,'intrus')`, [id, C])), /row-level security/)
    await fails(() => as(B, () => q(`insert into public.messages(encounter_id,sender,body) values ($1,$2,'usurpation')`, [id, A])), /row-level security/)
  })
  it('limitation d’abus : trop de messages à la minute', async () => {
    await resetEncounters()
    const id = await readyEncounter()
    await fails(async () => { for (let i = 0; i < 40; i++) await as(A, () => q(`insert into public.messages(encounter_id,sender,body) values ($1,$2,$3)`, [id, A, 'm' + i])) }, /rate_limited/)
  })
})

describe('suppression du compte', () => {
  it('efface profil, réponses, photos et rencontres', async () => {
    await resetEncounters()
    await readyEncounter()
    await db.exec(`insert into storage.objects(bucket_id,name,owner) values ('photos','${B}/me.jpg','${B}')`)
    await as(B, () => rpc('delete_my_account'))
    expect((await q(`select count(*)::int n from public.profiles where user_id = $1`, [B])).rows[0].n).toBe(0)
    expect((await q(`select count(*)::int n from storage.objects where name like $1`, [B + '%'])).rows[0].n).toBe(0)
    expect((await q(`select count(*)::int n from public.encounters`)).rows[0].n).toBe(0)
  })
})
