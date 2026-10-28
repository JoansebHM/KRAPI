import { HojaInferior } from '../../components/HojaInferior'
import { useCategorias } from '../categorias/api'
import { IconoCategoria } from '../categorias/IconoCategoria'
import { SelectorParticipantes } from '../estudios/SelectorParticipantes'
import { NOMBRE_TIPO, type TipoEvidencia } from '../evidencias/archivos'
import { IconoTipoEvidencia } from '../evidencias/IconoTipoEvidencia'
import { contarFiltrosActivos, FILTROS_VACIOS, HORA_DESDE_VACIA, HORA_HASTA_VACIA, type FiltrosMapa } from './api'
import { useFiltros } from './filtrosContexto'

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const TIPOS_EVIDENCIA: TipoEvidencia[] = ['foto', 'audio', 'documento', 'texto', 'video']

/** Los filtros del mapa, en una hoja que no tapa el mapa: se ve el resultado al ajustarlos. */
export function PanelFiltros({ onCerrar }: { onCerrar: () => void }) {
  const { filtros, setFiltros } = useFiltros()
  const { data: categorias } = useCategorias()
  const activos = contarFiltrosActivos(filtros)

  const cambiar = <K extends keyof FiltrosMapa>(campo: K, valor: FiltrosMapa[K]) => setFiltros({ ...filtros, [campo]: valor })
  const alternarCategoria = (id: string) =>
    cambiar('categoriaIds', filtros.categoriaIds.includes(id) ? filtros.categoriaIds.filter((otro) => otro !== id) : [...filtros.categoriaIds, id])
  const alternarDia = (dia: number) => cambiar('diasSemana', filtros.diasSemana.includes(dia) ? filtros.diasSemana.filter((otro) => otro !== dia) : [...filtros.diasSemana, dia])
  const alternarTipo = (tipo: TipoEvidencia) =>
    cambiar('tiposEvidencia', filtros.tiposEvidencia.includes(tipo) ? filtros.tiposEvidencia.filter((otro) => otro !== tipo) : [...filtros.tiposEvidencia, tipo])

  return (
    <HojaInferior
      titulo="Filtros"
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="btn btn-primary btn-block" onClick={onCerrar}>
            Ver en el mapa
          </button>
          <button type="button" className="btn-texto btn-texto-peligro" onClick={() => setFiltros(FILTROS_VACIOS)} disabled={activos === 0}>
            Limpiar filtros
          </button>
        </>
      }
    >
      <div className="formulario">
        <div className="field">
          <span className="field-label">Elementos</span>
          <div className="chips">
            <button type="button" className="chip chip-sin-icono" aria-pressed={filtros.mostrarElementos} onClick={() => cambiar('mostrarElementos', !filtros.mostrarElementos)}>
              <span>Mostrar elementos</span>
            </button>
          </div>
          <p className="chips-nota">Canecas, postes, árboles… Como no tienen estudios, solo los filtra la categoría.</p>
        </div>

        <div className="field">
          <span className="field-label">
            Categoría<span className="field-opcional"> (de los puntos y los elementos; las zonas no se ven afectadas)</span>
          </span>
          {!categorias || categorias.length === 0 ? (
            <p className="chips-nota">No hay categorías para filtrar.</p>
          ) : (
            <div className="chips">
              {categorias.map((categoria) => (
                <button key={categoria.id} type="button" className="chip" aria-pressed={filtros.categoriaIds.includes(categoria.id)} onClick={() => alternarCategoria(categoria.id)}>
                  <IconoCategoria icono={categoria.icono} color={categoria.color} tamano={24} />
                  <span>{categoria.nombre}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <fieldset className="field salida-fecha-hora">
          <legend className="field-label">Rango de fechas</legend>
          <label className="field">
            <span className="field-label">Desde</span>
            <input className="field-input" type="date" value={filtros.fechaDesde ?? ''} onChange={(evento) => cambiar('fechaDesde', evento.target.value || null)} />
          </label>
          <label className="field">
            <span className="field-label">Hasta</span>
            <input className="field-input" type="date" value={filtros.fechaHasta ?? ''} onChange={(evento) => cambiar('fechaHasta', evento.target.value || null)} />
          </label>
        </fieldset>

        <div className="field">
          <span className="field-label">Días de la semana</span>
          <div className="chips">
            {DIAS_SEMANA.map((dia, indice) => (
              <button key={dia} type="button" className="chip chip-sin-icono" aria-pressed={filtros.diasSemana.includes(indice)} onClick={() => alternarDia(indice)}>
                <span>{dia}</span>
              </button>
            ))}
          </div>
        </div>

        <fieldset className="field salida-fecha-hora">
          <legend className="field-label">
            Rango de horas<span className="field-opcional"> (por defecto, todo el día)</span>
          </legend>
          <label className="field">
            <span className="field-label">Desde</span>
            <input className="field-input" type="time" value={filtros.horaDesde} onChange={(evento) => cambiar('horaDesde', evento.target.value || HORA_DESDE_VACIA)} />
          </label>
          <label className="field">
            <span className="field-label">Hasta</span>
            <input className="field-input" type="time" value={filtros.horaHasta} onChange={(evento) => cambiar('horaHasta', evento.target.value || HORA_HASTA_VACIA)} />
          </label>
        </fieldset>

        <div className="field">
          <span className="field-label">Tipo de evidencia</span>
          <div className="chips">
            {TIPOS_EVIDENCIA.map((tipo) => (
              <button key={tipo} type="button" className="chip" aria-pressed={filtros.tiposEvidencia.includes(tipo)} onClick={() => alternarTipo(tipo)}>
                <IconoTipoEvidencia tipo={tipo} />
                <span>{NOMBRE_TIPO[tipo]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Responsables</span>
          <SelectorParticipantes valor={filtros.participanteIds} onCambiar={(ids) => cambiar('participanteIds', ids)} />
        </div>
      </div>
    </HojaInferior>
  )
}
