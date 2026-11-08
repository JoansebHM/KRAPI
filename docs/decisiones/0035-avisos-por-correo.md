# 0035 · Avisos por correo con Brevo

**Estado:** aceptada · 2026-11 · Refs #159

## Contexto

Las cuentas entran con nombre de usuario y no tienen un correo real ([decisión 0021](0021-usuarios-individuales.md)). Eso dejaba dos huecos: los admins se enteraban de una cuenta nueva solo si abrían **Usuarios**, y quien se registraba esperaba en una pantalla sin saber cuándo lo aprobaban. Hacen falta avisos sencillos y gratuitos.

## Decisión

- **Un correo de contacto opcional** por cuenta. Se pide en el registro y se cambia o se quita cuando se quiera en Mi perfil. **No se verifica** por ahora, y no sirve para entrar (se sigue entrando con el nombre de usuario).
- **Vive en una tabla aparte, `contactos`**, no en `perfiles`: cualquier cuenta activa lee todos los perfiles y el correo solo debe leerlo su dueño. Se escribe únicamente con `guardar_correo()`. Los admins tampoco lo leen desde la app.
- **Cuatro correos, de dos momentos:**
  - Cuando alguien se registra y queda pendiente: a **los admins activos que tengan correo** (`registro_pendiente`) y, si puso su correo, a **la persona** (`registro_recibido`: "recibimos tu solicitud, un admin la revisará").
  - Cuando un admin decide: a **la persona**, si puso su correo, con la cuenta aprobada (`cuenta_aprobada`) o rechazada (`cuenta_rechazada`). Reactivar una cuenta desactivada no cuenta como aprobación.
- **Brevo** (plan gratuito, 300 correos al día) envía los correos, desde una **Edge Function**, `enviar-correo`. Es la segunda pieza de servidor del proyecto, con la misma justificación de la [decisión 0022](0022-edge-function-restablecer-clave.md): la clave de Brevo no puede llegar al navegador.
- **Los triggers de la base de datos la llaman con `pg_net`**, después del commit y sin esperar la respuesta. Si Brevo falla, el registro o la aprobación no se bloquean. La dirección de la función y el secreto van en **Vault** (`correos_url` y `correos_secreto`); si faltan, simplemente no se avisa.
- **La función solo la puede llamar la base de datos**: no pide sesión (`verify_jwt = false`) pero exige el secreto compartido en el encabezado `x-kira-secreto`. No recibe el contenido del correo, solo `{evento, perfil_id}`, y arma el mensaje ella misma, así nadie puede usarla para mandar correos arbitrarios. Además revisa que el estado de la cuenta coincida con el evento, para que repetir una petición vieja no mande avisos falsos.
- **Una plantilla en HTML en el repositorio** (`supabase/functions/enviar-correo/plantilla.ts`), con los colores de KIRA: cabecera con la marca igual que la de la app (las letras KI del logo de Kratos Innovation Team, "RA" en texto y "powered by KIT"), etiqueta del tipo de aviso, título, tarjeta con los datos, botón y un pie que explica por qué llega el correo. Usa tablas, estilos en línea y fuentes del sistema. El logo es una única imagen (`public/correo/marca-ki.png`, generada con `scripts/correo/generar-marca-ki.mjs`) servida por la app con `KIRA_URL`, porque los clientes de correo no entienden SVG; si falta o se bloquea, "KI" sale como texto azul. Los textos están aparte, en `mensajes.ts`, y siempre se manda también una versión en texto plano.
- **Un correo por destinatario**, para que los admins no vean las direcciones de los demás. Los nombres se escapan en el HTML.
- **Tope contra abusos:** si llegan más de 10 registros en una hora, el trigger deja de avisar, y el tope cubre también el aviso a quien se registró. El registro está abierto: sin tope un abuso llenaría los correos de los admins, gastaría el cupo de Brevo.

## Descartado

- **Columna `perfiles.correo`:** la leería cualquier cuenta activa.
- **Llamar a la Edge Function desde el navegador:** exigiría confiar en lo que mande la app y darle una forma de enviar correos a quien quiera.
- **Resend:** el plan gratuito solo envía a cualquiera con un dominio propio verificado, que el equipo no tiene.
- **Verificar el correo:** agrega pantallas y un flujo de confirmación; para un equipo pequeño con aprobación de un admin basta con avisarlo.
- **Más avisos** (salidas asignadas, contraseña restablecida, estudios): quedan para después, ahora que la pieza de envío existe.

## Consecuencias

- **Sin verificación**, alguien podría escribir el correo de otra persona y esa persona recibiría avisos que no pidió. Con un equipo cerrado y cuentas aprobadas a mano, el riesgo es bajo.
- **Los admins solo reciben el aviso si pusieron su propio correo** en Mi perfil.
- El remitente es una dirección verificada en Brevo, no un dominio propio. Si es de un dominio con políticas estrictas (como uno institucional), algunos correos pueden caer en spam o rechazarse; basta cambiar el secreto `BREVO_REMITENTE_CORREO`.
- La configuración es de despliegue y no está en el repositorio: secretos de Supabase (`BREVO_API_KEY`, `BREVO_REMITENTE_CORREO`, `BREVO_REMITENTE_NOMBRE`, `CORREOS_SECRETO` y opcional `KIRA_URL`) y los dos valores de Vault. Los pasos están en el [README](../../README.md#avisos-por-correo).
- Las pruebas e2e simulan `contactos` y `guardar_correo()`. Los triggers y la seguridad se prueban con pgTAP (`supabase/tests/correos.test.sql`), y la función se probó contra Supabase local; el envío real con Brevo se comprueba a mano.
