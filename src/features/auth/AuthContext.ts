import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { MotivoCierre } from './politicaSesion'

export interface AuthContextValue {
  /** undefined mientras se revisa si hay una sesión guardada. */
  session: Session | null | undefined
  /** Por qué se cerró la última sesión, para explicarlo en el login. */
  motivoCierre: MotivoCierre | null
  /** Segundos que faltan para cerrar por inactividad, o null si no hay aviso. */
  avisoInactividadSegundos: number | null
  /** Entra con el nombre de usuario (o el correo de la cuenta compartida) y la contraseña. */
  iniciarSesion: (usuario: string, password: string) => Promise<{ error: string | null }>
  cerrarSesion: () => Promise<void>
  cerrarSesionEnTodos: () => Promise<{ error: string | null }>
  seguirConectado: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
