-- ============================================
-- SOFT DELETE PARA USUARIOS
-- Marca usuarios como eliminados sin borrarlos realmente
-- ============================================

-- 1. Agregar columna deleted_at a la tabla users
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índice para búsquedas de usuarios activos
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) 
WHERE deleted_at IS NULL;

-- 2. Vista de usuarios activos (no eliminados)
-- ============================================
CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users 
WHERE deleted_at IS NULL;

-- 3. Vista de usuarios con roles (solo activos)
-- ============================================
CREATE OR REPLACE VIEW users_with_roles AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.is_active,
  u.created_at,
  u.created_by,
  u.updated_at,
  u.deleted_at,
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', r.id,
          'name', r.name,
          'description', r.description,
          'permissions', r.permissions,
          'is_system', r.is_system
        )
      )
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = u.id
    ),
    '[]'::json
  ) as roles,
  COALESCE(
    (
      SELECT array_agg(DISTINCT p)
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      CROSS JOIN unnest(r.permissions) as p
      WHERE ur.user_id = u.id
    ),
    ARRAY[]::text[]
  ) as all_permissions
FROM users u
WHERE u.deleted_at IS NULL; -- Solo usuarios no eliminados

-- 4. Función para "eliminar" usuario (soft delete)
-- ============================================
CREATE OR REPLACE FUNCTION soft_delete_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Marcar usuario como eliminado
  UPDATE users 
  SET 
    deleted_at = NOW(),
    is_active = false,
    updated_at = NOW()
  WHERE id = target_user_id
  AND deleted_at IS NULL; -- Solo si no está ya eliminado
  
  IF NOT FOUND THEN
    result := json_build_object(
      'success', false,
      'error', 'Usuario no encontrado o ya eliminado'
    );
    RETURN result;
  END IF;
  
  -- Desvincular de entidades de negocio (opcional)
  UPDATE taquillas SET user_id = NULL WHERE user_id = target_user_id;
  UPDATE agencias SET user_id = NULL WHERE user_id = target_user_id;
  UPDATE comercializadoras SET user_id = NULL WHERE user_id = target_user_id;
  
  -- Desactivar API keys del usuario
  UPDATE api_keys SET is_active = false WHERE created_by = target_user_id;
  
  result := json_build_object(
    'success', true,
    'message', 'Usuario marcado como eliminado',
    'deleted_at', NOW()
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

-- 5. Función para restaurar usuario
-- ============================================
CREATE OR REPLACE FUNCTION restore_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Restaurar usuario
  UPDATE users 
  SET 
    deleted_at = NULL,
    is_active = true,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    result := json_build_object(
      'success', false,
      'error', 'Usuario no encontrado'
    );
    RETURN result;
  END IF;
  
  result := json_build_object(
    'success', true,
    'message', 'Usuario restaurado exitosamente'
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

-- 6. Función para hard delete (eliminar permanentemente)
-- ============================================
-- Solo debe usarse por el super admin para limpieza
CREATE OR REPLACE FUNCTION hard_delete_user(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Primero verificar que esté marcado como eliminado
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id AND deleted_at IS NOT NULL) THEN
    result := json_build_object(
      'success', false,
      'error', 'Solo se pueden eliminar permanentemente usuarios ya marcados como eliminados'
    );
    RETURN result;
  END IF;
  
  -- Limpiar dependencias
  DELETE FROM user_roles WHERE user_id = target_user_id;
  DELETE FROM bets WHERE user_id = target_user_id;
  DELETE FROM api_keys WHERE created_by = target_user_id;
  UPDATE taquillas SET activated_by = NULL WHERE activated_by = target_user_id;
  UPDATE transfers SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE withdrawals SET created_by = NULL WHERE created_by = target_user_id;
  
  -- Eliminar de public.users
  DELETE FROM users WHERE id = target_user_id;
  
  result := json_build_object(
    'success', true,
    'message', 'Usuario eliminado permanentemente'
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

-- 7. Trigger para deshabilitar login de usuarios eliminados
-- ============================================
-- Cuando se marca como eliminado, desactivar en auth
CREATE OR REPLACE FUNCTION disable_auth_on_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    -- Usuario acaba de ser marcado como eliminado
    -- Intentar deshabilitar en auth (puede fallar si no hay permisos)
    BEGIN
      UPDATE auth.users 
      SET banned_until = '2099-12-31'::timestamptz 
      WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      -- Ignorar si falla (no tenemos permisos)
      RAISE NOTICE 'No se pudo deshabilitar en auth.users: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_soft_deleted ON users;
CREATE TRIGGER on_user_soft_deleted
  AFTER UPDATE OF deleted_at ON users
  FOR EACH ROW
  EXECUTE FUNCTION disable_auth_on_soft_delete();

-- 8. RLS Policy para ocultar usuarios eliminados
-- ============================================
-- Los usuarios eliminados no aparecen en queries normales
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_not_deleted ON users;
CREATE POLICY users_not_deleted ON users
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Permitir ver eliminados solo a super admins
DROP POLICY IF EXISTS admins_see_deleted ON users;
CREATE POLICY admins_see_deleted ON users
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.permissions @> ARRAY['*']
    )
  );

-- 9. Dar permisos
-- ============================================
GRANT EXECUTE ON FUNCTION soft_delete_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION hard_delete_user(UUID) TO authenticated;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================
COMMENT ON COLUMN users.deleted_at IS 'Timestamp cuando el usuario fue marcado como eliminado (soft delete)';
COMMENT ON FUNCTION soft_delete_user IS 'Marca usuario como eliminado sin borrarlo (soft delete)';
COMMENT ON FUNCTION restore_user IS 'Restaura un usuario marcado como eliminado';
COMMENT ON FUNCTION hard_delete_user IS 'Elimina permanentemente un usuario (solo si ya está marcado como eliminado)';

-- ============================================
-- VERIFICAR INSTALACIÓN
-- ============================================
SELECT 
  routine_name,
  routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('soft_delete_user', 'restore_user', 'hard_delete_user');

-- Debería retornar 3 funciones ✓
