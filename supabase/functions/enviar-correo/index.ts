/**
 * Envía los avisos por correo de KIRA con Brevo (decisión 0035).
 *
 * Solo la llama la base de datos (triggers con pg_net), no el navegador: no tiene sesión de
 * usuario, así que se protege con un secreto compartido en el encabezado `x-kira-secreto`
 * (el mismo valor está en Vault como `correos_secreto`). La función no recibe el contenido del
 * correo, solo el evento y la cuenta: ella busca los datos y arma el mensaje, así nadie puede
 * usarla para mandar correos arbitrarios.
 *
 * POST { evento, perfil_id } → 200 { enviados: number } | 4xx/5xx { error: string }
 *
 * Eventos:
 *   - registro_pendiente: avisa a los admins activos que tengan correo.
 *   - registro_recibido, cuenta_aprobada y cuenta_rechazada: avisan a la persona, si guardó su correo.
 *
 * El diseño del correo está en `plantilla.ts`.
 *
 * Secretos (`supabase secrets set`): BREVO_API_KEY, BREVO_REMITENTE_CORREO,
 * BREVO_REMITENTE_NOMBRE y CORREOS_SECRETO. Opcional: KIRA_URL, la dirección de la app.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { armarMensaje, ESTADO_ESPERADO, EVENTOS, type Evento, type Mensaje } from './mensajes.ts'
import { aHtml, aTexto } from './plantilla.ts'

const responder = (status: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })

/** Compara sin que el tiempo de respuesta delate cuántos caracteres coinciden. */
function iguales(a: string, b: string) {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diferencia = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diferencia |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diferencia === 0
}

/** Envía un correo con Brevo. Devuelve true si Brevo lo aceptó. */
async function enviar(para: string, mensaje: Mensaje): Promise<boolean> {
  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': Deno.env.get('BREVO_API_KEY')!, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: Deno.env.get('BREVO_REMITENTE_NOMBRE') ?? 'KIRA', email: Deno.env.get('BREVO_REMITENTE_CORREO')! },
      to: [{ email: para }],
      subject: mensaje.asunto,
      htmlContent: aHtml(mensaje.correo, Deno.env.get('KIRA_URL')),
      textContent: aTexto(mensaje.correo),
    }),
  })
  if (!respuesta.ok) console.error(`Brevo respondió ${respuesta.status}: ${await respuesta.text().catch(() => '')}`)
  return respuesta.ok
}

Deno.serve(async (peticion) => {
  if (peticion.method !== 'POST') return responder(405, { error: 'Método no permitido.' })

  const secreto = Deno.env.get('CORREOS_SECRETO')
  const recibido = peticion.headers.get('x-kira-secreto')
  if (!secreto || !Deno.env.get('BREVO_API_KEY') || !Deno.env.get('BREVO_REMITENTE_CORREO')) {
    console.error('Falta configurar CORREOS_SECRETO, BREVO_API_KEY o BREVO_REMITENTE_CORREO.')
    return responder(500, { error: 'Servicio de correo sin configurar.' })
  }
  if (!recibido || !iguales(recibido, secreto)) return responder(401, { error: 'No autorizado.' })

  const { evento, perfil_id: perfilId } = await peticion.json().catch(() => ({}))
  if (!EVENTOS.includes(evento) || typeof perfilId !== 'string') return responder(400, { error: 'Faltan datos.' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  // Un error de la base de datos nunca debe pasar por "sin destinatarios": se responde 500 para que
  // se vea en la respuesta que guarda pg_net y en los registros de la función.
  const fallo = (donde: string, error: { message: string }) => {
    console.error(`No se pudo leer ${donde}: ${error.message}`)
    return responder(500, { error: `No se pudo leer ${donde}.` })
  }

  const { data: perfil, error: errorPerfil } = await admin.from('perfiles').select('id, nombre, usuario, estado').eq('id', perfilId).maybeSingle()
  if (errorPerfil) return fallo('la cuenta', errorPerfil)
  if (!perfil) return responder(404, { error: 'La cuenta no existe.' })

  // El estado debe coincidir con el evento: así repetir una petición vieja no manda avisos falsos.
  if (perfil.estado !== ESTADO_ESPERADO[evento as Evento]) return responder(200, { enviados: 0 })

  // A quién se le avisa.
  let destinatarios: string[]
  if (evento === 'registro_pendiente') {
    const { data: admins, error: errorAdmins } = await admin.from('perfiles').select('id').eq('estado', 'activo').eq('rol', 'admin')
    if (errorAdmins) return fallo('los admins', errorAdmins)
    const ids = (admins ?? []).map((a) => a.id)
    const { data: contactos, error: errorContactos } = await admin.from('contactos').select('correo').in('perfil_id', ids)
    if (errorContactos) return fallo('los correos', errorContactos)
    destinatarios = (contactos ?? []).map((c) => c.correo)
  } else {
    const { data: contacto, error: errorContacto } = await admin.from('contactos').select('correo').eq('perfil_id', perfilId).maybeSingle()
    if (errorContacto) return fallo('el correo', errorContacto)
    destinatarios = contacto ? [contacto.correo] : []
  }

  const mensaje = armarMensaje(evento as Evento, perfil, Deno.env.get('KIRA_URL'))
  // Un correo por persona, para que los admins no vean las direcciones de los demás.
  const resultados = await Promise.all(destinatarios.map((para) => enviar(para, mensaje).catch(() => false)))
  return responder(200, { enviados: resultados.filter(Boolean).length })
})
