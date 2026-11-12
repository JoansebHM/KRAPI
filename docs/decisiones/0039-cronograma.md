# 0039 · Cronograma: el calendario en fragmentos con su checklist

**Estado:** aceptada · 2026-11

## Contexto

El equipo planea el levantamiento por tramos de tiempo (qué se hace esta semana, qué sigue) y lo llevaba fuera de KIRA. Salidas sirve para repartir zonas en un día concreto, pero no para planear el trabajo general de un periodo ni para llevar una lista de pendientes.

## Decisión

- **Una página nueva, Cronograma (`/cronograma`)**, con entrada propia en el menú, después de Salidas.
- **Fragmentos de fechas libres:** se parte el calendario en tramos con fecha de inicio y de fin (por ejemplo, del 3 al 12 de noviembre), no en semanas fijas. Pueden solaparse y tienen un **título opcional**: sin él se muestra el rango de fechas. La fecha de fin no puede ser anterior a la de inicio.
- **Checklist por fragmento:** cada fragmento tiene una lista de tareas con una casilla. Una tarea lleva un texto (hasta 300 caracteres) y **responsables opcionales** (una o varias cuentas, ver la actualización de abajo). Al marcarla queda registrado quién y cuándo (`hecha_por`, `hecha_en`); la pone la base de datos, no la app, para que nadie marque a nombre de otra cuenta.
- **Todas las cuentas activas** ven, crean, editan y borran fragmentos y tareas, y marcan las casillas. Es una herramienta de coordinación del equipo, no un registro de campo.
- **Lista de fragmentos, no calendario:** se agrupan en **En curso** (hoy cae dentro), **Próximos** (el más cercano primero) y **Anteriores** (el más reciente primero). Cada uno es una tarjeta desplegable con su avance ("3 de 5 hechas") y una barra; los anteriores arrancan recogidos. Agregar una tarea se hace con un campo en la misma tarjeta, sin abrir un diálogo, y la casilla cambia al instante, antes de que responda el servidor.
- **Dos tablas** (`cronograma_fragmentos` y `cronograma_tareas`, migración `20261112120000_cronograma`), con autoría y bitácora como las demás. Al borrar un fragmento se borran sus tareas (ON DELETE CASCADE); al borrar una cuenta, sus tareas quedan sin responsable (ON DELETE SET NULL).

## Actualización: varios responsables y resumen de arriba

- **Varios responsables por tarea.** La primera versión dejaba una sola cuenta (`cronograma_tareas.responsable_id`). Ahora se eligen como los participantes de un estudio: botones con la carita de cada cuenta activa (`SelectorParticipantes`), que se marcan y desmarcan. Viven en la tabla de unión `cronograma_tarea_responsables` (migración `20261112180000_cronograma_responsables`), que reemplaza a la columna y pasa los datos que ya había. En la lista, cada tarea muestra las caritas y los nombres.
- **Resumen arriba del todo**, con las mismas cifras y colores de Analítica. La **fecha de entrega de un fragmento es su fecha de fin**; las tareas no tienen fecha propia.
  - *Avance:* % de tareas hechas de todas.
  - *Vencidas sin hacer:* tareas pendientes en fragmentos cuya fecha de fin ya pasó, y en cuántos fragmentos.
  - *Hechas a tiempo:* de las tareas hechas, las que se marcaron hasta el día de fin de su fragmento (en hora local) frente a las que se marcaron después.
  - *Entrega en curso:* días que le quedan al fragmento en curso con la entrega más cercana, con su avance frente al tiempo que ya pasó.
  - *Gráfica "Tareas y tiempo por fragmento":* por cada fragmento, una barra con el % de tareas hechas y otra con el % del tiempo transcurrido (0 antes de empezar, 100 al terminar), con su estado en palabras: Sin tareas, Completo, Por empezar, Al día, Atrasado o Vencido con pendientes.
- **Cuándo va "atrasado":** un fragmento en curso está atrasado si su avance queda más de **15 puntos** por debajo del tiempo transcurrido (`MARGEN_ATRASO`). Sin ese margen, el primer día de cualquier fragmento saldría atrasado solo porque aún no se marcó nada. Si todas sus tareas están hechas es Completo; si ya venció y quedan pendientes, Vencido con pendientes.
- **Todo se calcula en el cliente** (`resumirCronograma()` en `resumen.ts`, una función pura que recibe la fecha de hoy), igual que Analítica. La hora en que se marcó una tarea (`hecha_en`) ya existía; no hay columnas nuevas para esto.

## Descartado

- **Semanas automáticas (lunes a domingo):** no encaja con tramos que no coinciden con la semana (una salida de fin de semana largo, una temporada de 10 días).
- **Vista de calendario mensual:** a 390 px la cuadrícula es incómoda y aporta poco frente a una lista; queda para más adelante si el equipo lo pide.
- **Solo admins editan:** se prefirió que todo el equipo pueda marcar y agregar tareas sin pedirlo a un admin.
- **Fecha de entrega propia en cada tarea:** se descartó para no duplicar fechas. La entrega es la del fragmento; si hace falta una más fina, se parte el fragmento.
- **Ligar tareas a lugares, zonas o salidas:** se dejó fuera para empezar con lo mínimo. Si se necesita, se agrega una columna opcional sin romper nada.
- **Archivar en vez de borrar:** el cronograma es planeación, no histórico de campo, así que se borra de verdad (con confirmación al borrar un fragmento entero). La bitácora conserva una copia de lo borrado.

## Consecuencias

- `useCronograma()` trae todos los fragmentos con sus tareas y responsables en tres consultas, porque son pocos datos. Si el cronograma crece mucho habrá que paginar o traer solo los fragmentos recientes.
- Los fragmentos se ordenan por fecha de inicio en la consulta y se agrupan en el cliente según la fecha de hoy (`agruparFragmentos()`).
- Pruebas: `e2e/cronograma.spec.ts` y `supabase/tests/cronograma.test.sql`.
