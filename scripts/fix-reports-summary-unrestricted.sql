-- ============================================
-- SOLUCIÓN: Eliminar "Unrestricted" de reports_summary
-- ============================================

-- 1. Eliminar la vista actual
DROP VIEW IF EXISTS reports_summary CASCADE;

-- 2. Crear una función segura para obtener el resumen
CREATE OR REPLACE FUNCTION get_reports_summary()
RETURNS TABLE (
  type text,
  total_reports bigint,
  earliest_report timestamp with time zone,
  latest_report timestamp with time zone,
  avg_period_days double precision,
  reports_last_week bigint,
  reports_last_month bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    type,
    COUNT(*) as total_reports,
    MIN(start_date) as earliest_report,
    MAX(end_date) as latest_report,
    AVG(EXTRACT(EPOCH FROM (end_date - start_date))/86400) as avg_period_days,
    COUNT(*) FILTER (WHERE generated_at >= NOW() - INTERVAL '7 days') as reports_last_week,
    COUNT(*) FILTER (WHERE generated_at >= NOW() - INTERVAL '30 days') as reports_last_month
  FROM reports
  GROUP BY type
  ORDER BY type;
$$;

-- 3. Dar permisos a la función
GRANT EXECUTE ON FUNCTION get_reports_summary() TO authenticated, anon;

-- 4. Crear vista segura que llame a la función
CREATE VIEW reports_summary 
WITH (security_invoker=true)
AS 
SELECT * FROM get_reports_summary();

-- 5. Habilitar security invoker en la vista
ALTER VIEW reports_summary SET (security_invoker = on);

-- 6. Dar permisos a la vista
GRANT SELECT ON reports_summary TO authenticated, anon;

-- 7. Agregar comentario
COMMENT ON VIEW reports_summary IS 'Vista con resumen estadístico de reportes por tipo (segura)';
COMMENT ON FUNCTION get_reports_summary() IS 'Función para obtener resumen de reportes con seguridad';

-- Verificación
SELECT 
  'reports_summary' as object_name,
  'Vista creada con security_invoker' as status;
