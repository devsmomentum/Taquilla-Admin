-- Completar la estructura de la tabla users para soportar Agencias y Comercializadoras
-- Agregar columnas faltantes que existían en las tablas separadas

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS current_balance NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Comentarios
COMMENT ON COLUMN users.logo IS 'URL del logo (para agencias/comercializadoras)';
COMMENT ON COLUMN users.current_balance IS 'Saldo actual (para agencias/taquillas)';
COMMENT ON COLUMN users.is_default IS 'Para identificar la comercializadora por defecto';
