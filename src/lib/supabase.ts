import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'
import type { Database } from '../types/database'

/**
 * Cliente único de Supabase para toda la app.
 * Guarda la sesión en el navegador y renueva el token automáticamente mientras la app esté abierta.
 */
export const supabase = createClient<Database>(
  env.supabase.url || 'http://localhost',
  env.supabase.publishableKey || 'sin-configurar',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'krapi-auth',
    },
  },
)
