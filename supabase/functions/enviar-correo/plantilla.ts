/**
 * Plantilla de los correos de KIRA (decisión 0035): HTML y texto plano a partir del mismo contenido.
 *
 * Los correos se leen en clientes muy distintos (Gmail, Outlook, el del celular), que no entienden
 * CSS moderno ni cargan fuentes ni imágenes sin permiso. Por eso: tablas, estilos en línea, fuentes
 * del sistema. Los colores son los de `src/styles/theme.css`; el texto pequeño usa azul eléctrico,
 * porque el azul cielo no alcanza contraste AA sobre blanco.
 *
 * La cabecera repite la marca de la app: las letras KI del logo de Kratos Innovation Team (una
 * imagen, `public/correo/marca-ki.png`, que se sirve desde la app con `KIRA_URL`), "RA" en texto y
 * "powered by KIT" debajo. Si no hay `KIRA_URL` o el cliente bloquea las imágenes, "KI" sale como
 * texto en azul cielo, que se parece bastante.
 */

/** Lo que cambia entre un correo y otro. */
export interface Correo {
  /** Lo que se ve junto al asunto en la bandeja de entrada, antes de abrirlo. */
  resumen: string
  /** Etiqueta de color sobre el título, por ejemplo "Cuenta aprobada". */
  etiqueta: string
  tono: 'destacado' | 'info' | 'neutro'
  titulo: string
  parrafos: string[]
  /** Datos clave en una tarjeta, por ejemplo el nombre y el usuario. */
  datos?: { nombre: string; valor: string }[]
  /** Botón (opcional). */
  accion?: { texto: string; enlace: string }
  /** Por qué le llega este correo. */
  motivo: string
}

const AZUL_CIELO = '#0478fb'
const AZUL_ELECTRICO = '#0d34e9'
const TEXTO = '#0a0a0c'
const TEXTO_SUAVE = '#5a5d68'
const FONDO = '#f3f4f7'
const BORDE = '#e3e4ea'
const FUENTE = "Poppins, 'Segoe UI', Helvetica, Arial, sans-serif"

/** Etiqueta: fondo y texto de cada tono (siempre con buen contraste). */
const TONOS = {
  destacado: { fondo: '#deff5d', texto: '#000000' },
  info: { fondo: '#eaf2ff', texto: AZUL_ELECTRICO },
  neutro: { fondo: FONDO, texto: TEXTO_SUAVE },
}

/** Los nombres los escribe cualquiera al registrarse: nunca van al HTML sin escapar. */
export const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Las letras KI del logo. Con la imagen si se sabe dónde está la app; si no, en texto azul. */
function marcaKi(urlApp: string | undefined) {
  if (!urlApp) return `<span style="color:${AZUL_CIELO}">KI</span>`
  const enlace = `${urlApp.replace(/\/$/, '')}/correo/marca-ki.png`
  // 386 x 250 es la proporción del logo; 22 px de alto son las mayúsculas de un texto de 30 px.
  return `<img src="${escapar(enlace)}" alt="KI" width="34" height="22" style="display:inline-block;vertical-align:baseline;width:34px;height:22px;margin-right:3px;border:0;font:800 22px/1 ${FUENTE};color:${AZUL_CIELO}">`
}

export function aHtml(correo: Correo, urlApp?: string): string {
  const tono = TONOS[correo.tono]

  const parrafos = correo.parrafos
    .map((p) => `<p style="margin:0 0 16px;font:400 16px/1.6 ${FUENTE};color:${TEXTO}">${escapar(p)}</p>`)
    .join('')

  const datos = correo.datos?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;background:${FONDO};border-left:4px solid ${AZUL_CIELO};border-radius:6px">
        <tr><td style="padding:14px 16px">${correo.datos
          .map(
            (d, i) =>
              `<div style="${i > 0 ? 'margin-top:10px;' : ''}font:400 12px/1.4 ${FUENTE};color:${TEXTO_SUAVE}">${escapar(d.nombre)}</div>` +
              `<div style="font:600 16px/1.4 ${FUENTE};color:${TEXTO}">${escapar(d.valor)}</div>`,
          )
          .join('')}</td></tr>
      </table>`
    : ''

  const boton = correo.accion
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 8px">
        <tr><td style="background:${AZUL_ELECTRICO};border-radius:8px">
          <a href="${escapar(correo.accion.enlace)}" style="display:inline-block;padding:14px 26px;font:600 16px/1 ${FUENTE};color:#ffffff;text-decoration:none">${escapar(correo.accion.texto)}</a>
        </td></tr>
      </table>`
    : ''

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapar(correo.titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${FONDO}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all">${escapar(correo.resumen)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO}">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="height:6px;line-height:6px;font-size:0;background:${AZUL_CIELO}">&nbsp;</td></tr>
        <tr><td style="padding:22px 28px 16px;border-bottom:1px solid ${BORDE}">
          <div style="font:800 30px/1 ${FUENTE};color:${TEXTO}">${marcaKi(urlApp)}RA</div>
          <div style="margin-top:6px;font:400 11px/1 ${FUENTE};color:${TEXTO_SUAVE}">powered by <strong style="font-weight:700;color:${TEXTO}">KIT</strong></div>
        </td></tr>
        <tr><td style="padding:28px 28px 20px">
          <span style="display:inline-block;margin:0 0 14px;padding:4px 12px;border-radius:999px;background:${tono.fondo};font:600 12px/1.4 ${FUENTE};color:${tono.texto}">${escapar(correo.etiqueta)}</span>
          <h1 style="margin:0 0 16px;font:700 22px/1.3 ${FUENTE};color:${TEXTO}">${escapar(correo.titulo)}</h1>
          ${parrafos}${datos}${boton}
        </td></tr>
        <tr><td style="padding:16px 28px 22px;border-top:1px solid ${BORDE}">
          <p style="margin:0 0 6px;font:400 12px/1.5 ${FUENTE};color:${TEXTO_SUAVE}">${escapar(correo.motivo)}</p>
          <p style="margin:0;font:600 12px/1.5 ${FUENTE};color:${TEXTO_SUAVE}">KIRA - Kratos Innovation Team</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** La misma información sin formato, para los clientes que no muestran HTML. */
export function aTexto(correo: Correo): string {
  return [
    correo.titulo.toUpperCase(),
    ...correo.parrafos,
    correo.datos?.map((d) => `${d.nombre}: ${d.valor}`).join('\n'),
    correo.accion ? `${correo.accion.texto}: ${correo.accion.enlace}` : undefined,
    '--',
    correo.motivo,
    'KIRA - Kratos Innovation Team',
  ]
    .filter(Boolean)
    .join('\n\n')
}
