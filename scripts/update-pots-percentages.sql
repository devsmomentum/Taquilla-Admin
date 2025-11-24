-- =====================================================
-- MIGRACIÓN: Actualizar Porcentajes y Nombres de Potes
-- =====================================================
-- Este script actualiza los potes del sistema con los nuevos
-- porcentajes y cambia el nombre de "Pote de Reserva" a "Costos"
-- 
-- NUEVOS VALORES:
-- - Pote de Premios: 60% (antes 40%)
-- - Costos: 30% (antes Pote de Reserva 35%)
-- - Pote de Ganancias: 10% (antes 25%)
-- =====================================================

BEGIN;

-- 1. Actualizar Pote de Premios
UPDATE pots 
SET percentage = 60
WHERE name = 'Pote de Premios';

-- 2. Actualizar Pote de Reserva (cambiar nombre y porcentaje)
UPDATE pots 
SET 
  name = 'Costos',
  percentage = 30,
  description = 'Costos operativos y gastos del sistema'
WHERE name = 'Pote de Reserva';

-- 3. Actualizar Pote de Ganancias
UPDATE pots 
SET percentage = 10
WHERE name = 'Pote de Ganancias';

-- 4. Verificar los cambios
SELECT 
  name,
  percentage,
  balance,
  description
FROM pots
ORDER BY id;

COMMIT;

-- =====================================================
-- Verificación de totales
-- =====================================================
-- El total de porcentajes debe ser 100%
SELECT 
  SUM(percentage) as total_percentage,
  CASE 
    WHEN SUM(percentage) = 100 THEN '✅ Correcto'
    ELSE '❌ Error: el total no es 100%'
  END as status
FROM pots;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- Después de ejecutar este script:
-- 1. Reinicia la aplicación para cargar los nuevos valores
-- 2. Verifica que los porcentajes se vean correctamente en la UI
-- 3. Las transferencias y retiros anteriores NO se verán afectados
-- 4. Solo se actualizan los nombres y porcentajes, los balances se mantienen
-- =====================================================