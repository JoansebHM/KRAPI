import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { usePerfil } from './api'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { mensajeDeError } from './mensajesError'
import { correoParaEntrar } from './nombreDeUsuario'
import {
  borrarMarcas,
  evaluarSesion,
  leerMarcas,
  registrarActividad,
  registrarInicio,
  type MotivoCierre,
} from './politicaSesion'

/** Cada cuánto se revisa la política de sesión. */
const INTERVALO_REVISION_MS = 1000
/** Para no escribir en el almacenamiento con cada toque, la actividad se registra como máximo cada 15 s. */
const INTERVALO_REGISTRO_ACTIVIDAD_MS = 15 * 1000
const EVENTOS_DE_ACTIVIDAD = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [motivoCierre, setMotivoCierre] = useState<MotivoCierre | null>(null)
  const [avisoInactividadSegundos, setAvisoInactividadSegundos] = useState<number | null>(null)
  // Motivo del próximo cierre, cuando lo inicia esta misma pestaña.
  const motivoPendienteRef = useRef<MotivoCierre | null>(null)
  const queryClient = useQueryClient()

  // Sesión guardada y cambios de sesión (inicio, cierre, renovación del token).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      setSession(nuevaSesion)
      if (evento === 'SIGNED_OUT') {
        // Si no lo cerró esta pestaña, lo cerró otra pestaña o se cerró en todos los dispositivos.
        setMotivoCierre(motivoPendienteRef.current ?? 'remoto')
        motivoPendienteRef.current = null
        setAvisoInactividadSegundos(null)
        borrarMarcas()
        // Si después entra otra cuenta en este dispositivo, no debe ver datos de la anterior.
        queryClient.clear()
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const cerrarPor = useCallback(async (motivo: MotivoCierre) => {
    motivoPendienteRef.current = motivo
    await supabase.auth.signOut({ scope: 'local' })
  }, [])

  // Perfil de la cuenta: rol y estado. Si un admin la desactiva con la app abierta, se cierra la sesión.
  const consultaPerfil = usePerfil(session?.user.id)
  const perfil = consultaPerfil.data
  const estadoAnteriorRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (perfil?.estado === 'desactivado' && estadoAnteriorRef.current === 'activo') void cerrarPor('cuenta_desactivada')
    estadoAnteriorRef.current = perfil?.estado
  }, [perfil?.estado, cerrarPor])

  // Política de sesión: inactividad (2 h) y duración máxima (7 días).
  const haySesion = Boolean(session)
  useEffect(() => {
    if (!haySesion) return

    const revisar = () => {
      const estado = evaluarSesion({ ahora: Date.now(), ...leerMarcas() })
      if (estado.tipo === 'cerrar') {
        void cerrarPor(estado.motivo)
      } else {
        setAvisoInactividadSegundos(estado.tipo === 'aviso' ? Math.ceil(estado.restanteMs / 1000) : null)
      }
    }

    // Se revisa antes de contar actividad: si la app se abre después de 2 h, primero se cierra la sesión.
    revisar()

    let ultimoRegistro = 0
    const alHaberActividad = () => {
      const ahora = Date.now()
      if (ahora - ultimoRegistro < INTERVALO_REGISTRO_ACTIVIDAD_MS) return
      // Si ya se venció, la actividad no la revive.
      if (evaluarSesion({ ahora, ...leerMarcas(ahora) }).tipo === 'cerrar') return
      ultimoRegistro = ahora
      registrarActividad(ahora)
    }
    const alVolverAVer = () => {
      if (document.visibilityState === 'visible') revisar()
    }

    const intervalo = window.setInterval(revisar, INTERVALO_REVISION_MS)
    EVENTOS_DE_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, alHaberActividad, { passive: true }))
    document.addEventListener('visibilitychange', alVolverAVer)
    return () => {
      window.clearInterval(intervalo)
      EVENTOS_DE_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, alHaberActividad))
      document.removeEventListener('visibilitychange', alVolverAVer)
    }
  }, [haySesion, cerrarPor])

  const iniciarSesion = useCallback<AuthContextValue['iniciarSesion']>(async (usuario, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: correoParaEntrar(usuario), password })
      if (error) return { error: mensajeDeError(error) }
      registrarInicio()
      setMotivoCierre(null)
      return { error: null }
    } catch (error) {
      return { error: mensajeDeError(error) }
    }
  }, [])

  const registrarse = useCallback<AuthContextValue['registrarse']>(async ({ nombre, usuario, password, avatarSemilla }) => {
    try {
      // El nombre y el avatar viajan en los metadatos para que el trigger crear_perfil los guarde en el perfil.
      const { error } = await supabase.auth.signUp({
        email: correoParaEntrar(usuario),
        password,
        options: { data: { nombre: nombre.trim(), avatar_semilla: avatarSemilla } },
      })
      if (error) return { error: mensajeDeError(error) }
      registrarInicio()
      setMotivoCierre(null)
      return { error: null }
    } catch (error) {
      return { error: mensajeDeError(error) }
    }
  }, [])

  const cerrarSesion = useCallback(() => cerrarPor('manual'), [cerrarPor])

  const cerrarSesionEnTodos = useCallback<AuthContextValue['cerrarSesionEnTodos']>(async () => {
    motivoPendienteRef.current = 'todos_los_dispositivos'
    // Revoca la sesión en todos los dispositivos. Los demás la pierden al renovar su token (máximo 1 hora).
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) {
      motivoPendienteRef.current = null
      return { error: mensajeDeError(error) }
    }
    return { error: null }
  }, [])

  const seguirConectado = useCallback(() => {
    registrarActividad()
    setAvisoInactividadSegundos(null)
  }, [])

  const { refetch: refetchPerfil } = consultaPerfil
  const recargarPerfil = useCallback(() => void refetchPerfil(), [refetchPerfil])
  const errorPerfil = consultaPerfil.isError && !perfil
  const esAdmin = perfil?.estado === 'activo' && perfil.rol === 'admin'

  const valor = useMemo<AuthContextValue>(
    () => ({
      session,
      perfil,
      errorPerfil,
      recargarPerfil,
      esAdmin,
      motivoCierre,
      avisoInactividadSegundos,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      cerrarSesionEnTodos,
      seguirConectado,
    }),
    [session, perfil, errorPerfil, recargarPerfil, esAdmin, motivoCierre, avisoInactividadSegundos, iniciarSesion, registrarse, cerrarSesion, cerrarSesionEnTodos, seguirConectado],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
