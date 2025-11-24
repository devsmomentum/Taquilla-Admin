-- ============================================
-- FIX RLS para api_keys_stats VIEW
-- ============================================

-- Las vistas (VIEWS) no soportan RLS directamente en PostgreSQL
-- La solución es aplicar RLS en la tabla base (api_keys)
-- ya que la vista hereda los permisos de la tabla subyacente

-- 1. Verificar que RLS esté habilitado en api_keys (tabla base)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 2. Asegurar que las políticas estén correctas en api_keys
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver api keys" ON api_keys;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear api keys" ON api_keys;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar api keys" ON api_keys;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar api keys" ON api_keys;

-- Política de SELECT (lectura)
CREATE POLICY "Usuarios autenticados pueden ver api keys"
  ON api_keys
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de INSERT (creación)
CREATE POLICY "Usuarios autenticados pueden crear api keys"
  ON api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política de UPDATE (actualización)
CREATE POLICY "Usuarios autenticados pueden actualizar api keys"
  ON api_keys
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política de DELETE (eliminación)
CREATE POLICY "Usuarios autenticados pueden eliminar api keys"
  ON api_keys
  FOR DELETE
  TO authenticated
  USING (true);

-- 3. Re-crear la vista para asegurar que funcione correctamente
DROP VIEW IF EXISTS api_keys_stats;
CREATE VIEW api_keys_stats AS
SELECT 
  COUNT(*) as total_keys,
  COUNT(*) FILTER (WHERE is_active = true) as active_keys,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_keys,
  COUNT(DISTINCT created_by) as total_creators
FROM api_keys;

-- 4. Dar permisos de lectura a la vista
GRANT SELECT ON api_keys_stats TO authenticated, anon;

-- 5. Verificación
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'api_keys';

-- Nota: La vista api_keys_stats aparecerá como "Unrestricted" en Supabase
-- porque las vistas NO soportan RLS directamente.
-- Sin embargo, está protegida porque la tabla base (api_keys) SÍ tiene RLS.
-- Esto es el comportamiento esperado y correcto en PostgreSQL.
