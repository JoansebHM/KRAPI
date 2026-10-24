import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { generarDocs } from './scripts/docs/generar.ts'

/**
 * Documentación navegable en /docs, generada a partir de los .md del repositorio.
 * En desarrollo se regenera en cada visita; al compilar queda en dist/docs/index.html.
 */
function documentacion(): Plugin {
  let raiz = process.cwd()
  return {
    name: 'krapi-docs',
    configResolved(config) {
      raiz = config.root
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const ruta = req.url?.split('?')[0]
        if (ruta !== '/docs' && ruta !== '/docs/' && ruta !== '/docs/index.html') return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(generarDocs(raiz))
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'docs/index.html', source: generarDocs(raiz) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), documentacion()],
  worker: {
    // El worker de MapLibre se carga como módulo ES.
    format: 'es',
  },
})
