/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAP_STYLE_URL_LIGHT?: string
  readonly VITE_MAP_STYLE_URL_DARK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
