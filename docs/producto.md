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
| **Lugar** (ubicación) | Algo en el mapa que se visita. Se crea **una sola vez** y existe siempre. Puede ser un **punto** o una **zona** (y, aparte, un **elemento**, que no se visita). | "Tienda Don Pepe" |
| **Punto** | Un local. Tiene nombre, categoría, dirección, complemento, contacto (nombre y teléfono del administrador) y estado. | Un café en una esquina |
| **Zona** | Un área del barrio (una manzana, una cuadra, un parque). Tiene nombre, **tipo** (de qué es: comercial, residencial…, con su color en el mapa), descripción, **comentarios** del equipo y su histórico de **recorridos** (estudios de la zona). Las zonas pueden superponerse. | "Cuadra de los cafés" |
| **Elemento** | Algo del barrio que se ubica y se documenta pero **no se estudia**. Tiene categoría, descripción y un nombre **opcional** (sin él se muestra el de su categoría), y sus **evidencias van directo en su ficha**, sin estudios ([decisión 0028](decisiones/0028-elementos.md)). En el mapa es una **gota invertida**, para distinguirlo de los locales (círculos). | Una caneca, un poste, un árbol, una alcantarilla, un parqueadero |
| **Tipo de zona** | De qué es una zona, con un color. Administrable. | Comercial · azul |
| **Comentario** | Lo que alguien del equipo dice de una zona, con quién lo escribió y cuándo. | "Mucho comercio informal en las tardes" |
| **Estudio** | **Una visita** a un lugar: una entrevista o un levantamiento. Tiene fecha, hora de inicio y de fin, **participantes** (cuentas del equipo), **a quién se entrevistó** (texto corto), **notas** (varios apuntes sueltos) y evidencias. No tiene título: se identifica por su fecha y hora. Los estudios de puntos y de zonas tienen **la misma estructura**. | "30 oct 2026 · 2:00 p. m., con Ana y Beto" |
| **Evidencia** | Material de un estudio (o de un elemento): fotos, audios, documentos (Word, PDF, Excel) o videos (por enlace de SharePoint). Los apuntes escritos van en las notas del estudio. Un estudio puede tener todas las evidencias que haga falta. | Foto de la fachada |
| **Boceto** | Un dibujo hecho a mano alzada sobre el mapa para explicar algo en una reunión (la ruta de un bus, por dónde se mueve la gente). Se guarda como **pantallazo** del mapa con los trazos, con título, descripción, autor y fecha. **No se edita**: si algo cambia, se hace otro ([decisión 0029](decisiones/0029-pizarra-y-bocetos.md)). | "Ruta del bus 133 por la 10" |
| **Histórico** | La lista de estudios de un lugar, del más reciente al más antiguo. **Volver a un lugar es agregarle un estudio nuevo**, nunca reemplazar el anterior. | Tres visitas a la misma tienda en noviembre |
| **Categoría** | Tipo de local (comercio, café, hotelería…) o de elemento (caneca, poste…), con un **color** y un **ícono** que se usan en el mapa. Cada una dice si se usa en lugares, en elementos o en ambos. Administrable. | Café · lila · taza |
| **Participante** | Cuenta del equipo que participó en un estudio, con su **avatar dibujado** (se elige al registrarse) | Ana |

Reglas de negocio:

- **Nada puede quedar fuera de Manila.** La app avisa y no deja continuar; la base de datos también lo impide.
- **Estado del lugar:** activo o cerrado. Si un local cierra, se marca como cerrado y conserva su histórico. Si en el mismo sitio abre otro negocio, se crea un lugar nuevo.
- **Archivar en vez de borrar.** Lugares y estudios se archivan: desaparecen del mapa pero se pueden recuperar. Solo se borra de verdad un lugar creado por error y sin estudios (o un elemento sin evidencias), o una evidencia equivocada.
- **Una zona muestra los locales que tiene adentro**, calculado por la geometría (con un botón para ir a la ficha de cada uno), junto con sus comentarios y sus recorridos ("en la manzana no hay canecas", "la zona es muy oscura"). Los estudios de una zona no tienen "a quién se entrevistó".
- **Las salidas reparten el trabajo, no agrupan estudios.** Un admin crea una salida (fecha y hora de inicio), dibuja sus zonas de asignación y dice quién cubre cada una. Desde el día de la salida, cada persona reporta a qué hora terminó y qué porcentaje de su zona cubrió (0, 25, 50, 75 o 100 %). Los estudios siguen llevando su propia fecha y sus participantes, porque no todos van el mismo día (ver decisiones [0008](decisiones/0008-modelo-lugares-y-estudios.md) y [0025](decisiones/0025-salidas-y-asignaciones.md)).
- **Las zonas de asignación no son zonas del mapa.** Cambian de una salida a otra. Si un recorrido merece quedar en el histórico, se registra como zona del mapa con la misma forma.
- **La evidencia de una salida son los estudios de siempre, no un sistema aparte.** Casi todo lo que se hace en una salida es crear un punto o agregarle un estudio a uno existente: eso ya trae fotos, audios, documentos y notas. Un estudio puede decir en qué salida se hizo, y la página de la salida muestra todo lo que se registró en ella, con un enlace a cada lugar. El reporte (hora de fin y porcentaje) sigue siendo aparte: un resumen rápido de cuánto se cubrió.
- **El mismo cuadrante se puede cubrir en varias salidas sin duplicar la zona.** Al crear una nueva asignación se puede usar la forma de una anterior en vez de redibujarla, y si esa anterior ya se había registrado como zona del mapa, la nueva lo hereda: el botón pasa de "Registrar el recorrido…" a "Agregar estudio a la zona del mapa", para que todo quede en el mismo histórico en vez de crear una zona repetida.
- **Un elemento no es un lugar de estudio, ni se convierte en uno.** No tiene estudios, ni estado (abierto o cerrado), ni dirección o contacto. Si en campo algo resulta digno de estudiarse, se crea como punto.
- **Sin tipos de estudio ni equipos por ahora**, y sin datos medibles (conteos, cifras). La estructura de los locales se registra con fotos. Más adelante se puede agregar una tabla de mediciones sin romper el modelo.

## Cómo se usa en campo

1. La persona entra con su **nombre de usuario** y su contraseña. Si no tiene cuenta, la crea en "Crear una cuenta" (nombre, nombre de usuario y contraseña, sin correo) y espera a que un admin la apruebe: mientras tanto ve una pantalla de espera y entra al mapa sola apenas la aprueban. La sesión dura hasta 7 días y se cierra tras 2 horas sin uso.
2. En el mapa toca **"+ Nuevo lugar"** y elige **Punto** (un local), **Zona** (un área) o **Elemento** (algo que no se estudia, como una caneca).
3. **Ubica el punto** moviendo el mapa bajo una **mira fija en el centro**, con "Mi ubicación" (que lleva el mapa hasta donde se está) o, solo al crear un punto, con **"Usar mi ubicación"**: el navegador pide permiso para ubicarte y, si estás dentro de Manila, el punto queda ahí y se sigue con los datos. Si estás fuera, avisa y no lo crea.
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

   En la ficha también está el histórico: los estudios del más reciente al más antiguo, con "Agregar estudio" para una visita nueva. Al tocar un estudio se abre una presentación con sus datos (y quién lo registró y quién lo editó por última vez), sus **notas** en una sección desplegable, un carrusel de fotos (se pasan con los botones o **deslizando el dedo**, con un indicador de carga mientras se descargan; al ampliarlas a pantalla completa también se pasan con flechas y deslizando) y las demás evidencias agrupadas por tipo. Los **PDF** y los **Word (.docx)** se pueden ver sin salir de la app con "Ver documento" (el PDF página por página y con zoom; el Word como una vista aproximada de su texto); los demás documentos se descargan. Cada grupo muestra su ícono en el título y cada tarjeta tiene un menú para descargar archivos, copiar enlaces o copiar notas. Los enlaces de archivos son temporales y duran una hora. Los audios usan controles compactos propios (reproducir/pausar, avance y tiempos) y se pueden escuchar a velocidad normal, doble o triple; desde el modal también se puede editar con el formulario existente o ir a la página del estudio para agregar evidencias. Todos los modales incluyen una X arriba a la derecha para cerrar cuando el flujo lo permite. El formulario permite archivarlo (con "Deshacer").

Para una **zona**: con la misma mira se van marcando las esquinas ("Agregar esquina", "Deshacer", "Terminar"), viendo la forma y el área. No deja terminar si se sale de Manila, si sus lados se cruzan o si tiene menos de 20 m². Luego se llenan su nombre, su tipo y su descripción. En su ficha se ven el área, los locales de adentro, los comentarios y los recorridos; desde ahí se edita, se **redibuja**, se archiva o se borra (si no tiene estudios).

Para un **elemento**: con la misma mira se ubica y se llenan su categoría (solo salen las de elementos), un nombre opcional (si no se escribe, se usa el de la categoría: no hace falta llamar «Caneca» a cada caneca) y una descripción opcional. Antes de guardar, si ya hay otro **de la misma categoría a menos de 3 m**, pregunta si es el mismo (dos canecas o dos postes seguidos no son un aviso: solo cuenta la misma categoría). Al guardar se abre su **ficha**, con "Agregar evidencia" (las mismas opciones de un estudio), un carrusel con sus fotos y la lista de evidencias. Desde ahí se edita, se mueve, se archiva o, si no tiene evidencias, se borra.

Para un **boceto**:

1. En el menú, **Pizarra**. El mapa arranca en **Mano**: se ubica donde se quiere explicar algo.
2. Se toca **Lápiz**: el mapa queda quieto y el dedo (o el mouse, en computador) dibuja. Hay cinco colores (por ejemplo, rojo para la ruta del bus y azul para las personas), dos grosores, **Deshacer** y **Borrar todo** (con confirmación). Con **Mano** se vuelve a mover el mapa y los trazos se quedan pegados a él.
3. Con **Texto**, tocar el mapa abre un cuadro para escribir (varias líneas, hasta 160 caracteres) y pone el texto ahí; el mapa se sigue moviendo arrastrando. Tocar un texto lo elige: se **arrastra** para moverlo, se **gira** con su manija (o con los botones de girar, de a 15°) y se puede **editar**, cambiarle el **color** y el **tamaño** (normal o grande) y **borrar**. Los textos también se pegan al mapa.
4. **Deshacer** revierte la última acción de cualquier tipo (un trazo, un texto, mover, girar, editar, borrar), también después de **Borrar todo**.
5. **Guardar** (se activa con el primer trazo o texto) pide un título y, si se quiere, una descripción. Se guarda el pantallazo del mapa con los trazos. Los marcadores de los lugares no salen: se ocultan en la pizarra; el mapa base (calles y nombres), las zonas y el límite de Manila sí.
6. En **Bocetos** están todos, del más reciente al más antiguo, con miniatura, quién lo hizo y cuándo. Al tocar uno se ve entero en pantalla completa, con su descripción, y se puede **descargar** o **borrar** (solo su autor o un admin, con confirmación). Sirve para proyectarlo en las reuniones.

Para **preguntas de entrevista**:

1. En el menú, **Preguntas**. Se abre un diálogo sobre el mapa, en la última guía que se usó (la primera vez, *Centro de distribución*). Hay una pestaña por tipo de actor: Centro de distribución, JAC, Instituciones, Tenderos, Residentes y Visitantes.
2. Antes de empezar, **Autorización para grabar** muestra el guion de presentación de la guía activa, con el nombre de la cuenta ya puesto, los siete elementos que deben quedar claros y las notas para ese actor. "Volver a las preguntas" (o el botón atrás) regresa a la lista.
3. La lista muestra primero las **imprescindibles ★** (con solo estas se hace la versión de 40 minutos) y luego las complementarias. Al tocar una pregunta se ve por qué se hace, qué evidencia se busca, las repreguntas, el registro técnico, el ejercicio con sus tarjetas (JAC, Tenderos, Residentes y Visitantes) y las lentes.
4. En **Instituciones** (Policía, Hospital o clínica, Centro comercial) y **Visitantes** (Turistas, Población flotante, Consumidores) se elige el módulo que corresponde; las preguntas del tronco común se hacen siempre.
5. Al final de la lista está el **cierre de la entrevista**.

Para una **salida**:

1. Un admin la crea en **Salidas** (nombre, fecha y hora de inicio).
2. En la salida toca **"Agregar zona"**, dibuja la zona con la mira y elige quiénes la cubren.
3. Cada persona ve sus zonas en **Mis asignaciones** y en el mapa: las suyas en rosado con borde continuo, y las de los demás con borde punteado. "Ver en el mapa" encuadra la zona, y tocarla directamente en el mapa abre la misma información.
4. Mientras recorre su zona, registra puntos y les agrega estudios como siempre; el formulario del estudio trae la salida ya elegida, para dejarlo ligado a ella (se puede cambiar o quitar).
5. Al terminar, toca **"Reportar"**: a qué hora terminó y qué porcentaje cubrió (0, 25, 50, 75 o 100 %). Lo puede corregir después, y un admin también.
6. En la página de la salida, **"Qué se registró"** lista los estudios ligados a ella. Si además lo que se encontró merece quedar como una zona informativa permanente, **"Registrar el recorrido como zona del mapa"** crea una zona del mapa con la misma forma y el mismo nombre, y la asignación queda ligada a ella.
7. Si otra salida (en otra fecha) vuelve a cubrir el mismo cuadrante, al crear su asignación se puede elegir "usar la forma de una anterior" en vez de redibujarla. Si esa anterior ya estaba ligada a una zona del mapa, el botón ya no ofrece crear una: ofrece **"Agregar estudio a la zona del mapa"**, directo sobre la zona que ya existe.

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
- Pizarra y bocetos (decisiones 0029 y 0030): dibujar a mano alzada y escribir textos sobre el mapa (Mano, Lápiz y Texto; colores, grosores; los textos se mueven, se giran y se editan; deshacer cualquier acción, borrar todo) y guardarlo como pantallazo con título y descripción. El registro tiene miniatura, autor y fecha; cada boceto se ve entero, se descarga y se borra. No se editan.
- Preguntas de entrevista (decisión 0031): seis guías con las imprescindibles primero, desplegables con la razón de cada pregunta, módulos, ejercicios con tarjetas, guion de autorización con el nombre de la cuenta y cierre. Solo lectura: no se guardan respuestas.
- Elementos (decisión 0028): canecas, postes, árboles… con categoría, descripción y nombre opcional, como gotas invertidas en el mapa. Sus evidencias van directo en su ficha, sin estudios. Las categorías dicen si se usan en lugares, en elementos o en ambos.
- Zonas: dibujarlas con la mira, su tipo (lista administrable), comentarios, locales adentro, recorridos, editarlas, redibujarlas y archivarlas.
- Salidas: los admins crean salidas, dibujan sus zonas y las asignan a personas. Cada persona ve sus zonas en "Mis asignaciones" (el menú cuenta las que faltan por reportar) y en el mapa, y reporta su hora de fin y el porcentaje que cubrió. Las salidas se pueden cancelar y reactivar.
- Ficha del punto: todos sus datos (con el teléfono para llamar o abrir WhatsApp), editarlos, moverlo con la mira, marcarlo cerrado o activo, archivarlo y recuperarlo, y borrarlo si no tiene estudios. El histórico dice cuántas evidencias tiene cada estudio.
- Crear puntos desde el mapa: botón "+ Nuevo lugar", mira fija en el centro, "Mi ubicación", "Usar mi ubicación" (pone el punto donde estás), bloqueo fuera de Manila, aviso de lugares a menos de 15 m y formulario del lugar.
- Estudios: se registran al crear un punto, al encontrar un duplicado o desde la ficha ("Agregar estudio"), con participantes (vienen marcadas la cuenta propia y las del último estudio del celular). La ficha muestra el histórico; al tocar un estudio se abre su presentación con fotos y otras evidencias, y desde ahí se puede editar o agregar evidencias.
- Evidencias de archivo: tomar fotos (comprimidas antes de subir), grabar audios en la app y subir documentos, con avance, reintento y borrado con confirmación.
- Videos de SharePoint por enlace (se abren en otra pestaña).
- Filtros del mapa (decisión 0026): mostrar u ocultar los elementos, categoría (de los puntos y los elementos), rango de fechas, días de la semana, rango de horas, tipo de evidencia y responsables. Un lugar se muestra si al menos uno de sus estudios cumple todos a la vez; los elementos solo los filtra la categoría. El panel ("Filtros", en el mapa) no tapa el mapa: se ve cómo cambia al ajustar algo.
- Esquema completo en Supabase con seguridad (RLS) y bucket privado de evidencias.
- Pruebas de punta a punta.
- Documentación navegable en `/docs`.

**Pendiente del MVP:**

| Issue | Qué |
| --- | --- |
| #22 | Prueba de SharePoint |
| #23 | Revisión móvil |
| #24 | Despliegue |
| #5 | Revisión automática de PRs |
| #6 | Proveedor de mapa |

## Fuera del alcance por ahora

- Tipos de estudio, equipos (estrategia, desarrollo técnico…).
- Datos medibles y reportes numéricos.
- Subida de videos al bucket (se usan enlaces de SharePoint).
