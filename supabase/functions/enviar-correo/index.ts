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
 *   - cuenta_aprobada y cuenta_rechazada: avisa a la persona, si guardó su correo.
 *
 * Secretos (`supabase secrets set`): BREVO_API_KEY, BREVO_REMITENTE_CORREO,
 * BREVO_REMITENTE_NOMBRE y CORREOS_SECRETO. Opcional: KIRA_URL, la dirección de la app.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const EVENTOS = ['registro_pendiente', 'cuenta_aprobada', 'cuenta_rechazada'] as const
type Evento = (typeof EVENTOS)[number]

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

/** Los nombres los escribe cualquiera al registrarse: nunca van al HTML sin escapar. */
const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

interface Mensaje {
  asunto: string
  parrafos: string[]
  /** Texto y enlace del botón (opcional). */
  accion?: { texto: string; enlace: string }
}

function armarMensaje(evento: Evento, perfil: { nombre: string; usuario: string }, urlApp: string | undefined): Mensaje {
  const alUsuarios = urlApp ? { texto: 'Revisar solicitudes', enlace: `${urlApp.replace(/\/$/, '')}/usuarios` } : undefined
  const alMapa = urlApp ? { texto: 'Abrir KIRA', enlace: urlApp } : undefined

  if (evento === 'registro_pendiente') {
    return {
      asunto: 'Nueva cuenta esperando aprobación en KIRA',
      parrafos: [
        `${perfil.nombre} (@${perfil.usuario}) creó una cuenta en KIRA y espera que un admin la apruebe.`,
        'Puedes aprobarla o rechazarla desde la página de Usuarios.',
      ],
      accion: alUsuarios,
    }
  }
  if (evento === 'cuenta_aprobada') {
    return {
      asunto: 'Tu cuenta de KIRA fue aprobada',
      parrafos: [
        `Hola ${perfil.nombre}, un admin aprobó tu cuenta de KIRA.`,
        `Ya puedes ingresar con tu nombre de usuario: ${perfil.usuario}.`,
      ],
      accion: alMapa,
    }
  }
  return {
    asunto: 'Tu cuenta de KIRA no fue aprobada',
    parrafos: [
      `Hola ${perfil.nombre}, un admin del equipo no aprobó tu cuenta de KIRA.`,
      'Si crees que es un error, habla con alguien del equipo de Kratos.',
    ],
  }
}

function aHtml(mensaje: Mensaje) {
  const boton = mensaje.accion
    ? `<p><a href="${escapar(mensaje.accion.enlace)}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none">${escapar(mensaje.accion.texto)}</a></p>`
    : ''
  const cuerpo = mensaje.parrafos.map((p) => `<p>${escapar(p)}</p>`).join('')
  return `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#111">${cuerpo}${boton}<p style="color:#666;font-size:13px">KIRA · Kratos Innovation Lab</p></div>`
}

const aTexto = (mensaje: Mensaje) =>
  [...mensaje.parrafos, mensaje.accion?.enlace, 'KIRA · Kratos Innovation Lab'].filter(Boolean).join('\n\n')

/** Envía un correo con Brevo. Devuelve true si Brevo lo aceptó. */
async function enviar(para: string, mensaje: Mensaje): Promise<boolean> {
  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': Deno.env.get('BREVO_API_KEY')!, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: Deno.env.get('BREVO_REMITENTE_NOMBRE') ?? 'KIRA', email: Deno.env.get('BREVO_REMITENTE_CORREO')! },
      to: [{ email: para }],
      subject: mensaje.asunto,
      htmlContent: aHtml(mensaje),
      textContent: aTexto(mensaje),
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
  const { data: perfil } = await admin.from('perfiles').select('id, nombre, usuario, estado').eq('id', perfilId).maybeSingle()
  if (!perfil) return responder(404, { error: 'La cuenta no existe.' })

  // El estado debe coincidir con el evento: así repetir una petición vieja no manda avisos falsos.
  const estadoEsperado = { registro_pendiente: 'pendiente', cuenta_aprobada: 'activo', cuenta_rechazada: 'rechazado' }[evento as Evento]
  if (perfil.estado !== estadoEsperado) return responder(200, { enviados: 0 })

  // A quién se le avisa.
  let destinatarios: string[]
  if (evento === 'registro_pendiente') {
    const { data: admins } = await admin.from('perfiles').select('id').eq('estado', 'activo').eq('rol', 'admin')
    const ids = (admins ?? []).map((a) => a.id)
    const { data: contactos } = await admin.from('contactos').select('correo').in('perfil_id', ids)
    destinatarios = (contactos ?? []).map((c) => c.correo)
  } else {
    const { data: contacto } = await admin.from('contactos').select('correo').eq('perfil_id', perfilId).maybeSingle()
    destinatarios = contacto ? [contacto.correo] : []
  }

  const mensaje = armarMensaje(evento as Evento, perfil, Deno.env.get('KIRA_URL'))
  // Un correo por persona, para que los admins no vean las direcciones de los demás.
  const resultados = await Promise.all(destinatarios.map((para) => enviar(para, mensaje).catch(() => false)))
  return responder(200, { enviados: resultados.filter(Boolean).length })
})
