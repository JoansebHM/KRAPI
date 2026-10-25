/**
 * Pone una contraseña temporal a otra cuenta (decisión 0022). Las cuentas no tienen correo, así
 * que es la forma de ayudar a quien olvidó la suya sin usar la terminal.
 *
 * Solo un admin activo puede llamarla. Cambiar la contraseña de otro exige la clave secreta, que
 * vive aquí y nunca llega al navegador. Después cierra las sesiones abiertas de esa cuenta.
 *
 * POST { usuario_id: string, password: string } → 200 { ok: true } | 4xx { error: string }
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

/** Debe coincidir con MINIMO_CLAVE de src/features/auth/nombreDeUsuario.ts. */
const MINIMO_CLAVE = 10

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (status: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (peticion.method !== 'POST') return responder(405, { error: 'Método no permitido.' })

  const url = Deno.env.get('SUPABASE_URL')!
  const autorizacion = peticion.headers.get('Authorization')
  if (!autorizacion) return responder(401, { error: 'Vuelve a iniciar sesión.' })

  // Con la sesión de quien llama: RLS y es_admin() deciden si puede hacerlo.
  const comoQuienLlama = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: autorizacion } },
  })
  const { data: quien } = await comoQuienLlama.auth.getUser()
  const { data: esAdmin } = await comoQuienLlama.rpc('es_admin')
  if (!quien.user || esAdmin !== true) return responder(403, { error: 'Solo un admin puede restablecer contraseñas.' })

  const { usuario_id: usuarioId, password } = await peticion.json().catch(() => ({}))
  if (typeof usuarioId !== 'string' || typeof password !== 'string') return responder(400, { error: 'Faltan datos.' })
  if (password.length < MINIMO_CLAVE) return responder(400, { error: `La contraseña debe tener al menos ${MINIMO_CLAVE} caracteres.` })
  if (usuarioId === quien.user.id) return responder(400, { error: 'Para cambiar tu propia contraseña usa Mi perfil.' })

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: perfil } = await admin.from('perfiles').select('id').eq('id', usuarioId).maybeSingle()
  if (!perfil) return responder(404, { error: 'La cuenta no existe.' })

  const { error: errorClave } = await admin.auth.admin.updateUserById(usuarioId, { password })
  if (errorClave) {
    const mensaje =
      errorClave.code === 'weak_password'
        ? `La contraseña debe tener al menos ${MINIMO_CLAVE} caracteres.`
        : 'No se pudo cambiar la contraseña. Inténtalo de nuevo.'
    return responder(422, { error: mensaje })
  }

  // Quien tenía la sesión abierta con la contraseña anterior tendrá que volver a entrar.
  await admin.rpc('cerrar_sesiones', { usuario_id: usuarioId })
  return responder(200, { ok: true })
})
