-- =====================================================
-- TABLA: reports
-- Almacena reportes pre-calculados del sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'custom')),
  title VARCHAR(500) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para reports
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_start_date ON reports(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_end_date ON reports(end_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_type_dates ON reports(type, start_date, end_date);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- POLÍTICAS PARA LA TABLA: reports
-- =====================================================

-- Habilitar RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Los usuarios autenticados pueden ver todos los reportes
CREATE POLICY "Authenticated users can view reports"
  ON reports FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios con permiso 'reports' pueden crear reportes
CREATE POLICY "Users with reports permission can insert reports"
  ON reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"reports"'::jsonb
    )
  );

-- Solo usuarios con permiso 'reports' pueden actualizar reportes
CREATE POLICY "Users with reports permission can update reports"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"reports"'::jsonb
    )
  );

-- Solo usuarios con permiso 'reports' pueden eliminar reportes
CREATE POLICY "Users with reports permission can delete reports"
  ON reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"reports"'::jsonb
    )
  );

-- =====================================================
-- VISTA: reports_summary
-- Vista con resumen de reportes por tipo y período
-- =====================================================
CREATE OR REPLACE VIEW reports_summary AS
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

-- =====================================================
-- FUNCIONES PARA REPORTES
-- =====================================================

-- Función para limpiar reportes antiguos automáticamente
CREATE OR REPLACE FUNCTION cleanup_old_reports(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM reports 
  WHERE generated_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de reportes
CREATE OR REPLACE FUNCTION get_reports_stats()
RETURNS TABLE(
  total_reports BIGINT,
  daily_reports BIGINT,
  weekly_reports BIGINT,
  monthly_reports BIGINT,
  custom_reports BIGINT,
  oldest_report TIMESTAMP WITH TIME ZONE,
  newest_report TIMESTAMP WITH TIME ZONE,
  avg_generation_time_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_reports,
    COUNT(*) FILTER (WHERE type = 'daily') as daily_reports,
    COUNT(*) FILTER (WHERE type = 'weekly') as weekly_reports,
    COUNT(*) FILTER (WHERE type = 'monthly') as monthly_reports,
    COUNT(*) FILTER (WHERE type = 'custom') as custom_reports,
    MIN(generated_at) as oldest_report,
    MAX(generated_at) as newest_report,
    AVG(EXTRACT(EPOCH FROM (created_at - generated_at))) as avg_generation_time_seconds
  FROM reports;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE reports IS 'Almacena reportes pre-calculados del sistema de loterías';
COMMENT ON COLUMN reports.id IS 'Identificador único del reporte';
COMMENT ON COLUMN reports.type IS 'Tipo de reporte: daily, weekly, monthly, custom';
COMMENT ON COLUMN reports.title IS 'Título descriptivo del reporte';
COMMENT ON COLUMN reports.start_date IS 'Fecha de inicio del período del reporte';
COMMENT ON COLUMN reports.end_date IS 'Fecha de fin del período del reporte';
COMMENT ON COLUMN reports.report_data IS 'Datos del reporte en formato JSON';
COMMENT ON COLUMN reports.generated_at IS 'Fecha y hora cuando se generó el reporte';

COMMENT ON VIEW reports_summary IS 'Vista con resumen estadístico de reportes por tipo';
COMMENT ON FUNCTION cleanup_old_reports IS 'Elimina reportes más antiguos que X días (por defecto 90)';
COMMENT ON FUNCTION get_reports_stats IS 'Obtiene estadísticas generales de todos los reportes';