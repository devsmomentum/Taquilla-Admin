-- Actualizar tabla de Taquillas para agregar agency_id
-- Primero verificar si la columna ya existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'taquillas' AND column_name = 'agency_id'
    ) THEN
        ALTER TABLE taquillas ADD COLUMN agency_id UUID REFERENCES agencias(id) ON DELETE SET NULL;
        CREATE INDEX idx_taquillas_agency_id ON taquillas(agency_id);
    END IF;
END $$;

-- Comentario
COMMENT ON COLUMN taquillas.agency_id IS 'ID de la agencia responsable de esta taquilla';

-- Actualizar políticas RLS para taquillas
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Admins can view all taquillas" ON taquillas;
DROP POLICY IF EXISTS "Comercializadoras can view their taquillas" ON taquillas;
DROP POLICY IF EXISTS "Agencias can view their taquillas" ON taquillas;
DROP POLICY IF EXISTS "Taquillas can view their own" ON taquillas;

-- Política: Admins pueden ver todas las taquillas
CREATE POLICY "Admins can view all taquillas"
    ON taquillas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.user_type = 'admin'
        )
    );

-- Política: Comercializadoras pueden ver taquillas de sus agencias
CREATE POLICY "Comercializadoras can view their taquillas"
    ON taquillas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN comercializadoras c ON c.user_id = auth.uid()
            JOIN agencias a ON a.commercializer_id = c.id
            WHERE u.id = auth.uid()::text 
            AND u.user_type = 'comercializadora'
            AND taquillas.agency_id = a.id
        )
    );

-- Política: Agencias pueden ver sus taquillas
CREATE POLICY "Agencias can view their taquillas"
    ON taquillas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN agencias a ON (a.user_id = auth.uid() OR a.user_email = u.email)
            WHERE u.id = auth.uid()::text 
            AND u.user_type = 'agencia'
            AND taquillas.agency_id = a.id
        )
    );

-- Política: Taquillas pueden ver su propia información
CREATE POLICY "Taquillas can view their own"
    ON taquillas FOR SELECT
    USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Política: Admins y Agencias pueden insertar taquillas
CREATE POLICY "Admins and Agencias can insert taquillas"
    ON taquillas FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.user_type IN ('admin', 'agencia')
        )
    );

-- Política: Admins y Agencias pueden actualizar taquillas
CREATE POLICY "Admins and Agencias can update taquillas"
    ON taquillas FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.user_type IN ('admin', 'agencia')
        )
    );

-- Política: Solo admins pueden eliminar taquillas
CREATE POLICY "Admins can delete taquillas"
    ON taquillas FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid()::text 
            AND users.user_type = 'admin'
        )
    );
