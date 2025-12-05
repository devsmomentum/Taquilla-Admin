-- Agregar columna user_type a la tabla users en Supabase
-- Ejecuta esto en: Supabase Dashboard > SQL Editor

-- 1. Agregar columna user_type
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'admin' 
CHECK (user_type IN ('admin', 'comercializadora', 'agencia', 'taquilla'));

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- 3. Actualizar usuarios existentes
UPDATE users 
SET user_type = 'admin' 
WHERE user_type IS NULL;

-- 4. Verificar que se agregó correctamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'user_type';

-- Si retorna 1 fila, la columna existe ✅
