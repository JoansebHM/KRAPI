-- =============================================================================
-- Aviso de "recibimos tu solicitud" a quien se registra (#159, decisión 0035)
--
-- Además del aviso a los admins, quien se registró con correo recibe uno que le confirma que su
-- solicitud llegó y que un admin la revisará. Reemplaza avisar_registro_nuevo() de la migración
-- 20261107230101_correos: sigue el mismo tope de 10 registros por hora, que ahora protege también
-- este aviso (el registro es abierto, y sin tope alguien podría usarlo para mandar correos a
-- direcciones ajenas).
-- =============================================================================

create or replace function public.avisar_registro_nuevo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado = 'pendiente'
     and (select count(*) from public.perfiles where created_at > now() - interval '1 hour') <= 10 then
    perform public.avisar_por_correo('registro_pendiente', new.id);
    perform public.avisar_por_correo('registro_recibido', new.id);
  end if;
  return new;
end;
$$;
