import { useState } from 'react'
import type { Ejercicio } from './guias'

/** Pasos de un ejercicio y, si los tiene, sus tarjetas para leer en voz alta (con un selector si hay varios juegos). */
export function EjercicioTarjetas({ ejercicio }: { ejercicio: Ejercicio }) {
  const juegos = ejercicio.juegosDeTarjetas ?? []
  const [elegido, setElegido] = useState(0)
  const juego = juegos[elegido]

  return (
    <div className="ejercicio">
      <p className="ejercicio-titulo">{ejercicio.titulo}</p>
      <ul className="ejercicio-pasos">
        {ejercicio.pasos.map((paso) => (
          <li key={paso}>{paso}</li>
        ))}
      </ul>
      {juegos.length > 1 && (
        <div className="chips" role="group" aria-label="Juego de tarjetas">
          {juegos.map((opcion, indice) => (
            <button
              key={opcion.titulo}
              type="button"
              className="chip chip-sin-icono"
              aria-pressed={indice === elegido}
              onClick={() => setElegido(indice)}
            >
              <span>{opcion.titulo}</span>
            </button>
          ))}
        </div>
      )}
      {juego && (
        <ul className="tarjetas" aria-label={`Tarjetas: ${juego.titulo}`}>
          {juego.tarjetas.map((tarjeta) => (
            <li key={tarjeta.nombre} className="tarjeta">
              <strong className="tarjeta-nombre">{tarjeta.nombre}</strong>
              <q className="tarjeta-texto">{tarjeta.texto}</q>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
