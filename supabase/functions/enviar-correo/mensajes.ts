/**
 * Los textos de cada aviso por correo (decisión 0035). El diseño está en `plantilla.ts`.
 * Son funciones puras, sin nada de Deno, para poder probarlas y previsualizarlas.
 */
import type { Correo } from './plantilla.ts'

export const EVENTOS = ['registro_pendiente', 'registro_recibido', 'cuenta_aprobada', 'cuenta_rechazada'] as const
export type Evento = (typeof EVENTOS)[number]

/** Estado que debe tener la cuenta para que el evento tenga sentido. */
export const ESTADO_ESPERADO: Record<Evento, string> = {
  registro_pendiente: 'pendiente',
  registro_recibido: 'pendiente',
  cuenta_aprobada: 'activo',
  cuenta_rechazada: 'rechazado',
}

export interface Mensaje {
  asunto: string
  correo: Correo
}

const MOTIVO_ADMIN = 'Recibes este correo porque eres admin de KIRA y guardaste tu correo en Mi perfil. Puedes quitarlo ahí cuando quieras.'
const MOTIVO_PERSONA = 'Recibes este correo porque esta dirección se escribió al crear una cuenta en KIRA. Si no fuiste tú, ignóralo.'

export function armarMensaje(evento: Evento, perfil: { nombre: string; usuario: string }, urlApp: string | undefined): Mensaje {
  const base = urlApp?.replace(/\/$/, '')
  const datosCuenta = [
    { nombre: 'Nombre', valor: perfil.nombre },
    { nombre: 'Nombre de usuario', valor: perfil.usuario },
  ]

  switch (evento) {
    case 'registro_pendiente':
      return {
        asunto: 'Nueva solicitud para unirse a KIRA',
        correo: {
          resumen: `${perfil.nombre} espera que apruebes su cuenta.`,
          etiqueta: 'Nueva solicitud',
          tono: 'info',
          titulo: 'Alguien quiere unirse a KIRA',
          parrafos: ['Una persona creó una cuenta y espera que un admin la apruebe.'],
          datos: datosCuenta,
          accion: base ? { texto: 'Revisar la solicitud', enlace: `${base}/usuarios` } : undefined,
          motivo: MOTIVO_ADMIN,
        },
      }
    case 'registro_recibido':
      return {
        asunto: 'Recibimos tu solicitud para unirte a KIRA',
        correo: {
          resumen: 'Un admin del equipo la revisará y te avisaremos por aquí.',
          etiqueta: 'Solicitud recibida',
          tono: 'info',
          titulo: 'Recibimos tu solicitud',
          parrafos: [
            `Hola ${perfil.nombre}, creamos tu cuenta de KIRA. Un admin del equipo debe aprobarla antes de que puedas entrar.`,
            'No tienes que hacer nada más: te avisaremos por este correo apenas la revisen.',
          ],
          datos: [{ nombre: 'Tu nombre de usuario', valor: perfil.usuario }],
          motivo: MOTIVO_PERSONA,
        },
      }
    case 'cuenta_aprobada':
      return {
        asunto: 'Tu cuenta de KIRA fue aprobada',
        correo: {
          resumen: 'Ya puedes entrar con tu nombre de usuario y tu contraseña.',
          etiqueta: 'Cuenta aprobada',
          tono: 'destacado',
          titulo: 'Ya puedes entrar a KIRA',
          parrafos: [`Hola ${perfil.nombre}, un admin aprobó tu cuenta. Entra con tu nombre de usuario y la contraseña que elegiste.`],
          datos: [{ nombre: 'Tu nombre de usuario', valor: perfil.usuario }],
          accion: base ? { texto: 'Abrir KIRA', enlace: base } : undefined,
          motivo: MOTIVO_PERSONA,
        },
      }
    case 'cuenta_rechazada':
      return {
        asunto: 'Tu solicitud para unirte a KIRA no fue aprobada',
        correo: {
          resumen: 'Si crees que es un error, habla con el equipo de Kratos.',
          etiqueta: 'Solicitud no aprobada',
          tono: 'neutro',
          titulo: 'Tu solicitud no fue aprobada',
          parrafos: [
            `Hola ${perfil.nombre}, un admin del equipo no aprobó tu cuenta de KIRA.`,
            'Si crees que es un error, habla con alguien del equipo de Kratos.',
          ],
          motivo: MOTIVO_PERSONA,
        },
      }
  }
}

