-- CONFIGURACIÓN MÍNIMA PARA API KEYS
-- Ejecutar en Supabase SQL Editor

-- Crear tabla api_keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix VARCHAR(10) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);

-- Habilitar RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Política básica de acceso
CREATE POLICY "api_keys_access_policy" ON api_keys
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM get_user_permissions(auth.uid()::text)
        WHERE unnest = 'api-keys'
      )
    )
  );

-- Función básica para verificar API keys
CREATE OR REPLACE FUNCTION verify_api_key(api_key_hash TEXT)
RETURNS TABLE(
  id UUID,
  is_valid BOOLEAN,
  permissions JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_record RECORD;
BEGIN
  SELECT 
    ak.id,
    ak.is_active,
    ak.permissions
  INTO key_record
  FROM api_keys ak
  WHERE ak.key_hash = $1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      FALSE,
      '[]'::JSONB;
    RETURN;
  END IF;

  IF NOT key_record.is_active THEN
    RETURN QUERY SELECT 
      key_record.id,
      FALSE,
      key_record.permissions;
    RETURN;
  END IF;

  -- Actualizar último uso
  UPDATE api_keys 
  SET last_used_at = NOW()
  WHERE api_keys.key_hash = $1;

  RETURN QUERY SELECT 
    key_record.id,
    TRUE,
    key_record.permissions;
END;
$$;