const DEFAULT_MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty'
const DEFAULT_MAP_STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark'

export const env = {
  mapStyles: {
    light: import.meta.env.VITE_MAP_STYLE_URL_LIGHT || DEFAULT_MAP_STYLE_LIGHT,
    dark: import.meta.env.VITE_MAP_STYLE_URL_DARK || DEFAULT_MAP_STYLE_DARK,
  },
} as const
