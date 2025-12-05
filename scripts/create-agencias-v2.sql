-- Tabla de Agencias (con user_id como TEXT)
CREATE TABLE IF NOT EXISTS agencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    logo TEXT,
    commercializer_id UUID REFERENCES comercializadoras(id) ON DELETE CASCADE,
    share_on_sales NUMERIC(5,2) DEFAULT 0,
    share_on_profits NUMERIC(5,2) DEFAULT 0,
    current_balance NUMERIC(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    user_email TEXT,
    user_id TEXT, -- Cambiado a TEXT para compatibilidad
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agencias_commercializer_id ON agencias(commercializer_id);
CREATE INDEX IF NOT EXISTS idx_agencias_is_active ON agencias(is_active);
CREATE INDEX IF NOT EXISTS idx_agencias_user_email ON agencias(user_email);
CREATE INDEX IF NOT EXISTS idx_agencias_user_id ON agencias(user_id);

-- Comentarios
COMMENT ON TABLE agencias IS 'Tabla de agencias que gestionan taquillas';
COMMENT ON COLUMN agencias.commercializer_id IS 'ID de la comercializadora responsable';
COMMENT ON COLUMN agencias.share_on_sales IS 'Porcentaje de participación sobre ventas';
COMMENT ON COLUMN agencias.share_on_profits IS 'Porcentaje de participación sobre ganancias';
COMMENT ON COLUMN agencias.current_balance IS 'Balance actual de la agencia';
