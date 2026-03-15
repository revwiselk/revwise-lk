import { createClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
const svc  = import.meta.env.VITE_SUPABASE_SERVICE_KEY

if (!url || !anon) throw new Error('Missing Supabase env vars. Check .env.local')

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
})

// Use a completely separate storage key so both clients coexist silently
export const supabaseAdmin = svc
  ? createClient(url, svc, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'supabase-admin',
      },
    })
  : supabase