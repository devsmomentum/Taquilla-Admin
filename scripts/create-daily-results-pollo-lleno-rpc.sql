-- RPC para insertar resultados de Pollo Lleno
-- Ejecutar en Supabase

create extension if not exists intarray;

create or replace function public.create_daily_result_pollo_lleno(
  p_numbers integer[],
  p_result_date date
)
returns public.daily_results_pollo_lleno
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.daily_results_pollo_lleno;
  pot_row public.pollo_lleno_pot%rowtype;
  day_start_utc timestamptz;
  day_end_utc timestamptz;
  total_pot numeric := 0;
  share5 numeric := 0;
  share6 numeric := 0;
  winners5_count int := 0;
  winners6_count int := 0;
  prize5 numeric := 0;
  prize6 numeric := 0;
  paid_total numeric := 0;
begin
  day_start_utc := make_timestamptz(
    extract(year from p_result_date)::int,
    extract(month from p_result_date)::int,
    extract(day from p_result_date)::int,
    0,
    0,
    0,
    'UTC'
  );
  day_end_utc := day_start_utc + interval '1 day';

  insert into public.daily_results_pollo_lleno (numbers, result_date)
  values (p_numbers, p_result_date)
  returning * into inserted;

  select *
    into pot_row
  from public.pollo_lleno_pot
  where created_at >= day_start_utc
    and created_at < day_end_utc
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'No existe pote para la fecha %', p_result_date;
  end if;

  total_pot := coalesce(pot_row.amount_pot, 0)
             + coalesce(pot_row.inicial_pot, 0)
             + coalesce(pot_row.admin_pot, 0);

  share5 := total_pot * 0.25;
  share6 := total_pot * 0.40;

  select count(*) into winners6_count
  from public.bets_item_pollo_lleno
  where status = 'active'
    and created_at >= day_start_utc
    and created_at < day_end_utc
    and array_length(numbers & p_numbers, 1) >= 6;

  select count(*) into winners5_count
  from public.bets_item_pollo_lleno
  where status = 'active'
    and created_at >= day_start_utc
    and created_at < day_end_utc
    and array_length(numbers & p_numbers, 1) = 5;

  if winners6_count > 0 then
    prize6 := share6 / winners6_count;

    update public.bets_item_pollo_lleno
       set status = 'winner',
           prize = prize6,
           description_prize = 6,
           updated_at = now()
     where status = 'active'
       and created_at >= day_start_utc
       and created_at < day_end_utc
       and array_length(numbers & p_numbers, 1) >= 6;
  end if;

  if winners5_count > 0 then
    prize5 := share5 / winners5_count;

    update public.bets_item_pollo_lleno
       set status = 'winner',
           prize = prize5,
           description_prize = 5,
           updated_at = now()
     where status = 'active'
       and created_at >= day_start_utc
       and created_at < day_end_utc
       and array_length(numbers & p_numbers, 1) = 5;
  end if;

  paid_total := (case when winners6_count > 0 then share6 else 0 end)
              + (case when winners5_count > 0 then share5 else 0 end);

  if paid_total > 0 then
    update public.pollo_lleno_pot
       set amount_to_pay = paid_total
     where id = pot_row.id;
  end if;

  return inserted;
end;
$$;

grant execute on function public.create_daily_result_pollo_lleno(integer[], date) to anon, authenticated;
