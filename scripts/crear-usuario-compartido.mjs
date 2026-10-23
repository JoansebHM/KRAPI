/**
 * Crea (o actualiza) el usuario compartido con el que el equipo de Kratos inicia sesión en KRAPI.
 *
 * Uso:  npm run usuario:crear
 *
 * Lee de .env.local:
 *   VITE_SUPABASE_URL      URL del proyecto (https://<id>.supabase.co)
 *   SUPABASE_SECRET_KEY    Clave secreta (Project Settings → API Keys). NUNCA con prefijo VITE_.
 *   KRAPI_USUARIO_EMAIL    Correo del usuario compartido
 *
 * La contraseña se pide al correr el script y no se guarda en ningún archivo.
 */
import { createInterface } from 'node:readline'
import { stdin, stdout, exit, env } from 'node:process'

const MIN_PASSWORD = 10

const url = env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const secretKey = env.SUPABASE_SECRET_KEY
const email = env.KRAPI_USUARIO_EMAIL

const faltantes = [
  ['VITE_SUPABASE_URL', url],
  ['SUPABASE_SECRET_KEY', secretKey],
  ['KRAPI_USUARIO_EMAIL', email],
].filter(([, valor]) => !valor)

if (faltantes.length > 0) {
  console.error(`Faltan variables en .env.local: ${faltantes.map(([nombre]) => nombre).join(', ')}`)
  console.error('Mira .env.example para ver qué va en cada una.')
  exit(1)
}

/** Lee una línea. En una terminal no muestra lo que se escribe; si la entrada viene de otro lado, la lee tal cual. */
const lineasEntrada = stdin.isTTY ? null : createInterface({ input: stdin, terminal: false })[Symbol.asyncIterator]()

async function preguntarOculto(pregunta) {
  if (lineasEntrada) {
    stdout.write(pregunta)
    const { value } = await lineasEntrada.next()
    stdout.write('\n')
    return value ?? ''
  }
  return new Promise((resolve) => {
    let valor = ''
    const terminar = () => {
      stdin.off('data', alEscribir)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write('\n')
    }
    const alEscribir = (texto) => {
      for (const caracter of texto) {
        if (caracter === '\r' || caracter === '\n') {
          terminar()
          resolve(valor)
          return
        }
        if (caracter === '\u0003') {
          terminar()
          exit(130)
        }
        if (caracter === '\u007f' || caracter === '\b') valor = valor.slice(0, -1)
        else valor += caracter
      }
    }
    // Primero se apaga el eco de la terminal y luego se muestra la pregunta,
    // para que ni siquiera una contraseña pegada muy rápido alcance a verse.
    stdin.setRawMode(true)
    stdin.setEncoding('utf8')
    stdout.write(pregunta)
    stdin.resume()
    stdin.on('data', alEscribir)
  })
}

const password = await preguntarOculto(`Contraseña para ${email} (mínimo ${MIN_PASSWORD} caracteres): `)
if (password.length < MIN_PASSWORD) {
  console.error(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
  exit(1)
}
const confirmacion = await preguntarOculto('Repite la contraseña: ')
if (password !== confirmacion) {
  console.error('Las contraseñas no coinciden.')
  exit(1)
}

// Las claves nuevas (sb_secret_...) van solo en "apikey"; las antiguas (JWT) también en Authorization.
const headers = { apikey: secretKey, 'Content-Type': 'application/json' }
if (secretKey.startsWith('eyJ')) headers.Authorization = `Bearer ${secretKey}`

async function admin(path, method, body) {
  const res = await fetch(`${url}/auth/v1/admin${path}`, { method, headers, body: body && JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

const creado = await admin('/users', 'POST', { email, password, email_confirm: true })
if (creado.ok) {
  console.log(`Usuario ${email} creado. Ya puede iniciar sesión en KRAPI.`)
  exit(0)
}

// Si ya existe, se actualiza su contraseña.
const yaExiste = creado.status === 422 || /already/i.test(JSON.stringify(creado.data))
if (!yaExiste) {
  console.error(`No se pudo crear el usuario (HTTP ${creado.status}):`, creado.data.msg ?? creado.data.message ?? creado.data)
  exit(1)
}

const lista = await admin('/users?per_page=1000', 'GET')
const usuario = lista.data.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
if (!usuario) {
  console.error('El usuario ya existe pero no se pudo encontrar para actualizarlo.')
  exit(1)
}
const actualizado = await admin(`/users/${usuario.id}`, 'PUT', { password })
if (!actualizado.ok) {
  console.error(`No se pudo actualizar la contraseña (HTTP ${actualizado.status}).`)
  exit(1)
}
console.log(`El usuario ${email} ya existía: se actualizó su contraseña.`)
