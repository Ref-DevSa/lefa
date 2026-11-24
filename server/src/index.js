import { createApp } from './app.js'
import { parseOrigins } from './lib/cors.js'
import { createSupabaseFactory } from './lib/supabase.js'

const port = Number(process.env.PORT) || 3001
const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy server/.env.example to server/.env.')
  process.exit(1)
}

const corsOrigins = parseOrigins(process.env.CORS_ORIGIN)

createApp({ supabase: createSupabaseFactory({ url, anonKey }), corsOrigins }).listen(port, () => {
  console.log(`Lefa API listening on port ${port}; allowing browser calls from ${corsOrigins.join(', ')}`)
})
