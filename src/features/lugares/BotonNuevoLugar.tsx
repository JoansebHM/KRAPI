import { useState } from 'react'
import { Link } from 'react-router'
import { Dialog } from '../../components/Dialog'
import { FlechaLista } from '../../components/FlechaLista'
import './CrearPunto.css'

/** Botón flotante "+" del mapa: pregunta si se registra un punto (un local) o una zona. */
export function BotonNuevoLugar() {
  const [eligiendo, setEligiendo] = useState(false)

  return (
    <>
      <button type="button" className="fab fab-mapa" onClick={() => setEligiendo(true)}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Nuevo lugar
      </button>

      {eligiendo && (
        <Dialog
          titulo="¿Qué vas a registrar?"
          onCerrar={() => setEligiendo(false)}
          acciones={
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setEligiendo(false)}>
              Cancelar
            </button>
          }
        >
          <ul className="lista">
            <li>
              <Link to="/lugares/nuevo" className="lista-item">
                <span className="nuevo-lugar-icono" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
                    <circle cx="12" cy="9.5" r="2.5" />
                  </svg>
                </span>
                <span className="lista-item-textos">
                  <span className="lista-item-titulo">Punto</span>
                  <span className="lista-item-detalle">Un local: tienda, café, restaurante…</span>
                </span>
                <FlechaLista />
              </Link>
            </li>
            <li>
              <Link to="/zonas/nueva" className="lista-item">
                <span className="nuevo-lugar-icono" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7 10 4l10 4-2 11-12 1Z" />
                  </svg>
                </span>
                <span className="lista-item-textos">
                  <span className="lista-item-titulo">Zona</span>
                  <span className="lista-item-detalle">Un área: una manzana, una cuadra, un parque…</span>
                </span>
                <FlechaLista />
              </Link>
            </li>
          </ul>
        </Dialog>
      )}
    </>
  )
}
