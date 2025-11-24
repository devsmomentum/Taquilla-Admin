-- =====================================================
-- CORRECCIÓN SOLO POLÍTICAS RLS PARA API KEYS
-- Ejecutar en Supabase Dashboard > SQL Editor
-- =====================================================

-- PASO 1: Eliminar TODAS las políticas existentes de api_keys
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

-- PASO 2: Deshabilitar RLS temporalmente para limpiar
ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;

-- PASO 3: Crear políticas MUY PERMISIVAS
CREATE POLICY "api_keys_allow_all_authenticated"
ON api_keys FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "api_keys_allow_select_anon"
ON api_keys FOR SELECT
TO anon
USING (true);

-- PASO 4: Rehabilitar RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- PASO 5: Verificar que el usuario sistema existe
INSERT INTO users (id, name, email, password_hash, is_active) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Sistema', 'sistema@apikeys.local', 'sistema_hash_123', true)
ON CONFLICT (id) DO NOTHING;

-- PASO 6: Mensaje de confirmación
SELECT 'Políticas RLS corregidas para API Keys!' as status;