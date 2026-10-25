import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Perfil } from './api'
import type { MotivoCierre } from './politicaSesion'

export interface AuthContextValue {
  /** undefined mientras se revisa si hay una sesión guardada. */
  session: Session | null | undefined
  /** Perfil de la cuenta. undefined mientras se carga (o si no se pudo cargar: ver errorPerfil). */
  perfil: Perfil | undefined
  errorPerfil: boolean
  recargarPerfil: () => void
  /** Si la cuenta es admin activo. La seguridad real está en RLS; esto solo decide qué se muestra. */
  esAdmin: boolean
  /** Por qué se cerró la última sesión, para explicarlo en el login. */
  motivoCierre: MotivoCierre | null
  /** Segundos que faltan para cerrar por inactividad, o null si no hay aviso. */
  avisoInactividadSegundos: number | null
  /** Entra con el nombre de usuario y la contraseña. */
  iniciarSesion: (usuario: string, password: string) => Promise<{ error: string | null }>
  /** Crea una cuenta pendiente de aprobación y entra con ella. */
  registrarse: (datos: DatosRegistro) => Promise<{ error: string | null }>
  cerrarSesion: () => Promise<void>
  cerrarSesionEnTodos: () => Promise<{ error: string | null }>
  seguirConectado: () => void
}

export interface DatosRegistro {
  nombre: string
  usuario: string
  password: string
}

export const AuthContext = createContext<AuthContextValue | null>(null)
