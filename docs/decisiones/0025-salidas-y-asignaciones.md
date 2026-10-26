# 0025 · Salidas y asignaciones de zonas a cuentas

**Estado:** aceptada · 2026-10 · Refs #106 · Cambia en parte la [decisión 0008](0008-modelo-lugares-y-estudios.md)

## Contexto

Antes de salir a campo, los admins reparten el barrio: dibujan zonas y dicen quién cubre cada una. Las zonas que se reparten cambian de una temporada a otra, y después de cada salida hace falta saber hasta dónde llegó cada persona. La decisión 0008 había dejado fuera las salidas porque no todos van el mismo día. Por eso las salidas organizan el trabajo, pero no agrupan los estudios: cada estudio sigue llevando su propia fecha.

## Decisión

- **Salida** (`salidas`): nombre, fecha y hora de inicio. Solo los admins la crean, la editan y la cancelan. Al cancelarla no se borra (queda en la bitácora como "archivar") y se puede reactivar.
- **Zonas de asignación** (`asignaciones`): cada salida tiene las suyas, dibujadas con la misma mira de las zonas del mapa. **No son zonas del mapa** (`ubicaciones`). Pueden repetirse o cambiar de una salida a otra sin llenar el mapa de polígonos. Al quitar una, se van con ella sus asignaciones y sus reportes.
- **Asignación por persona** (`asignacion_participantes`): una zona se asigna a una o más cuentas. **Cada persona reporta lo suyo**: a qué hora terminó y qué porcentaje cubrió, que **estima ella misma** en pasos de 25 % (0, 25, 50, 75 o 100). Puede corregirlo, y un admin también puede corregir cualquier reporte. Solo los admins asignan o quitan personas, y al editar la zona, quien sigue asignado conserva su reporte.
- **Cuándo se reporta:** desde el día de la salida. Antes aparece como "Programada", y en una salida cancelada no se reporta.
- **Dónde se ve:**
  - En **Salidas** (`/salidas`), las próximas y las anteriores.
  - En la página de cada salida, sus zonas con quiénes las cubren y cómo van.
  - En **Mis asignaciones** (`/mis-asignaciones`). El menú cuenta las zonas que faltan por reportar.
  - En el mapa: las zonas de las salidas de hoy se pintan en rosado. Las propias van con borde continuo y las de los demás, con borde punteado. "Ver en el mapa" encuadra una zona y muestra quiénes la cubren.
- **Del recorrido al mapa:** desde una zona asignada, "Registrar el recorrido como zona del mapa" crea una zona del mapa con la misma forma y el mismo nombre. Así, lo que se encontró queda en el histórico de esa zona (recorridos, comentarios y locales adentro).

## Descartado

- **Usar las zonas del mapa para asignar:** las asignaciones cambian cada temporada y llenarían el mapa de polígonos repetidos.
- **Un solo reporte por zona:** el equipo pidió el reporte por persona, porque cada quien llega hasta donde llega.
- **Porcentaje calculado con el GPS:** más complejo y poco fiable entre edificios. La persona lo estima.
- **Porcentaje libre (0 a 100):** con pasos de 25 % se reporta más rápido en el celular y alcanza para planear la siguiente salida.
- **Que cualquier cuenta asigne:** solo los admins reparten el trabajo.

## Consecuencias

- La bitácora registra también las salidas, las zonas asignadas y los reportes. En `asignacion_participantes`, `registro_id` es el id de la zona asignada.
- Los estudios siguen sin estar ligados a una salida. Si más adelante hace falta, se puede agregar `estudios.salida_id` sin romper nada.
