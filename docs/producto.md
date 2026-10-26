# Producto

## Para qué existe KIRA

El equipo de **Kratos Innovation Lab** (EAFIT) está haciendo un **estudio de proximidad** para analizar cómo mejorar la distribución de productos de bebidas en el **barrio Manila** (El Poblado, Medellín). Hoy está en la etapa de **levantamiento de información**: salir a campo, hablar con las personas de los locales y registrar lo que se encuentra.

KIRA es el geovisor donde queda ese registro: **qué lugares se visitaron, qué se hizo en cada visita y con qué evidencias**, de forma que cualquiera del equipo pueda consultarlo después sobre el mapa.

El foco está en los **locales fijos** (tiendas, cafés, restaurantes…): no en turistas ni en personas de paso.

## Quién la usa

- **Integrantes de Kratos.** Es un grupo pequeño, con **una cuenta por integrante** ([decisión 0021](decisiones/0021-usuarios-individuales.md)):
  - Cada quien se registra con **nombre, nombre de usuario y contraseña**, sin correo. La cuenta queda **pendiente** hasta que un admin la apruebe.
  - **Miembros:** ven, crean y editan lugares, estudios, evidencias y catálogos. Solo borran las evidencias y los lugares sin estudios que ellos mismos crearon.
  - **Admins:** además aprueban, rechazan, desactivan y reactivan cuentas y nombran a otros admins desde **Usuarios** (menú ☰, con un contador de las cuentas por aprobar), y borran cualquier cosa que se pueda borrar. Si alguien olvida su contraseña, un admin le pone una temporal desde Usuarios.
  - Cada registro guarda quién lo creó y quién lo editó por última vez, y una bitácora guarda cada acción. Lo registrado antes de las cuentas individuales aparece como "Cuenta compartida".
- **Se usa sobre todo en el celular, en la calle.** A veces con una mano, con sol y con datos móviles. Por eso cada pantalla se diseña primero para celular (ver [`diseno.md`](diseno.md)).

## Conceptos

| Concepto | Qué es | Ejemplo |
| --- | --- | --- |
| **Lugar** (ubicación) | Algo en el mapa que se visita. Se crea **una sola vez** y existe siempre. Puede ser un **punto** o una **zona**. | "Tienda Don Pepe" |
| **Punto** | Un local. Tiene nombre, categoría, dirección, complemento, contacto (nombre y teléfono del administrador) y estado. | Un café en una esquina |
| **Zona** | Un área del barrio (una manzana, una cuadra, un parque). Tiene nombre, **tipo** (de qué es: comercial, residencial…, con su color en el mapa), descripción, **comentarios** del equipo y su histórico de **recorridos** (estudios de la zona). Las zonas pueden superponerse. | "Cuadra de los cafés" |
| **Tipo de zona** | De qué es una zona, con un color. Administrable. | Comercial · azul |
| **Comentario** | Lo que alguien del equipo dice de una zona, con quién lo escribió y cuándo. | "Mucho comercio informal en las tardes" |
| **Estudio** | **Una visita** a un lugar: una entrevista o un levantamiento. Tiene fecha, hora de inicio y de fin, **participantes** (cuentas del equipo), **a quién se entrevistó** (texto corto), título, **notas** (varios apuntes sueltos) y evidencias. Los estudios de puntos y de zonas tienen **la misma estructura**. | "Entrevista al tendero, 30 oct, 2–4 p. m." |
| **Evidencia** | Material de un estudio: fotos, audios, documentos (Word, PDF, Excel) o videos (por enlace de SharePoint). Los apuntes escritos van en las notas del estudio. Un estudio puede tener todas las evidencias que haga falta. | Foto de la fachada |
| **Histórico** | La lista de estudios de un lugar, del más reciente al más antiguo. **Volver a un lugar es agregarle un estudio nuevo**, nunca reemplazar el anterior. | Tres visitas a la misma tienda en noviembre |
| **Categoría** | Tipo de local (comercio, café, hotelería…), con un **color** y un **ícono** que se usan en el mapa. Administrable. | Café · lila · taza |
| **Participante** | Cuenta del equipo que participó en un estudio, con su **avatar dibujado** (se elige al registrarse) | Ana |

Reglas de negocio:

- **Nada puede quedar fuera de Manila.** La app avisa y no deja continuar; la base de datos también lo impide.
- **Estado del lugar:** activo o cerrado. Si un local cierra, se marca como cerrado y conserva su histórico. Si en el mismo sitio abre otro negocio, se crea un lugar nuevo.
- **Archivar en vez de borrar.** Lugares y estudios se archivan: desaparecen del mapa pero se pueden recuperar. Solo se borra de verdad un lugar creado por error y sin estudios, o una evidencia equivocada.
- **Una zona muestra los locales que tiene adentro**, calculado por la geometría (con un botón para ir a la ficha de cada uno), junto con sus comentarios y sus recorridos ("en la manzana no hay canecas", "la zona es muy oscura"). Los estudios de una zona no tienen "a quién se entrevistó".
- **Las salidas reparten el trabajo, no agrupan estudios.** Un admin crea una salida (fecha y hora de inicio), dibuja sus zonas de asignación y dice quién cubre cada una. Desde el día de la salida, cada persona reporta a qué hora terminó y qué porcentaje de su zona cubrió (0, 25, 50, 75 o 100 %). Los estudios siguen llevando su propia fecha y sus participantes, porque no todos van el mismo día (ver decisiones [0008](decisiones/0008-modelo-lugares-y-estudios.md) y [0025](decisiones/0025-salidas-y-asignaciones.md)).
- **Las zonas de asignación no son zonas del mapa.** Cambian de una salida a otra. Si un recorrido merece quedar en el histórico, se registra como zona del mapa con la misma forma.
- **La evidencia de una salida son los estudios de siempre, no un sistema aparte.** Casi todo lo que se hace en una salida es crear un punto o agregarle un estudio a uno existente: eso ya trae fotos, audios, documentos y notas. Un estudio puede decir en qué salida se hizo, y la página de la salida muestra todo lo que se registró en ella, con un enlace a cada lugar. El reporte (hora de fin y porcentaje) sigue siendo aparte: un resumen rápido de cuánto se cubrió.
- **Sin tipos de estudio ni equipos por ahora**, y sin datos medibles (conteos, cifras). La estructura de los locales se registra con fotos. Más adelante se puede agregar una tabla de mediciones sin romper el modelo.

## Cómo se usa en campo

1. La persona entra con su **nombre de usuario** y su contraseña. Si no tiene cuenta, la crea en "Crear una cuenta" (nombre, nombre de usuario y contraseña, sin correo) y espera a que un admin la apruebe: mientras tanto ve una pantalla de espera y entra al mapa sola apenas la aprueban. La sesión dura hasta 7 días y se cierra tras 2 horas sin uso.
2. En el mapa toca **"+ Nuevo lugar"** y elige **Punto** (un local) o **Zona** (un área).
3. **Ubica el punto** moviendo el mapa bajo una **mira fija en el centro**, o con "Mi ubicación".
   - Si el punto queda fuera de Manila, no deja continuar.
   - Si hay otro lugar a menos de ~15 m, pregunta si es el mismo. Si lo es, se toca y se le **agrega el estudio** ahí mismo, sin duplicar el lugar.
4. Llena el lugar (nombre, categoría, dirección, complemento, contacto y descripción) y, en el siguiente paso, el **estudio**. En el estudio puede ir sumando **notas** sueltas con "Agregar nota" y borrar las que sobren. La fecha (hoy) y la hora de inicio (ahora) vienen prellenadas, la de fin una hora después, y los participantes vienen marcados: la cuenta propia y las del último estudio hecho desde ese celular. También puede elegir "Solo guardar el lugar".
5. Al guardar el estudio se abre **su página**, con el botón **"Agregar evidencia"**:
   - **Tomar foto** con la cámara. Las fotos se reducen (2048 px de lado mayor) y se comprimen antes de subirlas, para ahorrar datos.
   - **Grabar audio** dentro de la app. Se escucha antes de subirlo.
   - **Elegir archivos**: fotos, audios, PDF, Word o Excel, varios a la vez, hasta 50 MB cada uno.
   - **Video de SharePoint**: se pega el enlace (o el código para insertar) y un título opcional. Por ahora solo se aceptan enlaces de SharePoint, y el video se abre en otra pestaña (verlo dentro de la app espera la prueba de #22).

   Cada archivo muestra su avance. Si falla, se explica por qué y se puede reintentar. Las subidas siguen aunque se vuelva al mapa. Una evidencia equivocada se borra de verdad, con confirmación.
6. Al tocar un punto se abre su **ficha**: categoría, estado, dirección, contacto (el teléfono se toca para llamar o, si es un celular, abrir WhatsApp) y descripción. Desde ahí se **edita**, se **mueve** con la misma mira, se marca **cerrado** (o activo de nuevo) y se **archiva**: sale del mapa, con "Deshacer", y desde su ficha se recupera. Solo se borra de verdad un punto sin estudios, y solo quien lo creó o un admin.

   En la ficha también está el histórico: los estudios del más reciente al más antiguo, con "Agregar estudio" para una visita nueva. Al tocar un estudio se abre una presentación con sus datos (y quién lo registró y quién lo editó por última vez), sus **notas** en una sección desplegable, un carrusel de fotos y las demás evidencias agrupadas por tipo. Cada grupo muestra su ícono en el título y cada tarjeta tiene un menú para descargar archivos, copiar enlaces o copiar notas. Los enlaces de archivos son temporales y duran una hora. Los audios usan controles compactos propios (reproducir/pausar, avance y tiempos) y se pueden escuchar a velocidad normal, doble o triple; desde el modal también se puede editar con el formulario existente o ir a la página del estudio para agregar evidencias. Todos los modales incluyen una X arriba a la derecha para cerrar cuando el flujo lo permite. El formulario permite archivarlo (con "Deshacer").

Para una **zona**: con la misma mira se van marcando las esquinas ("Agregar esquina", "Deshacer", "Terminar"), viendo la forma y el área. No deja terminar si se sale de Manila, si sus lados se cruzan o si tiene menos de 20 m². Luego se llenan su nombre, su tipo y su descripción. En su ficha se ven el área, los locales de adentro, los comentarios y los recorridos; desde ahí se edita, se **redibuja**, se archiva o se borra (si no tiene estudios).

Para una **salida**:

1. Un admin la crea en **Salidas** (nombre, fecha y hora de inicio).
2. En la salida toca **"Agregar zona"**, dibuja la zona con la mira y elige quiénes la cubren.
3. Cada persona ve sus zonas en **Mis asignaciones** y en el mapa: las suyas en rosado con borde continuo, y las de los demás con borde punteado. "Ver en el mapa" encuadra la zona.
4. Mientras recorre su zona, registra puntos y les agrega estudios como siempre; el formulario del estudio trae la salida ya elegida, para dejarlo ligado a ella (se puede cambiar o quitar).
5. Al terminar, toca **"Reportar"**: a qué hora terminó y qué porcentaje cubrió (0, 25, 50, 75 o 100 %). Lo puede corregir después, y un admin también.
6. En la página de la salida, **"Qué se registró"** lista los estudios ligados a ella. Si además lo que se encontró merece quedar como una zona informativa permanente, **"Registrar el recorrido como zona del mapa"** crea una zona del mapa con la misma forma y el mismo nombre.

Una salida se puede cancelar (las personas lo ven) y reactivar. Una zona de la salida se puede editar (nombre y personas) o quitar.

> **Ya funcionan** los pasos 2 a 6 para puntos y zonas. Los estudios ya tienen una presentación con carrusel de fotos, reproducción de audio y descarga de documentos. La mira central y el botón "+" son la propuesta acordada como punto de partida; se ajustarán al probarlos en campo.

## Estado

**Hecho:**
- Mapa con el límite de Manila, navegación limitada a 1 km alrededor y modo claro/oscuro.
- Cuentas individuales: registro con nombre de usuario (sin correo), aprobación de un admin, roles (miembro y admin), Mi perfil, administración de usuarios y política de sesión.
- Permisos en la base de datos según el estado y el rol de cada cuenta, autoría de cada registro y bitácora.
- Notificaciones.
- Administración de categorías (color e ícono). Cada cuenta tiene su avatar dibujado.
- Lugares en el mapa: puntos con el color y el ícono de su categoría (blancos si no tienen), zonas con el color de su tipo (lila sin tipo), cerrados atenuados y archivados ocultos.
- Zonas: dibujarlas con la mira, su tipo (lista administrable), comentarios, locales adentro, recorridos, editarlas, redibujarlas y archivarlas.
- Salidas: los admins crean salidas, dibujan sus zonas y las asignan a personas. Cada persona ve sus zonas en "Mis asignaciones" (el menú cuenta las que faltan por reportar) y en el mapa, y reporta su hora de fin y el porcentaje que cubrió. Las salidas se pueden cancelar y reactivar.
- Ficha del punto: todos sus datos (con el teléfono para llamar o abrir WhatsApp), editarlos, moverlo con la mira, marcarlo cerrado o activo, archivarlo y recuperarlo, y borrarlo si no tiene estudios. El histórico dice cuántas evidencias tiene cada estudio.
- Crear puntos desde el mapa: botón "+ Nuevo lugar", mira fija en el centro, "Mi ubicación", bloqueo fuera de Manila, aviso de lugares a menos de 15 m y formulario del lugar.
- Estudios: se registran al crear un punto, al encontrar un duplicado o desde la ficha ("Agregar estudio"), con participantes (vienen marcadas la cuenta propia y las del último estudio del celular). La ficha muestra el histórico; al tocar un estudio se abre su presentación con fotos y otras evidencias, y desde ahí se puede editar o agregar evidencias.
- Evidencias de archivo: tomar fotos (comprimidas antes de subir), grabar audios en la app y subir documentos, con avance, reintento y borrado con confirmación.
- Videos de SharePoint por enlace (se abren en otra pestaña).
- Esquema completo en Supabase con seguridad (RLS) y bucket privado de evidencias.
- Pruebas de punta a punta.
- Documentación navegable en `/docs`.

**Pendiente del MVP:**

| Issue | Qué |
| --- | --- |
| #21 | Filtros |
| #22 | Prueba de SharePoint |
| #23 | Revisión móvil |
| #24 | Despliegue |
| #5 | Revisión automática de PRs |
| #6 | Proveedor de mapa |

## Fuera del alcance por ahora

- Tipos de estudio, equipos (estrategia, desarrollo técnico…).
- Datos medibles y reportes numéricos.
- Subida de videos al bucket (se usan enlaces de SharePoint).
