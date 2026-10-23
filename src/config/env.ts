const DEFAULT_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export const env = {
  mapStyleUrl: import.meta.env.VITE_MAP_STYLE_URL || DEFAULT_MAP_STYLE,
} as const
