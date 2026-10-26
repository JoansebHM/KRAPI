# Diseño

La identidad sigue el **Manual de marca Kratos 2026**, en su versión **Kratos Innovation Lab** (la azul). Los valores viven como variables CSS en `src/styles/theme.css`, y las clases compartidas en `src/styles/ui.css`. **No escribas colores sueltos en los componentes: usa los tokens.**

## Color

| Token | Valor | Uso |
| --- | --- | --- |
| `--kratos-azul-cielo` → `--color-primary` | `#0478FB` | Color principal: superficies, íconos, textos grandes, botón flotante |
| `--kratos-azul-electrico` → `--color-primary-strong` / `--color-accent` (claro) | `#0D34E9` | Botones y textos azules **pequeños**: el azul cielo no da contraste AA sobre blanco y el eléctrico sí (7,8:1) |
| `--kratos-amarillo-neon` → `--color-highlight` | `#DEFF5D` | Resaltados puntuales, siempre con texto negro. Es el **foco** en modo oscuro |
| `--kratos-lila`, `--kratos-morado-oscuro` | `#9E7AE1`, `#6100DF` | Secundarios |

| Superficie | Claro | Oscuro |
| --- | --- | --- |
| `--color-bg` | `#FFFFFF` | `#121214` |
| `--color-surface` | `#F3F4F7` | `#1C1C21` |
| `--color-text` / `--color-text-muted` | `#0A0A0C` / `#5A5D68` | `#FFFFFF` / `#A3A6B1` |
| `--color-accent` | `#0D34E9` | `#3D8DFC` (azul cielo aclarado, 5,7:1) |
| `--color-focus` | azul eléctrico | amarillo neón |

Las **categorías** usan una paleta propia (`src/features/categorias/colores.ts`): primero los colores de Kratos y después colores bien distinguibles entre sí en el mapa. Sobre cada color, el texto o ícono es blanco o negro según su luminosidad (`esClaro` en `lib/color.ts`).

## Tipografía

- **Good Times**: marca y títulos (`--font-display`). Solo se usa si está instalada en el dispositivo; si no, se ve **Poppins Black**. Para incluir el archivo web, ver el README.
- **Poppins**: todo el texto (`--font-sans`), cargada desde Google Fonts.
- La barra superior muestra **KIRA** y, justo debajo, "powered by **KIT**". `KIT` es una abreviatura con `title` y `aria-label` "Kratos Innovation Team".

## Modo claro y oscuro

- El tema empieza según el sistema y se guarda en `localStorage` (`krapi-theme`). Se aplica con `data-theme` en `<html>` y también cambia `theme-color`.
- Las claves locales con prefijo `krapi-` se conservan para no cerrar sesiones ni perder preferencias al actualizar instalaciones existentes.
- Para el mapa oscuro se genera un **estilo nocturno de alto contraste** a partir de Liberty (`nightStyle.ts`): conserva los nombres de los locales, que en el estilo "dark" de OpenFreeMap desaparecían.
- **Toda pantalla nueva se revisa en ambos temas.**

## Celular primero

Se usa en la calle, con una mano y con sol:

- **Ancho de referencia: 390 px.** Nada se debe desbordar a **320 px**. Desde **900 px** (computador) el menú queda **fijo a la izquierda**, debajo de la barra (☰ lo oculta o lo muestra, y se recuerda), y las secciones se abren en un **panel de 440 px a la derecha**, sin cerrar el menú. El panel se cierra al tocar el mapa (no al arrastrarlo); tocar un lugar abre su ficha.
- **Áreas de toque de 44 px o más.** La acción principal de cada pantalla es un **botón flotante** (`.fab`, abajo a la derecha, al alcance del pulgar).
- **Los diálogos salen desde abajo** en celular y respetan el área segura (`env(safe-area-inset-*)`).
- **Todos los diálogos tienen una X en la esquina superior derecha**, en una superficie de toque de 44 px. Cierra cuando el flujo lo permite; durante operaciones no interrumpibles se muestra deshabilitada.
- **Que no salte el teclado sin necesidad:** al editar se enfoca el botón, no el primer campo. Los campos usan `type`, `inputmode` y `autocomplete` adecuados.
- **Textos cortos y claros**, en español neutro y sin jerga técnica. Los mensajes de error dicen qué hacer ("Revisa tu conexión…").
- **Confirmar antes de algo difícil de deshacer**, y ofrecer **"Deshacer"** en el toast después de eliminar.
- Las listas largas tienen **buscador**, y las vacías explican qué hacer y ofrecen la acción.

## Componentes y clases

| Pieza | Para qué |
| --- | --- |
| `.btn` + `.btn-primary` / `.btn-secondary` / `.btn-danger` / `.btn-block` | Botones |
| `.btn-texto`, `.btn-texto-peligro` | Acciones secundarias en línea |
| `.icon-btn` | Botón de solo ícono (siempre con `aria-label`) |
| `.field-textarea` | Campo de varias líneas (descripción del lugar, notas del estudio) |
| `CampoNotas`, `.campo-notas` | Notas del estudio en el formulario: un campo por nota con su botón de borrar (44 px) y "Agregar nota". El campo crece con el texto |
| `NotasDelEstudio`, `.estudio-notas` | Sección desplegable "Notas" (con cuántas hay) en la presentación y la página del estudio; cada nota tiene su botón "Copiar" |
| `.field`, `.field-label`, `.field-input`, `.field-error`, `.field-ayuda` | Campos de formulario; el error va debajo del campo y con `aria-invalid`. `.field-ayuda` es la ayuda gris debajo del campo cuando no hay error |
| `CampoContrasena` | Contraseña con el botón "Mostrar" / "Ocultar" (login, registro) |
| `PantallaAcceso`, `.login-alterno` | Pantalla centrada con la marca para entrar o registrarse, y el enlace de 44 px para pasar de una a otra |
| `.estudio-presentacion-autoria` | "Registrado por Ana · 30 oct 2026" y "Editado por…" al final de los datos del estudio, en gris y separado por una línea. Lo de antes de las cuentas individuales dice "Cuenta compartida" |
| `.ficha-acciones`, `.ficha-acciones-grilla` | Acciones de la ficha del lugar: dos columnas de botones (editar, mover, cerrar, archivar) y "Borrar lugar" en texto rojo debajo |
| `.dibujo-barra` | Barra de abajo al dibujar una zona: "Deshacer" y "Agregar esquina" arriba, "Cancelar" y "Terminar" abajo. La zona en curso se ve en naranja sobre el mapa |
| `.tipo-zona-muestra` | Cuadrado con el color de un tipo de zona (lista, selector y ficha) |
| `.zona-local`, `.zona-local-ver` | Local dentro de una zona: ícono, nombre, último estudio y botón "Ver" que lleva a su ficha |
| `.salida-zona`, `.salida-persona`, `.salida-estado-*` | Zona de una salida: nombre, "Ver en el mapa", cada persona con su avatar, su estado (sin reportar, porcentaje o completa, en azul) y "Reportar" |
| `.salida-porcentajes` | Chips de 0, 25, 50, 75 y 100 % para reportar |
| `.ver-asignacion` | Tarjeta abajo del mapa al ver una zona asignada (flota a la izquierda en computador) |
| `.zona-comentario` | Comentario de una zona: avatar, autor, fecha y texto; botón de borrar (44 px) solo para su autor o un admin |
| `.estudio-evidencia-video` | Botón redondeado "Ver en SharePoint" (44 px, con ícono de play) en la tarjeta de un video; se abre en otra pestaña |
| `.ficha-telefono-enlace` | Botones redondeados de 44 px con ícono (Lucide `Phone` y `MessageCircle`) para llamar al contacto y escribirle por WhatsApp |
| `.pestanas`, `.pestana` | Pestañas en un control segmentado de todo el ancho (botones de 44 px con `role="tab"`), con la cantidad de cada una. Se usan en Usuarios (Pendientes, Activos, Otros) |
| `.menu-contador` | Cantidad en amarillo neón junto a una sección del menú (cuentas por aprobar) |
| `.usuario-inicial` | Círculo de 40 px con la inicial del nombre de una cuenta |
| `CuentaNoActiva`, `.cuenta-estado` | Pantalla de cuenta pendiente, rechazada o desactivada: recuadro con el estado, el nombre y el usuario, y los botones "Revisar ahora" y "Salir" |
| `.alert-error`, `.alert-info` | Mensajes fijos en una pantalla (por ejemplo, en el login) |
| `.lista`, `.lista-item…` | Listas tocables de los catálogos |
| `.fab` | Botón flotante de crear. Sobre el mapa, `.fab-mapa` ("+ Nuevo lugar") queda por encima de los créditos |
| `.formulario`, `.field-opcional` | Campos de un formulario, uno debajo del otro; "(opcional)" en gris junto a la etiqueta |
| `FlechaLista` | Flecha (›) al final de una fila que se puede abrir |
| `.chips`, `.chip` | Opciones que se marcan tocándolas, con ícono o avatar (categoría del lugar, participantes del estudio). La marcada lleva borde azul y fondo suave |
| `.ficha-datos` | Datos de una ficha (lugar, estudio): etiqueta pequeña arriba y valor debajo |
| `.solo-lector` | Texto que solo leen los lectores de pantalla (por ejemplo, los nombres detrás de los avatares de un estudio) |
| `Dialog`, `Panel`, `MenuNavegacion`, `Buscador`, `Estados` | Ver [`arquitectura.md`](arquitectura.md) |
| `.dialog-header`, `.dialog-cerrar` | Encabezado con título a la izquierda y botón X de 44 px a la derecha; el botón se deshabilita cuando el diálogo no se puede cerrar |
| `.dialog-presentacion`, `.estudio-carrusel` | Modal de presentación del estudio: el contenido completo se desplaza dentro del diálogo y las acciones quedan al final, sin quedarse fijas; en móvil conserva al menos 16 px hasta los bordes superior e inferior (respetando las áreas seguras), con datos, carrusel de controles táctiles de 44 px y ampliación de fotos; las otras evidencias se reproducen, leen, descargan o abren según su tipo |
| `.estudio-audio-controles`, `.estudio-audio-progreso` | Reproductor de audio propio: botón play/pausa, barra de avance táctil de 44 px, tiempos actual y total; evita los controles nativos cuya distribución varía entre móviles |
| `.estudio-audio-velocidades` | Selector accesible de velocidad del audio (1×, 2×, 3×), con opción seleccionada visible y botones de al menos 44 px |
| `.estudio-evidencias-titulo`, `.estudio-evidencia-menu` | Las evidencias se agrupan por tipo con su ícono en el título; cada tarjeta tiene un menú desplegable de acciones con botones de toque de 44 px |
| `notificar.*` | Toasts de Sonner arriba al centro, con botón de cerrar de 40 px y colores de marca |
| `Avatar`, `SelectorAvatar` | Avatar dibujado (DiceBear Croodles, a lápiz) de una cuenta, y el selector con propuestas para elegirlo (registro y Mi perfil). El botón de la cuenta en la barra muestra el avatar propio |
| `IconoCategoria` | Ícono de Lucide sobre el color de la categoría |
| `IconoTipoEvidencia` | Círculo de 44 px con el ícono del tipo de evidencia (cámara, micrófono, documento, hoja de cálculo) sobre fondo azul suave |
| `.evidencia`, `.evidencia-accion`, `.evidencia-progreso` | Fila de evidencia: abre el archivo en otra pestaña y a la derecha lleva botones de 44 px (borrar; o cancelar, reintentar y descartar mientras sube). La subida muestra "Subiendo… N %" y una barra de avance; el error va en rojo, debajo del nombre |
| `.marcador-lugar` | Punto en el mapa: `IconoCategoria` de 32 px con borde blanco y sombra (se ve sobre el mapa claro y el oscuro) dentro de un botón de 44 px. `.marcador-sin-categoria` (círculo blanco con borde gris), `.marcador-cerrado` (atenuado) y `.marcador-seleccionado` (más grande, con anillo azul eléctrico) |

## Mapa

- **Límite de Manila:** línea azul punteada con relleno muy suave.
- **Zonas:** en **lila** (relleno semitransparente y borde morado; lila claro en oscuro), para no confundirlas con el límite azul. Las cerradas van más tenues y la seleccionada lleva un borde más grueso.
- **Zonas de una salida:** en **rosado** (`#E93D82`), para no confundirlas con las zonas del mapa (lila o el color de su tipo) ni con el límite azul. Se ven las de las salidas de hoy (o la de la salida que se está viendo); las propias con borde continuo y las de los demás punteado.
- **Crear un punto:** mira fija en el centro, en azul eléctrico, que se pone roja fuera de Manila. Arriba, un aviso dice qué hacer. Abajo, una barra con "Cancelar" y "Continuar", y encima de ella un botón redondo "Mi ubicación", todo al alcance del pulgar. En computador, la barra flota centrada.
- **Puntos:** el color y el ícono de su categoría. **Sin categoría:** círculo blanco con borde gris, distinto de todos los colores de la paleta (incluido el gris). **Cerrados:** atenuados. **Archivados:** no se muestran.

## Accesibilidad

- Foco visible siempre: azul eléctrico en claro y amarillo neón en oscuro.
- Contraste AA para todo el texto.
- Los diálogos atrapan el foco, se cierran con Escape y devuelven el foco al cerrarse.
- La presentación de un estudio prioriza las fotos en un carrusel; el audio usa controles propios para que la barra de avance sea manipulable con una mano y se reproduce a 1×, 2× o 3×. Las notas se leen y los enlaces o archivos se abren o descargan según su tipo.
- Los íconos decorativos llevan `aria-hidden`.
