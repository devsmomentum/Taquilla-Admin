-- Función para confirmar usuarios automáticamente y asegurar sincronización
-- Ejecuta esto en el Editor SQL de Supabase

create or replace function confirm_user_and_sync(
  user_email text,
  user_name text,
  user_password_hash text, -- Opcional, solo para public.users
  is_active boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  -- 1. Buscar el usuario en auth.users por email
  select id into target_user_id
  from auth.users
  where email = lower(trim(user_email));

  if target_user_id is null then
    raise exception 'Usuario no encontrado en Auth. Asegúrate de haber llamado a signUp primero.';
  end if;

  -- 2. Confirmar el email automáticamente (para que pueda hacer login)
  update auth.users
  set email_confirmed_at = now(),
      updated_at = now()
  where id = target_user_id;

  -- 3. Asegurar que existe en public.users
  -- (Usamos ON CONFLICT para actualizar si ya existe)
  insert into public.users (id, name, email, password_hash, is_active, created_at, updated_at)
  values (
    target_user_id,
    user_name,
    lower(trim(user_email)),
    user_password_hash,
    is_active,
    now(),
    now()
  )
  on conflict (id) do update
  set name = excluded.name,
      is_active = excluded.is_active,
      updated_at = now();

end;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION confirm_user_and_sync TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_user_and_sync TO service_role;
GRANT EXECUTE ON FUNCTION confirm_user_and_sync TO anon;
