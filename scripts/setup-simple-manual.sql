-- =====================================================
-- VERSIÓN SIMPLE - INSTALACIÓN MANUAL PASO A PASO
-- =====================================================
-- Ejecuta cada sección UNA POR UNA y verifica que funcione
-- =====================================================

-- =====================================================
-- PASO 1: Crear tabla COMERCIALIZADORAS
-- =====================================================
-- Copia desde aquí 👇
CREATE TABLE IF NOT EXISTS comercializadoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT,
    logo TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Habilitar seguridad
ALTER TABLE comercializadoras ENABLE ROW LEVEL SECURITY;

-- Permitir que todos vean comercializadoras
CREATE POLICY "Permitir acceso a comercializadoras"
ON comercializadoras
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
-- Hasta aquí ☝️
-- Ejecuta esto y verifica que no haya errores

-- =====================================================
-- PASO 2: Actualizar tabla AGENCIAS
-- =====================================================
-- Copia desde aquí 👇
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS agency_code VARCHAR(50);
-- Hasta aquí ☝️

-- =====================================================
-- PASO 3: Actualizar tabla TAQUILLAS
-- =====================================================
-- Copia desde aquí 👇
ALTER TABLE taquillas ADD COLUMN IF NOT EXISTS agency_code VARCHAR(50);
ALTER TABLE taquillas ADD COLUMN IF NOT EXISTS commercializer_id UUID;
-- Hasta aquí ☝️

-- =====================================================
-- PASO 4: Crear tabla PORCENTAJES
-- =====================================================
-- Copia desde aquí 👇
CREATE TABLE IF NOT EXISTS porcentajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    admin_percentage DECIMAL(5, 2) NOT NULL DEFAULT 40,
    commercializer_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20,
    agency_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20,
    taquilla_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar seguridad
ALTER TABLE porcentajes ENABLE ROW LEVEL SECURITY;

-- Permitir acceso
CREATE POLICY "Permitir acceso a porcentajes"
ON porcentajes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Insertar configuración por defecto
INSERT INTO porcentajes (entity_type, admin_percentage, commercializer_percentage, agency_percentage, taquilla_percentage)
VALUES ('general', 40.00, 20.00, 20.00, 20.00);
-- Hasta aquí ☝️

-- =====================================================
-- PASO 5: Crear COMERCIALIZADORA PRINCIPAL (Manual)
-- =====================================================
-- Copia desde aquí 👇
INSERT INTO comercializadoras (
    name, 
    email, 
    address, 
    is_default, 
    is_active,
    commission_percentage
)
VALUES (
    'Comercializadora Principal',
    'comercializadora@sistema.com',
    'Dirección principal',
    true,
    true,
    20.00
);
-- Hasta aquí ☝️

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta esto para ver si todo se creó correctamente
SELECT 'comercializadoras' as tabla, COUNT(*) as registros FROM comercializadoras
UNION ALL
SELECT 'agencias', COUNT(*) FROM agencias
UNION ALL
SELECT 'taquillas', COUNT(*) FROM taquillas
UNION ALL
SELECT 'porcentajes', COUNT(*) FROM porcentajes;
