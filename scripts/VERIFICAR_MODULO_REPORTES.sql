-- ============================================================================
-- VERIFICACIÓN DEL MÓDULO DE REPORTES
-- ============================================================================
-- Este script verifica que el módulo de reportes esté completamente integrado
--
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard
-- 2. Ve a SQL Editor
-- 3. Copia y pega este script
-- 4. Ejecuta el script
-- ============================================================================

-- 1. Verificar que la tabla reports existe
SELECT 
    '📊 VERIFICANDO TABLA REPORTS' as info;

SELECT 
    table_name,
    CASE 
        WHEN table_name = 'reports' THEN '✅ Tabla existe'
        ELSE '❌ Tabla NO existe'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'reports';

-- 2. Verificar estructura de la tabla
SELECT 
    '' as " ",
    '🔍 ESTRUCTURA DE LA TABLA' as info;

SELECT 
    column_name as "Columna",
    data_type as "Tipo",
    is_nullable as "Nullable",
    column_default as "Default"
FROM information_schema.columns
WHERE table_name = 'reports' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Verificar índices
SELECT 
    '' as " ",
    '📑 ÍNDICES CREADOS' as info;

SELECT 
    indexname as "Índice",
    indexdef as "Definición"
FROM pg_indexes
WHERE tablename = 'reports' AND schemaname = 'public';

-- 4. Verificar políticas RLS
SELECT 
    '' as " ",
    '🔒 POLÍTICAS RLS' as info;

SELECT 
    policyname as "Política",
    cmd as "Comando",
    qual as "Condición"
FROM pg_policies
WHERE tablename = 'reports' AND schemaname = 'public';

-- 5. Verificar si hay reportes guardados
SELECT 
    '' as " ",
    '📋 REPORTES EXISTENTES' as info;

SELECT 
    COUNT(*) as "Total de Reportes",
    COUNT(*) FILTER (WHERE type = 'daily') as "Reportes Diarios",
    COUNT(*) FILTER (WHERE type = 'weekly') as "Reportes Semanales",
    COUNT(*) FILTER (WHERE type = 'monthly') as "Reportes Mensuales",
    COUNT(*) FILTER (WHERE type = 'custom') as "Reportes Personalizados"
FROM reports;

-- 6. Mostrar últimos reportes (si existen)
SELECT 
    '' as " ",
    '📊 ÚLTIMOS 5 REPORTES' as info;

SELECT 
    id,
    type as "Tipo",
    title as "Título",
    start_date as "Fecha Inicio",
    end_date as "Fecha Fin",
    generated_at as "Generado",
    (report_data->>'totalSales')::numeric as "Ventas Totales",
    (report_data->>'totalBets')::integer as "Total Jugadas",
    (report_data->>'netProfit')::numeric as "Ganancia Neta"
FROM reports
ORDER BY generated_at DESC
LIMIT 5;

-- 7. Resumen final
SELECT 
    '' as " ",
    '✅ RESUMEN DE VERIFICACIÓN' as info;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports')
        THEN '✅ Tabla reports existe'
        ELSE '❌ Tabla reports NO existe'
    END as "Estado Tabla",
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reports')
        THEN '✅ Políticas RLS configuradas'
        ELSE '❌ Faltan políticas RLS'
    END as "Estado RLS",
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'reports')
        THEN '✅ Índices creados'
        ELSE '❌ Faltan índices'
    END as "Estado Índices",
    (SELECT COUNT(*) FROM reports) as "Reportes Guardados";

-- ============================================================================
-- INTERPRETACIÓN DE RESULTADOS:
-- ============================================================================
-- ✅ Si todo muestra "✅":
--    El módulo de reportes está completamente integrado y funcional
--    Puedes usar la aplicación para generar y guardar reportes
--
-- ❌ Si algo muestra "❌":
--    Ejecuta el script add-reports-table.sql en Supabase Dashboard
--    Luego vuelve a ejecutar este script de verificación
-- ============================================================================

-- ============================================================================
-- PRÓXIMOS PASOS SI TODO ESTÁ CORRECTO:
-- ============================================================================
-- 1. Ve a la aplicación
-- 2. Navega a la pestaña "Reportes"
-- 3. Selecciona un tipo de reporte (Diario, Semanal, Mensual)
-- 4. Haz clic en "Generar Reporte"
-- 5. El reporte se guardará automáticamente en Supabase
-- 6. Puedes ver reportes guardados en el selector
-- 7. El botón "Sincronizar" actualiza desde Supabase
-- 8. El botón "Limpiar" elimina reportes antiguos (>30 días)
-- ============================================================================