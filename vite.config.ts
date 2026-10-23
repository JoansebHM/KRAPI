import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    // El worker de MapLibre se carga como módulo ES.
    format: 'es',
  },
})
