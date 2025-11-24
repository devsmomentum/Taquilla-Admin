-- Script de limpieza profunda para usuarios corruptos
-- Ejecuta esto en el Editor SQL de Supabase

-- 1. Desactivar triggers temporalmente para permitir limpieza
SET session_replication_role = 'replica';

-- 2. Limpiar identidades huérfanas o corruptas
DELETE FROM auth.identities 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'name' LIKE '%Test%' 
       OR email LIKE '%example.com%'
       OR email LIKE '%loteria.com%'
);

-- 3. Limpiar usuarios corruptos específicos (ajusta el filtro según necesites)
DELETE FROM auth.users 
WHERE raw_user_meta_data->>'name' LIKE '%Test%' 
   OR email LIKE '%example.com%'
   OR email LIKE '%loteria.com%';

-- 4. Reactivar triggers
SET session_replication_role = 'origin';

-- 5. Verificar si quedan usuarios
SELECT id, email, created_at FROM auth.users;
