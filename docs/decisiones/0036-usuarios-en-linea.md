# 0036 · Usuarios en línea con presencia de Realtime

**Estado:** aceptada · 2026-11 · Refs #161

## Contexto

Nadie sabía quién más estaba usando KIRA en un momento dado: a quién preguntarle algo, si alguien más estaba registrando en la misma zona o si un admin estaba conectado. Hace falta mostrarlo, como los colaboradores de un documento compartido.

## Decisión

- **Presencia de Supabase Realtime**, no una columna de "visto por última vez". Cada app abierta se anuncia en un canal y todas ven quién está. No escribe en las tablas, no necesita migración de datos y quien cierra la app o pierde la conexión desaparece solo.
- **Canal privado `presencia`**, protegido con RLS sobre `realtime.messages` (migración `20261108130000_presencia`): solo una cuenta **activa** puede unirse al canal, ver quién está y anunciarse. Las políticas se limitan al tópico `presencia` y a la extensión `presence`, así no abren ningún otro canal.
- **La clave de presencia es el id de la cuenta**, así que varias pestañas o dispositivos de la misma persona cuentan como una. El anuncio no lleva nombres: estos salen de `perfiles` (`useUsuarios()`), que ya se lee con RLS.
- **"En línea" es tener la app abierta y visible.** Si queda oculta (otra pestaña, pantalla apagada) más de un minuto, deja de figurar; al volver, reaparece. Un minuto evita que un cambio rápido de aplicación saque a alguien. La cuenta se anuncia otra vez al reconectar.
- **En la barra superior**, entre la marca y las acciones: los avatares de las **otras** cuentas en línea, montados unos sobre otros (2 en celular, 1 en menos de 360 px, 4 en computador y "+N" si hay más). Si no hay nadie más, no se muestra nada. Al tocarlos, un modal lista a todos, incluida la propia cuenta, que va primera con "Tú": avatar, nombre, usuario y rol.
- **Lo ve cualquier cuenta activa**, no solo los admins.

## Descartado

- **`perfiles.visto_en` con un latido cada minuto:** escribe en la base por cada persona conectada, exige migración, permisos y una regla de quién actualiza qué. Sirve para "activo hace 5 minutos", que no se pidió.
- **Canal público:** cualquiera con la clave pública (que está en el navegador) podría unirse y ver quién está en línea.
- **Solo un contador en el menú:** no dice quiénes son.

## Consecuencias

- **Realtime no valida la clave de presencia**: la manda cada cliente. Una cuenta activa podría anunciarse con el id de otra y aparecer en línea como ella. Es un equipo cerrado, solo pasa entre cuentas aprobadas y el único efecto es ese.
- **Mostrar quién está conectado es información sobre las personas del equipo.** Se limita a cuentas activas y conviene que el equipo lo sepa.
- **Supabase local no corre Realtime** (`npm run db:local` lo excluye): `supabase/tests/presencia.test.sql` prueba las políticas de `realtime.messages`, pero la parte en vivo solo se ve en producción. Las pruebas e2e la simulan (`e2e/soporte/realtime-falso.ts`, protocolo de Phoenix: `presence_state`, `presence_diff`, `track` y `untrack`).
- Si Realtime no responde, la lista queda vacía y el resto de la app sigue igual.
