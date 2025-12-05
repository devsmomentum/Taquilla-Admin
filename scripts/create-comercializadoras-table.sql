-- Tabla de Comercializadoras
CREATE TABLE IF NOT EXISTS comercializadoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    address TEXT,
    share_on_sales NUMERIC(5,2) DEFAULT 0,
    share_on_profits NUMERIC(5,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comercializadoras_email ON comercializadoras(email);
CREATE INDEX IF NOT EXISTS idx_comercializadoras_is_active ON comercializadoras(is_active);
CREATE INDEX IF NOT EXISTS idx_comercializadoras_is_default ON comercializadoras(is_default);
CREATE INDEX IF NOT EXISTS idx_comercializadoras_user_id ON comercializadoras(user_id);

-- RLS (Row Level Security)
ALTER TABLE comercializadoras ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver todas las comercializadoras
CREATE POLICY "Users can view all comercializadoras"
    ON comercializadoras FOR SELECT
    USING (true);

-- Política: Solo admins pueden insertar comercializadoras
CREATE POLICY "Admins can insert comercializadoras"
    ON comercializadoras FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND (users.user_type = 'admin' OR users.all_permissions @> ARRAY['*'])
        )
    );

-- Política: Solo admins pueden actualizar comercializadoras
CREATE POLICY "Admins can update comercializadoras"
    ON comercializadoras FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND (users.user_type = 'admin' OR users.all_permissions @> ARRAY['*'])
        )
    );

-- Política: Solo admins pueden eliminar comercializadoras
CREATE POLICY "Admins can delete comercializadoras"
    ON comercializadoras FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND (users.user_type = 'admin' OR users.all_permissions @> ARRAY['*'])
        )
    );

-- Comentarios
COMMENT ON TABLE comercializadoras IS 'Tabla de comercializadoras que coordinan agencias';
COMMENT ON COLUMN comercializadoras.share_on_sales IS 'Porcentaje de participación sobre ventas';
COMMENT ON COLUMN comercializadoras.share_on_profits IS 'Porcentaje de participación sobre ganancias';
COMMENT ON COLUMN comercializadoras.is_default IS 'Indica si es la comercializadora por defecto';
