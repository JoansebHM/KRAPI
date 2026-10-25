/**
 * Lo que comparten los scripts de administración de cuentas (usuario:admin y usuario:clave).
 *
 * Leen de .env.local:
 *   VITE_SUPABASE_URL      URL del proyecto (https://<id>.supabase.co)
 *   SUPABASE_SECRET_KEY    Clave secreta (Project Settings → API Keys). NUNCA con prefijo VITE_.
 *
 * Las contraseñas se piden al correr el script y no se guardan en ningún archivo.
 */
import { createInterface } from 'node:readline'
import { stdin, stdout, exit, env } from 'node:process'

/** Debe coincidir con src/features/auth/nombreDeUsuario.ts y el trigger crear_perfil. */
export const DOMINIO_CUENTAS = 'usuarios.kira.invalid'
export const MINIMO_CLAVE = 10
const FORMATO_USUARIO = /^[a-z0-9._-]{3,30}$/

const url = env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const secretKey = env.SUPABASE_SECRET_KEY

const faltantes = [
  ['VITE_SUPABASE_URL', url],
  ['SUPABASE_SECRET_KEY', secretKey],
].filter(([, valor]) => !valor)

if (faltantes.length > 0) {
  console.error(`Faltan variables en .env.local: ${faltantes.map(([nombre]) => nombre).join(', ')}`)
  console.error('Mira .env.example para ver qué va en cada una.')
  exit(1)
}

export function fallar(mensaje) {
  console.error(mensaje)
  exit(1)
}

/** Lee una línea. En una terminal no muestra lo que se escribe; si la entrada viene de otro lado, la lee tal cual. */
const lineasEntrada = stdin.isTTY ? null : createInterface({ input: stdin, terminal: false })[Symbol.asyncIterator]()

export async function preguntar(pregunta) {
  if (lineasEntrada) {
    stdout.write(pregunta)
    const { value } = await lineasEntrada.next()
    stdout.write('\n')
    return (value ?? '').trim()
  }
  const lector = createInterface({ input: stdin, output: stdout })
  const respuesta = await new Promise((resolve) => lector.question(pregunta, resolve))
  lector.close()
  return respuesta.trim()
}

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

/** Pide una contraseña nueva dos veces, sin mostrarla. */
export async function pedirClaveNueva(paraQuien) {
  const password = await preguntarOculto(`Contraseña para ${paraQuien} (mínimo ${MINIMO_CLAVE} caracteres): `)
  if (password.length < MINIMO_CLAVE) fallar(`La contraseña debe tener al menos ${MINIMO_CLAVE} caracteres.`)
  const confirmacion = await preguntarOculto('Repite la contraseña: ')
  if (password !== confirmacion) fallar('Las contraseñas no coinciden.')
  return password
}

/** El nombre de usuario del primer argumento o, si no se pasó, preguntado. Se valida como en la app. */
export async function pedirUsuario() {
  const usuario = (process.argv[2] ?? (await preguntar('Nombre de usuario: '))).trim().toLowerCase()
  if (!FORMATO_USUARIO.test(usuario)) {
    fallar('El nombre de usuario debe tener de 3 a 30 caracteres: minúsculas sin tildes, números, punto, guion o guion bajo.')
  }
  return usuario
}

export const correoInterno = (usuario) => `${usuario}@${DOMINIO_CUENTAS}`

// Las claves nuevas (sb_secret_...) van solo en "apikey"; las antiguas (JWT) también en Authorization.
const headers = { apikey: secretKey, 'Content-Type': 'application/json' }
if (secretKey.startsWith('eyJ')) headers.Authorization = `Bearer ${secretKey}`

async function pedir(ruta, method, body, extra = {}) {
  const res = await fetch(`${url}${ruta}`, { method, headers: { ...headers, ...extra }, body: body && JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

/** API de administración de Supabase Auth. */
export const admin = (ruta, method, body) => pedir(`/auth/v1/admin${ruta}`, method, body)

/** Perfil de la cuenta con ese nombre de usuario, o null si no existe. */
export async function buscarPerfil(usuario) {
  const { ok, status, data } = await pedir(`/rest/v1/perfiles?usuario=eq.${encodeURIComponent(usuario)}&select=*`, 'GET')
  if (!ok) fallar(`No se pudo consultar las cuentas (HTTP ${status}): ${data.message ?? JSON.stringify(data)}`)
  return data[0] ?? null
}

/** Cambia el perfil con la clave secreta (por ejemplo, para nombrar al primer admin). */
export async function actualizarPerfil(id, cambios) {
  const { ok, status, data } = await pedir(`/rest/v1/perfiles?id=eq.${id}`, 'PATCH', cambios, { Prefer: 'return=representation' })
  if (!ok) fallar(`No se pudo actualizar la cuenta (HTTP ${status}): ${data.message ?? JSON.stringify(data)}`)
  return data[0]
}

export function mensajeDe(data) {
  return data.msg ?? data.message ?? JSON.stringify(data)
}
