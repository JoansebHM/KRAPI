import type { BrowserContext, Route } from '@playwright/test'

/**
 * Supabase simulado para las pruebas: inicio de sesión y una base de datos en memoria que
 * responde como PostgREST para las tablas que usa la app. Cada prueba tiene el suyo, vacío.
 *
 * Imita las reglas importantes del esquema real:
 * - nombres únicos (sin importar mayúsculas ni espacios) en categorías y responsables → 23505
 * - borrar una categoría deja sus ubicaciones sin categoría (ON DELETE SET NULL)
 * - borrar un responsable lo quita de sus estudios (ON DELETE CASCADE)
 * - lugares_mapa() devuelve los lugares no archivados, zonas primero
 * - ubicaciones_cercanas() devuelve hasta 5 puntos no archivados a menos de N metros
 * - el teléfono de contacto debe tener formato de teléfono → 23514
 *
 * En `ubicaciones`, `geom` se guarda directamente como GeoJSON (en la base real es PostGIS).
 * Si la app la envía como texto ('SRID=4326;POINT(lng lat)'), se convierte.
 */

export const USUARIO = { email: 'compartido@kratos.test', password: 'clave-correcta-123' }

type Fila = Record<string, unknown> & { id?: string }
type Tabla = 'categorias' | 'responsables' | 'ubicaciones' | 'estudio_responsables'

const MAPA_VACIO = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#eef0f3' } }],
}

const normalizar = (texto: string) => texto.trim().replace(/\s+/g, ' ').toLowerCase()

/** 'SRID=4326;POINT(lng lat)' → GeoJSON. Otros valores quedan igual. */
function geometria(valor: unknown) {
  const punto = typeof valor === 'string' && valor.match(/POINT\(([-\d.]+) ([-\d.]+)\)/)
  return punto ? { type: 'Point', coordinates: [Number(punto[1]), Number(punto[2])] } : valor
}

/** Distancia en metros entre dos coordenadas (fórmula del haversine). */
function metrosEntre([lng1, lat1]: number[], [lng2, lat2]: number[]) {
  const rad = Math.PI / 180
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2
  return 6_371_000 * 2 * Math.asin(Math.sqrt(a))
}

function jwt() {
  const codificar = (datos: object) => Buffer.from(JSON.stringify(datos)).toString('base64url')
  const ahora = Math.floor(Date.now() / 1000)
  return `${codificar({ alg: 'HS256', typ: 'JWT' })}.${codificar({ sub: 'u1', exp: ahora + 3600, iat: ahora, role: 'authenticated', session_id: 's1', email: USUARIO.email })}.firma`
}

const USUARIO_AUTH = {
  id: 'u1',
  aud: 'authenticated',
  role: 'authenticated',
  email: USUARIO.email,
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-23T00:00:00Z',
}

export class SupabaseFalso {
  db: Record<Tabla, Fila[]> = { categorias: [], responsables: [], ubicaciones: [], estudio_responsables: [] }
  /** Peticiones recibidas, por ejemplo "POST /auth/v1/logout?scope=global". */
  peticiones: string[] = []

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
    return ruta.fulfill({ status: 404, json: {} })
  }

  private async auth(ruta: Route, url: URL) {
    if (url.pathname === '/auth/v1/token') {
      const cuerpo = JSON.parse(ruta.request().postData() ?? '{}')
      if (cuerpo.password !== USUARIO.password) {
        return ruta.fulfill({
          status: 400,
          headers: { 'x-supabase-api-version': '2024-01-01' },
          json: { code: 'invalid_credentials', error_code: 'invalid_credentials', msg: 'Invalid login credentials' },
        })
      }
      return ruta.fulfill({
        json: {
          access_token: jwt(),
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'r1',
          user: USUARIO_AUTH,
        },
      })
    }
    if (url.pathname === '/auth/v1/logout') return ruta.fulfill({ status: 204, body: '' })
    if (url.pathname === '/auth/v1/user') return ruta.fulfill({ json: USUARIO_AUTH })
    return ruta.fulfill({ status: 404, json: {} })
  }

  /** Funciones SQL que la app llama con supabase.rpc(). */
  private rpc(ruta: Route, funcion: string) {
    const argumentos = JSON.parse(ruta.request().postData() || '{}')
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

  private async rest(ruta: Route, url: URL) {
    if (url.pathname.startsWith('/rest/v1/rpc/')) return this.rpc(ruta, url.pathname.replace('/rest/v1/rpc/', ''))
    const peticion = ruta.request()
    const tabla = url.pathname.replace('/rest/v1/', '') as Tabla
    const filas = (this.db[tabla] ??= [])
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
        const resultado = filas.filter(coincide).map((fila) => this.proyectar(tabla, fila, select))
        return ruta.fulfill({ json: unaFila ? resultado[0] : resultado })
      }
      case 'POST': {
        const cuerpo = JSON.parse(peticion.postData() ?? '[]')
        const creadas: Fila[] = []
        for (const datos of Array.isArray(cuerpo) ? cuerpo : [cuerpo]) {
          if (typeof datos.nombre === 'string' && this.nombreRepetido(tabla, datos.nombre)) return this.duplicado(ruta)
          if (tabla === 'ubicaciones' && datos.contacto_telefono && !/^\+?[0-9 ()-]{7,20}$/.test(datos.contacto_telefono)) return this.invalido(ruta)
          const fila = { id: datos.id ?? crypto.randomUUID(), ...datos, ...(tabla === 'ubicaciones' ? { geom: geometria(datos.geom) } : {}) }
          filas.push(fila)
          creadas.push(this.proyectar(tabla, fila, select))
        }
        if (!select) return ruta.fulfill({ status: 201, body: '' })
        return ruta.fulfill({ status: 201, json: unaFila ? creadas[0] : creadas })
      }
      case 'PATCH': {
        const cambios = JSON.parse(peticion.postData() ?? '{}')
        for (const fila of filas.filter(coincide)) {
          if (typeof cambios.nombre === 'string' && this.nombreRepetido(tabla, cambios.nombre, fila.id)) return this.duplicado(ruta)
          Object.assign(fila, cambios)
        }
        return ruta.fulfill({ status: 204, body: '' })
      }
      case 'DELETE': {
        for (const fila of filas.filter(coincide)) {
          filas.splice(filas.indexOf(fila), 1)
          if (tabla === 'categorias') {
            for (const ubicacion of this.db.ubicaciones) if (ubicacion.categoria_id === fila.id) ubicacion.categoria_id = null
          }
          if (tabla === 'responsables') {
            this.db.estudio_responsables = this.db.estudio_responsables.filter((r) => r.responsable_id !== fila.id)
          }
        }
        return ruta.fulfill({ status: 204, body: '' })
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
      if (conteo) resultado[conteo[1]] = [{ count: this.contar(tabla, fila) }]
      else resultado[campo] = fila[campo] ?? null
    }
    return resultado
  }

  private contar(tabla: Tabla, fila: Fila) {
    if (tabla === 'categorias') return this.db.ubicaciones.filter((u) => u.categoria_id === fila.id).length
    if (tabla === 'responsables') return this.db.estudio_responsables.filter((r) => r.responsable_id === fila.id).length
    return 0
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
