/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAP_STYLE_URL_LIGHT?: string
  readonly VITE_MAP_STYLE_URL_DARK?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
