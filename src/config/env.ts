const DEFAULT_MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty'

export const env = {
  mapStyles: {
    light: import.meta.env.VITE_MAP_STYLE_URL_LIGHT || DEFAULT_MAP_STYLE_LIGHT,
    /** Si no se configura, el modo oscuro se genera a partir del estilo claro (ver nightStyle.ts). */
    dark: import.meta.env.VITE_MAP_STYLE_URL_DARK || undefined,
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    /** Clave pública (publishable o anon). Es segura en el navegador porque los datos están protegidos con RLS. */
    publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  },
} as const

/** Variables obligatorias que faltan en .env.local. */
export const variablesFaltantes = [
  ['VITE_SUPABASE_URL', env.supabase.url],
  ['VITE_SUPABASE_PUBLISHABLE_KEY', env.supabase.publishableKey],
]
  .filter(([, valor]) => !valor)
  .map(([nombre]) => nombre)
