# 0026 · Filtros del mapa

**Estado:** aceptada · 2026-10 · Refs #21

## Contexto

Con el barrio ya registrado, hace falta ver solo una parte del mapa: por ejemplo, los cafés visitados en una fecha, o los lugares con audio grabado por una persona. La issue #21 pedía seis filtros (categoría, rango de fechas, días de la semana, rango de horas, tipo de evidencia y responsables) y un panel que, en celular, no tapara todo el mapa.

## Decisión

- **Un lugar se muestra si al menos uno de sus estudios cumple *todos* los filtros a la vez** (fecha, día, hora, tipo de evidencia y responsable del mismo estudio, no de estudios distintos). La **categoría es aparte**, porque es del lugar, no del estudio: un punto además debe estar en una de las categorías elegidas.
- **Las zonas no tienen categoría y nunca se ocultan por ese filtro.** El resto de filtros sí les aplica igual que a los puntos, sobre sus propios estudios (recorridos).
- **Responsables son cuentas**, no el catálogo viejo de responsables (ya no existe, decisión 0023).
- **Rango de horas:** un estudio cumple si su franja se cruza con el rango elegido (no que quede completamente adentro). Por defecto es todo el día, así que no filtra nada.
- **Los filtros se calculan en el cliente**, igual que las salidas (decisión 0025): se traen los lugares (`lugares_mapa()`, como siempre) y, aparte, los estudios visibles con su fecha, horas, participantes y tipos de evidencia, y se cruzan en el navegador. No hace falta una función nueva en la base de datos ni ninguna migración.
- **Sin guardarlos:** los filtros viven en memoria (un contexto de React) mientras dura la sesión en el navegador; se reinician al recargar la página.
- **Un panel que no tapa el mapa** (`HojaInferior`, nuevo componente en `components/`): a diferencia de `Dialog`, no oscurece la pantalla completa. Sube desde abajo (o flota abajo a la izquierda en computador) y dentro se puede seguir viendo cómo cambia el mapa al tocar un filtro. Tocar fuera o Escape lo cierra.
- **El botón "Filtros"** flota arriba a la izquierda del mapa (solo en la pantalla de inicio, igual que "Nuevo lugar") y muestra cuántos de los 6 grupos están activos, no cuántas opciones se marcaron dentro de cada uno.

## Descartado

- **Una función SQL para filtrar:** más robusta si el barrio creciera mucho, pero para el tamaño de Manila es innecesaria; se puede migrar después sin romper nada si hace falta.
- **Guardar los filtros** (en la cuenta o en el navegador): se decidió que cada sesión empiece sin filtros, para no dejar a alguien viendo un mapa incompleto sin darse cuenta.
- **Filtro de tipo de zona:** la issue solo pedía categoría (de los puntos); se dejó así y las zonas quedan fuera de ese filtro en vez de inventarle uno nuevo.
- **Reusar `Dialog` para el panel:** su fondo oscuro cubre toda la pantalla, que es justo lo que la issue pedía evitar.

## Consecuencias

- `LugaresEnMapa` ahora depende también de los estudios (fechas, horas, participantes y evidencias) de todo el mapa, no solo de `lugares_mapa()`. Son pocos datos para el tamaño del barrio.
- `HojaInferior` queda disponible para otros paneles que no deban tapar el mapa.
