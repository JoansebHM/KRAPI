# Producto

## Para qué existe KIRA

El equipo de **Kratos Innovation Lab** (EAFIT) está haciendo un **estudio de proximidad** para analizar cómo mejorar la distribución de productos de bebidas en el **barrio Manila** (El Poblado, Medellín). Hoy está en la etapa de **levantamiento de información**: salir a campo, hablar con las personas de los locales y registrar lo que se encuentra.

KIRA es el geovisor donde queda ese registro: **qué lugares se visitaron, qué se hizo en cada visita y con qué evidencias**, de forma que cualquiera del equipo pueda consultarlo después sobre el mapa.

El foco está en los **locales fijos** (tiendas, cafés, restaurantes…): no en turistas ni en personas de paso.

## Quién la usa

- **Integrantes de Kratos.** Es un grupo pequeño. Hoy entra con **un solo usuario compartido** y se está pasando a **una cuenta por integrante** (milestone *Usuarios individuales*, [decisión 0021](decisiones/0021-usuarios-individuales.md)):
  - Cada quien se registra con **nombre, nombre de usuario y contraseña**, sin correo. La cuenta queda **pendiente** hasta que un admin la apruebe.
  - **Miembros:** ven, crean y editan lugares, estudios, evidencias y catálogos. Solo borran las evidencias y los lugares sin estudios que ellos mismos crearon.
  - **Admins:** además aprueban, rechazan, desactivan y reactivan cuentas, nombran a otros admins y borran cualquier cosa que se pueda borrar. Si alguien olvida su contraseña, un admin la restablece.
  - Cada registro guarda quién lo creó y quién lo editó por última vez.
- **Se usa sobre todo en el celular, en la calle.** A veces con una mano, con sol y con datos móviles. Por eso cada pantalla se diseña primero para celular (ver [`diseno.md`](diseno.md)).

## Conceptos

| Concepto | Qué es | Ejemplo |
| --- | --- | --- |
| **Lugar** (ubicación) | Algo en el mapa que se visita. Se crea **una sola vez** y existe siempre. Puede ser un **punto** o una **zona**. | "Tienda Don Pepe" |
| **Punto** | Un local. Tiene nombre, categoría, dirección, complemento, contacto (nombre y teléfono del administrador) y estado. | Un café en una esquina |
| **Zona** | Un polígono **opcional** que marca lo que se cubrió, por ejemplo la manzana donde un equipo revisó varios locales. No tiene tipo ni categoría: solo nombre, descripción y su forma. Las zonas pueden superponerse. | "Manzana del parque" |
| **Estudio** | **Una visita** a un lugar: una entrevista o un levantamiento. Tiene fecha, hora de inicio y de fin, responsables, **a quién se entrevistó** (texto corto), título, notas y evidencias. Los estudios de puntos y de zonas tienen **la misma estructura**. | "Entrevista al tendero, 30 oct, 2–4 p. m." |
| **Evidencia** | Material de un estudio: fotos, audios, documentos (Word, PDF, Excel), notas de texto o videos (por enlace de SharePoint). Un estudio puede tener todas las evidencias que haga falta. | Foto de la fachada |
| **Histórico** | La lista de estudios de un lugar, del más reciente al más antiguo. **Volver a un lugar es agregarle un estudio nuevo**, nunca reemplazar el anterior. | Tres visitas a la misma tienda en noviembre |
| **Categoría** | Tipo de local (comercio, café, hotelería…), con un **color** y un **ícono** que se usan en el mapa. Administrable. | Café · lila · taza |
| **Responsable** | Persona del equipo que participa en estudios, con su **avatar dibujado**. Administrable. | Ana |

Reglas de negocio:

- **Nada puede quedar fuera de Manila.** La app avisa y no deja continuar; la base de datos también lo impide.
- **Estado del lugar:** activo o cerrado. Si un local cierra, se marca como cerrado y conserva su histórico. Si en el mismo sitio abre otro negocio, se crea un lugar nuevo.
- **Archivar en vez de borrar.** Lugares y estudios se archivan: desaparecen del mapa pero se pueden recuperar. Solo se borra de verdad un lugar creado por error y sin estudios, o una evidencia equivocada.
- **Una zona muestra los locales que tiene adentro**, calculado por la geometría, junto con sus propios estudios ("en la manzana no hay canecas", "la zona es muy oscura").
- **Sin salidas.** No existe el concepto de "salida" o jornada: no todos van el mismo día. Cada estudio lleva su propia fecha y responsables (ver [decisión 0008](decisiones/0008-modelo-lugares-y-estudios.md)).
- **Sin tipos de estudio ni equipos por ahora**, y sin datos medibles (conteos, cifras). La estructura de los locales se registra con fotos. Más adelante se puede agregar una tabla de mediciones sin romper el modelo.

## Cómo se usa en campo

1. La persona entra con su **nombre de usuario** y su contraseña. Si no tiene cuenta, la crea en "Crear una cuenta" (nombre, nombre de usuario y contraseña, sin correo) y espera a que un admin la apruebe: mientras tanto ve una pantalla de espera y entra al mapa sola apenas la aprueban. La sesión dura hasta 7 días y se cierra tras 2 horas sin uso.
2. En el mapa toca **"+ Nuevo lugar"**. Cuando existan las zonas (#15), elegirá entre **lugar** o **zona**.
3. **Ubica el punto** moviendo el mapa bajo una **mira fija en el centro**, o con "Mi ubicación".
   - Si el punto queda fuera de Manila, no deja continuar.
   - Si hay otro lugar a menos de ~15 m, pregunta si es el mismo. Si lo es, se toca y se le **agrega el estudio** ahí mismo, sin duplicar el lugar.
4. Llena el lugar (nombre, categoría, dirección, complemento y contacto) y, en el siguiente paso, el **estudio**. La fecha (hoy) y la hora de inicio (ahora) vienen prellenadas, la de fin una hora después, y los responsables vienen con los del último estudio hecho desde ese celular. También puede elegir "Solo guardar el lugar".
5. Al guardar el estudio se abre **su página**, con el botón **"Agregar evidencia"**:
   - **Tomar foto** con la cámara. Las fotos se reducen (2048 px de lado mayor) y se comprimen antes de subirlas, para ahorrar datos.
   - **Grabar audio** dentro de la app. Se escucha antes de subirlo.
   - **Elegir archivos**: fotos, audios, PDF, Word o Excel, varios a la vez, hasta 50 MB cada uno.

   Cada archivo muestra su avance. Si falla, se explica por qué y se puede reintentar. Las subidas siguen aunque se vuelva al mapa. Una evidencia equivocada se borra de verdad, con confirmación.
6. En la ficha del lugar está el histórico: los estudios del más reciente al más antiguo, con "Agregar estudio" para una visita nueva. Al tocar un estudio se abre una presentación con sus datos, un carrusel de fotos y las demás evidencias agrupadas por tipo. Cada grupo muestra su ícono en el título y cada tarjeta tiene un menú para descargar archivos, copiar enlaces o copiar notas. Los enlaces de archivos son temporales y duran una hora. Los audios usan controles compactos propios (reproducir/pausar, avance y tiempos) y se pueden escuchar a velocidad normal, doble o triple; desde el modal también se puede editar con el formulario existente o ir a la página del estudio para agregar evidencias. Todos los modales incluyen una X arriba a la derecha para cerrar cuando el flujo lo permite. El formulario permite archivarlo (con "Deshacer").

Para una **zona**: con la misma mira se van marcando las esquinas ("Agregar esquina", "Deshacer", "Terminar"), viendo el área en m².

> **Ya funcionan** los pasos 2 a 6 para puntos. Faltan las zonas (#15) y las notas de texto y videos por enlace (#19). Los estudios ya tienen una presentación con carrusel de fotos, reproducción de audio y descarga de documentos; falta completar el visor según el tipo de evidencia (#20). La mira central y el botón "+" son la propuesta acordada como punto de partida; se ajustarán al probarlos en campo.

## Estado

**Hecho:**
- Mapa con el límite de Manila, navegación limitada a 1 km alrededor y modo claro/oscuro.
- Login con nombre de usuario y política de sesión. Registro de cuentas con nombre de usuario (quedan pendientes de aprobación).
- Notificaciones.
- Administración de categorías (color e ícono) y responsables (avatar).
- Lugares en el mapa: puntos con el color y el ícono de su categoría (blancos si no tienen), zonas en lila, cerrados atenuados y archivados ocultos. Al tocar uno se abre una ficha básica (nombre, tipo, categoría y estado).
- Crear puntos desde el mapa: botón "+ Nuevo lugar", mira fija en el centro, "Mi ubicación", bloqueo fuera de Manila, aviso de lugares a menos de 15 m y formulario del lugar.
- Estudios: se registran al crear un punto, al encontrar un duplicado o desde la ficha ("Agregar estudio"), con responsables (vienen del último estudio del celular). La ficha muestra el histórico; al tocar un estudio se abre su presentación con fotos y otras evidencias, y desde ahí se puede editar o agregar evidencias.
- Evidencias de archivo: tomar fotos (comprimidas antes de subir), grabar audios en la app y subir documentos, con avance, reintento y borrado con confirmación.
- Esquema completo en Supabase con seguridad (RLS) y bucket privado de evidencias.
- Pruebas de punta a punta.
- Documentación navegable en `/docs`.

**Siguiente: usuarios individuales** (milestone *Usuarios individuales*, #68 a #81). Va antes de lo que falta del MVP.

**Pendiente del MVP:**

| Issue | Qué |
| --- | --- |
| #15 | Crear zonas (y elegir punto o zona en el "+") |
| #16 | Ficha del lugar completa (datos, histórico, editar y archivar) |
| #19 | Evidencias de texto y videos por enlace |
| #21 | Filtros |
| #22 | Prueba de SharePoint |
| #23 | Revisión móvil |
| #24 | Despliegue |
| #5 | Revisión automática de PRs |
| #6 | Proveedor de mapa |

## Fuera del alcance por ahora

- Salidas o jornadas de campo.
- Tipos de estudio, equipos (estrategia, desarrollo técnico…).
- Datos medibles y reportes numéricos.
- Subida de videos al bucket (se usan enlaces de SharePoint).
