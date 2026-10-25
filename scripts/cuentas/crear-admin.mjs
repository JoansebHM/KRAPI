/**
 * Crea una cuenta de admin activa, o nombra admin (y activa) una cuenta que ya existe.
 * Sirve para el primer admin, que no tiene a nadie que lo apruebe.
 *
 * Uso:  npm run usuario:admin             (pregunta el nombre de usuario)
 *       npm run usuario:admin -- ana.gomez
 */
import { actualizarPerfil, admin, buscarPerfil, correoInterno, fallar, mensajeDe, pedirClaveNueva, pedirUsuario, preguntar } from './comun.mjs'

const usuario = await pedirUsuario()
let perfil = await buscarPerfil(usuario)

if (perfil) {
  console.log(`La cuenta ${usuario} (${perfil.nombre}) ya existe: se nombrará admin y quedará activa.`)
} else {
  const nombre = await preguntar('Nombre (como lo conoce el equipo): ')
  if (!nombre) fallar('Escribe un nombre.')
  const password = await pedirClaveNueva(usuario)
  const creado = await admin('/users', 'POST', {
    email: correoInterno(usuario),
    password,
    email_confirm: true,
    // El trigger crear_perfil toma el nombre de aquí.
    user_metadata: { nombre },
  })
  if (!creado.ok) fallar(`No se pudo crear la cuenta (HTTP ${creado.status}): ${mensajeDe(creado.data)}`)
  perfil = await buscarPerfil(usuario)
  if (!perfil) fallar('La cuenta se creó pero no tiene perfil. Revisa que estén aplicadas las migraciones (npm run db:push).')
}

const actualizado = await actualizarPerfil(perfil.id, {
  rol: 'admin',
  estado: 'activo',
  aprobado_en: perfil.aprobado_en ?? new Date().toISOString(),
})
console.log(`Listo: ${actualizado.usuario} es admin y su cuenta está activa. Ya puede entrar a KIRA.`)
