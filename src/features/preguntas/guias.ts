/**
 * Guías de preguntas para las entrevistas de campo. El contenido es estático y está versionado aquí
 * (decisión 0031): se transcribe de las seis guías de entrevista semiestructurada y se deja fuera
 * el material de preparación y análisis.
 */

export type Lente = 'Estrategia' | 'Técnica' | 'Valor y negocio' | 'Todas'

export interface Tarjeta {
  nombre: string
  texto: string
}

export interface Ejercicio {
  titulo: string
  pasos: string[]
  juegosDeTarjetas?: { titulo: string; tarjetas: Tarjeta[] }[]
}

export interface Pregunta {
  codigo: string
  imprescindible: boolean
  texto: string
  /** Repreguntas. */
  profundizacion?: string
  /** Evidencia esperada. */
  evidencia: string
  lentes: Lente[]
  ejercicio?: Ejercicio
}

export interface Bloque {
  codigo: string
  titulo: string
  minutos?: number
  /** Solo los módulos. */
  aQuien?: string
  /** Va en «Por qué se pregunta». */
  proposito: string
  notas?: string[]
  registroTecnico?: string[]
  preguntas: Pregunta[]
}

export type IdGuia = 'centro-distribucion' | 'jac' | 'instituciones' | 'tenderos' | 'residentes' | 'visitantes'

export interface OpcionDeModulo {
  id: string
  nombre: string
  bloque: Bloque
}

export interface Guia {
  id: IdGuia
  numero: string
  pestana: string
  titulo: string
  aQuien: string
  aviso?: string
  autorizacion: { guion: string[]; notas: string[] }
  cierre: string[]
  /** Tronco común: se hace siempre. */
  bloques: Bloque[]
  modulos?: { etiqueta: 'Institución' | 'Perfil'; nota: string; opciones: OpcionDeModulo[] }
}

/** Elementos obligatorios del consentimiento, iguales para las seis guías. */
export const ELEMENTOS_CONSENTIMIENTO: string[] = [
  'Presentación como estudiantes de la Universidad EAFIT, con mención explícita del proyecto con Postobón. La transparencia sobre el aliado es condición del consentimiento informado; lo que se evita es presentarse como representante, vendedor o auditor de la empresa.',
  'Propósito del estudio en una frase y duración estimada (40 a 60 minutos).',
  'Aclaración de que no es una evaluación ni una auditoría del participante.',
  'Autorización para grabar audio y tomar fotografías, por separado. Sin rostros ni interiores sin permiso expreso.',
  'Confidencialidad: uso académico, codificación del participante y reporte agregado.',
  'Libertad de no responder y de terminar en cualquier momento.',
  'Forma en que se devolverán los resultados.',
]

/** Marca del nombre de quien entrevista dentro del guion. */
export const MARCA_NOMBRE = '______'

// Atajos para escribir las preguntas: `i` = imprescindible (★), `c` = complementaria.
// La profundización '—' significa que la pregunta no tiene repreguntas.
function pregunta(
  imprescindible: boolean,
  codigo: string,
  texto: string,
  profundizacion: string,
  lente: string,
  evidencia: string,
  ejercicio?: Ejercicio,
): Pregunta {
  return {
    codigo,
    imprescindible,
    texto,
    profundizacion: profundizacion === '—' ? undefined : profundizacion,
    evidencia,
    lentes: lente.split(' · ') as Lente[],
    ejercicio,
  }
}
const i = (...args: [string, string, string, string, string, Ejercicio?]) => pregunta(true, ...args)
const c = (...args: [string, string, string, string, string, Ejercicio?]) => pregunta(false, ...args)

const CIERRE_PREGUNTA =
  'Hemos terminado las preguntas. ¿Hay algo que no le hayamos preguntado y que usted considere importante para entender este tema en Manila?'
const CIERRE_CONTACTO = '¿Estaría dispuesto(a) a que lo contactemos de nuevo, por ejemplo, para un taller donde revisemos juntos lo encontrado?'

const EJERCICIO_JAC: Ejercicio = {
  titulo: 'Mapa rápido de relaciones',
  pasos: [
    'Versión breve (7 a 9 minutos) del Taller de Cartografía Social de la herramienta de estrategia. Su función es producir un primer mapa y abrir la puerta al taller completo, no reemplazarlo.',
    'En el centro de una hoja en blanco se escribe "Junta de Acción Comunal". El entrevistado nombra a las personas y organizaciones con que se relaciona y el entrevistador las escribe alrededor.',
    'Para cada relación, el entrevistado elige un color: verde (trabajamos juntos), rojo (hay diferencias o tensiones), amarillo (contacto ocasional o solo comercial).',
    'Se pregunta brevemente qué explica cada relación y desde cuándo es así.',
    'Se fotografía la hoja al terminar y se deja una copia a la Junta si la solicita.',
    'El entrevistador no sugiere actores. Si al final no aparecen tenderos, recuperadores, empresas o instituciones, se puede preguntar de forma abierta: "¿Hay alguien más con quien la Junta tenga que ver?".',
  ],
}

const EJERCICIO_TENDEROS: Ejercicio = {
  titulo: 'Decisiones forzadas',
  pasos: [
    'Adaptado de la Herramienta 3 de estrategia. Se presentan cuatro tarjetas impresas, en orden aleatorio, y el participante las ordena de 1 (la que más le serviría) a 4 (la que menos). Lo importante no es solo el orden sino la justificación, que se registra textualmente.',
    'Las tarjetas se leen en voz alta con el mismo texto para todos los participantes.',
    'No se explica ni se "vende" ninguna opción; si el participante pregunta cómo funcionaría, se responde "no está definido, queremos saber qué le serviría".',
    'Se fotografía el orden final.',
  ],
  juegosDeTarjetas: [
    {
      titulo: 'Tiendas, restaurantes, bares y cafés',
      tarjetas: [
        { nombre: 'Beneficio comercial', texto: 'Un descuento en el pedido o una bonificación según la cantidad de envases que usted devuelva.' },
        { nombre: 'Mejor servicio', texto: 'Visitas y entregas en los días y horas que más le convengan, con prioridad cuando se le acabe el producto.' },
        { nombre: 'Reconocimiento', texto: 'Un distintivo físico y digital que identifique su negocio como parte de una red de negocios del barrio que recuperan envases.' },
        { nombre: 'Más espacio libre', texto: 'Una recogida rápida y frecuente de envases que le libere espacio en la bodega o en el local.' },
      ],
    },
    {
      titulo: 'Hostales y alojamientos',
      tarjetas: [
        { nombre: 'Beneficio para el huésped', texto: 'Descuentos en comercios del barrio para los huéspedes que devuelvan sus envases.' },
        { nombre: 'Relación con el barrio', texto: 'Poder mostrar a los vecinos y a la Junta lo que el alojamiento hace para reducir los residuos del turismo.' },
        { nombre: 'Operación sin carga', texto: 'Un registro muy rápido, por ejemplo con un código QR, que no le quite tiempo a la recepción.' },
        { nombre: 'Reporte de impacto', texto: 'Un dato claro de cuántos envases se recuperaron, para sus informes o su comunicación.' },
      ],
    },
  ],
}

const EJERCICIO_RESIDENTES: Ejercicio = {
  titulo: 'Decisiones forzadas',
  pasos: [
    'Adaptación de la Herramienta 3 de estrategia para residentes. Estas tarjetas son una propuesta del equipo de integración y deben validarse en una prueba piloto antes de su uso generalizado.',
    'Se leen en voz alta, en orden aleatorio, con el mismo texto para todos.',
    'El participante ordena de 1 (lo que más le motivaría) a 4 (lo que menos) y explica su elección.',
    'No se explica cómo funcionaría cada opción; si pregunta, se responde que no está definido.',
  ],
  juegosDeTarjetas: [
    {
      titulo: 'Residentes',
      tarjetas: [
        { nombre: 'Beneficio económico', texto: 'Un descuento o bono en una tienda del barrio por cada cierta cantidad de envases que usted entregue.' },
        { nombre: 'Beneficio para el barrio', texto: 'Lo que se recupere se convierte en apoyo para proyectos de la Junta o de una organización del barrio.' },
        { nombre: 'Comodidad', texto: 'Un punto para entregar envases a menos de una cuadra de su casa, o una recogida en su edificio.' },
        { nombre: 'Información', texto: 'Saber con claridad qué pasa con los envases que entrega y cuánto se ha recuperado en el barrio.' },
      ],
    },
  ],
}

const EJERCICIO_VISITANTES: Ejercicio = {
  titulo: 'Decisiones forzadas',
  pasos: [
    'Adaptación de la Herramienta 3 de estrategia para visitantes, inspirada en las fichas propuestas para alojamientos. Estas tarjetas son una propuesta del equipo de integración y deben validarse en una prueba piloto.',
    'Se leen en voz alta, en orden aleatorio, con el mismo texto para todos (versión en inglés en el anexo).',
    'El participante ordena de 1 (lo que más le motivaría) a 4 (lo que menos) y explica su elección.',
  ],
  juegosDeTarjetas: [
    {
      titulo: 'Visitantes y consumidores',
      tarjetas: [
        { nombre: 'Beneficio inmediato', texto: 'Un descuento en un comercio del barrio al devolver el envase.' },
        { nombre: 'Aporte al barrio', texto: 'Lo que se recupere apoya proyectos comunitarios de Manila.' },
        { nombre: 'Facilidad', texto: 'Un punto para dejar el envase en su recorrido, sin tener que desviarse.' },
        { nombre: 'Registro digital', texto: 'Un código QR que le muestra lo que se ha recuperado gracias a su aporte.' },
      ],
    },
  ],
}

const GUIA_CENTRO: Guia = {
  id: 'centro-distribucion',
  numero: '01',
  pestana: 'Centro de distribución',
  titulo: 'Centro de Distribución Manila (BUSI) – Postobón',
  aQuien:
    'Jefe o coordinador del centro; supervisor de ventas o de rutas; asesor comercial o preventista del sector Manila; conductor o auxiliar de entrega',
  autorizacion: {
    guion: [
      'Buenos días/tardes. Mi nombre es ______ y hago parte del equipo de estudiantes de la Universidad EAFIT que trabaja con Postobón en el Proyecto Kratos 2026, sobre distribución de proximidad y aprovechamiento de envases en el barrio Manila.',
      'Esta conversación no evalúa su desempeño ni el de su equipo. Nos interesa su conocimiento práctico de cómo funciona la operación en el barrio, que es algo que normalmente no queda en los sistemas de información. Durará entre 40 y 60 minutos.',
      'No le vamos a pedir cifras financieras, precios ni datos de clientes; cuando hablemos de cantidades, un estimado o un rango es suficiente. Sus respuestas se usarán solo con fines académicos, no se atribuirán a usted con nombre propio y los hallazgos se compartirán con la compañía de forma agregada. Puede no responder cualquier pregunta y terminar cuando quiera.',
      '¿Está de acuerdo en participar? ¿Nos autoriza a grabar el audio?',
    ],
    notas: [
      'La autorización institucional de Postobón no reemplaza el consentimiento individual de cada persona entrevistada.',
      'Con conductores, auxiliares y asesores, aclarar que lo que digan no se reportará a sus jefes de forma identificable. Sin esa garantía, las respuestas sobre dificultades tienden a suavizarse.',
    ],
  },
  cierre: [
    CIERRE_PREGUNTA,
    `Muchas gracias por su tiempo. Con lo que conversamos con distintas personas del barrio vamos a preparar un resumen de resultados; la síntesis se entregará a Postobón, como se comprometió en la solicitud, y a usted si lo desea. ${CIERRE_CONTACTO}`,
  ],
  bloques: [
    {
      codigo: 'BU1',
      titulo: 'Rol y lugar del centro en la operación',
      minutos: 5,
      proposito:
        'Situar al centro y al entrevistado dentro de la cadena de distribución e identificar qué decisiones se toman localmente y cuáles vienen definidas desde otras áreas.',
      preguntas: [
        i('BU1.1', 'Para empezar, cuéntenos cómo es un día normal de su trabajo en relación con el sector de Manila, desde que empieza hasta que termina.', '¿Qué momentos del día son más exigentes? ¿Qué decisiones toma usted y cuáles vienen definidas por otra área?', 'Estrategia', 'Secuencia operativa diaria; puntos de decisión.'),
        c('BU1.2', '¿Cómo se reparte la atención del barrio entre el centro de distribución, el operador logístico y el equipo comercial?', '¿Quién define rutas y frecuencias? ¿Qué ha cambiado en esa organización en los últimos años?', 'Valor y negocio', 'Mapa de responsabilidades de la cadena.'),
      ],
    },
    {
      codigo: 'BU2',
      titulo: 'Profundidad de la distribución en el sector',
      minutos: 7,
      proposito:
        'Conocer cuántos y qué tipo de puntos se atienden, cómo se evalúa la zona y dónde se concentran las dificultades de atención. Insumo para la métrica de éxito del reto y para la muestra de puntos de venta.',
      preguntas: [
        i('BU2.1', '¿Aproximadamente cuántos puntos de venta se atienden en Manila y de qué tipo son?', 'Tiendas, minimercados, restaurantes, bares, cafés, hoteles u hostales, institucionales. ¿Cómo ha cambiado esa composición con la transformación comercial del barrio? ¿Hay puntos que no se atienden o se atienden con dificultad? ¿Por qué?', 'Estrategia · Valor y negocio', 'Rango de puntos por tipología y tendencia.'),
        i('BU2.2', '¿Qué distingue a un punto de venta bien atendido de uno con dificultades en este sector?', '¿Con qué indicadores se evalúa el desempeño de la zona? ¿Cuántas referencias maneja en promedio un punto y qué determina esa variedad?', 'Valor y negocio', 'Criterios internos de desempeño; insumo para la métrica de éxito (V2).'),
        c('BU2.3', '¿Cómo varía la demanda a lo largo del día, de la semana y del año en Manila?', '¿Qué papel tienen el turismo, los eventos y la vida nocturna? ¿Qué ocurre con los agotados en esos picos?', 'Estrategia', 'Estacionalidad, picos y relación con agotados.'),
      ],
    },
    {
      codigo: 'BU3',
      titulo: 'Operación de la ruta y última milla',
      minutos: 10,
      proposito:
        'Reconstruir, parada por parada, cómo se entrega en Manila y dónde se pierde tiempo o capacidad. Es el bloque que más se contrasta con el shadowing y con la entrevista a tenderos.',
      registroTecnico: [
        'Si se autoriza, acompañar una ruta en Manila y diligenciar el Módulo 3 (shadowing): tiempo total de parada, descargue y traslado, cargue de retorno, distancias a pie mayores de 10 m y altura del vehículo.',
        'Marcar en el plano las calles y puntos que el entrevistado señale como críticos.',
        'Fotografiar el vehículo tipo y las unidades de carga (canastilla, estiba) con elemento de escala.',
      ],
      preguntas: [
        i('BU3.1', '¿Con qué frecuencia se visita y se entrega en cada tipo de punto de venta, y qué determina esa frecuencia?', '¿Cómo se toma y se registra el pedido? ¿Qué información queda registrada y cuál no?', 'Valor y negocio', 'Frecuencias por tipología; flujo de información del pedido.'),
        i('BU3.2', 'Descríbanos una entrega típica en una calle de Manila, desde que el vehículo entra a la cuadra hasta que sale.', '¿Dónde se parquea? ¿Cuánto dura cada parada? ¿Qué tramos se hacen a pie y a qué distancia? ¿Qué papel juegan el tráfico, las pendientes o los andenes? (pedir que lo señale en el plano)', 'Técnica', 'Secuencia de maniobras y tiempos estimados, contrastables con el cronómetro.'),
        c('BU3.3', '¿Qué vehículos se usan en el sector y qué limitaciones tienen allí?', 'Capacidad, altura, radio de giro. ¿Hay calles donde no pueden entrar? ¿Se ha probado otro medio (vehículo pequeño, carretilla, bicicleta de carga)?', 'Técnica', 'Configuración vehicular y restricciones de acceso.'),
        i('BU3.4', '¿En qué franjas horarias se entrega y qué limita esa ventana?', 'Normativa de cargue y descargue, horario de los establecimientos, zonas formales de descarga, comparendos.', 'Técnica · Valor y negocio', 'Ventanas de entrega y restricciones normativas y operativas.'),
        i('BU3.5', '¿Cuáles son las tres dificultades operativas más frecuentes en este sector?', 'De cada una: ¿con qué frecuencia ocurre y qué la causa? ¿Qué parte aproximada del tiempo de ruta se va en espera, desplazamiento o parqueo?', 'Valor y negocio', 'Fricciones priorizadas por frecuencia y costo percibido.'),
      ],
    },
    {
      codigo: 'BU4',
      titulo: 'Envase, empaque y retorno',
      minutos: 9,
      proposito:
        'Establecer el portafolio de envase que circula realmente, cómo funciona en la práctica el retorno y si existe capacidad de transporte ociosa en el viaje de regreso. Punto de partida material del diseño.',
      preguntas: [
        i('BU4.1', '¿Qué formatos y presentaciones circulan realmente en el sector y cuáles predominan en cada tipo de establecimiento?', '¿Qué diferencias hay entre el consumo en sitio (restaurantes, bares) y la compra de conveniencia (tiendas)?', 'Estrategia · Técnica', 'Portafolio de envase efectivo por canal (insumo V4).'),
        i('BU4.2', '¿Cómo funciona en la práctica el retorno de envases retornables y de canastillas en Manila?', '¿Se recoge envase en cada visita? ¿Qué lo limita? ¿Qué pasa cuando el punto no tiene el envase listo?', 'Técnica · Valor y negocio', 'Ciclo previsto frente a ciclo efectivo del retornable.'),
        c('BU4.3', '¿Qué material queda en el punto de venta después de la entrega y qué ocurre con él?', 'Plástico de empaque, cartón, envases no retornables. ¿Hay relación de los puntos con recicladores o recuperadores? ¿Cómo funciona?', 'Estrategia', 'Flujo de posconsumo no retornable y actores de recuperación.'),
        i('BU4.4', 'Cuando el vehículo regresa al centro, ¿con qué regresa y cómo se usa el espacio en ese viaje?', '¿Qué impediría traer en ese viaje otro material del barrio (manipulación, higiene, tiempos, normativa, contabilidad del inventario)?', 'Valor y negocio · Técnica', 'Capacidad de retorno disponible y restricciones para aprovecharla.'),
      ],
    },
    {
      codigo: 'BU5',
      titulo: 'Relación con el territorio',
      minutos: 6,
      proposito:
        'Verificar el supuesto de que la operación no tiene relación institucional con las organizaciones del barrio e identificar activos físicos que podrían facilitar la operación.',
      preguntas: [
        i('BU5.1', '¿Qué relación tiene la operación con actores del barrio distintos de los clientes?', 'Junta de Acción Comunal, administración de centros comerciales, autoridades de tránsito, Policía, vecinos. ¿Ha habido quejas, acuerdos o conflictos? ¿Con quién se habla cuando hay un problema en la calle?', 'Estrategia', 'Relaciones institucionales existentes (verifica supuesto de la Fase 2).'),
        c('BU5.2', '¿Cómo cree que ven los tenderos y los vecinos la operación en Manila?', '¿En qué se basa esa percepción? ¿Qué reclamos se escuchan con más frecuencia?', 'Estrategia', 'Percepción atribuida, a contrastar con tenderos y residentes.'),
        c('BU5.3', '¿Existen en el barrio espacios que faciliten, o que podrían facilitar, la operación?', 'Bodegas, parqueaderos, locales, sedes comunitarias. ¿Se ha explorado alguna vez un punto de transferencia o una bodega pequeña cercana?', 'Técnica · Valor y negocio', 'Activos físicos potenciales en el territorio.'),
      ],
    },
    {
      codigo: 'BU6',
      titulo: 'Costos, indicadores y valor',
      minutos: 6,
      proposito:
        'Entender, sin pedir cifras, qué factores hacen más costoso atender Manila y cómo se reconocería internamente una mejora. Aporta evidencia a dos hipótesis de la estrategia consolidada: la relación entre fricción urbana y aumento de fletes, y el comportamiento de recaudo del sector.',
      notas: ['Respetar el alcance de la carta: se indaga por factores y órdenes de magnitud, nunca por valores, márgenes o tarifas.'],
      preguntas: [
        i('BU6.1', 'Desde su experiencia, ¿qué hace que atender a Manila sea más costoso o más sencillo que atender otros sectores?', '¿Qué factores han cambiado en los últimos dos años? ¿Cuáles dependen del barrio y cuáles de la operación?', 'Valor y negocio', 'Factores de costo atribuidos al territorio.'),
        c('BU6.2', '¿Cómo son hoy las formas de pago de los puntos del sector y qué ha cambiado?', '¿Qué tipos de punto suelen pagar de contado y cuáles a plazo? ¿Cómo afecta eso los tiempos de la ruta?', 'Valor y negocio', 'Comportamiento cualitativo de recaudo.'),
        c('BU6.3', 'Si una solución mejorara la entrega y el retorno en Manila, ¿en qué indicadores se notaría?', '¿Quién tendría que aprobarla? ¿Qué condiciones debería cumplir una prueba piloto para ser aceptada?', 'Valor y negocio', 'Criterios de éxito y ruta de decisión interna.'),
      ],
    },
    {
      codigo: 'BU7',
      titulo: 'Antecedentes y propuestas',
      minutos: 6,
      proposito: 'Evitar que el proyecto proponga soluciones ya intentadas y recoger la hipótesis de quien opera el territorio todos los días.',
      notas: ['BU7.3 es la pregunta más valiosa de la guía: se reserva siempre para el final.'],
      preguntas: [
        i('BU7.1', '¿Se han hecho antes, en este sector o en uno parecido, iniciativas de retorno, depósito, recolección o distribución compartida?', '¿Qué funcionó y qué no? ¿Por qué cree que pasó eso?', 'Estrategia · Valor y negocio', 'Antecedentes y aprendizajes.'),
        c('BU7.2', '¿Qué propuestas de mejora ha planteado usted y qué respuesta han tenido?', '¿Qué le faltó a esa propuesta para avanzar?', 'Valor y negocio', 'Propuestas internas no documentadas.'),
        i('BU7.3', 'Si pudiera cambiar una sola cosa de la operación en este barrio, ¿qué cambiaría?', '¿Qué se necesitaría para hacerlo? ¿Quién tendría que participar?', 'Todas', 'Hipótesis del operador sobre el problema central.'),
      ],
    },
  ],
}

const GUIA_JAC: Guia = {
  id: 'jac',
  numero: '02',
  pestana: 'JAC',
  titulo: 'Junta de Acción Comunal (JAC) del barrio Manila',
  aQuien: 'Presidencia y dignatarios; coordinadores de comités de trabajo (a confirmar cuáles existen); afiliados activos',
  autorizacion: {
    guion: [
      'Buenos días/tardes. Mi nombre es ______ y hago parte de un equipo de estudiantes de la Universidad EAFIT. Estamos haciendo un estudio sobre cómo funcionan el comercio, la distribución de bebidas y el manejo de envases en Manila, en el marco de un proyecto académico con Postobón. No trabajamos para la empresa ni venimos a proponer nada todavía: queremos entender el barrio desde quienes lo conocen y lo organizan.',
      'La conversación durará entre 40 y 60 minutos. Con su permiso tomaremos notas y, si lo autoriza, grabaremos el audio solo para no perder información. Lo que nos diga se usará con fines académicos y no se publicará con su nombre. Puede no responder cualquier pregunta y terminar cuando quiera. Al final le contaremos cómo pensamos devolver los resultados a la comunidad.',
      '¿Está de acuerdo en participar? ¿Nos autoriza a grabar?',
    ],
    notas: [
      'Si el entrevistado habla en nombre de la Junta, preguntar si lo hace a título personal o como vocero; registrarlo en la ficha.',
      'Evitar que la entrevista se perciba como la antesala de un proyecto ya decidido o de recursos comprometidos.',
    ],
  },
  cierre: [
    CIERRE_PREGUNTA,
    `Muchas gracias por su tiempo. Con lo que conversamos con distintas personas del barrio vamos a preparar un resumen de resultados; proponemos hacerlo en una reunión con la Junta, y si ustedes quieren, construir juntos esa devolución. ${CIERRE_CONTACTO}`,
  ],
  bloques: [
    {
      codigo: 'JA1',
      titulo: 'Trayectoria y rol de la Junta',
      minutos: 5,
      proposito: 'Comprender la función actual, el alcance territorial y el nivel de organización de la Junta, y la posición del entrevistado dentro de ella.',
      preguntas: [
        i('JA1.1', 'Cuéntenos cómo llegó usted a la Junta y qué hace hoy la Junta en el barrio.', '¿Qué cuadras o sectores cubre su gestión? ¿Qué comités funcionan hoy? ¿Cuántas personas participan de forma activa?', 'Estrategia', 'Rol, alcance territorial y capacidad organizativa.'),
      ],
    },
    {
      codigo: 'JA2',
      titulo: 'Lectura del barrio y sus transformaciones',
      minutos: 7,
      proposito: 'Recoger la narrativa del cambio del barrio (de residencial a comercial, turístico y cultural), sus lugares significativos y los problemas que llegan a la Junta.',
      registroTecnico: ['Conservar el plano con el recorrido y los lugares señalados, con el código del entrevistado.'],
      preguntas: [
        i('JA2.1', '¿Cómo ha cambiado Manila en los últimos diez años?', '¿Qué llegó y qué se fue? ¿Qué ha significado para los vecinos de toda la vida? ¿Y para los negocios tradicionales?', 'Estrategia', 'Narrativa de transformación y tensiones percibidas.'),
        i('JA2.2', 'Si tuviera que mostrarle el barrio a alguien que no lo conoce, ¿por dónde lo llevaría y qué le mostraría?', 'Pedir que trace el recorrido en el plano. ¿Qué lugares son importantes para la comunidad? ¿Cuáles son los más difíciles y por qué?', 'Estrategia · Técnica', 'Hitos y nodos de proximidad; recorrido dibujado.'),
        c('JA2.3', '¿Qué problemas relacionados con el comercio, el paso de camiones o las basuras llegan hasta la Junta?', '¿Quién los trae? ¿Cómo se tramitan? ¿Cuál se repite más?', 'Estrategia · Valor y negocio', 'Percepción del problema (variable comparable).'),
      ],
    },
    {
      codigo: 'JA3',
      titulo: 'Convocatoria y comunicación',
      minutos: 5,
      proposito: 'Estimar la capacidad real de convocatoria y los canales por los que circula la información en el barrio.',
      preguntas: [
        i('JA3.1', 'Cuando la Junta convoca una actividad, ¿quiénes responden y cuántas personas suelen participar?', '¿Qué actividades convocan más? ¿Participan los comerciantes? ¿Y los residentes que llegaron hace poco?', 'Estrategia', 'Capacidad de convocatoria (rango de personas).'),
        c('JA3.2', '¿Por qué medios se entera la gente de lo que pasa en el barrio?', 'Grupos de mensajería, carteleras, asambleas, redes sociales, voz a voz. ¿Cuál funciona mejor y con quién?', 'Estrategia', 'Canales locales de comunicación y su alcance.'),
      ],
    },
    {
      codigo: 'JA4',
      titulo: 'Relaciones entre actores',
      minutos: 8,
      proposito:
        'Construir un mapa preliminar de relaciones de la Junta (cooperación, diferencia, contacto ocasional) y verificar si existe relación previa con empresas, en particular con Postobón o sus distribuidores.',
      notas: ['JA4.1 se realiza con el ejercicio de mapa rápido de relaciones descrito en la sección 9.'],
      preguntas: [
        i('JA4.1', '¿Con qué personas y organizaciones se relaciona la Junta? Ubiquémoslas en esta hoja.', 'Luego: ¿con cuáles trabajan juntos, con cuáles hay diferencias y con cuáles solo hay contacto ocasional? ¿Qué explica cada relación?', 'Estrategia', 'Mapa de relaciones por tipo de vínculo.', EJERCICIO_JAC),
        c('JA4.2', '¿Qué relación tiene la Junta con las tiendas, restaurantes y otros negocios del sector?', '¿Hay comerciantes afiliados? ¿Han hecho cosas juntos? ¿Cómo describiría la confianza entre vecinos y comerciantes?', 'Estrategia · Valor y negocio', 'Vínculos entre la Junta y el comercio; nivel de confianza.'),
        i('JA4.3', '¿La Junta ha trabajado antes con alguna empresa privada? ¿Cómo fue esa experiencia?', '¿Qué hizo que funcionara o no? ¿Han tenido algún contacto con Postobón o con quienes distribuyen sus productos?', 'Estrategia · Valor y negocio', 'Antecedentes de relación empresa–comunidad.'),
      ],
    },
    {
      codigo: 'JA5',
      titulo: 'Residuos, reciclaje y recuperadores',
      minutos: 7,
      proposito: 'Inventariar cómo funciona hoy el manejo de residuos y reciclaje, quiénes recuperan material y qué iniciativas previas existieron.',
      registroTecnico: ['Marcar en el plano los puntos de acopio, de acumulación y las rutas de recuperadores mencionados.'],
      preguntas: [
        i('JA5.1', '¿Cómo se manejan hoy las basuras y el reciclaje en el barrio?', '¿Hay días, horarios o puntos de acopio? ¿Qué problemas generan? ¿Qué pasa con las botellas y las latas?', 'Técnica · Estrategia', 'Sistema actual de residuos y puntos críticos.'),
        i('JA5.2', '¿Quiénes recogen material reciclable en Manila y cómo es la relación con ellos?', '¿Recicladores de oficio, asociaciones, empresa de aseo? ¿Qué material buscan más? ¿Dónde lo acopian?', 'Estrategia · Técnica', 'Actores de recuperación; material más buscado y cuello de botella.'),
        c('JA5.3', '¿Se han hecho campañas o proyectos de reciclaje en el barrio? ¿Qué pasó con ellos?', '¿Por qué se sostuvieron o no? ¿Quién los lideró?', 'Valor y negocio', 'Antecedentes y razones de éxito o fracaso.'),
      ],
    },
    {
      codigo: 'JA6',
      titulo: 'Espacios y capacidad física',
      minutos: 6,
      proposito: 'Dimensionar los espacios y las personas con que cuenta la Junta, y otros espacios subutilizados del barrio. Insumo directo para el Módulo 4 de la herramienta técnica.',
      registroTecnico: [
        'Con autorización: medir el espacio (área, altura útil, vano de acceso, desniveles) y fotografiarlo con elemento de escala.',
        'Registrar el acceso vehicular más cercano y la distancia a pie hasta la calle.',
      ],
      preguntas: [
        i('JA6.1', '¿La Junta cuenta con algún espacio propio o prestado? ¿Cómo se usa hoy?', 'Tamaño aproximado, horarios, acceso desde la calle, quién tiene las llaves. ¿Hay restricciones de uso?', 'Técnica', 'Ficha de espacio: m², horarios, responsables, acceso.'),
        c('JA6.2', '¿Conoce otros espacios del barrio que estén poco usados?', '¿De quién son? ¿Qué habría que hacer para usarlos?', 'Técnica · Valor y negocio', 'Inventario de espacios potenciales.'),
        c('JA6.3', '¿Con cuántas personas y cuánto tiempo cuenta hoy la Junta para asumir tareas nuevas?', '¿Hay voluntarios? ¿Qué tareas se han dejado de hacer por falta de manos?', 'Valor y negocio', 'Capacidad operativa disponible (personas y horas).'),
      ],
    },
    {
      codigo: 'JA7',
      titulo: 'Condiciones de participación',
      minutos: 8,
      proposito:
        'Identificar incentivos, barreras y formas de gobierno bajo las cuales la Junta participaría en una iniciativa con una empresa, y qué rol estaría dispuesta a asumir: articular y comunicar, o además administrar un espacio (decisión pendiente en la herramienta de estrategia).',
      preguntas: [
        i('JA7.1', 'Si una empresa propusiera al barrio trabajar juntos en el manejo de envases, ¿qué condiciones pondría la Junta para participar?', '¿Qué debería recibir la comunidad? ¿Qué pesa más: un beneficio económico, el reconocimiento o el efecto visible en el barrio?', 'Valor y negocio', 'Incentivos y condiciones priorizados.'),
        i('JA7.2', '¿Qué podría impedir que una iniciativa así funcione en Manila?', '¿Hay experiencias que no lograron sostenerse? ¿Qué pasó? Confianza, recursos, conflictos, continuidad.', 'Valor y negocio · Estrategia', 'Barreras y riesgos identificados por el actor.'),
        c('JA7.3', '¿Quién debería tomar las decisiones y coordinar el día a día de una iniciativa así?', '¿Qué papel podría tener la Junta: convocar, comunicar, prestar o administrar un espacio, hacer seguimiento? ¿Qué necesitaría para hacerlo?', 'Estrategia · Valor y negocio', 'Rol articulador viable y requisitos.'),
      ],
    },
    {
      codigo: 'JA8',
      titulo: 'Comunicación y participación en el estudio',
      minutos: 5,
      proposito: 'Definir las condiciones de devolución de resultados y de comunicación sobre el barrio, y la disposición de la Junta a co-investigar.',
      preguntas: [
        i('JA8.1', '¿Cómo le gustaría que la comunidad se enterara de este estudio y de sus resultados?', '¿Le interesaría a la Junta participar en el análisis de lo que encontremos, por ejemplo en un taller con un mapa del barrio?', 'Estrategia', 'Condiciones de devolución; disposición a co-investigar.'),
        c('JA8.2', 'Si lo que pase en Manila se contara en el resto de Medellín, ¿cómo debería contarse?', '¿Qué le molestaría ver o leer sobre el barrio?', 'Estrategia', 'Riesgos comunicacionales y narrativa local.'),
      ],
    },
    {
      codigo: 'JA9',
      titulo: 'Propuestas de la comunidad',
      minutos: 3,
      proposito: 'Recoger propuestas espontáneas desde el conocimiento del territorio, sin inducirlas.',
      preguntas: [
        i('JA9.1', 'Desde su experiencia, ¿qué propondría para mejorar la relación entre el barrio y las empresas que trabajan aquí?', '¿Ha pensado en alguna alianza o forma de trabajo que le gustaría ver?', 'Todas', 'Propuestas no inducidas.'),
      ],
    },
  ],
}

const GUIA_INSTITUCIONES: Guia = {
  id: 'instituciones',
  numero: '03',
  pestana: 'Instituciones',
  titulo: 'Instituciones representativas del barrio Manila',
  aQuien:
    'Policía: comandante de estación o de cuadrante. Hospital: coordinación de gestión ambiental, servicios generales o administración. Centro comercial: administración, jefatura de operaciones o logística, coordinación de aseo',
  autorizacion: {
    guion: [
      'Buenos días/tardes. Mi nombre es ______ y hago parte de un equipo de estudiantes de la Universidad EAFIT. Adelantamos un estudio sobre cómo funcionan el abastecimiento de bebidas, el uso del espacio público y el manejo de envases en Manila, en el marco de un proyecto académico con Postobón. No representamos a la empresa: nuestro interés es entender el barrio desde las instituciones que tienen un papel importante en él.',
      'La conversación durará entre 40 y 60 minutos. Con su autorización tomaremos notas y grabaremos el audio. La información se usará con fines académicos; en los informes nos referiremos a la institución de forma general y no a usted con nombre propio, salvo que usted lo autorice. Puede no responder cualquier pregunta. ¿Está de acuerdo en participar? ¿Nos autoriza a grabar?',
    ],
    notas: [
      'Preguntar explícitamente si la institución puede ser nombrada en los resultados o si prefiere una referencia genérica (por ejemplo, "una institución de salud del sector").',
      'Si el entrevistado solo puede hablar a título personal y no institucional, registrarlo y tenerlo en cuenta en el análisis.',
    ],
  },
  cierre: [
    CIERRE_PREGUNTA,
    `Muchas gracias por su tiempo. Con lo que conversamos con distintas personas del barrio vamos a preparar un resumen de resultados; se lo haremos llegar a la institución por el canal que usted indique. ${CIERRE_CONTACTO}`,
  ],
  bloques: [
    {
      codigo: 'IN1',
      titulo: 'Papel de la institución en el barrio',
      minutos: 4,
      proposito: 'Situar a la institución en el territorio: qué hace, desde cuándo, qué área cubre y cómo se relaciona con los vecinos.',
      preguntas: [
        i('IN1.1', 'Para empezar, cuéntenos qué hace la institución en Manila y cuál es su papel en el día a día del barrio.', '¿Desde cuándo está aquí? ¿Qué área o población atiende? ¿Cuántas personas trabajan en la sede?', 'Estrategia', 'Rol, alcance y escala de la institución.'),
      ],
    },
    {
      codigo: 'IN2',
      titulo: 'Lectura del barrio',
      minutos: 5,
      proposito: 'Obtener la lectura institucional de los cambios del barrio y de sus franjas y zonas de mayor actividad, que complementa las franjas de observación del Tiempo 1.',
      preguntas: [
        i('IN2.1', 'Desde lo que ve la institución, ¿cómo ha cambiado Manila en los últimos años?', 'Población residente y flotante, turismo, comercio y vida nocturna. ¿Qué efectos ha tenido sobre su labor?', 'Estrategia', 'Lectura institucional de la transformación.'),
        c('IN2.2', '¿En qué horarios y lugares se concentra la actividad del barrio?', 'Picos de visitantes, noches, fines de semana, temporadas. Pedir que los señale en el plano.', 'Técnica', 'Franjas y zonas críticas.'),
      ],
    },
    {
      codigo: 'IN3',
      titulo: 'Abastecimiento, movilidad y espacio público',
      minutos: 7,
      proposito: 'Conocer cómo se abastece la propia institución y qué observa sobre el cargue y descargue de mercancías en su entorno.',
      registroTecnico: [
        'Marcar en el plano los puntos de cargue y conflicto señalados.',
        'Si se autoriza el recorrido: medir y fotografiar la zona de recepción (ancho, altura, accesos, desniveles).',
      ],
      preguntas: [
        i('IN3.1', '¿Cómo le llegan a la institución sus insumos y mercancías, y qué dificultades encuentra?', 'Horarios, zonas de cargue, accesos, número de proveedores. ¿Hay reglas para los proveedores?', 'Técnica', 'Operación de abastecimiento propia y sus restricciones.'),
        i('IN3.2', '¿Qué observa sobre el cargue y descargue de mercancías en las calles cercanas?', '¿Genera congestión, ocupación de andenes o conflictos? ¿En qué puntos y a qué horas?', 'Técnica · Valor y negocio', 'Puntos críticos de fricción urbana.'),
      ],
    },
    {
      codigo: 'IN4',
      titulo: 'Residuos y envases',
      minutos: 7,
      proposito: 'Establecer el volumen, el destino y los responsables de los envases de bebidas que genera la institución y su entorno inmediato.',
      registroTecnico: ['Si se autoriza: dimensiones y fotografía del cuarto o punto de residuos; tipo y número de contenedores; frecuencia de evacuación declarada.'],
      preguntas: [
        i('IN4.1', '¿Cómo maneja la institución los residuos que genera, en especial botellas, latas y empaques?', '¿Quién los recoge y con qué frecuencia? ¿Se separan? ¿Hay un plan o un responsable ambiental?', 'Técnica · Valor y negocio', 'Volumen aproximado, frecuencia, gestor y separación.'),
        c('IN4.2', '¿Dónde se acumulan residuos en el entorno de la institución?', '¿A qué horas? ¿Quiénes intervienen?', 'Técnica', 'Puntos de acumulación (para fotografiar).'),
        c('IN4.3', '¿Qué relación existe con los recicladores o recuperadores que trabajan en la zona?', '¿Tienen acuerdos? ¿Qué material se llevan?', 'Estrategia', 'Vínculos con la recuperación informal o formal.'),
      ],
    },
    {
      codigo: 'IN5',
      titulo: 'Relaciones y disposición a articularse',
      minutos: 6,
      proposito: 'Mapear las relaciones de la institución en el barrio y su disposición, condiciones y límites frente a una iniciativa conjunta.',
      preguntas: [
        i('IN5.1', '¿Con qué organizaciones del barrio trabaja la institución?', 'Junta de Acción Comunal, comerciantes, otras instituciones, empresas. ¿En qué temas? ¿Cómo describiría esas relaciones?', 'Estrategia', 'Mapa de relaciones institucionales.'),
        i('IN5.2', 'Si en el barrio se probara una forma distinta de organizar la entrega de bebidas y la recolección de envases, ¿qué papel podría tener o no tener la institución?', '¿Qué permisos o condiciones serían necesarios? ¿Qué le preocuparía? ¿Qué beneficio tendría para la institución?', 'Valor y negocio', 'Disposición, condiciones, beneficios y restricciones institucionales.'),
      ],
    },
    {
      codigo: 'IN6',
      titulo: 'Comunicación',
      minutos: 3,
      proposito: 'Identificar cómo se comunica la institución con la comunidad y qué recomendaría a una empresa que quiera comunicar un proyecto en el barrio.',
      preguntas: [
        c('IN6.1', '¿Cómo se comunica la institución con la comunidad y qué ha aprendido de eso?', '¿Qué debería tener en cuenta una empresa que quiera contar un proyecto en este barrio?', 'Estrategia', 'Canales institucionales y recomendaciones de comunicación.'),
      ],
    },
  ],
  modulos: {
    etiqueta: 'Institución',
    nota: 'Se aplica un solo módulo por entrevista, según la institución. Las preguntas ★ del módulo forman parte de la versión de 40 minutos.',
    opciones: [
      {
        id: 'policia',
        nombre: 'Policía',
        bloque: {
          codigo: 'PO',
          titulo: 'Policía',
          aQuien: 'Comandante de estación o de cuadrante del sector, o quien este designe.',
          proposito:
            'Conocer las dinámicas de convivencia y uso del espacio público que condicionan la distribución y la ubicación de cualquier punto de recolección, y obtener recomendaciones de seguridad para el trabajo de campo.',
          preguntas: [
            i('PO1', '¿Cuáles son las situaciones de convivencia más frecuentes en el sector y en qué lugares y horarios ocurren?', '¿Qué relación tienen con la vida nocturna, el comercio o el espacio público?', 'Estrategia', 'Franjas y zonas sensibles.'),
            i('PO2', '¿Qué situaciones relacionadas con el cargue y descargue o con la ocupación del espacio público atiende la Policía?', '¿Hay comparendos, quejas o acuerdos con transportadores o comerciantes? ¿Qué normas aplican?', 'Técnica · Valor y negocio', 'Conflictos y marco normativo de la operación en calle.'),
            i('PO3', 'Si en el barrio se instalara un punto de recolección de envases, ¿qué habría que tener en cuenta en materia de seguridad y convivencia?', 'Ubicación, horarios, vigilancia, riesgos de hurto o de uso indebido.', 'Técnica · Valor y negocio', 'Restricciones de diseño y ubicación.'),
            c('PO4', '¿Cómo es la relación entre la Policía, los recicladores y los comerciantes en el sector?', '¿Qué funciona bien? ¿Qué genera dificultades?', 'Estrategia', 'Relaciones entre actores del espacio público.'),
            c('PO5', '¿Qué recomendaciones daría a un equipo de estudiantes que hará trabajo de campo en Manila?', 'Horarios y zonas a tener en cuenta; a quién acudir en caso de necesidad.', 'Estrategia', 'Protocolo de seguridad del trabajo de campo.'),
          ],
        },
      },
      {
        id: 'hospital',
        nombre: 'Hospital o clínica',
        bloque: {
          codigo: 'HO',
          titulo: 'Hospital o clínica',
          aQuien: 'Coordinación de gestión ambiental, servicios generales o administración.',
          proposito:
            'Dimensionar la población flotante asociada a la institución y su consumo en el entorno, y conocer las restricciones sanitarias y de acceso que condicionan cualquier manejo de envases.',
          preguntas: [
            i('HO1', '¿Cuántas personas circulan aproximadamente por la institución en un día y dónde consumen bebidas?', 'Pacientes, acompañantes, personal. Cafetería, máquinas dispensadoras, tiendas cercanas.', 'Estrategia · Técnica', 'Población flotante y puntos de consumo.'),
            i('HO2', '¿Cómo diferencia la institución los residuos propios de la atención en salud de los residuos comunes o aprovechables como botellas y latas?', '¿Quién gestiona cada flujo? ¿Qué restricciones sanitarias hay para almacenar o entregar envases?', 'Técnica', 'Restricciones sanitarias y de manejo.'),
            c('HO3', '¿Cómo se abastecen la cafetería y los puntos de venta de la institución?', 'Proveedores, frecuencia, horarios de recepción, espacio de almacenamiento.', 'Técnica · Valor y negocio', 'Operación de abastecimiento interno.'),
            c('HO4', '¿La institución tiene metas o informes ambientales a los que una iniciativa de recuperación de envases podría aportar?', '¿Quién es el responsable? ¿Qué información necesitaría?', 'Valor y negocio', 'Incentivos institucionales (reporte de impacto).'),
            i('HO5', '¿Qué condiciones del entorno deben respetarse por la actividad de la institución?', 'Accesos de ambulancias, zonas libres de ruido o de obstáculos, horarios restringidos.', 'Técnica', 'Restricciones de entorno para rutas y prototipos.'),
          ],
        },
      },
      {
        id: 'centro-comercial',
        nombre: 'Centro comercial',
        bloque: {
          codigo: 'CC',
          titulo: 'Administración del Centro Comercial Monterrey',
          aQuien: 'Administración, jefatura de operaciones o logística, coordinación de aseo.',
          proposito:
            'Conocer la infraestructura y las reglas de recepción de mercancía, la concentración de locales que venden bebidas, la gestión centralizada de residuos y las condiciones bajo las cuales la administración consideraría un punto de recolección o una bodega compartida.',
          registroTecnico: ['Si se autoriza: medir y fotografiar muelle de carga y cuarto de residuos (área, altura, accesos); registrar número y tipo de contenedores.'],
          preguntas: [
            i('CC1', '¿Cómo está organizada la recepción de mercancías en el centro comercial?', 'Muelles, horarios, reglas para proveedores, tiempos de espera, número aproximado de entregas diarias.', 'Técnica', 'Infraestructura y reglas de cargue.'),
            i('CC2', '¿Cuántos locales venden o sirven bebidas y cómo se abastecen?', 'Plazoleta de comidas, tiendas, máquinas. ¿Cada local se abastece por su cuenta o hay algo centralizado?', 'Valor y negocio · Técnica', 'Concentración de puntos y modelo de abastecimiento.'),
            i('CC3', '¿Cómo se gestionan los residuos del centro comercial, en particular los envases de bebidas?', 'Cuarto de residuos, separación, gestor, frecuencia, qué se recupera y qué no. ¿Esa gestión genera costos o ingresos?', 'Técnica · Valor y negocio', 'Volumen, destino y espacio de residuos.'),
            c('CC4', '¿Cómo es el público que visita el centro comercial?', 'Residentes, visitantes de otros barrios, turistas, trabajadores. Franjas de mayor afluencia.', 'Estrategia', 'Perfil y picos del público.'),
            c('CC5', '¿Qué interés o qué reparos tendría la administración frente a un punto de recolección de envases o una bodega compartida en sus instalaciones o en su entorno?', '¿Quién tendría que decidirlo (administración, consejo, copropietarios)? ¿Qué beneficio buscaría?', 'Valor y negocio', 'Condiciones, decisores e incentivos.'),
          ],
        },
      },
    ],
  },
}

const GUIA_TENDEROS: Guia = {
  id: 'tenderos',
  numero: '04',
  pestana: 'Tenderos',
  titulo: 'Tenderos y establecimientos de restauración',
  aQuien: 'Propietario, administrador o encargado con conocimiento de pedidos y recepción de mercancía',
  aviso:
    'Si no hay tiempo, divídela en dos sesiones: TR1–TR4 (con el arqueo) y TR5–TR9. Con hostales usa las tarjetas de alojamientos y omite TR6.',
  autorizacion: {
    guion: [
      'Buenos días/tardes. Mi nombre es ______ y hago parte de un equipo de estudiantes de la Universidad EAFIT. Estamos haciendo un estudio sobre cómo funciona el comercio en Manila: cómo les llegan las bebidas a los negocios, qué pasa con los envases y cómo se vive eso en el día a día. Es un proyecto académico que hacemos con Postobón, pero no somos vendedores ni venimos a revisar su negocio: esto no es una auditoría ni una evaluación.',
      'Nos tomaría entre 40 y 60 minutos, o lo podemos partir en dos ratos si le queda mejor. Con su permiso tomaremos notas y, si lo autoriza, grabaremos el audio y tomaremos algunas fotos del espacio, sin personas. No le vamos a pedir cifras de ventas ni documentos. Lo que nos diga es confidencial y se usa solo para el estudio. Puede no responder cualquier pregunta y parar cuando quiera, sobre todo si llegan clientes.',
      '¿Está de acuerdo? ¿Nos autoriza a grabar y a tomar fotos del espacio?',
    ],
    notas: [
      'La mención del proyecto con Postobón es obligatoria por transparencia; si el participante reacciona con desconfianza, reiterar que nada de lo que diga se reportará de forma individual a ninguna empresa.',
      'Si el negocio trabaja con marcas de la competencia, dejar claro que eso no es un problema para el estudio.',
    ],
  },
  cierre: [
    CIERRE_PREGUNTA,
    `Muchas gracias por su tiempo. Con lo que conversamos con distintas personas del barrio vamos a preparar un resumen de resultados; se lo traeremos personalmente o por el medio que usted prefiera. ${CIERRE_CONTACTO}`,
  ],
  bloques: [
    {
      codigo: 'TR1',
      titulo: 'El negocio y su día a día',
      minutos: 5,
      proposito: 'Caracterizar el establecimiento, sus franjas de actividad y su clientela, y abrir la conversación en terreno conocido para el participante.',
      preguntas: [
        i('TR1.1', 'Cuéntenos cómo es un día normal en su negocio, desde que abre hasta que cierra.', '¿Cuáles son las horas de más movimiento? ¿Qué se vende más? ¿Quiénes son sus clientes: vecinos, trabajadores, turistas?', 'Estrategia', 'Tipología, franjas y clientela.'),
        c('TR1.2', '¿Cómo ha cambiado su clientela desde que empezó el negocio?', '¿Qué ha significado la llegada de turistas y de negocios nuevos al barrio?', 'Estrategia', 'Efecto de la transformación del barrio en el negocio.'),
      ],
    },
    {
      codigo: 'TR2',
      titulo: 'Abastecimiento y relación con proveedores',
      minutos: 7,
      proposito: 'Entender cómo se pide y se recibe el producto, qué canales alternos se usan y qué ocurre cuando el producto se agota.',
      preguntas: [
        i('TR2.1', '¿Cómo le llegan las bebidas al negocio: quién toma el pedido, cada cuánto pasa el vendedor y cada cuánto llega la entrega?', '¿Todos los proveedores funcionan igual? ¿Compra también en supermercados o mayoristas? ¿Por qué?', 'Valor y negocio', 'Frecuencias por proveedor y canales alternos.'),
        i('TR2.2', '¿Qué pasa cuando se le acaba un producto antes de la siguiente visita?', '¿Con qué frecuencia le pasa y con qué productos? ¿Qué hace el cliente: espera, compra otra marca, se va?', 'Valor y negocio', 'Agotados y su costo percibido.'),
        c('TR2.3', '¿Cómo decide cuánto pedir y qué marcas tener en la nevera?', '¿De quién es la nevera? ¿Hay condiciones para exhibir el producto?', 'Valor y negocio · Estrategia', 'Criterios de surtido y exhibición.'),
      ],
    },
    {
      codigo: 'TR3',
      titulo: 'El momento de la entrega',
      minutos: 6,
      proposito: 'Recoger la experiencia de la entrega para contrastarla con la observación de la maniobra. Idealmente se conversa justo después del shadowing.',
      registroTecnico: [
        'Si coincide una entrega: Módulo 3 de la herramienta técnica (tiempo total de parada, descargue y traslado, cargue de retorno, distancias a pie mayores de 10 m).',
        'Medir el vano de la puerta y los desniveles; fotografiar fachada, andén y vano con flexómetro.',
      ],
      preguntas: [
        i('TR3.1', 'Cuando llega el pedido, ¿qué es lo que más tiempo le quita a usted o a sus empleados?', '¿El vehículo logra parquear cerca? ¿A qué hora llega y esa hora le sirve? ¿Qué pasa si está atendiendo clientes?', 'Técnica · Valor y negocio', 'Relato de fricción contrastable con el cronómetro.'),
        c('TR3.2', '¿Por dónde entra la mercancía y hasta dónde la llevan?', 'Escaleras, desniveles, puertas. ¿Quién la acomoda y cuánto se demora?', 'Técnica', 'Geometría del acceso y tiempo de acomodación.'),
      ],
    },
    {
      codigo: 'TR4',
      titulo: 'Almacenamiento y espacio',
      minutos: 6,
      proposito: 'Dimensionar el espacio de almacenamiento y estimar de forma indirecta la rotación del producto, sin pedir cifras contables.',
      registroTecnico: [
        'Arqueo: espacio de exhibición de productos Postobón y de la competencia (m² o número de caras); área y altura útil de la trastienda; arreglos improvisados.',
        'Prueba de huella en piso con cinta de enmascarar, si el participante lo autoriza.',
      ],
      preguntas: [
        i('TR4.1', '¿Dónde guarda las bebidas que no caben en la nevera o en el mostrador?', '¿Nos podría mostrar ese espacio? ¿Cómo lo organiza? ¿Qué pasa en temporada alta?', 'Técnica', 'Área y altura útil de la trastienda.'),
        c('TR4.2', 'En los días de más venta (quincenas, fines de semana, eventos), ¿cambia la frecuencia con que pide?', '¿Cada cuánto necesita que le surtan para no quedarse sin producto?', 'Valor y negocio', 'Estimación indirecta de días de rotación.'),
      ],
    },
    {
      codigo: 'TR5',
      titulo: 'Envases y lo que queda después de vender',
      minutos: 8,
      proposito: 'Reconstruir el ciclo efectivo de envases retornables, no retornables y empaques en el negocio, y el espacio que ocupan mientras salen.',
      notas: [
        'Esta formulación reemplaza la pregunta C5 de la herramienta de valor y negocio, que sugería la respuesta ("¿no le haría falta ese espacio?"). Aquí el costo del espacio se observa y se mide, no se induce.',
      ],
      registroTecnico: [
        'Fotografiar la acumulación de vacíos y la organización de cajas o arrumes; estimar proporción de llenos y vacíos.',
        'Registrar frecuencia mínima de evacuación declarada.',
      ],
      preguntas: [
        i('TR5.1', '¿Qué pasa en su negocio con las botellas, canastillas y empaques después de vender el producto?', 'Retornables y no retornables por separado. ¿Dónde quedan mientras los recogen? ¿Cada cuánto los recogen? ¿Qué hace con el plástico y el cartón?', 'Técnica · Estrategia', 'Ciclo efectivo y frecuencia de evacuación.'),
        i('TR5.2', '¿Dónde se quedan los envases vacíos y las canastillas mientras esperan la recogida, y qué pasa con ese espacio?', '¿Alguna vez ha tenido que ponerlos en otro lugar, por ejemplo en el andén? ¿Eso cambia algo en su trabajo?', 'Técnica · Valor y negocio', 'Espacio ocupado (m²) y efectos declarados.'),
        c('TR5.3', '¿Pasa algún reciclador o recuperador por el negocio? ¿Cómo es esa relación?', '¿Qué se lleva? ¿Lo regala, se lo pagan o usted le paga?', 'Estrategia · Valor y negocio', 'Circuito informal y su economía.'),
        c('TR5.4', 'Solo restauración: sus clientes, ¿consumen la bebida aquí o se la llevan?', '¿En qué proporción aproximada? ¿Dónde terminan los envases de quienes se la llevan?', 'Estrategia', 'Consumo en sitio frente a consumo en movimiento.'),
      ],
    },
    {
      codigo: 'TR6',
      titulo: 'Pagos y liquidez',
      minutos: 5,
      proposito:
        'Obtener evidencia indirecta del comportamiento de pago y de las presiones de liquidez, sin solicitar información financiera. Aporta a la hipótesis de la estrategia consolidada sobre el aumento de los días de recaudo.',
      notas: ['Nunca se piden cifras, estados financieros ni documentos. La pregunta es situacional.'],
      preguntas: [
        i('TR6.1', 'Cuando las ventas están flojas, ¿con qué proveedores es más fácil acordar un plazo y cuáles exigen el pago de contado?', '¿Ha tenido semanas en que le toca decidir a quién pagarle primero? ¿El valor de los envases retornables influye en esas cuentas?', 'Valor y negocio', 'Ranking de prioridad de pago por proveedor.'),
      ],
    },
    {
      codigo: 'TR7',
      titulo: 'Barrio, vecinos y Junta',
      minutos: 4,
      proposito: 'Medir la proximidad organizada del negocio: su relación con la Junta y con otros comerciantes, y su confianza para trabajar con ellos.',
      preguntas: [
        i('TR7.1', '¿Qué relación tiene su negocio con la Junta de Acción Comunal y con otros negocios del barrio?', '¿Ha participado en alguna iniciativa del barrio? ¿Qué tanta confianza tendría para trabajar algo con ellos?', 'Estrategia', 'Vínculos y confianza.'),
      ],
    },
    {
      codigo: 'TR8',
      titulo: 'Prioridades y condiciones',
      minutos: 7,
      proposito: 'Identificar el incentivo dominante y las barreras reales mediante el ejercicio de decisiones forzadas (sección 9), que evita la respuesta "todo me sirve".',
      preguntas: [
        i('TR8.1', 'Ejercicio: "Le voy a mostrar cuatro tarjetas. Ordénelas de la que más le serviría a la que menos, y cuénteme por qué."', '¿Qué haría que la tarjeta 1 dejara de ser la más importante? ¿Hay algo que no esté en las tarjetas y que le serviría más?', 'Valor y negocio · Estrategia', 'Incentivo dominante y su justificación.', EJERCICIO_TENDEROS),
        i('TR8.2', '¿Qué le preocuparía de un cambio en la forma en que le entregan el producto o le recogen los envases?', '¿Cuánto tiempo estaría dispuesto(a) a dedicarle? ¿Qué no estaría dispuesto(a) a hacer?', 'Valor y negocio', 'Barreras y límites de esfuerzo.'),
      ],
    },
    {
      codigo: 'TR9',
      titulo: 'Propuestas del entrevistado',
      minutos: 4,
      proposito: 'Recoger soluciones espontáneas del propio comerciante y acordar la devolución de resultados.',
      preguntas: [
        i('TR9.1', 'Si pudiera cambiar una sola cosa de cómo le llega o le recogen la mercancía, ¿qué cambiaría?', '¿Ha pensado en alguna solución propia, aunque sea sencilla? ¿Ha visto algo en otro barrio que le guste?', 'Todas', 'Propuestas no inducidas.'),
        c('TR9.2', '¿Cómo le gustaría enterarse de lo que encontremos en el estudio?', 'Visita, mensaje, reunión con otros comerciantes.', 'Estrategia', 'Canal de devolución preferido.'),
      ],
    },
  ],
}

const GUIA_RESIDENTES: Guia = {
  id: 'residentes',
  numero: '05',
  pestana: 'Residentes',
  titulo: 'Comunidad: residentes del barrio Manila',
  aQuien: 'Residentes de larga data; residentes recientes; adultos mayores (foco señalado por la herramienta de estrategia); hogares de distinta composición',
  autorizacion: {
    guion: [
      'Buenos días/tardes. Mi nombre es ______ y hago parte de un equipo de estudiantes de la Universidad EAFIT. Estamos haciendo un estudio sobre la vida en Manila: cómo compran las personas, qué pasa con los envases de lo que consumen y cómo es la convivencia con el comercio. Es un proyecto académico que hacemos con Postobón; no trabajamos para la empresa y no venimos a venderle nada.',
      'La conversación dura entre 40 y 60 minutos. No hay respuestas correctas ni incorrectas: nos interesa su experiencia tal como es. Con su permiso tomaremos notas y, si lo autoriza, grabaremos el audio. Lo que nos diga es confidencial y no aparecerá con su nombre. Puede no responder cualquier pregunta y terminar cuando quiera.',
      '¿Está de acuerdo en participar? ¿Nos autoriza a grabar?',
    ],
    notas: [
      'Insistir en que no hay respuestas correctas es especialmente importante en los bloques sobre residuos, donde la gente tiende a describir lo que cree que debería hacer.',
    ],
  },
  cierre: [
    CIERRE_PREGUNTA,
    `Muchas gracias por su tiempo. Con lo que conversamos con distintas personas del barrio vamos a preparar un resumen de resultados; lo compartiremos en una reunión abierta con la Junta y por el medio que usted prefiera. ${CIERRE_CONTACTO}`,
  ],
  bloques: [
    {
      codigo: 'RE1',
      titulo: 'La vida en el barrio',
      minutos: 7,
      proposito: 'Conocer la relación del participante con el barrio y su geografía cotidiana, usando el dibujo como evidencia cuando no es posible medir ni fotografiar.',
      registroTecnico: ['Fotografiar el dibujo con el código del participante. Anotar distancias o tiempos que el participante mencione.'],
      preguntas: [
        i('RE1.1', '¿Hace cuánto vive en Manila y cómo llegó aquí?', '¿Qué le gusta del barrio? ¿Qué ha cambiado desde que llegó?', 'Estrategia', 'Trayectoria y vínculo con el barrio.'),
        i('RE1.2', 'En esta hoja, dibuje su cuadra y los lugares a los que va en una semana normal.', '¿Va a pie o en vehículo? ¿Cuánto tiempo le toma? ¿Qué lugares evita y por qué?', 'Técnica · Estrategia', 'Mapa mental; proximidad geográfica vivida.'),
      ],
    },
    {
      codigo: 'RE2',
      titulo: 'Compras y consumo cotidiano',
      minutos: 8,
      proposito: 'Identificar los atractores de proximidad (cercanía, relación, rapidez, precio) y la conducta real de compra de bebidas.',
      preguntas: [
        i('RE2.1', '¿Dónde compra lo del día a día, y por qué allí?', '¿Qué le da la tienda que no le da el supermercado, o al revés? ¿Pide domicilios? ¿A quién?', 'Estrategia', 'Atractores de proximidad y canales de compra.'),
        i('RE2.2', 'Piense en la última vez que compró bebidas (gaseosa, agua, jugo u otra). ¿Qué compró, dónde y para qué ocasión?', '¿En qué presentación? ¿Para consumir en casa o fuera?', 'Estrategia · Técnica', 'Conducta real reciente de compra.'),
        c('RE2.3', '¿Cómo es su relación con el tendero o los negocios que más frecuenta?', '¿Le fían, le guardan cosas, le avisan cuando llega algo?', 'Estrategia', 'Proximidad social y confianza.'),
      ],
    },
    {
      codigo: 'RE3',
      titulo: 'Envases y residuos en el hogar',
      minutos: 9,
      proposito: 'Reconstruir qué pasa realmente con los envases en el hogar y en el edificio, la infraestructura disponible y la experiencia previa con envases retornables.',
      preguntas: [
        i('RE3.1', 'Con esa última compra de bebidas, ¿qué pasó con la botella o la lata cuando se terminó?', '¿Eso es lo que suele pasar? ¿Hace algo distinto con el vidrio, el plástico y las latas?', 'Técnica · Estrategia', 'Conducta real de desecho.'),
        i('RE3.2', '¿Cómo se organizan las basuras y el reciclaje en su casa o edificio?', '¿Hay cuarto de basuras o puntos de separación? ¿Quién los saca y cuándo? ¿Pasa algún reciclador?', 'Técnica', 'Infraestructura doméstica y del edificio.'),
        c('RE3.3', '¿Alguna vez ha devuelto un envase a la tienda? ¿Cómo fue?', '¿Qué hizo que lo hiciera o que dejara de hacerlo?', 'Estrategia · Valor y negocio', 'Experiencia con envases retornables.'),
        c('RE3.4', 'En su casa, ¿dónde se guardan los envases hasta que salen y cuánto espacio ocupan?', 'Pedir que lo dibuje o lo compare con un objeto conocido. ¿Le genera alguna incomodidad?', 'Técnica', 'Espacio doméstico (dibujo o estimación).'),
      ],
    },
    {
      codigo: 'RE4',
      titulo: 'Convivencia con el comercio, el turismo y la distribución',
      minutos: 7,
      proposito: 'Conocer cómo viven los residentes la actividad comercial, turística y de abastecimiento, y dónde se concentran las fricciones.',
      preguntas: [
        i('RE4.1', '¿Cómo es la convivencia entre los vecinos y los negocios del barrio?', 'Ruido, horarios, basuras en la calle, ocupación de andenes. ¿Qué funciona bien?', 'Estrategia', 'Tensiones y acuerdos de convivencia.'),
        c('RE4.2', '¿Qué observa cuando llegan los camiones a surtir tiendas y restaurantes?', 'Horarios, calles o garajes bloqueados, ruido. ¿En qué calles? (señalar en el plano)', 'Técnica', 'Puntos de fricción percibidos.'),
        c('RE4.3', '¿Qué ha significado para usted la llegada de turistas y visitantes?', '¿Qué gana y qué pierde el barrio?', 'Estrategia', 'Percepción del turismo.'),
      ],
    },
    {
      codigo: 'RE5',
      titulo: 'Participación y comunidad',
      minutos: 5,
      proposito: 'Medir la proximidad organizada desde la base: conocimiento y participación en la Junta y en iniciativas del barrio.',
      preguntas: [
        i('RE5.1', '¿Participa o conoce lo que hace la Junta de Acción Comunal u otras organizaciones del barrio?', '¿Por qué sí o por qué no? ¿Cómo se entera de lo que pasa en el barrio?', 'Estrategia', 'Proximidad organizada y canales.'),
        c('RE5.2', '¿Ha participado en alguna iniciativa del barrio o de reciclaje? ¿Qué le motivó y qué hizo que continuara o terminara?', '—', 'Valor y negocio', 'Motivadores y causas de abandono.'),
      ],
    },
    {
      codigo: 'RE6',
      titulo: 'Condiciones para participar',
      minutos: 7,
      proposito: 'Identificar el incentivo dominante y las barreras reales mediante el ejercicio de decisiones forzadas (sección 9).',
      preguntas: [
        i('RE6.1', 'Ejercicio: "Le voy a mostrar cuatro tarjetas. Ordénelas de la que más le motivaría a la que menos, y cuénteme por qué."', '¿Hay algo que no esté en las tarjetas y que le motivaría más?', 'Valor y negocio · Estrategia', 'Incentivo dominante y su justificación.', EJERCICIO_RESIDENTES),
        i('RE6.2', '¿Qué haría que usted no participara, aunque la idea le pareciera buena?', 'Esfuerzo, espacio en casa, desconfianza, olvido, distancia.', 'Valor y negocio', 'Barreras reales.'),
      ],
    },
    {
      codigo: 'RE7',
      titulo: 'Confianza y comunicación',
      minutos: 4,
      proposito: 'Explorar la credibilidad de las empresas cuando hablan de temas ambientales o del barrio, y los canales preferidos.',
      preguntas: [
        i('RE7.1', '¿Qué opinión tiene de las empresas de bebidas que están presentes en el barrio?', '¿En qué se basa? ¿Qué tendría que hacer una empresa para que usted le creyera cuando habla del reciclaje o del barrio?', 'Estrategia', 'Confianza, legitimidad y riesgo de greenwashing.'),
        c('RE7.2', '¿Por qué medio le gustaría enterarse de un proyecto como este?', '—', 'Estrategia', 'Canal preferido.'),
      ],
    },
    {
      codigo: 'RE8',
      titulo: 'Propuestas',
      minutos: 3,
      proposito: 'Recoger propuestas espontáneas.',
      preguntas: [
        i('RE8.1', 'Si pudiera cambiar una cosa del barrio relacionada con las compras, las basuras o el reciclaje, ¿qué cambiaría?', '—', 'Todas', 'Propuestas no inducidas.'),
      ],
    },
  ],
}

const GUIA_VISITANTES: Guia = {
  id: 'visitantes',
  numero: '06',
  pestana: 'Visitantes',
  titulo: 'Turistas, población flotante y consumidores',
  aQuien:
    'A · Turistas nacionales e internacionales. B · Población flotante (personas que trabajan o estudian en Manila, nómadas digitales). C · Consumidores visitantes (vienen de otros barrios por gastronomía, cultura o vida nocturna) y consumidores locales (viven en barrios vecinos y consumen habitualmente en Manila)',
  aviso: 'Con turistas prioriza las ★. Si hay dudas de comprensión del consentimiento, no se hace la entrevista.',
  autorizacion: {
    guion: [
      'Hola, mi nombre es ______ y hago parte de un equipo de estudiantes de la Universidad EAFIT. Estamos haciendo un estudio sobre cómo las personas que visitan o usan el barrio Manila compran y consumen bebidas, y qué pasa con los envases. Es un proyecto académico con Postobón; no trabajamos para la empresa y no venimos a vender nada.',
      'La conversación dura entre 40 y 60 minutos. No hay respuestas correctas o incorrectas. Con su permiso tomaremos notas y, si lo autoriza, grabaremos el audio. No le pediremos su nombre completo ni datos de contacto, salvo que quiera recibir los resultados. Puede no responder cualquier pregunta y terminar cuando quiera. ¿Está de acuerdo? ¿Nos autoriza a grabar?',
    ],
    notas: [
      'Para turistas internacionales, usar la versión en inglés del anexo. El consentimiento debe entenderse plenamente; si hay dudas de comprensión, no se realiza la entrevista.',
      'Aclarar que la participación no tiene relación con su alojamiento ni con ningún comercio.',
    ],
  },
  cierre: [
    CIERRE_PREGUNTA,
    `Muchas gracias por su tiempo. Con lo que conversamos con distintas personas del barrio vamos a preparar un resumen de resultados; si nos deja un correo, se lo enviaremos; si no, podrá consultarlo en los canales del proyecto. ${CIERRE_CONTACTO}`,
  ],
  bloques: [
    {
      codigo: 'VC1',
      titulo: 'Relación con Manila',
      minutos: 5,
      proposito: 'Caracterizar el vínculo del participante con el barrio, su movilidad y la imagen que tiene de él (insumo para la narrativa de comunicación).',
      preguntas: [
        i('VC1.1', '¿Qué lo trae a Manila y con qué frecuencia viene?', '¿Desde dónde viene? ¿Cuánto tiempo se queda? ¿Cómo llega: a pie, transporte público, taxi o aplicación, vehículo propio?', 'Estrategia', 'Tipo de vínculo y movilidad.'),
        c('VC1.2', '¿Cómo le describiría Manila a alguien que no lo conoce?', '¿Qué lo diferencia de otros barrios?', 'Estrategia', 'Imagen del barrio.'),
      ],
    },
    {
      codigo: 'VC2',
      titulo: 'Recorrido y consumo',
      minutos: 10,
      proposito: 'Reconstruir el recorrido y los momentos de consumo, distinguiendo el consumo en el lugar del consumo en movimiento y los atractores de cada punto de compra.',
      registroTecnico: ['Fotografiar el plano con el recorrido y los puntos de compra y consumo, con el código del participante.'],
      preguntas: [
        i('VC2.1', 'Cuéntenos su recorrido de hoy, o de su última visita: por dónde pasó y dónde se detuvo.', 'Pedir que lo trace en el plano. ¿Dónde compró o consumió algo?', 'Técnica · Estrategia', 'Rutas y nodos de consumo.'),
        i('VC2.2', '¿Qué bebidas ha comprado en el barrio, dónde y en qué momento?', '¿Las tomó en el lugar o caminando? ¿Por qué eligió ese lugar: cercanía, precio, rapidez, ambiente?', 'Estrategia', 'Consumo en sitio frente a consumo en movimiento; atractores.'),
        c('VC2.3', 'Cuando quiere una bebida en Manila, ¿qué tan fácil es encontrar lo que busca?', '¿Alguna vez no encontró lo que quería? ¿Qué hizo?', 'Valor y negocio', 'Disponibilidad percibida y agotados.'),
      ],
    },
    {
      codigo: 'VC3',
      titulo: 'Qué pasa con el envase',
      minutos: 8,
      proposito: 'Establecer la conducta real de desecho del consumo en movimiento, la infraestructura que el visitante percibe y sus referentes de sistemas de depósito o retorno.',
      preguntas: [
        i('VC3.1', 'La última vez que terminó una bebida mientras caminaba por el barrio, ¿qué hizo con el envase?', '¿Eso es lo que suele hacer? ¿Qué tan fácil fue encontrar dónde botarlo o reciclarlo?', 'Técnica · Estrategia', 'Conducta real de desecho e infraestructura percibida.'),
        c('VC3.2', '¿Ha visto en el barrio canecas, puntos de reciclaje o recicladores? ¿Dónde?', 'Señalar en el plano.', 'Técnica', 'Localización de infraestructura percibida.'),
        i('VC3.3', 'En otros lugares (su ciudad, su país, otros viajes), ¿ha devuelto envases o usado sistemas de depósito? ¿Cómo funcionaban?', '¿Qué le pareció fácil o difícil? ¿Qué lo hacía participar?', 'Estrategia · Técnica', 'Referentes de uso y expectativas del usuario.'),
      ],
    },
    {
      codigo: 'VC4',
      titulo: 'Condiciones para participar',
      minutos: 7,
      proposito: 'Identificar el incentivo dominante y el esfuerzo máximo aceptable para devolver un envase, variables directas de diseño para ubicación y señalización.',
      notas: [
        'VC4.2 produce una disposición declarada, que tiende a sobrestimar el comportamiento real. Se usa como techo, no como dato de diseño definitivo, y debe contrastarse con la observación y el prototipado.',
      ],
      preguntas: [
        i('VC4.1', 'Ejercicio: "Le voy a mostrar cuatro tarjetas. Ordénelas de la que más le motivaría a la que menos, y cuénteme por qué." (sección 10)', '¿Hay algo que no esté en las tarjetas y que le motivaría más?', 'Valor y negocio · Estrategia', 'Incentivo dominante y su justificación.', EJERCICIO_VISITANTES),
        i('VC4.2', 'Pensando en su recorrido, ¿hasta dónde estaría dispuesto a desviarse o cuánto esperaría para devolver un envase?', 'En cuadras o minutos. ¿Qué le haría desistir?', 'Técnica · Valor y negocio', 'Distancia y tiempo máximos declarados.'),
      ],
    },
    {
      codigo: 'VC5',
      titulo: 'Percepción y comunicación',
      minutos: 5,
      proposito: 'Explorar la confianza en las empresas de bebidas y los canales por los que los visitantes se informan del barrio.',
      preguntas: [
        i('VC5.1', '¿Qué empresas de bebidas reconoce en el barrio y qué imagen tiene de ellas?', '¿Qué tendría que ver para creer que una empresa actúa de verdad a favor del barrio?', 'Estrategia', 'Confianza y legitimidad.'),
        c('VC5.2', '¿Por qué medios se informa de lo que hay para hacer en el barrio?', 'Redes sociales, anfitriones de alojamiento, mapas, recomendaciones.', 'Estrategia', 'Canales para visitantes.'),
      ],
    },
  ],
  modulos: {
    etiqueta: 'Perfil',
    nota: 'Se aplica el módulo que corresponde al perfil del participante. Si una persona tiene dos perfiles (por ejemplo, trabaja en Manila y también lo visita de noche), se aplica el módulo principal y se registra el secundario.',
    opciones: [
      {
        id: 'turistas',
        nombre: 'Turistas',
        bloque: {
          codigo: 'TA',
          titulo: 'Turistas nacionales e internacionales',
          aQuien: 'Personas de fuera de Medellín, hospedadas en Manila o de paso.',
          proposito: 'Conocer la experiencia de alojamiento y de llegada al barrio en lo relativo a compras y residuos, y las necesidades de información de un visitante.',
          preguntas: [
            i('TA1', '¿Dónde se está hospedando y cómo funcionan allí las basuras y el reciclaje?', '¿Le explicaron cómo separar? ¿En qué idioma? ¿Qué hace con los envases en el alojamiento?', 'Técnica · Estrategia', 'Infraestructura y reglas del alojamiento.'),
            c('TA2', '¿Qué le ha sorprendido del barrio, para bien o para mal?', '—', 'Estrategia', 'Imagen del barrio desde afuera.'),
            i('TA3', '¿Qué información le habría servido al llegar para moverse, comprar y saber qué hacer con los residuos?', '¿Por qué medio le habría gustado recibirla?', 'Estrategia', 'Necesidades de comunicación para visitantes.'),
          ],
        },
      },
      {
        id: 'flotante',
        nombre: 'Población flotante',
        bloque: {
          codigo: 'FB',
          titulo: 'Población flotante',
          aQuien: 'Personas que trabajan o estudian en Manila sin vivir allí, incluidos nómadas digitales.',
          proposito: 'Entender las rutinas diarias de consumo de quienes están en el barrio varias horas al día y el manejo de envases en sus lugares de trabajo o estudio.',
          preguntas: [
            i('FB1', '¿Cómo es un día suyo de trabajo o estudio en Manila y en qué momentos compra algo de tomar?', '¿Compra siempre en el mismo lugar? ¿Por qué?', 'Estrategia', 'Rutina y lealtad de compra.'),
            i('FB2', '¿Qué pasa con los envases en su lugar de trabajo o estudio?', '¿Hay puntos de separación? ¿Quién se encarga? ¿Pasa algún reciclador?', 'Técnica', 'Infraestructura en lugares de trabajo.'),
            c('FB3', '¿Qué relación tiene con el barrio más allá del trabajo o el estudio?', '¿Conoce a los tenderos? ¿Participa en algo del barrio?', 'Estrategia', 'Proximidad social.'),
          ],
        },
      },
      {
        id: 'consumidores',
        nombre: 'Consumidores',
        bloque: {
          codigo: 'CL',
          titulo: 'Consumidores visitantes y locales',
          aQuien: 'Personas de otros barrios que vienen a Manila a comer, salir o comprar, y personas de barrios vecinos que consumen habitualmente allí.',
          proposito: 'Conocer las razones para elegir Manila y la diferencia entre el comportamiento con los envases en casa y fuera de ella.',
          preguntas: [
            i('CL1', '¿Por qué elige Manila para comer, salir o comprar, y no otro sector?', '¿Con quién viene? ¿Qué días y a qué horas?', 'Estrategia', 'Atractores del barrio.'),
            c('CL2', '¿Compra en las tiendas de barrio de Manila o solo en restaurantes, cafés y bares?', '¿Por qué?', 'Estrategia · Valor y negocio', 'Uso de canales.'),
            i('CL3', '¿Lo que hace con los envases en su casa es distinto de lo que hace cuando consume en Manila?', '¿Por qué cree que cambia?', 'Estrategia', 'Diferencia hogar/fuera del hogar.'),
          ],
        },
      },
    ],
  },
}

export const GUIAS: Guia[] = [GUIA_CENTRO, GUIA_JAC, GUIA_INSTITUCIONES, GUIA_TENDEROS, GUIA_RESIDENTES, GUIA_VISITANTES]

export const ID_GUIA_INICIAL: IdGuia = GUIAS[0].id
