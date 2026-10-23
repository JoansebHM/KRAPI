import './PoweredBy.css'

/** Firma "powered by KRATOS INNOVATION TEAM" con el estilo de Kratos Innovation Lab. */
export function PoweredBy({ tamano = 'pequeno' }: { tamano?: 'pequeno' | 'mediano' }) {
  return (
    <span className={`powered powered-${tamano}`}>
      <span className="powered-por">powered by</span>
      <span className="powered-equipo">Kratos Innovation Team</span>
    </span>
  )
}
