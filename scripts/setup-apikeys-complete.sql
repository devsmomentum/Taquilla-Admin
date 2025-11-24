-- =====================================================
-- CONFIGURACIÓN COMPLETA DE API KEYS PARA SUPABASE
-- Módulo 10: Gestión de API Keys con integración completa
-- =====================================================

-- Primero verificar si la tabla existe y recrearla si es necesario
DROP TABLE IF EXISTS api_keys CASCADE;

-- =====================================================
-- TABLA: api_keys
-- Almacena las API keys para acceso externo con seguridad mejorada
-- =====================================================
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- Hash SHA-256 de la API key
  key_prefix VARCHAR(10) NOT NULL, -- Primeros caracteres para identificación (sk_xxxx)
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints para seguridad
  CONSTRAINT valid_key_prefix CHECK (key_prefix LIKE 'sk_%'),
  CONSTRAINT valid_permissions CHECK (
    jsonb_typeof(permissions) = 'array' AND
    permissions <@ '["create_bets", "read_lotteries", "read_draws", "read_winners"]'::jsonb
  )
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_permissions ON api_keys USING GIN(permissions);
CREATE INDEX idx_api_keys_created_at ON api_keys(created_at);
CREATE INDEX idx_api_keys_last_used ON api_keys(last_used_at) WHERE last_used_at IS NOT NULL;

-- =====================================================
-- TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();

-- =====================================================
-- FUNCIÓN PARA VERIFICAR API KEY
-- Verifica si una API key es válida y actualiza su último uso
-- =====================================================
CREATE OR REPLACE FUNCTION verify_api_key(api_key_hash TEXT)
RETURNS TABLE(
  id UUID,
  is_valid BOOLEAN,
  permissions JSONB,
  created_by UUID,
  name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_record RECORD;
BEGIN
  -- Buscar la API key por hash
  SELECT 
    ak.id,
    ak.is_active,
    ak.permissions,
    ak.created_by,
    ak.name
  INTO key_record
  FROM api_keys ak
  WHERE ak.key_hash = $1;

  -- Si no existe la key
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      FALSE,
      '[]'::JSONB,
      NULL::UUID,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Si la key existe pero está inactiva
  IF NOT key_record.is_active THEN
    RETURN QUERY SELECT 
      key_record.id,
      FALSE,
      key_record.permissions,
      key_record.created_by,
      key_record.name;
    RETURN;
  END IF;

  -- Key válida: actualizar último uso y retornar datos
  UPDATE api_keys 
  SET last_used_at = NOW()
  WHERE api_keys.key_hash = $1;

  RETURN QUERY SELECT 
    key_record.id,
    TRUE,
    key_record.permissions,
    key_record.created_by,
    key_record.name;
END;
$$;

-- =====================================================
-- FUNCIÓN PARA CREAR HASH DE API KEY
-- Utility function para generar hash seguro
-- =====================================================
CREATE OR REPLACE FUNCTION create_api_key_hash(raw_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(digest(raw_key, 'sha256'), 'hex');
END;
$$;

-- =====================================================
-- FUNCIÓN PARA VALIDAR PERMISOS DE API KEY
-- =====================================================
CREATE OR REPLACE FUNCTION validate_api_key_permissions(
  api_key_hash TEXT,
  required_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_permissions JSONB;
BEGIN
  -- Obtener permisos de la API key
  SELECT permissions INTO key_permissions
  FROM api_keys 
  WHERE key_hash = api_key_hash 
    AND is_active = true;
  
  -- Si no se encuentra la key, denegar acceso
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar si tiene el permiso requerido
  RETURN key_permissions ? required_permission;
END;
$$;

-- =====================================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- =====================================================
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Solo usuarios autenticados pueden ver API keys
CREATE POLICY "Users can view api_keys with proper permissions" ON api_keys
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- El creador puede ver sus propias keys
      created_by = auth.uid() OR
      -- Usuarios con permiso api-keys pueden ver todas
      EXISTS (
        SELECT 1 FROM get_user_permissions(auth.uid()::text)
        WHERE unnest = 'api-keys'
      )
    )
  );

-- Policy: Solo usuarios con permisos pueden crear API keys
CREATE POLICY "Users can create api_keys with permissions" ON api_keys
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::text)
      WHERE unnest = 'api-keys'
    )
  );

-- Policy: Solo el creador o usuarios con permisos pueden actualizar
CREATE POLICY "Users can update own api_keys or with permissions" ON api_keys
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM get_user_permissions(auth.uid()::text)
        WHERE unnest = 'api-keys'
      )
    )
  );

-- Policy: Solo el creador o usuarios con permisos pueden eliminar
CREATE POLICY "Users can delete own api_keys or with permissions" ON api_keys
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM get_user_permissions(auth.uid()::text)
        WHERE unnest = 'api-keys'
      )
    )
  );

-- =====================================================
-- VISTA PARA ESTADÍSTICAS DE API KEYS
-- =====================================================
CREATE OR REPLACE VIEW api_keys_stats AS
SELECT 
  COUNT(*) as total_keys,
  COUNT(*) FILTER (WHERE is_active = true) as active_keys,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_keys,
  COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '24 hours') as used_today,
  COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '7 days') as used_this_week,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as created_this_month,
  AVG(jsonb_array_length(permissions))::numeric(3,1) as avg_permissions_per_key,
  MAX(last_used_at) as most_recent_usage,
  MIN(created_at) as oldest_key_created
FROM api_keys;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE api_keys IS 'Almacena API keys para acceso externo con seguridad SHA-256';
COMMENT ON COLUMN api_keys.key_hash IS 'Hash SHA-256 de la API key para verificación segura';
COMMENT ON COLUMN api_keys.key_prefix IS 'Prefijo de la key (sk_xxxx) para identificación en logs';
COMMENT ON COLUMN api_keys.permissions IS 'Array JSON de permisos: create_bets, read_lotteries, read_draws, read_winners';
COMMENT ON COLUMN api_keys.last_used_at IS 'Timestamp del último uso de la API key';

-- =====================================================
-- DATOS INICIALES PARA TESTING (OPCIONAL)
-- =====================================================
-- Insertamos una API key de ejemplo para testing
-- NOTA: En producción, estas keys se crean através de la interfaz
DO $$
DECLARE
  admin_user_id UUID;
  test_key_hash TEXT;
BEGIN
  -- Buscar un usuario admin para asignar la key de prueba
  SELECT id INTO admin_user_id 
  FROM users 
  WHERE email LIKE '%admin%' 
  LIMIT 1;
  
  -- Solo crear key de prueba si existe un admin
  IF admin_user_id IS NOT NULL THEN
    -- Hash de la key de prueba: sk_test_development_key_12345678901234567890123456
    test_key_hash := create_api_key_hash('sk_test_development_key_12345678901234567890123456');
    
    INSERT INTO api_keys (
      name,
      key_hash,
      key_prefix,
      description,
      is_active,
      permissions,
      created_by
    ) VALUES (
      'Sistema de Prueba - Desarrollo',
      test_key_hash,
      'sk_test',
      'API Key de desarrollo para testing del sistema',
      true,
      '["create_bets", "read_lotteries", "read_draws"]'::jsonb,
      admin_user_id
    )
    ON CONFLICT (key_hash) DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
SELECT 
  'api_keys' as tabla,
  COUNT(*) as registros_creados,
  BOOL_AND(is_active) as todas_activas
FROM api_keys;

-- Mostrar estadísticas
SELECT * FROM api_keys_stats;

COMMIT;