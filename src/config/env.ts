const DEFAULT_MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty'

export const env = {
  mapStyles: {
    light: import.meta.env.VITE_MAP_STYLE_URL_LIGHT || DEFAULT_MAP_STYLE_LIGHT,
    /** Si no se configura, el modo oscuro se genera a partir del estilo claro (ver nightStyle.ts). */
    dark: import.meta.env.VITE_MAP_STYLE_URL_DARK || undefined,
  },
} as const
