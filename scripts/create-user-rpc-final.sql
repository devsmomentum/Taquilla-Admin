-- Función CORREGIDA para crear usuarios compatibles con Supabase Auth
-- Ejecuta esto en el Editor SQL de Supabase

-- Asegurar extensiones
create extension if not exists pgcrypto schema extensions;

create or replace function create_new_user(
  email text,
  password text,
  name text,
  is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_id uuid;
  encrypted_pw text;
  clean_email text;
begin
  -- 1. Limpiar email (siempre minúsculas y sin espacios)
  clean_email := lower(trim(email));

  -- Verificar si existe
  if exists (select 1 from auth.users where auth.users.email = clean_email) then
    raise exception 'El usuario ya existe en Auth';
  end if;

  -- Generar ID
  new_id := gen_random_uuid();
  
  -- 2. Generar hash EXACTO como lo hace Supabase (Bcrypt costo 10)
  encrypted_pw := crypt(password, gen_salt('bf', 10));

  -- 3. Insertar en auth.users
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, recovery_token,
    is_sso_user
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    clean_email,
    encrypted_pw,
    now(), -- Confirmado automáticamente
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', name),
    now(),
    now(),
    '',
    '',
    false
  );

  -- 4. Insertar en auth.identities (Corregido provider_id)
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), -- ID único para la identidad
    new_id,
    jsonb_build_object('sub', new_id, 'email', clean_email, 'email_verified', true, 'phone_verified', false),
    'email',
    new_id::text, -- El provider_id para email es el User ID
    now(),
    now(),
    now()
  );

  -- 5. Insertar en public.users
  insert into public.users (
    id, name, email, password_hash, is_active, created_at, updated_at
  ) values (
    new_id,
    name,
    clean_email,
    encrypted_pw,
    is_active,
    now(),
    now()
  );

  return new_id;
end;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION create_new_user TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_user TO service_role;
GRANT EXECUTE ON FUNCTION create_new_user TO anon;
