-- ============================================
-- PRERREQUISITOS: ESTRUCTURA DE TABLA USERS
-- ============================================
-- Ejecutar ANTES de las políticas RLS
-- ============================================

-- 1. Agregar columna comercializadora_id a users (para agencias y taquillas)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS comercializadora_id UUID;

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_comercializadora_id ON users(comercializadora_id);

-- 3. Comentario explicativo
COMMENT ON COLUMN users.comercializadora_id IS 'ID de la comercializadora a la que pertenece (para agencias y taquillas)';

-- 4. Verificar estructura
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('user_type', 'parent_id', 'comercializadora_id', 'agencia_id');
