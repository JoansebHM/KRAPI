import './PoweredBy.css'

/** Firma "powered by KIT" (Kratos Innovation Team) con el estilo de Kratos Innovation Lab. */
export function PoweredBy({ tamano = 'pequeno' }: { tamano?: 'pequeno' | 'mediano' }) {
  return (
    <span className={`powered powered-${tamano}`} aria-label="powered by Kratos Innovation Team">
      <span className="powered-por" aria-hidden="true">
        powered by
      </span>
      <abbr className="powered-equipo" title="Kratos Innovation Team" aria-hidden="true">
        KIT
      </abbr>
    </span>
  )
}
