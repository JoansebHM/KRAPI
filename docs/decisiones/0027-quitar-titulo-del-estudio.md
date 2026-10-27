# 0027 · Quitar el título del estudio

**Estado:** aceptada · 2026-10

## Contexto

Un estudio tenía un campo `titulo` obligatorio ("Entrevista al tendero", "Levantamiento"…). En la práctica, el equipo lo llenaba con algo genérico o repetía el nombre del lugar: no agregaba información que la fecha y la hora no dieran ya, y era un campo más que llenar en el formulario antes de salir a evidenciar.

## Decisión

- **Se quita `estudios.titulo`.** Un estudio se identifica por su fecha y hora ("30 oct 2026 · 2:00 p. m."), calculado con `cuandoFue()` (`features/estudios/campos.ts`), donde antes se mostraba el título: el encabezado de su presentación y de su página, y la primera línea del histórico de un lugar (ahí la fecha sube a ese lugar y el resto de datos —hora, evidencias, si viene de una salida— quedan en la línea de abajo).
- La sección **"Qué se registró"** de una salida, que antes mostraba el título del estudio, ahora muestra el **nombre del lugar** como título de cada fila (es el dato más útil ahí; la fecha y la hora siguen debajo).
- El formulario de un estudio pierde el campo "Título" y su validación.

## Descartado

- **Dejarlo opcional en vez de quitarlo:** mantenía el campo en el formulario y la pregunta de qué mostrar cuando está vacío, sin resolver el problema de fondo.
- **Generar un título automático** (por ejemplo, con el nombre de quien participó): más complejo que mostrar la fecha y la hora, que ya identifican sin ambigüedad una visita de ese lugar.

## Consecuencias

- Migración `20261026180000_quitar_titulo_estudio`: quita la columna y su `check` de no vacío.
- Los estudios de antes de este cambio no pierden nada más que ese texto; se conserva su fecha, hora, notas y evidencias.
