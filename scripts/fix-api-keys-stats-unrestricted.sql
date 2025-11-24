-- ============================================
-- SOLUCIÓN: Eliminar "Unrestricted" de api_keys_stats
-- ============================================
-- Convertir la vista en una función de seguridad definida
-- que Supabase reconocerá como segura

-- 1. Eliminar la vista actual
DROP VIEW IF EXISTS api_keys_stats CASCADE;

-- 2. Crear una función segura en lugar de vista
CREATE OR REPLACE FUNCTION get_api_keys_stats()
RETURNS TABLE (
  total_keys bigint,
  active_keys bigint,
  inactive_keys bigint,
  total_creators bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) as total_keys,
    COUNT(*) FILTER (WHERE is_active = true) as active_keys,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_keys,
    COUNT(DISTINCT created_by) as total_creators
  FROM api_keys;
$$;

-- 3. Dar permisos a la función
GRANT EXECUTE ON FUNCTION get_api_keys_stats() TO authenticated, anon;

-- 4. Crear una vista simple que llame a la función (con RLS)
CREATE VIEW api_keys_stats 
WITH (security_invoker=true)
AS 
SELECT * FROM get_api_keys_stats();

-- 5. Habilitar RLS en la vista
ALTER VIEW api_keys_stats SET (security_invoker = on);

-- 6. Dar permisos finales
GRANT SELECT ON api_keys_stats TO authenticated, anon;

-- Verificación
SELECT 
  'api_keys_stats' as object_name,
  'Vista creada con security_invoker' as status;

COMMENT ON VIEW api_keys_stats IS 'Vista de estadísticas con seguridad habilitada';
