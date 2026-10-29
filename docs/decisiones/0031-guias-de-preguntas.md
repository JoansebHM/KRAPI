# 0031 · Guías de preguntas para las entrevistas

**Estado:** aceptada · 2026-10

## Contexto

El equipo sale a campo con seis guías de entrevista semiestructurada (documentos de 10 a 12 páginas, una por tipo de actor). Mezclan lo que se necesita *durante* la entrevista (preguntas, su razón, repreguntas y el guion para pedir autorización) con mucho material de preparación y análisis. En el celular, con la persona al frente, ese ruido hace difícil encontrar la siguiente pregunta.

## Decisión

- **Sección "Preguntas"** en el menú (`/preguntas`): un diálogo encima del mapa, con una pestaña por guía (Centro de distribución, JAC, Instituciones, Tenderos, Residentes, Visitantes). La pestaña activa va en la URL (`?guia=`), así el botón atrás del celular funciona; la última se recuerda en `localStorage` (`krapi-preguntas-guia`).
- **Las ★ primero.** Cada guía muestra primero las preguntas imprescindibles (la versión de 40 minutos) y luego las complementarias. Cada pregunta es un desplegable: cerrada se lee de corrido; abierta muestra por qué se hace (el propósito de su bloque), qué evidencia se busca, las repreguntas, el registro técnico, el ejercicio y las lentes. Al final, el cierre de la entrevista.
- **Módulos.** Instituciones (Policía, Hospital o clínica, Centro comercial) y Visitantes (Turistas, Población flotante, Consumidores) tienen un tronco común más un solo módulo, que se elige con chips y se recuerda.
- **Autorización para grabar como botón fijo, no como séptima pestaña.** El guion cambia según el actor, así que el botón siempre abre el de la pestaña activa. Es una **vista interna del mismo diálogo** (`?vista=autorizacion`), no un segundo diálogo encima (regla de `docs/arquitectura.md`); entrar a ella agrega una entrada al historial para que atrás vuelva a las preguntas. El nombre de quien entrevista sale de la cuenta y reemplaza la línea `______`.
- **El contenido es estático y va en el código** (`src/features/preguntas/guias.ts`). **No hay tabla ni migración**: las guías cambian poco y por PR, y no hay nada que guardar por usuario.
- **Se dejó fuera, a propósito,** lo que no se usa durante la entrevista: propósito general de la guía, lentes y convenciones, participantes y criterios de selección, preparación (roles, condiciones, kit de campo), ficha de caracterización, distribución del tiempo, matrices de hallazgos y de variables, criterios de calidad y las tablas vacías de registro de los ejercicios.

## Descartado

- **Guardar las guías en la base de datos con una pantalla para editarlas:** exigiría tablas, permisos y una interfaz de edición para contenido que cambia unas pocas veces; por PR queda revisado y versionado.
- **Una séptima pestaña "Autorización":** obliga a recordar de cuál guía se trata; el botón fijo ya sabe cuál es la activa.
- **Un segundo diálogo para el guion:** los diálogos no se encimen.
- **Marcar preguntas como cubiertas, ligar la guía a un estudio, versión en inglés del consentimiento:** quedan para después.

## Consecuencias

- Cambiar una pregunta o un guion es editar `guias.ts` y abrir un PR. `e2e/preguntas.spec.ts` verifica los conteos (129 preguntas, 81 ★) para proteger la transcripción.
- Algunos textos conservan referencias a secciones de los documentos originales (por ejemplo, "descrito en la sección 9"), porque se transcribieron tal cual.
