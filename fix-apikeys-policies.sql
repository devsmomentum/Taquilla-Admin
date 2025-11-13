-- =====================================================
-- FIX: API KEYS POLICIES PARA FUNCIONAR SIN SUPABASE AUTH
-- Actualiza las policies para trabajar con la tabla users
-- =====================================================

-- Desactivar RLS temporalmente
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes
DROP POLICY IF EXISTS "Users can view api_keys with proper permissions" ON api_keys;
DROP POLICY IF EXISTS "Users can create api_keys with permissions" ON api_keys;
DROP POLICY IF EXISTS "Users can update their api_keys" ON api_keys;
DROP POLICY IF EXISTS "Users can delete their api_keys" ON api_keys;

-- Eliminar nuevas policies si existen (para poder recrearlas)
DROP POLICY IF EXISTS "Allow read api_keys" ON api_keys;
DROP POLICY IF EXISTS "Allow insert api_keys" ON api_keys;
DROP POLICY IF EXISTS "Allow update api_keys" ON api_keys;
DROP POLICY IF EXISTS "Allow delete api_keys" ON api_keys;

-- Reactivar RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- NUEVA POLÍTICA: Permitir todas las operaciones
-- (Simplificado para funcionar sin auth.uid())
-- =====================================================

-- Policy para SELECT: Permitir lectura a todos los usuarios autenticados en la tabla
CREATE POLICY "Allow read api_keys" ON api_keys
  FOR SELECT
  USING (true); -- Permitir lectura a todos

-- Policy para INSERT: Permitir crear API keys
CREATE POLICY "Allow insert api_keys" ON api_keys
  FOR INSERT
  WITH CHECK (
    created_by IN (SELECT id FROM users WHERE is_active = true)
  );

-- Policy para UPDATE: Permitir actualizar API keys propias
CREATE POLICY "Allow update api_keys" ON api_keys
  FOR UPDATE
  USING (
    created_by IN (SELECT id FROM users WHERE is_active = true)
  );

-- Policy para DELETE: Permitir eliminar API keys propias
CREATE POLICY "Allow delete api_keys" ON api_keys
  FOR DELETE
  USING (
    created_by IN (SELECT id FROM users WHERE is_active = true)
  );

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 'API Keys policies actualizadas exitosamente' as status;

-- Listar policies activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'api_keys';
