-- =============================================================================
-- Presencia: quién está en línea (#161, decisión 0036)
--
-- La app muestra en la barra superior las cuentas que tienen KIRA abierta, con la presencia de
-- Supabase Realtime: no se guarda nada en las tablas, y quien cierra la app desaparece solo.
--
-- El canal es privado (`presencia`), así que Realtime consulta `realtime.messages` con las
-- políticas RLS de abajo: solo una cuenta activa puede unirse al canal, ver quién está y
-- anunciarse. Una cuenta pendiente, rechazada o desactivada no. Las políticas se limitan al
-- tópico `presencia` y a la extensión `presence`: no abren ningún otro canal.
--
-- Nota: Realtime no valida la clave de presencia (el id de la cuenta), la manda cada cliente.
-- Una cuenta activa podría aparecer en línea como otra; es un equipo cerrado y el único
-- efecto es ese (decisión 0036).
-- =============================================================================

create policy "Presencia: las cuentas activas ven quién está en línea" on realtime.messages
  for select to authenticated
  using (
    (select public.es_miembro_activo())
    and realtime.messages.extension = 'presence'
    and (select realtime.topic()) = 'presencia'
  );

create policy "Presencia: las cuentas activas se anuncian en línea" on realtime.messages
  for insert to authenticated
  with check (
    (select public.es_miembro_activo())
    and realtime.messages.extension = 'presence'
    and (select realtime.topic()) = 'presencia'
  );
