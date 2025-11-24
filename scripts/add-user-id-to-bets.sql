
-- Agregar columna user_id a la tabla bets para rastrear quién vendió la jugada
alter table public.bets 
add column if not exists user_id uuid references auth.users(id);

-- Crear índice para búsquedas rápidas
create index if not exists bets_user_id_idx on public.bets(user_id);

-- Actualizar políticas RLS para permitir ver jugadas propias o si eres admin
drop policy if exists "bets_read_policy" on public.bets;
create policy "bets_read_policy" on public.bets
for select using (
  auth.uid() = user_id or 
  exists (
    select 1 from public.users 
    where id = auth.uid() 
    and (
      role_ids @> '["admin"]'::jsonb or 
      role_ids @> '["supervisor"]'::jsonb
    )
  )
);

-- Política para insertar (asignar user_id automáticamente)
drop policy if exists "bets_insert_policy" on public.bets;
create policy "bets_insert_policy" on public.bets
for insert with check (
  auth.uid() = user_id
);

-- Trigger para asignar user_id automáticamente si no viene
create or replace function public.set_bet_user_id()
returns trigger as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_bet_insert_set_user on public.bets;
create trigger on_bet_insert_set_user
before insert on public.bets
for each row execute procedure public.set_bet_user_id();
