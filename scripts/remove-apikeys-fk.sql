-- =====================================================
-- SOLUCIÓN RÁPIDA: Eliminar Foreign Key Constraint
-- =====================================================

-- Eliminar el constraint que está causando problemas
ALTER TABLE api_keys 
DROP CONSTRAINT IF EXISTS api_keys_created_by_fkey;

-- Verificación
SELECT 'Constraint eliminado - ahora puedes crear API Keys' as status;

-- NOTA: Esto hace que created_by sea solo un campo UUID sin validación
-- Las API Keys se podrán crear sin problemas
