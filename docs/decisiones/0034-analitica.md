# 0034 · Analítica del levantamiento

**Estado:** aceptada · 2026-11 · Sin issue: el equipo decidió no crearla para este cambio

## Contexto

El equipo quería ver **cómo va el proyecto** sin recorrer el mapa lugar por lugar: cuántos locales hay, cuántos estudios y evidencias, a qué ritmo se trabaja y quién ha hecho qué. No se trata de medir si va bien o mal (no hay metas), solo de mostrar el estado.

En la práctica el equipo registra sobre todo **locales (puntos)** y luego su información. Las zonas y las salidas todavía no se usan así, y por eso no entran en las cifras.

## Decisión

- **Una sección nueva, Analítica (`/analitica`)**, en el menú justo después de Mapa, para todas las cuentas activas. Los datos ya los puede leer cualquiera del equipo, así que no hay políticas nuevas.
- **Qué cuenta:** los locales (puntos) y elementos que siguen en el mapa, los estudios no archivados **de locales** y las evidencias de esos estudios (más las de los elementos). Los estudios de zonas (recorridos) y todo lo de salidas **no** se cuentan.
- **Qué muestra:** cifras (locales, estudios, entrevistas, evidencias y su peso), cobertura (locales con al menos un estudio), ritmo (estudios por semana, por día de la semana y por momento del día), locales y elementos por categoría, evidencias por tipo, qué tan completos están los estudios (con evidencia, con notas, con entrevistado) y el equipo (estudios en los que participó cada cuenta y evidencias que subió).
- **Se calcula en el cliente**, como los filtros del mapa ([decisión 0026](0026-filtros-del-mapa.md)): se leen solo las columnas necesarias (por páginas de 1000 filas, que es el tope de PostgREST) y una función pura, `calcularAnalitica()` (`src/features/analitica/calculos.ts`), saca las cifras. Con el volumen del estudio no hace falta una función SQL, y así **no hay migración**.
- **Gráficos propios en HTML y CSS**, sin librería: barras horizontales, columnas con una línea de lectura (al tocar una columna se lee su valor completo), medidores y cifras. Usan solo tokens de `theme.css`, así que siguen el modo claro y oscuro.
- **Color:** un solo azul cielo (`--color-primary`) para las barras; en las columnas, la destacada va en azul cielo y las demás en un tono suave del mismo azul. Las categorías mantienen su color propio, porque el color sigue a la categoría. No hay escala categórica nueva.

## Descartado

- **Metas y semáforos** ("vamos bien o mal"): el equipo no tiene metas numéricas. Si las define, se agregan como barras de progreso.
- **Zonas y salidas en el dashboard** (cobertura por zona, avance por salida): todavía no se usan así.
- **Una librería de gráficos (Recharts, Chart.js):** son varios cientos de KB para cuatro formas simples, y cuesta más acomodarlas a los tokens y al modo oscuro.
- **Analítica de uso de la app** (quién entra, qué pantallas): es otro tema y exigiría instrumentar la app.
- **Espacio libre del almacenamiento:** Supabase no lo expone por bucket (la cuota es del plan). Se muestra el peso de las evidencias, no lo que queda.

## Consecuencias

- Si el volumen crece mucho, conviene mover el cálculo a funciones SQL de solo lectura; `calcularAnalitica()` ya recibe todo por parámetro y sería el contrato a reproducir.
- El peso mostrado suma `evidencias.archivo_bytes`; no incluye los bocetos ni lo que ocupa la base de datos.
