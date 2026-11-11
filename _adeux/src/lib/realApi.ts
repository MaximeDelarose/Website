// Couche d'accès au MODE RÉEL (Supabase). Elle appelle uniquement les fonctions/politiques de la migration 0001.
// ÉTAT : écrite et typée, mais NON branchée à l'interface et NON testée contre une instance Supabase réelle
// (les politiques, elles, sont testées sur PostgreSQL : tests/unit/db.test.ts).
import { getSupabase } from './supabase'
import type { Answers, Profile } from './types'

const sb = () => { const c = getSupabase(); if (!c) throw new Error('Supabase non configuré (mode démo)'); return c }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ok = (r: { data?: any; error: { message: string } | null }): any => { if (r.error) throw new Error(r.error.message); return r.data }

export const realApi = {
  signUp: (email: string, password: string) => sb().auth.signUp({ email, password }).then(ok),
  signIn: (email: string, password: string) => sb().auth.signInWithPassword({ email, password }).then(ok),
  signOut: () => sb().auth.signOut(),
  redeemInvite: (code: string) => sb().rpc('redeem_invite', { code }).then(ok),

  async saveProfile(p: Profile, answers: Answers, onboarded: boolean) {
    const uid = (await sb().auth.getUser()).data.user?.id; if (!uid) throw new Error('Non connecté')
    ok(await sb().from('profiles').upsert({ user_id: uid, pseudo: p.pseudo, birthdate: p.birthdate, gender: p.gender, seeks: p.seeks, age_min: p.ageMin, age_max: p.ageMax, region: p.region, scope: p.scope, show_exact_age: p.showExactAge, adult_declared: p.adultDeclared, onboarded }))
    const rows = Object.entries(answers).map(([question_id, a]) => ({ user_id: uid, question_id, value: a.v, must: !!a.must }))
    if (rows.length) ok(await sb().from('answers').upsert(rows))
  },
  proposeMatch: () => sb().rpc('propose_match').then(ok),                       // null = personne de disponible
  myEncounter: () => sb().rpc('get_my_encounter').then(ok),
  respond: (enc: string, accept: boolean) => sb().rpc('respond_proposal', { enc, accept }).then(ok),
  consent: (enc: string, yes: boolean) => sb().rpc('submit_consent', { enc, yes }).then(ok) as Promise<'waiting' | 'revealed' | 'kind_end'>,
  leave: (enc: string, pause = false) => sb().rpc('leave_encounter', { enc, pause }).then(ok),
  block: (enc: string) => sb().rpc('block_user', { enc }).then(ok),
  report: (enc: string, reason: string) => sb().rpc('report_user', { enc, reason }).then(ok),
  deleteAccount: () => sb().rpc('delete_my_account').then(ok),

  async sendMessage(encounter_id: string, body: string) {
    const sender = (await sb().auth.getUser()).data.user?.id; if (!sender) throw new Error('Non connecté')
    ok(await sb().from('messages').insert({ encounter_id, sender, body }))
  },
  messages: (encounter_id: string) => sb().from('messages').select('*').eq('encounter_id', encounter_id).order('created_at').then(ok),
  subscribeMessages: (encounter_id: string, cb: (row: unknown) => void) =>
    sb().channel(`enc-${encounter_id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `encounter_id=eq.${encounter_id}` }, (p) => cb(p.new)).subscribe(),
  submitMove: (encounter_id: string, game: string, round_key: string, payload: unknown) => sb().from('game_moves').insert({ encounter_id, game, round_key, payload }).then(ok),
  moves: (encounter_id: string, game: string) => sb().from('game_moves').select('*').eq('encounter_id', encounter_id).eq('game', game).then(ok),

  async uploadPhoto(blob: Blob) {
    const uid = (await sb().auth.getUser()).data.user?.id; if (!uid) throw new Error('Non connecté')
    ok(await sb().storage.from('photos').upload(`${uid}/me.jpg`, blob, { upsert: true, contentType: 'image/jpeg' }))
  },
  /** URL signée courte : n'aboutit que si la politique de stockage l'autorise (révélation validée). */
  partnerPhotoUrl: async (partnerId: string) => (await sb().storage.from('photos').createSignedUrl(`${partnerId}/me.jpg`, 120)).data?.signedUrl ?? null,
}
