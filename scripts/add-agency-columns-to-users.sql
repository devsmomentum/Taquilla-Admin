-- Añadir columnas para datos de agencias a la tabla users
-- Ejecutar este script en Supabase SQL Editor

-- Columna para dirección (usada por agencias)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Columna para porcentaje de ventas (usada por agencias)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS share_on_sales NUMERIC(5,2) DEFAULT 0;

-- Columna para porcentaje de ganancias (usada por agencias)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS share_on_profits NUMERIC(5,2) DEFAULT 0;

-- Comentarios para documentar
COMMENT ON COLUMN users.address IS 'Dirección física (para agencias y comercializadoras)';
COMMENT ON COLUMN users.share_on_sales IS 'Porcentaje de participación sobre ventas (para agencias)';
COMMENT ON COLUMN users.share_on_profits IS 'Porcentaje de participación sobre ganancias (para agencias)';

-- Verificar las columnas añadidas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('address', 'share_on_sales', 'share_on_profits');
