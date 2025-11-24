-- Función para eliminar usuarios completamente (Auth + Public)
create or replace function public.delete_user_completely(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Verificar que el usuario que ejecuta la acción es admin
  if not exists (
    select 1 from public.users 
    where id = auth.uid() 
    and (role_ids @> '["admin"]'::jsonb or role_ids @> '["superadmin"]'::jsonb)
  ) then
    raise exception 'Permiso denegado: Solo administradores pueden eliminar usuarios';
  end if;

  -- 2. Eliminar de tablas dependientes (limpieza)
  delete from public.user_roles where user_id = target_user_id;
  delete from public.bets where user_id = target_user_id;
  delete from public.taquilla_sales where created_by = target_user_id;
  
  -- 3. Eliminar de public.users
  delete from public.users where id = target_user_id;

  -- 4. Eliminar de auth.users (El usuario real de Supabase)
  delete from auth.users where id = target_user_id;
end;
$$;

-- Otorgar permisos de ejecución
grant execute on function public.delete_user_completely to authenticated;
grant execute on function public.delete_user_completely to service_role;
