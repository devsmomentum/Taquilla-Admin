-- Tabla de Taquillas
create table if not exists public.taquillas (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  address text not null,
  telefono text, -- telefono (opcional inicialmente)
  email text not null,
  username text,
  password_hash text,
  is_active boolean not null default false, -- UI: muestra "Activo" / "Inactivo"
  activated_by uuid references public.users(id), -- antes approved_by
  activated_at timestamptz, -- antes approved_at
  created_at timestamptz not null default now()
);

-- Índices útiles
create index if not exists taquillas_email_idx on public.taquillas (email);
create index if not exists taquillas_username_idx on public.taquillas (username);
-- Índice de teléfono (renombrado de phone)
create index if not exists taquillas_telefono_idx on public.taquillas (telefono);

alter table public.taquillas enable row level security;

create policy if not exists taquillas_read on public.taquillas
for select using (true);

-- Solo admin o sistema deben poder insertar/activar en producción.
-- Para desarrollo, permitimos insertar para simplificar.
create policy if not exists taquillas_insert on public.taquillas
for insert with check (true);

create policy if not exists taquillas_update on public.taquillas
for update using (true) with check (true);

do $$ begin
  perform 1 from information_schema.columns where table_schema='public' and table_name='taquillas' and column_name='username' and is_nullable='NO';
  if found then
    execute 'alter table public.taquillas alter column username drop not null';
  end if;
end $$;

-- Adaptaciones para instalaciones existentes (renombrar columnas y agregar telefono si falta)
do $$
declare
  col_exists boolean;
begin
  -- Renombrar is_approved -> is_active
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='taquillas' and column_name='is_approved'
  ) into col_exists;
  if col_exists then
    execute 'alter table public.taquillas rename column is_approved to is_active';
  end if;

  -- Renombrar approved_by -> activated_by
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='taquillas' and column_name='approved_by'
  ) into col_exists;
  if col_exists then
    execute 'alter table public.taquillas rename column approved_by to activated_by';
  end if;

  -- Renombrar approved_at -> activated_at
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='taquillas' and column_name='approved_at'
  ) into col_exists;
  if col_exists then
    execute 'alter table public.taquillas rename column approved_at to activated_at';
  end if;

  -- Renombrar phone -> telefono si existe phone y no existe telefono
  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='taquillas' and column_name='telefono'
  ) into col_exists;
  if not col_exists then
    select exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='taquillas' and column_name='phone'
    ) into col_exists;
    if col_exists then
      execute 'alter table public.taquillas rename column phone to telefono';
    else
      execute 'alter table public.taquillas add column telefono text';
    end if;
  end if;
  -- Ajustar índice si existe el viejo índice
  select exists (
    select 1 from pg_indexes where schemaname='public' and indexname='taquillas_phone_idx'
  ) into col_exists;
  if col_exists then
    begin
      execute 'drop index if exists public.taquillas_phone_idx';
    exception when undefined_object then
      null;
    end;
  end if;
  -- Crear nuevo índice si falta
  select exists (
    select 1 from pg_indexes where schemaname='public' and indexname='taquillas_telefono_idx'
  ) into col_exists;
  if not col_exists then
    execute 'create index taquillas_telefono_idx on public.taquillas (telefono)';
  end if;
end $$;
