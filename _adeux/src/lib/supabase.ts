import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null | undefined
/** Client Supabase — uniquement la clé publique (anon). Retourne null si non configuré (mode démo). */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  client = url && key ? createClient(url, key, { auth: { persistSession: true, storageKey: 'adeux:auth', autoRefreshToken: true } }) : null
  return client
}
export const realModeAvailable = () => !!getSupabase()
