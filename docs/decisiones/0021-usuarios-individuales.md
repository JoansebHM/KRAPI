# 0021 · Usuarios individuales con aprobación de un admin

**Estado:** aceptada · 2026-10 · Refs #68 · Reemplaza a la [0007](0007-usuario-compartido-y-sesion.md)

## Contexto

Hasta ahora todo el equipo entraba con un usuario compartido ([decisión 0007](0007-usuario-compartido-y-sesion.md)). KIRA se va a volver la herramienta común del equipo y hace falta saber **quién hizo cada cosa**, poder dar y quitar el acceso a una persona sin cambiarle la contraseña a todos, y reservar algunas acciones (borrar catálogos, administrar cuentas) a quien coordina.

## Decisión

**Una cuenta por integrante.** Cada quien se registra desde la app y su cuenta queda **pendiente** hasta que un admin la apruebe.

- **Sin correos.** Para registrarse basta con **nombre**, **nombre de usuario** y **contraseña** (mínimo 10 caracteres). El nombre de usuario:
  - es único sin distinguir mayúsculas y la app lo guarda en minúsculas;
  - tiene de 3 a 30 caracteres: letras minúsculas sin tildes, números, `.`, `_` y `-`;
  - no cambia después de creado (el nombre visible sí).

  Supabase Auth exige un correo, así que la app convierte el nombre de usuario en un **correo interno** (`ana.gomez@usuarios.kira.invalid`). Nadie lo ve y nunca recibe nada, porque la confirmación de correo está desactivada. El dominio `.invalid` está reservado y no existe.
- **Estados de una cuenta:** `pendiente` (recién registrada), `activo`, `rechazado` y `desactivado`. Solo `activo` tiene acceso a los datos.
- **Roles:** `miembro` y `admin`. Puede haber varios admins y un admin puede nombrar a otros.
- ~~**Usuarios y responsables son cosas distintas.**~~ Reemplazado por la [0023](0023-participantes-son-cuentas.md): los participantes de un estudio son cuentas.
- **Trazabilidad:** cada registro guarda quién lo creó y quién lo editó por última vez (lo llena la base de datos con `auth.uid()`, no la app), y una bitácora guarda cada acción.
- **La protección vive en RLS, no en la interfaz.** El registro queda abierto en Supabase, pero una cuenta que no está activa no puede leer ni escribir nada.
- **Contraseñas olvidadas:** las restablece un admin (`npm run usuario:clave`, y más adelante desde `/usuarios`, #80).
- **La política de sesión de la 0007 se mantiene:** 2 h de inactividad, 7 días como máximo y cierre en todos los dispositivos, que ahora afecta solo a la propia cuenta.

### Permisos

| Acción | Pendiente / rechazado / desactivado | Miembro | Admin |
| --- | :-: | :-: | :-: |
| Ver mapa, lugares, estudios y evidencias | ✗ | ✓ | ✓ |
| Crear lugares, estudios y subir evidencias | ✗ | ✓ | ✓ |
| Editar y archivar lugares y estudios (de cualquiera) | ✗ | ✓ | ✓ |
| Borrar una evidencia equivocada | ✗ | Solo las suyas | ✓ |
| Borrar un lugar sin estudios | ✗ | Solo los suyos | ✓ |
| Crear y editar categorías y responsables | ✗ | ✓ | ✓ |
| Borrar categorías y responsables | ✗ | ✗ | ✓ |
| Editar su propio perfil y contraseña | ✗ | ✓ | ✓ |
| Aprobar, rechazar, desactivar y reactivar usuarios | ✗ | ✗ | ✓ |
| Nombrar o quitar admins | ✗ | ✗ | ✓ (nunca al último admin activo) |

Nadie puede cambiar su propio rol ni su propio estado, y un admin no puede desactivarse a sí mismo.

## Descartado

- **Seguir con el usuario compartido:** no deja saber quién hizo qué ni quitarle el acceso a una sola persona.
- **Código de invitación para registrarse:** hay que repartirlo y cambiarlo, y la aprobación del admin ya cumple esa función.
- **Registrarse con correo real:** sin un SMTP propio, el correo integrado de Supabase es muy limitado, y el equipo prefiere no depender de correos. Lo único que se pierde es la recuperación de contraseña por correo.

## Consecuencias

- La primera cuenta admin se crea con `npm run usuario:admin` (#79). El paso del usuario compartido a las cuentas individuales se hace en el proyecto real siguiendo #81.
- Los registros hechos antes del cambio no tienen autor y se muestran como "Cuenta compartida".
- Como `usuario_disponible()` se puede llamar sin sesión para avisar en el formulario, cualquiera puede averiguar si un nombre de usuario existe. Para un equipo interno es aceptable.
- `enable_signup = true` en el proyecto real solo puede aplicarse junto con las políticas de RLS de #71 o después. Si no, una cuenta recién registrada tendría acceso total.
