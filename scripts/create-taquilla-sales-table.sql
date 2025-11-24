-- Tabla para registrar ventas manuales de taquillas
create table if not exists public.taquilla_sales (
  id uuid primary key default gen_random_uuid(),
  taquilla_id uuid references public.taquillas(id) on delete cascade,
  amount numeric not null check (amount >= 0),
  sale_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- Índices
create index if not exists taquilla_sales_taquilla_id_idx on public.taquilla_sales(taquilla_id);
create index if not exists taquilla_sales_date_idx on public.taquilla_sales(sale_date);

-- RLS
alter table public.taquilla_sales enable row level security;

create policy "Enable read access for all users" on public.taquilla_sales
  for select using (true);

create policy "Enable insert for authenticated users" on public.taquilla_sales
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users" on public.taquilla_sales
  for update using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users" on public.taquilla_sales
  for delete using (auth.role() = 'authenticated');
