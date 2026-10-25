/**
 * Pone una contraseña nueva a una cuenta, para cuando alguien la olvida (las cuentas no tienen correo).
 *
 * Uso:  npm run usuario:clave             (pregunta el nombre de usuario)
 *       npm run usuario:clave -- ana.gomez
 */
import { admin, buscarPerfil, fallar, mensajeDe, pedirClaveNueva, pedirUsuario } from './comun.mjs'

const usuario = await pedirUsuario()
const perfil = await buscarPerfil(usuario)
if (!perfil) fallar(`No hay ninguna cuenta con el nombre de usuario ${usuario}.`)

const password = await pedirClaveNueva(`${usuario} (${perfil.nombre})`)
const actualizado = await admin(`/users/${perfil.id}`, 'PUT', { password })
if (!actualizado.ok) fallar(`No se pudo cambiar la contraseña (HTTP ${actualizado.status}): ${mensajeDe(actualizado.data)}`)

console.log(`Listo: ${usuario} ya puede entrar con la contraseña nueva. Pásasela por un medio seguro y pídele que la cambie en Mi perfil.`)
