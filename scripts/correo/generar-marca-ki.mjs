/**
 * Genera `public/correo/marca-ki.png`: las letras KI del logo, con los colores del modo claro (tallo
 * oscuro y resto en azul cielo), para la cabecera de los correos (supabase/functions/enviar-correo).
 * Los clientes de correo no entienden SVG, y el PNG se sirve desde la propia app (`KIRA_URL`).
 *
 * Los trazos salen de src/components/marcaKi.ts: si cambia el logo, vuelve a correr
 *   node scripts/correo/generar-marca-ki.mjs
 */
import { chromium } from 'playwright'
import { KI_RESTO, KI_TALLO, KI_VISTA } from '../../src/components/marcaKi.ts'

const TEXTO = '#0a0a0c'
const AZUL_CIELO = '#0478fb'
const [, , ancho, alto] = KI_VISTA.split(' ').map(Number)
// El logo se muestra a unos 34 px de ancho en el correo; 140 px se ve nítido en pantallas densas.
const ANCHO_PNG = 140
const escala = ANCHO_PNG / ancho

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${KI_VISTA}" width="${ANCHO_PNG}" height="${Math.round(alto * escala)}"><path fill="${TEXTO}" d="${KI_TALLO}"/><path fill="${AZUL_CIELO}" d="${KI_RESTO}"/></svg>`

const navegador = await chromium.launch({ args: ['--disable-gpu'] })
const pagina = await navegador.newPage({ viewport: { width: ANCHO_PNG, height: Math.round(alto * escala) } })
await pagina.setContent(`<body style="margin:0;background:transparent">${svg}</body>`)
await pagina.screenshot({ path: 'public/correo/marca-ki.png', omitBackground: true, timeout: 60000 })
await navegador.close()
console.log('Listo: public/correo/marca-ki.png')
