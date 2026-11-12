# 0039 · Cronograma: el calendario en fragmentos con su checklist

**Estado:** aceptada · 2026-11

## Contexto

El equipo planea el levantamiento por tramos de tiempo (qué se hace esta semana, qué sigue) y lo llevaba fuera de KIRA. Salidas sirve para repartir zonas en un día concreto, pero no para planear el trabajo general de un periodo ni para llevar una lista de pendientes.

## Decisión

- **Una página nueva, Cronograma (`/cronograma`)**, con entrada propia en el menú, después de Salidas.
- **Fragmentos de fechas libres:** se parte el calendario en tramos con fecha de inicio y de fin (por ejemplo, del 3 al 12 de noviembre), no en semanas fijas. Pueden solaparse y tienen un **título opcional**: sin él se muestra el rango de fechas. La fecha de fin no puede ser anterior a la de inicio.
- **Checklist por fragmento:** cada fragmento tiene una lista de tareas con una casilla. Una tarea lleva un texto (hasta 300 caracteres) y un **responsable opcional** (una cuenta). Al marcarla queda registrado quién y cuándo (`hecha_por`, `hecha_en`); la pone la base de datos, no la app, para que nadie marque a nombre de otra cuenta.
- **Todas las cuentas activas** ven, crean, editan y borran fragmentos y tareas, y marcan las casillas. Es una herramienta de coordinación del equipo, no un registro de campo.
- **Lista de fragmentos, no calendario:** se agrupan en **En curso** (hoy cae dentro), **Próximos** (el más cercano primero) y **Anteriores** (el más reciente primero). Cada uno es una tarjeta desplegable con su avance ("3 de 5 hechas") y una barra; los anteriores arrancan recogidos. Agregar una tarea se hace con un campo en la misma tarjeta, sin abrir un diálogo, y la casilla cambia al instante, antes de que responda el servidor.
- **Dos tablas** (`cronograma_fragmentos` y `cronograma_tareas`, migración `20261112120000_cronograma`), con autoría y bitácora como las demás. Al borrar un fragmento se borran sus tareas (ON DELETE CASCADE); al borrar una cuenta, sus tareas quedan sin responsable (ON DELETE SET NULL).

## Descartado

- **Semanas automáticas (lunes a domingo):** no encaja con tramos que no coinciden con la semana (una salida de fin de semana largo, una temporada de 10 días).
- **Vista de calendario mensual:** a 390 px la cuadrícula es incómoda y aporta poco frente a una lista; queda para más adelante si el equipo lo pide.
- **Solo admins editan:** se prefirió que todo el equipo pueda marcar y agregar tareas sin pedirlo a un admin.
- **Ligar tareas a lugares, zonas o salidas:** se dejó fuera para empezar con lo mínimo. Si se necesita, se agrega una columna opcional sin romper nada.
- **Archivar en vez de borrar:** el cronograma es planeación, no histórico de campo, así que se borra de verdad (con confirmación al borrar un fragmento entero). La bitácora conserva una copia de lo borrado.

## Consecuencias

- `useCronograma()` trae todos los fragmentos con sus tareas en dos consultas, porque son pocos datos. Si el cronograma crece mucho habrá que paginar o traer solo los fragmentos recientes.
- Los fragmentos se ordenan por fecha de inicio en la consulta y se agrupan en el cliente según la fecha de hoy (`agruparFragmentos()`).
- Pruebas: `e2e/cronograma.spec.ts` y `supabase/tests/cronograma.test.sql`.
