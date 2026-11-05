import { useState, type ReactNode } from 'react'
import type { Barra } from './calculos'
import { numero } from './formato'

/** Cifra principal de una tarjeta: etiqueta, valor y una línea de contexto. */
export function Cifra({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle?: ReactNode }) {
  return (
    <div className="analitica-cifra">
      <p className="analitica-cifra-etiqueta">{etiqueta}</p>
      <p className="analitica-cifra-valor">{valor}</p>
      {detalle && <p className="analitica-cifra-detalle">{detalle}</p>}
    </div>
  )
}

/** Sección con título y una explicación corta de qué se está mirando. */
export function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="analitica-seccion">
      <h2 className="analitica-titulo">{titulo}</h2>
      {descripcion && <p className="analitica-descripcion">{descripcion}</p>}
      {children}
    </section>
  )
}

/**
 * Barras horizontales, de mayor a menor, con el valor en la punta. Un solo color (el azul de KIRA) salvo que cada
 * barra traiga el suyo (las categorías). La barra más larga ocupa todo el ancho disponible.
 */
export function BarrasHorizontales({ barras, vacio = 'Aún no hay datos.', unidad }: { barras: Barra[]; vacio?: string; unidad?: string }) {
  const maximo = Math.max(1, ...barras.map((barra) => barra.valor))
  if (barras.length === 0) return <p className="analitica-vacio">{vacio}</p>
  return (
    <ul className="analitica-barras">
      {barras.map((barra) => (
        <li key={barra.clave} className="analitica-barra">
          <span className="analitica-barra-etiqueta">{barra.etiqueta}</span>
          <span className="analitica-barra-pista" aria-hidden="true">
            {barra.valor > 0 && (
              <span className="analitica-barra-relleno" style={{ width: `${(barra.valor / maximo) * 100}%`, ...(barra.color ? { background: barra.color } : {}) }} />
            )}
          </span>
          <span className="analitica-barra-valor">
            {numero(barra.valor)}
            {unidad && <span className="solo-lector"> {unidad}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Un valor frente a su total (por ejemplo, locales con estudio de todos los locales), en la misma barra. */
export function Medidor({ etiqueta, valor, total, detalle }: { etiqueta: string; valor: number; total: number; detalle?: string }) {
  const porcentaje = total === 0 ? 0 : Math.round((valor / total) * 100)
  return (
    <div className="analitica-medidor">
      <div className="analitica-medidor-texto">
        <span>{etiqueta}</span>
        <strong>{porcentaje} %</strong>
      </div>
      <div className="analitica-medidor-pista" role="meter" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={total} aria-valuenow={valor} aria-valuetext={`${valor} de ${total}`}>
        <span className="analitica-medidor-relleno" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="analitica-medidor-detalle">{detalle ?? `${numero(valor)} de ${numero(total)}`}</p>
    </div>
  )
}

export interface Columna {
  clave: string
  /** Lo que se lee bajo la columna (corto). */
  etiqueta: string
  valor: number
  /** Frase completa para la lectura y el lector de pantalla: "Semana del 26 oct: 5 estudios". */
  descripcion: string
}

/** Marcas del eje: 0, la mitad y el tope, siempre enteros. */
function marcasDelEje(maximo: number) {
  const tope = Math.max(2, Math.ceil(maximo / 2) * 2)
  return [tope, tope / 2, 0]
}

/**
 * Columnas con eje y una línea de lectura debajo: al tocar o recorrer una columna, la línea dice su valor completo.
 * La última columna (la semana actual, el día con más estudios…) se destaca con `destacada`; las demás van en un azul
 * más suave, para que el ojo vaya a lo que importa.
 */
export function Columnas({ columnas, destacada, titulo }: { columnas: Columna[]; destacada: number; titulo: string }) {
  const [elegida, setElegida] = useState<number | null>(null)
  const marcas = marcasDelEje(Math.max(0, ...columnas.map((columna) => columna.valor)))
  const tope = marcas[0]
  const activa = elegida ?? destacada
  return (
    <div className="analitica-columnas">
      <p className="analitica-lectura" aria-live="polite">
        {columnas[activa]?.descripcion}
      </p>
      <div className="analitica-columnas-cuerpo">
        <div className="analitica-eje" aria-hidden="true">
          {marcas.map((marca) => (
            <span key={marca}>{numero(marca)}</span>
          ))}
        </div>
        <div className="analitica-plano">
          <div className="analitica-lineas" aria-hidden="true">
            {marcas.map((marca) => (
              <span key={marca} />
            ))}
          </div>
          <div className="analitica-columnas-lista" role="group" aria-label={titulo}>
            {columnas.map((columna, indice) => (
              <button
                key={columna.clave}
                type="button"
                className={`analitica-columna${indice === activa ? ' analitica-columna-activa' : ''}`}
                aria-label={columna.descripcion}
                aria-pressed={indice === activa}
                onClick={() => setElegida(indice)}
                onMouseEnter={() => setElegida(indice)}
                onMouseLeave={() => setElegida(null)}
                onFocus={() => setElegida(indice)}
                onBlur={() => setElegida(null)}
              >
                <span className="analitica-columna-relleno" style={{ height: `${(columna.valor / tope) * 100}%` }} />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="analitica-columnas-etiquetas" aria-hidden="true">
        {columnas.map((columna, indice) => (
          <span key={columna.clave} className={indice === activa ? 'analitica-etiqueta-activa' : undefined}>
            {columna.etiqueta}
          </span>
        ))}
      </div>
    </div>
  )
}
