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
