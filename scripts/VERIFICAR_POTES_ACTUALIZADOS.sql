-- ============================================================================
-- VERIFICACIÓN DE ACTUALIZACIÓN DE POTES
-- ============================================================================
-- Este script verifica que los potes se hayan actualizado correctamente
-- con los nuevos porcentajes: 60/30/10 y el nombre "Costos"
--
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard
-- 2. Ve a SQL Editor
-- 3. Copia y pega este script
-- 4. Ejecuta el script
-- 5. Revisa los resultados
-- ============================================================================

-- Mostrar todos los potes
SELECT 
    '📊 POTES ACTUALES' as info;

SELECT 
    id,
    name as "Nombre",
    percentage as "Porcentaje %",
    balance as "Balance Bs.",
    color as "Color",
    description as "Descripción",
    updated_at as "Última Actualización"
FROM pots
ORDER BY id;

-- Verificar suma de porcentajes
SELECT 
    '' as " ",
    '🔢 VERIFICACIÓN DE PORCENTAJES' as info;

SELECT 
    SUM(percentage) as "Total Porcentajes",
    CASE 
        WHEN SUM(percentage) = 100 THEN '✅ Correcto'
        ELSE '❌ ERROR: No suma 100%'
    END as "Estado"
FROM pots;

-- Verificar potes específicos
SELECT 
    '' as " ",
    '🔍 VERIFICACIÓN DE NOMBRES Y PORCENTAJES' as info;

SELECT 
    CASE 
        WHEN COUNT(*) FILTER (WHERE name = 'Pote de Premios' AND percentage = 60) = 1 
        THEN '✅ Pote de Premios: 60%'
        ELSE '❌ Pote de Premios NO está correcto'
    END as "Pote de Premios",
    CASE 
        WHEN COUNT(*) FILTER (WHERE name = 'Costos' AND percentage = 30) = 1 
        THEN '✅ Costos: 30%'
        ELSE '❌ Costos NO está correcto'
    END as "Costos",
    CASE 
        WHEN COUNT(*) FILTER (WHERE name = 'Pote de Ganancias' AND percentage = 10) = 1 
        THEN '✅ Pote de Ganancias: 10%'
        ELSE '❌ Pote de Ganancias NO está correcto'
    END as "Pote de Ganancias"
FROM pots;

-- Verificar que NO exista "Pote de Reserva"
SELECT 
    '' as " ",
    '🚫 VERIFICACIÓN DE RENOMBRADO' as info;

SELECT 
    CASE 
        WHEN COUNT(*) FILTER (WHERE name = 'Pote de Reserva') = 0 
        THEN '✅ "Pote de Reserva" fue renombrado correctamente'
        ELSE '❌ "Pote de Reserva" todavía existe'
    END as "Estado del Renombrado"
FROM pots;

-- Resumen final
SELECT 
    '' as " ",
    '📋 RESUMEN FINAL' as info;

SELECT 
    COUNT(*) as "Total de Potes",
    COUNT(*) FILTER (WHERE percentage = 60) as "Potes con 60%",
    COUNT(*) FILTER (WHERE percentage = 30) as "Potes con 30%",
    COUNT(*) FILTER (WHERE percentage = 10) as "Potes con 10%",
    CASE 
        WHEN COUNT(*) = 3 
            AND COUNT(*) FILTER (WHERE name = 'Pote de Premios' AND percentage = 60) = 1
            AND COUNT(*) FILTER (WHERE name = 'Costos' AND percentage = 30) = 1
            AND COUNT(*) FILTER (WHERE name = 'Pote de Ganancias' AND percentage = 10) = 1
            AND SUM(percentage) = 100
        THEN '🎉 TODO CORRECTO'
        ELSE '⚠️ HAY PROBLEMAS'
    END as "Estado General"
FROM pots;

-- ============================================================================
-- INSTRUCCIONES SEGÚN RESULTADO:
-- ============================================================================
-- Si "Estado General" = "🎉 TODO CORRECTO":
--   1. En la aplicación, abre las herramientas de desarrollador (F12)
--   2. Ve a la consola
--   3. Ejecuta: localStorage.removeItem("supabase_pots_backup_v2")
--   4. Recarga la página (Ctrl+R o Cmd+R)
--   5. Los potes deberían mostrar los nuevos valores
--
-- Si "Estado General" = "⚠️ HAY PROBLEMAS":
--   1. Revisa los resultados de las verificaciones arriba
--   2. Ejecuta update-pots-percentages.sql nuevamente
--   3. Vuelve a ejecutar este script de verificación
-- ============================================================================