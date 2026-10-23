import { QueryClient } from '@tanstack/react-query'

/** Caché de datos compartida por toda la app (categorías, responsables, ubicaciones...). */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Los datos se consideran frescos 30 s; al volver a la app se actualizan solos.
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
