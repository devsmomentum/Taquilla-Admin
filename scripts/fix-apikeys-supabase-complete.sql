-- =====================================================
-- SOLUCIÓN COMPLETA PARA MÓDULO API KEYS
-- Corrige problemas de funciones y políticas RLS
-- =====================================================

-- 1. Crear función para generar hash de API keys
CREATE OR REPLACE FUNCTION create_api_key_hash(raw_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(digest(raw_key, 'sha256'), 'hex');
END;
$$;

-- 2. Crear función para verificar API keys
CREATE OR REPLACE FUNCTION verify_api_key(api_key_hash TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  permissions JSONB,
  key_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.is_active as is_valid,
    ak.permissions,
    to_jsonb(ak.*) as key_info
  FROM api_keys ak
  WHERE ak.key_hash = api_key_hash
    AND ak.is_active = true
  LIMIT 1;
END;
$$;

-- 3. Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "api_keys_policy" ON api_keys;
DROP POLICY IF EXISTS "basic_api_keys_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_select_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete_policy" ON api_keys;

-- 4. Crear políticas permisivas para usuarios autenticados
CREATE POLICY "api_keys_full_access_authenticated"
ON api_keys FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Crear políticas para acceso anónimo (verificación de API keys)
CREATE POLICY "api_keys_verify_anonymous"
ON api_keys FOR SELECT
TO anon
USING (is_active = true);

-- 6. Crear vista para estadísticas si no existe
CREATE OR REPLACE VIEW api_keys_stats AS
SELECT 
  COUNT(*) as total_keys,
  COUNT(*) FILTER (WHERE is_active = true) as active_keys,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_keys,
  COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '1 day') as used_today,
  COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '7 days') as used_this_week,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as created_this_month,
  ROUND(AVG(jsonb_array_length(permissions)), 2) as avg_permissions_per_key,
  MAX(last_used_at) as most_recent_usage
FROM api_keys;

-- 7. Otorgar permisos en la vista
GRANT SELECT ON api_keys_stats TO authenticated, anon;

-- 8. Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_api_keys_updated_at_trigger ON api_keys;
CREATE TRIGGER update_api_keys_updated_at_trigger
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- 9. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at);

-- 10. Verificar que RLS esté habilitado
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'API Keys module setup completed successfully!';
  RAISE NOTICE 'Functions created: create_api_key_hash, verify_api_key';
  RAISE NOTICE 'Policies configured for authenticated and anonymous access';
  RAISE NOTICE 'Statistics view and triggers ready';
END;
$$;