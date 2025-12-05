-- Tabla de Agencias
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
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_agencias_commercializer_id ON agencias(commercializer_id);
CREATE INDEX IF NOT EXISTS idx_agencias_is_active ON agencias(is_active);
CREATE INDEX IF NOT EXISTS idx_agencias_user_email ON agencias(user_email);
CREATE INDEX IF NOT EXISTS idx_agencias_user_id ON agencias(user_id);

-- RLS (Row Level Security)
ALTER TABLE agencias ENABLE ROW LEVEL SECURITY;

-- Política: Admins pueden ver todas las agencias
CREATE POLICY "Admins can view all agencias"
    ON agencias FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.user_type = 'admin'
        )
    );

-- Política: Comercializadoras pueden ver sus agencias
CREATE POLICY "Comercializadoras can view their agencias"
    ON agencias FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.user_type = 'comercializadora'
            AND EXISTS (
                SELECT 1 FROM comercializadoras c
                WHERE c.user_id = auth.uid()
                AND c.id = agencias.commercializer_id
            )
        )
    );

-- Política: Agencias pueden ver su propia agencia
CREATE POLICY "Agencias can view their own agencia"
    ON agencias FOR SELECT
    USING (
        user_id = auth.uid()
        OR user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Política: Admins y Comercializadoras pueden insertar agencias
CREATE POLICY "Admins and Comercializadoras can insert agencias"
    ON agencias FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.user_type IN ('admin', 'comercializadora')
        )
    );

-- Política: Admins y Comercializadoras pueden actualizar agencias
CREATE POLICY "Admins and Comercializadoras can update agencias"
    ON agencias FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.user_type IN ('admin', 'comercializadora')
        )
    );

-- Política: Solo admins pueden eliminar agencias
CREATE POLICY "Admins can delete agencias"
    ON agencias FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.user_type = 'admin'
        )
    );

-- Comentarios
COMMENT ON TABLE agencias IS 'Tabla de agencias que gestionan taquillas';
COMMENT ON COLUMN agencias.commercializer_id IS 'ID de la comercializadora responsable';
COMMENT ON COLUMN agencias.share_on_sales IS 'Porcentaje de participación sobre ventas';
COMMENT ON COLUMN agencias.share_on_profits IS 'Porcentaje de participación sobre ganancias';
COMMENT ON COLUMN agencias.current_balance IS 'Balance actual de la agencia';
