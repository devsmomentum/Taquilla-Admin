-- Añadir columnas para datos de negocio a la tabla users
-- Estos campos aplican para: Comercializadoras, Agencias y Taquillas
-- Ejecutar este script en Supabase SQL Editor

-- Columna para dirección física
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS address TEXT;

-- Columna para porcentaje de participación sobre ventas
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS share_on_sales NUMERIC(5,2) DEFAULT 0;

-- Columna para porcentaje de participación sobre ganancias
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS share_on_profits NUMERIC(5,2) DEFAULT 0;

-- Columna para la agencia a la que pertenece (para taquillas)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS agencia_id UUID;

-- Comentarios para documentar
COMMENT ON COLUMN users.address IS 'Dirección física (para comercializadoras, agencias y taquillas)';
COMMENT ON COLUMN users.share_on_sales IS 'Porcentaje de participación sobre ventas';
COMMENT ON COLUMN users.share_on_profits IS 'Porcentaje de participación sobre ganancias';
COMMENT ON COLUMN users.agencia_id IS 'ID de la agencia a la que pertenece (para taquillas)';

-- Verificar las columnas añadidas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('address', 'share_on_sales', 'share_on_profits', 'user_type', 'agencia_id');
