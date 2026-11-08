import type { BrowserContext, WebSocketRoute } from '@playwright/test'

/**
 * Realtime simulado para las pruebas de presencia (decisión 0036). Habla el protocolo de Phoenix
 * que usa supabase-js (mensajes `[join_ref, ref, topic, evento, carga]` en JSON) y solo entiende lo
 * que la app necesita: unirse a un canal, anunciarse (`track`) y dejar de anunciarse (`untrack`).
 *
 * Como el Realtime real, manda el estado completo al unirse (`presence_state`) y cada cambio
 * después (`presence_diff`) a todas las conexiones. Una cuenta que no esté activa no puede unirse
 * (lo que en producción hace la política RLS de `realtime.messages`).
 */

interface Conexion {
  ws: WebSocketRoute
  /** Cuenta dueña del token con el que se unió, o null si todavía no se une. */
  cuentaId: string | null
  joinRef: string | null
  topic: string
  /** Clave de presencia que eligió el cliente (el id de su cuenta). */
  clave: string
  /** Lo que esta conexión tiene anunciado. */
  metas: Meta[]
}

type Meta = Record<string, unknown> & { phx_ref: string }

/** Cómo sabe el simulador de qué cuenta es un token y si puede usar Realtime. */
export type CuentaDelToken = (token: string | undefined) => { id: string; activa: boolean } | null

export class RealtimeFalso {
  private conexiones = new Set<Conexion>()
  /** Presencias puestas desde la prueba, como si otras personas tuvieran la app abierta. */
  private externas = new Map<string, Meta[]>()
  private contador = 0

  constructor(private cuentaDelToken: CuentaDelToken) {}

  async instalar(contexto: BrowserContext) {
    await contexto.routeWebSocket(/supabase-falso\.e2e\.local\/realtime\/v1\/websocket/, (ws) => this.conectar(ws))
  }

  /** Ids de las cuentas con la app abierta ahora (las de la prueba y las de las pestañas reales). */
  enLinea() {
    return [...this.estado().keys()]
  }

  /** Otra persona abre la app. */
  entra(cuentaId: string) {
    const meta = this.nuevaMeta({ desde: new Date().toISOString() })
    this.externas.set(cuentaId, [...(this.externas.get(cuentaId) ?? []), meta])
    this.avisarDiff({ [cuentaId]: { metas: [meta] } }, {})
  }

  /** Otra persona cierra la app. */
  sale(cuentaId: string) {
    const metas = this.externas.get(cuentaId) ?? []
    this.externas.delete(cuentaId)
    if (metas.length) this.avisarDiff({}, { [cuentaId]: { metas } })
  }

  private nuevaMeta(carga: Record<string, unknown>): Meta {
    return { ...carga, phx_ref: `ref-${++this.contador}` }
  }

  /** clave → conexiones abiertas, sumando las anunciadas por la app y las puestas por la prueba. */
  private estado() {
    const estado = new Map<string, Meta[]>()
    const sumar = (clave: string, metas: Meta[]) => {
      if (metas.length) estado.set(clave, [...(estado.get(clave) ?? []), ...metas])
    }
    this.externas.forEach((metas, clave) => sumar(clave, metas))
    this.conexiones.forEach((conexion) => sumar(conexion.clave, conexion.metas))
    return estado
  }

  private estadoParaEnviar() {
    return Object.fromEntries([...this.estado()].map(([clave, metas]) => [clave, { metas }]))
  }

  private enviar(conexion: Conexion, ref: string | null, evento: string, carga: unknown, joinRef = conexion.joinRef) {
    conexion.ws.send(JSON.stringify([joinRef, ref, conexion.topic, evento, carga]))
  }

  private avisarDiff(joins: Record<string, { metas: Meta[] }>, leaves: Record<string, { metas: Meta[] }>) {
    for (const conexion of this.conexiones) {
      if (conexion.cuentaId) this.enviar(conexion, null, 'presence_diff', { joins, leaves })
    }
  }

  private conectar(ws: WebSocketRoute) {
    const conexion: Conexion = { ws, cuentaId: null, joinRef: null, topic: '', clave: '', metas: [] }
    this.conexiones.add(conexion)

    ws.onClose(() => {
      this.conexiones.delete(conexion)
      if (conexion.metas.length) this.avisarDiff({}, { [conexion.clave]: { metas: conexion.metas } })
    })

    ws.onMessage((mensaje) => {
      const [joinRef, ref, topic, evento, carga] = JSON.parse(String(mensaje)) as [string | null, string | null, string, string, Record<string, any>]

      switch (evento) {
        case 'heartbeat':
          ws.send(JSON.stringify([null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} }]))
          break

        case 'phx_join': {
          const cuenta = this.cuentaDelToken(carga.access_token)
          Object.assign(conexion, { joinRef, topic })
          if (!cuenta?.activa) {
            // Sin permiso en realtime.messages: Realtime rechaza la unión.
            this.enviar(conexion, ref, 'phx_reply', { status: 'error', response: { reason: 'Unauthorized: You do not have permissions to read from this Channel topic' } })
            break
          }
          conexion.cuentaId = cuenta.id
          conexion.clave = carga.config?.presence?.key ?? cuenta.id
          this.enviar(conexion, ref, 'phx_reply', { status: 'ok', response: { postgres_changes: [] } })
          this.enviar(conexion, null, 'presence_state', this.estadoParaEnviar())
          break
        }

        case 'presence': {
          if (!conexion.cuentaId) break
          this.enviar(conexion, ref, 'phx_reply', { status: 'ok', response: {} })
          if (carga.event === 'track') {
            const meta = this.nuevaMeta(carga.payload ?? {})
            conexion.metas.push(meta)
            this.avisarDiff({ [conexion.clave]: { metas: [meta] } }, {})
          } else if (carga.event === 'untrack' && conexion.metas.length) {
            const metas = conexion.metas
            conexion.metas = []
            this.avisarDiff({}, { [conexion.clave]: { metas } })
          }
          break
        }

        case 'phx_leave': {
          this.enviar(conexion, ref, 'phx_reply', { status: 'ok', response: {} })
          this.enviar(conexion, null, 'phx_close', {})
          if (conexion.metas.length) this.avisarDiff({}, { [conexion.clave]: { metas: conexion.metas } })
          Object.assign(conexion, { cuentaId: null, metas: [] })
          break
        }
      }
    })
  }
}
