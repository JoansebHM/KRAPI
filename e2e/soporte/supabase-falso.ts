import type { BrowserContext, Route } from '@playwright/test'

/**
 * Supabase simulado para las pruebas: cuentas, inicio de sesión y una base de datos en memoria que
 * responde como PostgREST para las tablas que usa la app. Cada prueba tiene el suyo, vacío, con
 * las cuentas de `CUENTAS` (un admin, un miembro y una cuenta pendiente).
 *
 * Imita las reglas importantes del esquema real:
 * - registro con nombre de usuario (correo interno `<usuario>@usuarios.kira.invalid`): la cuenta queda pendiente
 * - permisos (RLS): una cuenta que no está activa no recibe datos ni puede crear nada; categorías y
 *   responsables solo los borra un admin; lugares, estudios, evidencias y archivos, quien los creó o un admin
 * - creado_por y actualizado_por los pone la base de datos con la cuenta que hace la petición
 * - funciones de admin para aprobar, rechazar, desactivar, reactivar y cambiar el rol
 * - cambiar la contraseña propia (PUT /auth/v1/user): mínimo 10 caracteres y distinta de la actual
 * - Edge Function restablecer-clave: un admin pone una contraseña temporal a otra cuenta
 * - un responsable solo se vincula a una cuenta (perfiles.responsable_id único) → 23505
 * - nombres únicos (sin importar mayúsculas ni espacios) en categorías y responsables → 23505
 * - borrar una categoría deja sus ubicaciones sin categoría (ON DELETE SET NULL)
 * - borrar un responsable lo quita de sus estudios (ON DELETE CASCADE)
 * - lugares_mapa() devuelve los lugares no archivados, zonas primero
 * - ubicaciones_cercanas() devuelve hasta 5 puntos no archivados a menos de N metros
 * - el teléfono de contacto debe tener formato de teléfono → 23514
 * - la hora de fin de un estudio debe ser posterior a la de inicio → 23514
 * - las notas de un estudio no pueden estar vacías → 23514
 * - los estudios traen embebidos sus responsables: estudio_responsables(responsable_id)
 * - una evidencia de foto, audio o documento lleva su archivo completo → 23514
 * - Storage: el bucket `evidencias` acepta solo sus tipos de archivo y hasta 50 MB, y firma enlaces
 * - si RLS no deja borrar, el borrado no da error: borra 0 filas
 *
 * En `ubicaciones`, `geom` se guarda directamente como GeoJSON (en la base real es PostGIS).
 * Si la app la envía como texto ('SRID=4326;POINT(lng lat)'), se convierte.
 */

export const DOMINIO_CUENTAS = 'usuarios.kira.invalid'
export const correoDe = (usuario: string) => `${usuario}@${DOMINIO_CUENTAS}`

/** Contraseña de todas las cuentas de prueba. */
export const CLAVE = 'clave-correcta-123'

type Rol = 'miembro' | 'admin'
type Estado = 'pendiente' | 'activo' | 'rechazado' | 'desactivado'

export interface Cuenta {
  id: string
  usuario: string
  password: string
  nombre: string
  rol: Rol
  estado: Estado
  responsable_id: string | null
  aprobado_por: string | null
  aprobado_en: string | null
  created_at: string
}

/** Cuentas con las que arranca cada prueba. */
export const CUENTAS = {
  admin: { id: 'u-admin', usuario: 'admin', nombre: 'Admin Kratos', rol: 'admin', estado: 'activo' },
  miembro: { id: 'u-ana', usuario: 'ana', nombre: 'Ana Gómez', rol: 'miembro', estado: 'activo' },
  pendiente: { id: 'u-pepe', usuario: 'pepe', nombre: 'Pepe Pérez', rol: 'miembro', estado: 'pendiente' },
} as const satisfies Record<string, Pick<Cuenta, 'id' | 'usuario' | 'nombre' | 'rol' | 'estado'>>

export type ComoQuien = keyof typeof CUENTAS

type Fila = Record<string, unknown> & { id?: string }
type Tabla = 'categorias' | 'responsables' | 'ubicaciones' | 'estudios' | 'estudio_responsables' | 'evidencias'

/** Error de PostgreSQL como lo devuelve PostgREST. */
const errorPg = (code: string, message: string, status = 400) => ({ status, json: { code, message, details: null, hint: null } })
const SIN_PERMISO = errorPg('42501', 'new row violates row-level security policy', 403)

/** Copia de la configuración del bucket (migración bucket_evidencias). */
const BUCKET_TIPOS = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg',
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain',
]
const BUCKET_MAX_BYTES = 50 * 1024 * 1024

export interface ArchivoFalso {
  tipo: string
  bytes: number
  contenido?: Buffer
  /** Cuenta que subió el archivo (owner_id en Storage). */
  dueno?: string
}

const MAPA_VACIO = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#eef0f3' } }],
}

/** Fecha de creación de las filas que preparan las pruebas sin indicarla. */
const FECHA_PREPARADA = '2026-10-23T15:00:00Z'

/** El token simulado dura un año: así las pruebas pueden fijar el reloj del navegador en otra fecha. */
const DURACION_TOKEN_S = 365 * 24 * 3600

const normalizar = (texto: string) => texto.trim().replace(/\s+/g, ' ').toLowerCase()

/** 'SRID=4326;POINT(lng lat)' → GeoJSON. Otros valores quedan igual. */
function geometria(valor: unknown) {
  const punto = typeof valor === 'string' && valor.match(/POINT\(([-\d.]+) ([-\d.]+)\)/)
  return punto ? { type: 'Point', coordinates: [Number(punto[1]), Number(punto[2])] } : valor
}

/** La misma regla que notas_validas() en la base de datos. */
const notasValidas = (notas: unknown) =>
  notas === undefined || (Array.isArray(notas) && notas.length <= 50 && notas.every((nota) => typeof nota === 'string' && nota.trim().length >= 1 && nota.trim().length <= 2000))

/** Distancia en metros entre dos coordenadas (fórmula del haversine). */
function metrosEntre([lng1, lat1]: number[], [lng2, lat2]: number[]) {
  const rad = Math.PI / 180
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 6_371_000 * 2 * Math.asin(Math.sqrt(a))
}

function jwt(cuenta: Cuenta) {
  const codificar = (datos: object) => Buffer.from(JSON.stringify(datos)).toString('base64url')
  const ahora = Math.floor(Date.now() / 1000)
  return `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar({ sub: cuenta.id, exp: ahora + DURACION_TOKEN_S, iat: ahora, role: 'authenticated', session_id: `s-${cuenta.id}`, email: correoDe(cuenta.usuario) })}.firma`
}

/** id de la cuenta del token de la petición (Authorization: Bearer <jwt>), si lo hay. */
function idDelToken(autorizacion: string | undefined) {
  const partes = autorizacion?.replace(/^Bearer /, '').split('.')
  if (partes?.length !== 3) return null
  try {
    return (JSON.parse(Buffer.from(partes[1], 'base64url').toString()) as { sub?: string }).sub ?? null
  } catch {
    return null
  }
}

const usuarioAuth = (cuenta: Cuenta) => ({
  id: cuenta.id,
  aud: 'authenticated',
  role: 'authenticated',
  email: correoDe(cuenta.usuario),
  app_metadata: {},
  user_metadata: { nombre: cuenta.nombre },
  created_at: cuenta.created_at,
})

const perfilDe = ({ password: _password, ...perfil }: Cuenta) => perfil

const FUNCIONES_ADMIN = ['aprobar_usuario', 'rechazar_usuario', 'desactivar_usuario', 'reactivar_usuario', 'cambiar_rol']

export class SupabaseFalso {
  db: Record<Tabla, Fila[]> = { categorias: [], responsables: [], ubicaciones: [], estudios: [], estudio_responsables: [], evidencias: [] }
  /** Cuentas de auth.users con su perfil. */
  cuentas: Cuenta[] = Object.values(CUENTAS).map((cuenta) => this.nuevaCuenta(cuenta))
  /** Archivos del bucket `evidencias`, por ruta. */
  archivos = new Map<string, ArchivoFalso>()
  /** Si es verdadero, las subidas de archivos fallan con un error del servidor. */
  fallarSubidas = false
  /** Peticiones recibidas, por ejemplo "POST /auth/v1/logout?scope=global". */
  peticiones: string[] = []

  /** Agrega una cuenta (por defecto, un miembro activo) y la devuelve. */
  agregarCuenta(datos: Partial<Cuenta> & Pick<Cuenta, 'usuario'>) {
    const cuenta = this.nuevaCuenta(datos)
    this.cuentas.push(cuenta)
    return cuenta
  }

  /** La cuenta con ese nombre de usuario. */
  cuenta(usuario: string) {
    const cuenta = this.cuentas.find((c) => c.usuario === usuario)
    if (!cuenta) throw new Error(`No hay una cuenta "${usuario}" en el Supabase simulado`)
    return cuenta
  }

  private nuevaCuenta(datos: Partial<Cuenta> & Pick<Cuenta, 'usuario'>): Cuenta {
    return {
      id: `u-${datos.usuario}`,
      password: CLAVE,
      nombre: datos.usuario,
      rol: 'miembro',
      estado: 'activo',
      responsable_id: null,
      aprobado_por: null,
      aprobado_en: null,
      created_at: '2026-10-23T00:00:00Z',
      ...datos,
    }
  }

  /** Cuenta que hace la petición, según su token. */
  private quien(ruta: Route) {
    const id = idDelToken(ruta.request().headers()['authorization'])
    return this.cuentas.find((c) => c.id === id) ?? null
  }

  async instalar(contexto: BrowserContext) {
    await contexto.route('https://mapa-falso.e2e.local/**', (ruta) => ruta.fulfill({ json: MAPA_VACIO }))
    await contexto.route('https://supabase-falso.e2e.local/**', (ruta) => this.responder(ruta))
  }

  private async responder(ruta: Route) {
    const peticion = ruta.request()
    const url = new URL(peticion.url())
    this.peticiones.push(`${peticion.method()} ${url.pathname}${url.search}`)

    if (url.pathname.startsWith('/auth/v1/')) return this.auth(ruta, url)
    if (url.pathname.startsWith('/rest/v1/')) return this.rest(ruta, url)
    if (url.pathname.startsWith('/storage/v1/')) return this.storage(ruta, url)
    if (url.pathname === '/functions/v1/restablecer-clave') return this.restablecerClave(ruta)
    return ruta.fulfill({ status: 404, json: {} })
  }

  private sesion(cuenta: Cuenta) {
    return {
      access_token: jwt(cuenta),
      token_type: 'bearer',
      expires_in: DURACION_TOKEN_S,
      expires_at: Math.floor(Date.now() / 1000) + DURACION_TOKEN_S,
      refresh_token: `r-${cuenta.id}`,
      user: usuarioAuth(cuenta),
    }
  }

  private errorAuth(ruta: Route, status: number, codigo: string, mensaje: string) {
    return ruta.fulfill({
      status,
      headers: { 'x-supabase-api-version': '2024-01-01' },
      json: { code: codigo, error_code: codigo, msg: mensaje },
    })
  }

  private async auth(ruta: Route, url: URL) {
    const cuerpo = JSON.parse(ruta.request().postData() || '{}')
    if (url.pathname === '/auth/v1/token') {
      const cuenta =
        url.searchParams.get('grant_type') === 'refresh_token'
          ? this.cuentas.find((c) => `r-${c.id}` === cuerpo.refresh_token)
          : this.cuentas.find((c) => correoDe(c.usuario) === String(cuerpo.email).toLowerCase() && c.password === cuerpo.password)
      if (!cuenta) return this.errorAuth(ruta, 400, 'invalid_credentials', 'Invalid login credentials')
      return ruta.fulfill({ json: this.sesion(cuenta) })
    }
    if (url.pathname === '/auth/v1/signup') return this.registrar(ruta, cuerpo)
    if (url.pathname === '/auth/v1/logout') return ruta.fulfill({ status: 204, body: '' })
    if (url.pathname === '/auth/v1/user') {
      const cuenta = this.quien(ruta)
      if (!cuenta) return this.errorAuth(ruta, 403, 'session_not_found', 'Session not found')
      if (ruta.request().method() === 'PUT' && typeof cuerpo.password === 'string') {
        if (cuerpo.password.length < 10) return this.errorAuth(ruta, 422, 'weak_password', 'Password should be at least 10 characters.')
        if (cuerpo.password === cuenta.password) {
          return this.errorAuth(ruta, 422, 'same_password', 'New password should be different from the old password.')
        }
        cuenta.password = cuerpo.password
      }
      return ruta.fulfill({ json: usuarioAuth(cuenta) })
    }
    return ruta.fulfill({ status: 404, json: {} })
  }

  /** Registro como lo hacen Supabase Auth y el trigger crear_perfil: la cuenta queda pendiente. */
  private registrar(ruta: Route, { email, password, data }: { email?: string; password?: string; data?: { nombre?: string } }) {
    if (String(password ?? '').length < 10) {
      return this.errorAuth(ruta, 422, 'weak_password', 'Password should be at least 10 characters.')
    }
    const [usuario, dominio] = String(email).toLowerCase().split('@')
    if (dominio !== DOMINIO_CUENTAS || !/^[a-z0-9._-]{3,30}$/.test(usuario)) {
      return this.errorAuth(ruta, 500, 'unexpected_failure', 'Database error saving new user')
    }
    if (this.cuentas.some((c) => c.usuario === usuario)) {
      return this.errorAuth(ruta, 422, 'user_already_exists', 'User already registered')
    }
    const nombre = data?.nombre?.trim() || usuario
    const cuenta = this.agregarCuenta({ usuario, nombre, password, estado: 'pendiente', created_at: new Date().toISOString() })
    return ruta.fulfill({ json: this.sesion(cuenta) })
  }

  /** Storage: subir, borrar y firmar enlaces de archivos del bucket `evidencias`. */
  private storage(ruta: Route, url: URL) {
    const peticion = ruta.request()
    const camino = decodeURIComponent(url.pathname.replace('/storage/v1/', ''))
    const json = () => JSON.parse(peticion.postData() ?? '{}')
    const cuenta = this.quien(ruta)
    const activa = cuenta?.estado === 'activo'

    if (!activa && peticion.method() === 'POST' && camino.startsWith('object/evidencias/')) {
      return ruta.fulfill({ status: 400, json: { statusCode: '403', error: 'Unauthorized', message: 'new row violates row-level security policy' } })
    }
    if (!activa && peticion.method() !== 'GET') return ruta.fulfill({ json: [] })

    if (peticion.method() === 'POST' && camino === 'object/sign/evidencias') {
      const { paths } = json() as { paths: string[] }
      return ruta.fulfill({
        json: paths.map((path) =>
          this.archivos.has(path)
            ? { path, signedURL: `/object/sign/evidencias/${path}?token=falso`, error: null }
            : { path, signedURL: null, error: 'Object not found' },
        ),
      })
    }
    if (peticion.method() === 'GET' && camino.startsWith('object/sign/evidencias/')) {
      const archivo = this.archivos.get(camino.replace('object/sign/evidencias/', ''))
      if (!archivo) return ruta.fulfill({ status: 404, body: '' })
      return ruta.fulfill({ status: 200, contentType: archivo.tipo, body: archivo.contenido ?? 'contenido simulado' })
    }
    if (peticion.method() === 'DELETE' && camino === 'object/evidencias') {
      const { prefixes } = json() as { prefixes: string[] }
      const puedeBorrar = (path: string) => cuenta?.rol === 'admin' || this.archivos.get(path)?.dueno === cuenta?.id
      const borrados = prefixes.filter((path) => puedeBorrar(path) && this.archivos.delete(path))
      return ruta.fulfill({ json: borrados.map((name) => ({ name, bucket_id: 'evidencias' })) })
    }
    if (peticion.method() === 'POST' && camino.startsWith('object/evidencias/')) {
      const path = camino.replace('object/evidencias/', '')
      const tipo = peticion.headers()['content-type'] ?? ''
      const contenido = peticion.postDataBuffer() ?? Buffer.alloc(0)
      const bytes = contenido.length
      if (this.fallarSubidas) return ruta.fulfill({ status: 500, json: { statusCode: '500', error: 'internal', message: 'Internal Server Error' } })
      if (!BUCKET_TIPOS.includes(tipo)) {
        return ruta.fulfill({ status: 400, json: { statusCode: '415', error: 'invalid_mime_type', message: `mime type ${tipo} is not supported` } })
      }
      if (bytes > BUCKET_MAX_BYTES) {
        return ruta.fulfill({ status: 413, json: { statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' } })
      }
      if (this.archivos.has(path)) return ruta.fulfill({ status: 400, json: { statusCode: '409', error: 'Duplicate', message: 'The resource already exists' } })
      this.archivos.set(path, { tipo, bytes, contenido, dueno: cuenta?.id })
      return ruta.fulfill({ json: { Key: `evidencias/${path}`, Id: crypto.randomUUID() } })
    }
    return ruta.fulfill({ status: 404, json: { statusCode: '404', error: 'not_found', message: 'Not found' } })
  }

  /** Funciones SQL que la app llama con supabase.rpc(). */
  private rpc(ruta: Route, funcion: string) {
    const argumentos = JSON.parse(ruta.request().postData() || '{}')
    const cuenta = this.quien(ruta)
    if (funcion === 'usuario_disponible') {
      const usuario = String(argumentos.usuario).trim().toLowerCase()
      return ruta.fulfill({ json: !this.cuentas.some((c) => c.usuario === usuario) })
    }
    if (FUNCIONES_ADMIN.includes(funcion)) return this.administrarCuenta(ruta, cuenta, funcion, argumentos)
    // Las demás corren con los permisos de quien llama: a una cuenta no activa no le devuelven nada.
    if (cuenta?.estado !== 'activo') return ruta.fulfill({ json: [] })
    if (funcion === 'ubicaciones_cercanas') {
      const { lng, lat, metros = 15 } = argumentos
      const cercanos = this.db.ubicaciones
        .filter((u) => u.tipo === 'punto' && u.archivada_en == null)
        .map((u) => ({ id: u.id, nombre: u.nombre, estado: u.estado ?? 'activa', distancia_m: metrosEntre((u.geom as { coordinates: number[] }).coordinates, [lng, lat]) }))
        .filter((u) => u.distancia_m <= metros)
        .sort((a, b) => a.distancia_m - b.distancia_m)
        .slice(0, 5)
      return ruta.fulfill({ json: cercanos })
    }
    if (funcion === 'lugares_mapa') {
      const lugares = this.db.ubicaciones
        .filter((u) => u.archivada_en == null)
        .sort((a, b) => String(b.tipo).localeCompare(String(a.tipo)) || String(a.nombre).localeCompare(String(b.nombre)))
        .map((u) => ({ id: u.id, tipo: u.tipo, nombre: u.nombre, estado: u.estado ?? 'activa', categoria_id: u.categoria_id ?? null, geojson: u.geom }))
      return ruta.fulfill({ json: lugares })
    }
    return ruta.fulfill({ status: 404, json: { code: 'PGRST202', message: `Función ${funcion} no simulada` } })
  }

  /** Edge Function restablecer-clave: un admin pone una contraseña temporal a otra cuenta. */
  private restablecerClave(ruta: Route) {
    const quien = this.quien(ruta)
    const { usuario_id, password } = JSON.parse(ruta.request().postData() || '{}')
    const error = (status: number, mensaje: string) => ruta.fulfill({ status, json: { error: mensaje } })
    if (quien?.estado !== 'activo' || quien.rol !== 'admin') return error(403, 'Solo un admin puede restablecer contraseñas.')
    if (String(password ?? '').length < 10) return error(400, 'La contraseña debe tener al menos 10 caracteres.')
    if (usuario_id === quien.id) return error(400, 'Para cambiar tu propia contraseña usa Mi perfil.')
    const cuenta = this.cuentas.find((c) => c.id === usuario_id)
    if (!cuenta) return error(404, 'La cuenta no existe.')
    cuenta.password = password
    return ruta.fulfill({ json: { ok: true } })
  }

  /** aprobar_usuario, rechazar_usuario, desactivar_usuario, reactivar_usuario y cambiar_rol. */
  private administrarCuenta(ruta: Route, quien: Cuenta | null, funcion: string, { usuario_id, rol }: { usuario_id: string; rol?: Rol }) {
    const responder = ({ status, json }: { status: number; json: object }) => ruta.fulfill({ status, json })
    if (quien?.estado !== 'activo' || quien.rol !== 'admin') return responder(errorPg('42501', 'Solo un admin puede administrar cuentas.', 403))
    if (usuario_id === quien.id) return responder(errorPg('42501', 'No puedes cambiar tu propio rol ni tu propio estado.', 403))
    const cuenta = this.cuentas.find((c) => c.id === usuario_id)
    if (!cuenta) return responder(errorPg('P0002', 'La cuenta no existe.', 404))

    const reglas: Record<string, { desde: Estado[]; mensaje: string; cambiar: () => void }> = {
      aprobar_usuario: {
        desde: ['pendiente', 'rechazado'],
        mensaje: 'Solo se aprueban cuentas pendientes o rechazadas.',
        cambiar: () => Object.assign(cuenta, { estado: 'activo', aprobado_por: quien.id, aprobado_en: new Date().toISOString() }),
      },
      rechazar_usuario: { desde: ['pendiente'], mensaje: 'Solo se rechazan cuentas pendientes.', cambiar: () => (cuenta.estado = 'rechazado') },
      desactivar_usuario: { desde: ['activo'], mensaje: 'Solo se desactivan cuentas activas.', cambiar: () => (cuenta.estado = 'desactivado') },
      reactivar_usuario: { desde: ['desactivado'], mensaje: 'Solo se reactivan cuentas desactivadas.', cambiar: () => (cuenta.estado = 'activo') },
      cambiar_rol: { desde: ['activo'], mensaje: 'Solo se cambia el rol de cuentas activas.', cambiar: () => (cuenta.rol = rol ?? cuenta.rol) },
    }
    const regla = reglas[funcion]
    if (!regla.desde.includes(cuenta.estado)) return responder(errorPg('22023', regla.mensaje))
    regla.cambiar()
    return ruta.fulfill({ json: perfilDe(cuenta) })
  }

  /** perfiles: cada quien lee el suyo; una cuenta activa lee todos y edita su nombre y su responsable. */
  private perfiles(ruta: Route, url: URL, cuenta: Cuenta | null) {
    const peticion = ruta.request()
    const id = url.searchParams.get('id')?.replace(/^eq\./, '')
    const visibles = this.cuentas.filter((c) => c.id === cuenta?.id || cuenta?.estado === 'activo').filter((c) => !id || c.id === id)
    const unaFila = (peticion.headers()['accept'] ?? '').includes('vnd.pgrst.object')

    if (peticion.method() === 'GET') {
      const perfiles = visibles.map(perfilDe)
      if (unaFila && perfiles.length !== 1) return ruta.fulfill({ status: 406, json: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } })
      return ruta.fulfill({ json: unaFila ? perfiles[0] : perfiles })
    }
    if (peticion.method() === 'PATCH') {
      const cambios = JSON.parse(peticion.postData() ?? '{}') as Partial<Cuenta>
      if (Object.keys(cambios).some((campo) => !['nombre', 'responsable_id'].includes(campo))) {
        return ruta.fulfill(errorPg('42501', 'permission denied for table perfiles', 403))
      }
      const editables = visibles.filter((c) => c.id === cuenta?.id && c.estado === 'activo')
      if (cambios.responsable_id && this.cuentas.some((c) => c.id !== cuenta?.id && c.responsable_id === cambios.responsable_id)) {
        return this.duplicado(ruta)
      }
      editables.forEach((c) => Object.assign(c, cambios))
      const select = url.searchParams.get('select')
      if (!select) return ruta.fulfill({ status: 204, body: '' })
      const perfiles = editables.map(perfilDe)
      return ruta.fulfill({ json: unaFila ? perfiles[0] : perfiles })
    }
    return ruta.fulfill({ status: 405, json: {} })
  }

  /** Reglas de borrado de RLS. */
  private puedeBorrar(tabla: Tabla, fila: Fila, cuenta: Cuenta) {
    if (cuenta.rol === 'admin') return tabla !== 'ubicaciones' || !this.tieneEstudios(fila)
    if (tabla === 'categorias' || tabla === 'responsables') return false
    if (tabla === 'estudio_responsables') return true
    return fila.creado_por === cuenta.id && (tabla !== 'ubicaciones' || !this.tieneEstudios(fila))
  }

  private tieneEstudios(ubicacion: Fila) {
    return this.db.estudios.some((e) => e.ubicacion_id === ubicacion.id)
  }

  private async rest(ruta: Route, url: URL) {
    if (url.pathname.startsWith('/rest/v1/rpc/')) return this.rpc(ruta, url.pathname.replace('/rest/v1/rpc/', ''))
    const peticion = ruta.request()
    const cuenta = this.quien(ruta)
    if (url.pathname === '/rest/v1/perfiles') return this.perfiles(ruta, url, cuenta)
    const tabla = url.pathname.replace('/rest/v1/', '') as Tabla
    // RLS: una cuenta que no está activa no ve ni toca nada.
    const activa = cuenta?.estado === 'activo'
    const filas = activa ? (this.db[tabla] ??= []) : []
    const select = url.searchParams.get('select')
    const filtros = [...url.searchParams.entries()].filter(([clave]) => !['select', 'order', 'limit', 'columns'].includes(clave))
    const coincide = (fila: Fila) =>
      filtros.every(([columna, valor]) => {
        const [operador, ...resto] = valor.split('.')
        const dato = resto.join('.')
        if (operador === 'eq') return String(fila[columna]) === dato
        if (operador === 'is' && dato === 'null') return fila[columna] == null
        if (operador === 'in') return dato.replace(/[()]/g, '').split(',').map((id) => id.replace(/"/g, '')).includes(String(fila[columna]))
        return true
      })
    const unaFila = (peticion.headers()['accept'] ?? '').includes('vnd.pgrst.object')

    switch (peticion.method()) {
      case 'GET': {
        const [columnaOrden, sentido] = (url.searchParams.get('order') ?? '').split('.')
        const ordenadas = columnaOrden
          ? [...filas].sort((a, b) => String(a[columnaOrden]).localeCompare(String(b[columnaOrden])) * (sentido === 'desc' ? -1 : 1))
          : filas
        const resultado = ordenadas.filter(coincide).map((fila) => this.proyectar(tabla, fila, select))
        return ruta.fulfill({ json: unaFila ? resultado[0] : resultado })
      }
      case 'POST': {
        if (!activa) return ruta.fulfill(SIN_PERMISO)
        const cuerpo = JSON.parse(peticion.postData() ?? '[]')
        const creadas: Fila[] = []
        for (const datos of Array.isArray(cuerpo) ? cuerpo : [cuerpo]) {
          if (typeof datos.nombre === 'string' && this.nombreRepetido(tabla, datos.nombre)) return this.duplicado(ruta)
          if (tabla === 'estudios' && !(String(datos.hora_fin) > String(datos.hora_inicio))) return this.invalido(ruta)
          if (tabla === 'estudios' && !notasValidas(datos.notas)) return this.invalido(ruta)
          if (tabla === 'evidencias' && !this.evidenciaValida(datos)) return this.invalido(ruta)
          if (tabla === 'ubicaciones' && datos.contacto_telefono && !/^\+?[0-9 ()-]{7,20}$/.test(datos.contacto_telefono)) return this.invalido(ruta)
          const fila = {
            id: datos.id ?? crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...datos,
            ...(tabla === 'ubicaciones' ? { geom: geometria(datos.geom) } : {}),
            // Autoría: la pone la base de datos, no la app.
            ...(tabla === 'estudio_responsables' ? {} : { creado_por: cuenta?.id, actualizado_por: cuenta?.id }),
          }
          filas.push(fila)
          creadas.push(this.proyectar(tabla, fila, select))
        }
        if (!select) return ruta.fulfill({ status: 201, body: '' })
        return ruta.fulfill({ status: 201, json: unaFila ? creadas[0] : creadas })
      }
      case 'PATCH': {
        const cambios = JSON.parse(peticion.postData() ?? '{}')
        if (tabla === 'estudios' && cambios.hora_inicio && !(String(cambios.hora_fin) > String(cambios.hora_inicio))) return this.invalido(ruta)
        if (tabla === 'estudios' && !notasValidas(cambios.notas)) return this.invalido(ruta)
        for (const fila of filas.filter(coincide)) {
          if (typeof cambios.nombre === 'string' && this.nombreRepetido(tabla, cambios.nombre, fila.id)) return this.duplicado(ruta)
          Object.assign(
            fila,
            cambios,
            tabla === 'ubicaciones' && 'geom' in cambios ? { geom: geometria(cambios.geom) } : {},
            tabla === 'estudio_responsables' ? {} : { creado_por: fila.creado_por, actualizado_por: cuenta?.id, updated_at: new Date().toISOString() },
          )
        }
        return ruta.fulfill({ status: 204, body: '' })
      }
      case 'DELETE': {
        const borradas = filas.filter((fila) => coincide(fila) && cuenta && this.puedeBorrar(tabla, fila, cuenta))
        for (const fila of borradas) {
          filas.splice(filas.indexOf(fila), 1)
          if (tabla === 'categorias') {
            for (const ubicacion of this.db.ubicaciones) if (ubicacion.categoria_id === fila.id) ubicacion.categoria_id = null
          }
          if (tabla === 'responsables') {
            this.db.estudio_responsables = this.db.estudio_responsables.filter((r) => r.responsable_id !== fila.id)
          }
        }
        if (!select) return ruta.fulfill({ status: 204, body: '' })
        return ruta.fulfill({ json: borradas.map((fila) => this.proyectar(tabla, fila, select)) })
      }
      default:
        return ruta.fulfill({ status: 405, json: {} })
    }
  }

  private proyectar(tabla: Tabla, fila: Fila, select: string | null): Fila {
    if (!select || select === '*') return { ...fila }
    const resultado: Fila = {}
    for (const campo of select.split(',')) {
      const conteo = campo.match(/^(\w+)\(count\)$/)
      const embebida = campo.match(/^(\w+)\((\w+)\)$/)
      if (conteo) resultado[conteo[1]] = [{ count: this.contar(tabla, fila) }]
      else if (tabla === 'estudios' && embebida?.[1] === 'estudio_responsables') {
        resultado.estudio_responsables = this.db.estudio_responsables
          .filter((r) => r.estudio_id === fila.id)
          .map((r) => ({ [embebida[2]]: r[embebida[2]] }))
      }
      // Las filas que preparan las pruebas pueden no traer fechas; en la base real siempre las tienen.
      else if ((campo === 'created_at' || campo === 'updated_at') && fila[campo] == null) resultado[campo] = FECHA_PREPARADA
      else if (tabla === 'estudios' && campo === 'notas' && fila.notas == null) resultado.notas = []
      else resultado[campo] = fila[campo] ?? null
    }
    return resultado
  }

  private contar(tabla: Tabla, fila: Fila) {
    if (tabla === 'categorias') return this.db.ubicaciones.filter((u) => u.categoria_id === fila.id).length
    if (tabla === 'responsables') return this.db.estudio_responsables.filter((r) => r.responsable_id === fila.id).length
    if (tabla === 'ubicaciones') return this.db.estudios.filter((e) => e.ubicacion_id === fila.id).length
    if (tabla === 'estudios') return this.db.evidencias.filter((e) => e.estudio_id === fila.id).length
    return 0
  }

  /** Reglas de `evidencias` para las de archivo: lo que la app sube hoy. */
  private evidenciaValida(datos: Fila) {
    if (!['foto', 'audio', 'documento'].includes(String(datos.tipo))) return true
    return Boolean(datos.archivo_path && datos.archivo_nombre && datos.archivo_mime && Number(datos.archivo_bytes) > 0 && datos.proveedor)
  }

  private nombreRepetido(tabla: Tabla, nombre: string, excepto?: string) {
    if (tabla !== 'categorias' && tabla !== 'responsables') return false
    return this.db[tabla].some((fila) => fila.id !== excepto && normalizar(String(fila.nombre)) === normalizar(nombre))
  }

  private invalido(ruta: Route) {
    return ruta.fulfill({ status: 400, json: { code: '23514', message: 'new row violates check constraint' } })
  }

  private duplicado(ruta: Route) {
    return ruta.fulfill({ status: 409, json: { code: '23505', message: 'duplicate key value violates unique constraint' } })
  }
}
