-- =====================================================
-- CORRECCIÓN DEFINITIVA PARA API KEYS MODULE (VERSIÓN CORREGIDA)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =====================================================

-- PASO 1: Limpiar políticas existentes
DROP POLICY IF EXISTS "api_keys_policy" ON api_keys;
DROP POLICY IF EXISTS "basic_api_keys_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_select_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_insert_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_update_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_delete_policy" ON api_keys;
DROP POLICY IF EXISTS "api_keys_authenticated_access" ON api_keys;
DROP POLICY IF EXISTS "api_keys_anonymous_verify" ON api_keys;
DROP POLICY IF EXISTS "api_keys_full_access_authenticated" ON api_keys;
DROP POLICY IF EXISTS "api_keys_verify_anonymous" ON api_keys;
DROP POLICY IF EXISTS "api_keys_authenticated_full_access" ON api_keys;
DROP POLICY IF EXISTS "api_keys_all_access_authenticated" ON api_keys;
DROP POLICY IF EXISTS "api_keys_select_anon" ON api_keys;

-- PASO 2: Eliminar funciones existentes primero
DROP FUNCTION IF EXISTS verify_api_key(text);
DROP FUNCTION IF EXISTS create_api_key_hash(text);

-- PASO 3: Crear función para generar hash
CREATE OR REPLACE FUNCTION create_api_key_hash(raw_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(digest(raw_key, 'sha256'), 'hex');
END;
$$;

-- PASO 4: Crear función para verificar API keys (nueva signature)
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

-- PASO 5: Crear políticas PERMISIVAS
CREATE POLICY "api_keys_all_access_authenticated"
ON api_keys FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "api_keys_select_anon"
ON api_keys FOR SELECT
TO anon
USING (is_active = true);

-- PASO 6: Asegurar que RLS esté habilitado
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- PASO 7: Eliminar vista existente si existe y crear nueva
DROP VIEW IF EXISTS api_keys_stats;
CREATE VIEW api_keys_stats AS
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

-- PASO 8: Otorgar permisos en la vista
GRANT SELECT ON api_keys_stats TO authenticated, anon;

-- PASO 9: Eliminar trigger existente y crear nuevo
DROP TRIGGER IF EXISTS update_api_keys_updated_at_trigger ON api_keys;
DROP FUNCTION IF EXISTS update_api_keys_updated_at();

CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at_trigger
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- PASO 10: Crear usuario sistema si no existe (para created_by)
INSERT INTO users (id, name, email, password_hash, is_active) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Sistema', 'sistema@apikeys.local', 'sistema_hash_123', true)
ON CONFLICT (id) DO NOTHING;

-- PASO 11: Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at);

-- Mensaje de confirmación
SELECT 'API Keys module configuration completed successfully!' as status;