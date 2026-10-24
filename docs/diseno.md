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
- La barra superior muestra **KRAPI** y, justo debajo, "powered by **KIT**". `KIT` es una abreviatura con `title` y `aria-label` "Kratos Innovation Team".

## Modo claro y oscuro

- El tema empieza según el sistema y se guarda en `localStorage` (`krapi-theme`). Se aplica con `data-theme` en `<html>` y también cambia `theme-color`.
- Para el mapa oscuro se genera un **estilo nocturno de alto contraste** a partir de Liberty (`nightStyle.ts`): conserva los nombres de los locales, que en el estilo "dark" de OpenFreeMap desaparecían.
- **Toda pantalla nueva se revisa en ambos temas.**

## Celular primero

Se usa en la calle, con una mano y con sol:

- **Ancho de referencia: 390 px.** Nada se debe desbordar a **320 px**. Desde **900 px** las secciones se abren en un panel lateral de 440 px, sin tapar todo el mapa.
- **Áreas de toque de 44 px o más.** La acción principal de cada pantalla es un **botón flotante** (`.fab`, abajo a la derecha, al alcance del pulgar).
- **Los diálogos salen desde abajo** en celular y respetan el área segura (`env(safe-area-inset-*)`).
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
| `.field`, `.field-label`, `.field-input`, `.field-error` | Campos de formulario; el error va debajo del campo y con `aria-invalid` |
| `.alert-error`, `.alert-info` | Mensajes fijos en una pantalla (por ejemplo, en el login) |
| `.lista`, `.lista-item…` | Listas tocables de los catálogos |
| `.fab` | Botón flotante de crear |
| `Dialog`, `Panel`, `MenuNavegacion`, `Buscador`, `Estados` | Ver [`arquitectura.md`](arquitectura.md) |
| `notificar.*` | Toasts de Sonner arriba al centro, con botón de cerrar de 40 px y colores de marca |
| `Avatar` | Avatar dibujado (DiceBear Croodles, a lápiz) de un responsable |
| `IconoCategoria` | Ícono de Lucide sobre el color de la categoría |
| `.marcador-lugar` | Punto en el mapa: `IconoCategoria` de 32 px con borde blanco y sombra (se ve sobre el mapa claro y el oscuro) dentro de un botón de 44 px. `.marcador-sin-categoria` (círculo blanco con borde gris), `.marcador-cerrado` (atenuado) y `.marcador-seleccionado` (más grande, con anillo azul eléctrico) |

## Mapa

- **Límite de Manila:** línea azul punteada con relleno muy suave.
- **Zonas:** en **lila** (relleno semitransparente y borde morado; lila claro en oscuro), para no confundirlas con el límite azul. Las cerradas van más tenues y la seleccionada lleva un borde más grueso.
- **Puntos:** el color y el ícono de su categoría. **Sin categoría:** círculo blanco con borde gris, distinto de todos los colores de la paleta (incluido el gris). **Cerrados:** atenuados. **Archivados:** no se muestran.

## Accesibilidad

- Foco visible siempre: azul eléctrico en claro y amarillo neón en oscuro.
- Contraste AA para todo el texto.
- Los diálogos atrapan el foco, se cierran con Escape y devuelven el foco al cerrarse.
- Los íconos decorativos llevan `aria-hidden`.
