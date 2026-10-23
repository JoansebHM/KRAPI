import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// MapLibre busca su worker con una ruta relativa a su propio archivo, y esa ruta
// se rompe cuando Vite empaqueta la librería. Le pasamos la URL del worker
// ya empaquetado por Vite para que funcione igual en desarrollo y en producción.
setWorkerUrl(workerUrl)

export * from 'maplibre-gl'
