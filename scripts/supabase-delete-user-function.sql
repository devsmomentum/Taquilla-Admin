-- ============================================
-- FUNCIÓN PARA ELIMINAR USUARIOS COMPLETAMENTE
-- Elimina usuario de auth.users Y public.users
-- ============================================

-- NOTA IMPORTANTE: Esta función requiere la extensión pg_net para eliminar de auth
-- Si no puedes usar pg_net, necesitarás usar el Admin API desde el servidor

-- Opción 1: Función usando Admin API (recomendado)
-- ============================================
-- Esta función debe ejecutarse desde el servidor con privilegios de servicio

CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  -- 1. Eliminar relaciones de user_roles
  DELETE FROM user_roles WHERE user_id = target_user_id;
  
  -- 2. Limpiar dependencias
  DELETE FROM bets WHERE user_id = target_user_id;
  DELETE FROM taquilla_sales WHERE created_by = target_user_id;
  DELETE FROM api_keys WHERE created_by = target_user_id;
  UPDATE taquillas SET activated_by = NULL WHERE activated_by = target_user_id;
  UPDATE taquillas SET user_id = NULL WHERE user_id = target_user_id;
  UPDATE agencias SET user_id = NULL WHERE user_id = target_user_id;
  UPDATE comercializadoras SET user_id = NULL WHERE user_id = target_user_id;
  UPDATE transfers SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE withdrawals SET created_by = NULL WHERE created_by = target_user_id;
  
  -- 3. Eliminar de public.users
  DELETE FROM users WHERE id = target_user_id;
  
  -- 4. IMPORTANTE: Eliminar de auth.users
  -- ESTO SOLO FUNCIONA SI SE EJECUTA CON PRIVILEGIOS CORRECTOS
  DELETE FROM auth.users WHERE id = target_user_id;
  
  result := json_build_object(
    'success', true,
    'message', 'Usuario eliminado completamente de Auth y Public'
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  result := json_build_object(
    'success', false,
    'error', SQLERRM
  );
  RETURN result;
END;
$$;

-- Dar permisos a usuarios autenticados (ajusta según tus necesidades)
-- SOLO los admins deberían poder ejecutar esto
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;

-- ============================================
-- Opción 2: Trigger para CASCADE delete (más simple)
-- ============================================
-- Cuando se elimina de auth.users, elimina automáticamente de public.users

CREATE OR REPLACE FUNCTION handle_auth_user_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Limpiar todo lo relacionado al usuario
  DELETE FROM user_roles WHERE user_id = OLD.id;
  DELETE FROM bets WHERE user_id = OLD.id;
  DELETE FROM taquilla_sales WHERE created_by = OLD.id;
  DELETE FROM api_keys WHERE created_by = OLD.id;
  UPDATE taquillas SET activated_by = NULL WHERE activated_by = OLD.id;
  UPDATE taquillas SET user_id = NULL WHERE user_id = OLD.id;
  UPDATE agencias SET user_id = NULL WHERE user_id = OLD.id;
  UPDATE comercializadoras SET user_id = NULL WHERE user_id = OLD.id;
  UPDATE transfers SET created_by = NULL WHERE created_by = OLD.id;
  UPDATE withdrawals SET created_by = NULL WHERE created_by = OLD.id;
  DELETE FROM users WHERE id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Crear trigger en auth.users (SI TIENES PERMISOS)
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_deleted();

-- ============================================
-- Opción 3: Policy para permitir auto-delete
-- (No recomendado para producción)
-- ============================================

-- Permitir que Service Role borre usuarios de auth
-- ESTO DEBE HACERSE DESDE EL DASHBOARD DE SUPABASE
-- Settings > API > Service Role Key (mantener secreta)

-- ============================================
-- INSTRUCCIONES PARA USAR
-- ============================================

/*
PASO 1: Ejecutar este script en el SQL Editor de Supabase

PASO 2: Opción A - Desde el cliente (limitado):
  - Solo funciona si tienes permisos de SECURITY DEFINER
  - La función intentará borrar de auth.users pero puede fallar

PASO 2: Opción B - Usar Supabase Admin API (recomendado):
  - Necesitas el Service Role Key (NO la anon key)
  - Se hace desde el servidor Node.js, no desde el navegador
  - Es la forma oficial y segura

PASO 3: Alternativa - Borrar desde Dashboard:
  - Authentication > Users > (seleccionar usuario) > Delete User
  - Esto borra de auth.users, y el trigger limpia public.users automáticamente
*/

-- ============================================
-- VERIFICAR QUE LA FUNCIÓN EXISTE
-- ============================================

SELECT 
  routine_name,
  routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'delete_user_completely';

-- Si retorna 1 fila, la función existe ✓
