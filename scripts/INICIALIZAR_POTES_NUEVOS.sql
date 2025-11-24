-- ============================================================================
-- INICIALIZACIÓN DE POTES CON NUEVOS PORCENTAJES
-- ============================================================================
-- Este script inicializa los potes con los nuevos valores:
-- - Pote de Premios: 60% (antes 40%)
-- - Costos: 30% (antes "Pote de Reserva" 35%)
-- - Pote de Ganancias: 10% (antes 25%)
--
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard: https://supabase.com/dashboard
-- 2. Ve a SQL Editor
-- 3. Copia y pega este script completo
-- 4. Ejecuta el script
-- 5. Verifica que los potes se hayan creado correctamente
-- ============================================================================

BEGIN;

-- Verificar si ya existen potes
DO $$ 
DECLARE 
    pot_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO pot_count FROM pots;
    
    IF pot_count > 0 THEN
        RAISE NOTICE 'Ya existen % potes en la base de datos', pot_count;
        RAISE NOTICE 'Si deseas actualizar los potes existentes, ejecuta UPDATE_POTS_PERCENTAGES.sql';
        RAISE EXCEPTION 'Abortando: La tabla pots ya contiene datos';
    END IF;
    
    RAISE NOTICE 'No hay potes existentes. Procediendo a crear...';
END $$;

-- Insertar los 3 potes con los nuevos porcentajes
INSERT INTO pots (name, percentage, balance, color, description) VALUES
  ('Pote de Premios', 60, 0, 'bg-accent', 'Fondos destinados a pagar premios ganadores'),
  ('Costos', 30, 0, 'bg-secondary', 'Costos operativos y gastos del sistema'),
  ('Pote de Ganancias', 10, 0, 'bg-primary', 'Ganancias acumuladas del sistema');

-- Verificar la inserción
DO $$
DECLARE
    pot RECORD;
    total_percentage INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'POTES CREADOS EXITOSAMENTE';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '';
    
    FOR pot IN SELECT id, name, percentage, balance FROM pots ORDER BY id LOOP
        RAISE NOTICE '  ✓ % (ID: %): %% - Balance: Bs. %', 
            pot.name, pot.id, pot.percentage, pot.balance;
        total_percentage := total_percentage + pot.percentage;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE '  TOTAL: %%', total_percentage;
    RAISE NOTICE '----------------------------------------------------------------';
    RAISE NOTICE '';
    
    IF total_percentage = 100 THEN
        RAISE NOTICE '✓ Verificación exitosa: El total es 100%%';
    ELSE
        RAISE EXCEPTION 'ERROR: El total debería ser 100%% pero es %%', total_percentage;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================================';
    RAISE NOTICE 'PRÓXIMOS PASOS:';
    RAISE NOTICE '================================================================';
    RAISE NOTICE '1. Inicia o recarga la aplicación';
    RAISE NOTICE '2. Ve al Dashboard';
    RAISE NOTICE '3. Verifica que los potes muestren:';
    RAISE NOTICE '   • Pote de Premios: 60%%';
    RAISE NOTICE '   • Costos: 30%%';
    RAISE NOTICE '   • Pote de Ganancias: 10%%';
    RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================