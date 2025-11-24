-- 1. Corregir claves foráneas para permitir borrado en cascada (Esto arregla el error en el Dashboard)

-- public.users -> auth.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- public.bets -> auth.users (Solo si existe la columna user_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bets' AND column_name = 'user_id') THEN
        ALTER TABLE public.bets DROP CONSTRAINT IF EXISTS bets_user_id_fkey;
        -- Limpiar apuestas huérfanas
        DELETE FROM public.bets WHERE user_id NOT IN (SELECT id FROM auth.users);
        ALTER TABLE public.bets ADD CONSTRAINT bets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- public.taquilla_sales -> auth.users (Solo si existe la tabla)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taquilla_sales') THEN
        ALTER TABLE public.taquilla_sales DROP CONSTRAINT IF EXISTS taquilla_sales_created_by_fkey;
        -- Limpiar ventas huérfanas
        DELETE FROM public.taquilla_sales WHERE created_by NOT IN (SELECT id FROM auth.users);
        ALTER TABLE public.taquilla_sales ADD CONSTRAINT taquilla_sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- public.user_roles -> public.users
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- public.taquillas -> public.users (activated_by)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'taquillas') THEN
        ALTER TABLE public.taquillas DROP CONSTRAINT IF EXISTS taquillas_activated_by_fkey;
        -- Limpiar referencias rotas antes de aplicar la restricción
        UPDATE public.taquillas SET activated_by = NULL WHERE activated_by NOT IN (SELECT id FROM public.users);
        ALTER TABLE public.taquillas ADD CONSTRAINT taquillas_activated_by_fkey FOREIGN KEY (activated_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- public.api_keys -> public.users (created_by)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_created_by_fkey;
        -- Eliminar API Keys huérfanas (cuyo creador ya no existe)
        DELETE FROM public.api_keys WHERE created_by NOT IN (SELECT id FROM public.users);
        ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- public.transfers -> public.users (created_by)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfers') THEN
        ALTER TABLE public.transfers DROP CONSTRAINT IF EXISTS transfers_created_by_fkey;
        -- Desvincular transferencias de usuarios inexistentes
        UPDATE public.transfers SET created_by = NULL WHERE created_by NOT IN (SELECT id FROM public.users);
        ALTER TABLE public.transfers ADD CONSTRAINT transfers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- public.withdrawals -> public.users (created_by)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
        ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_created_by_fkey;
        -- Desvincular retiros de usuarios inexistentes
        UPDATE public.withdrawals SET created_by = NULL WHERE created_by NOT IN (SELECT id FROM public.users);
        ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
END $$;


-- 2. Re-crear la función de borrado seguro para la App

create or replace function public.delete_user_completely(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verificar permisos (Admin o Superadmin)
  if not exists (
    select 1 from public.users 
    where id = auth.uid() 
    and (role_ids @> '["admin"]'::jsonb or role_ids @> '["superadmin"]'::jsonb)
  ) then
    raise exception 'Permiso denegado: Solo administradores pueden eliminar usuarios';
  end if;

  -- El borrado en cascada configurado arriba se encargará de limpiar las tablas relacionadas
  -- Solo necesitamos borrar de auth.users y el resto se borrará solo.
  delete from auth.users where id = target_user_id;
  
  -- Si por alguna razón el cascada falla o no borra public.users explícitamente:
  delete from public.users where id = target_user_id;
end;
$$;

-- Otorgar permisos
grant execute on function public.delete_user_completely to authenticated;
grant execute on function public.delete_user_completely to service_role;
