import { createClient } from '@supabase/supabase-js'

// The browser only ever gets the public "anon" key. On its own it can do
// nothing RLS doesn't allow; the user's login token decides what they see.
// The service_role (master) key must never appear in client code.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy client/.env.example to client/.env.local.')
}

export const supabase = createClient(url, anonKey)
