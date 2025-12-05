-- Crear la tabla de agencias en Supabase
CREATE TABLE IF NOT EXISTS agencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    logo TEXT,
    commercializer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_agencias_commercializer ON agencias(commercializer_id);
CREATE INDEX IF NOT EXISTS idx_agencias_active ON agencias(is_active);
CREATE INDEX IF NOT EXISTS idx_agencias_created_at ON agencias(created_at DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE agencias ENABLE ROW LEVEL SECURITY;

-- Política: Los administradores pueden ver y gestionar todas las agencias
CREATE POLICY "Administradores pueden gestionar agencias"
ON agencias
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Política: Los comercializadores solo pueden ver sus propias agencias
CREATE POLICY "Comercializadores ven sus agencias"
ON agencias
FOR SELECT
TO authenticated
USING (
    commercializer_id = auth.uid()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencias_updated_at
    BEFORE UPDATE ON agencias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE agencias IS 'Tabla que almacena las agencias/grupos de taquillas';
COMMENT ON COLUMN agencias.commercializer_id IS 'ID del usuario responsable de la agencia (comercializador)';
COMMENT ON COLUMN agencias.credit_limit IS 'Límite de crédito asignado a la agencia';
COMMENT ON COLUMN agencias.commission_percentage IS 'Porcentaje de comisión que recibe la agencia';
COMMENT ON COLUMN agencias.current_balance IS 'Saldo actual de la agencia';
