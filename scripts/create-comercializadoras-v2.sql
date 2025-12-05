-- Tabla de Comercializadoras (con user_id como TEXT)
CREATE TABLE IF NOT EXISTS comercializadoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    address TEXT,
    logo TEXT,
    share_on_sales NUMERIC(5,2) DEFAULT 0,
    share_on_profits NUMERIC(5,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    user_id TEXT, -- Cambiado a TEXT para compatibilidad
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comercializadoras_email ON comercializadoras(email);
CREATE INDEX IF NOT EXISTS idx_comercializadoras_is_active ON comercializadoras(is_active);
CREATE INDEX IF NOT EXISTS idx_comercializadoras_is_default ON comercializadoras(is_default);
CREATE INDEX IF NOT EXISTS idx_comercializadoras_user_id ON comercializadoras(user_id);

-- Comentarios
COMMENT ON TABLE comercializadoras IS 'Tabla de comercializadoras que coordinan agencias';
COMMENT ON COLUMN comercializadoras.share_on_sales IS 'Porcentaje de participación sobre ventas';
COMMENT ON COLUMN comercializadoras.share_on_profits IS 'Porcentaje de participación sobre ganancias';
COMMENT ON COLUMN comercializadoras.is_default IS 'Indica si es la comercializadora por defecto';
