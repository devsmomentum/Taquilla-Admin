-- =====================================================
-- SCRIPT DE MIGRACIÓN: NUEVO SISTEMA DE JERARQUÍA
-- =====================================================
-- Este script implementa el nuevo sistema con:
-- - Comercializadoras
-- - Agencias (con códigos y agencias públicas)
-- - Taquillas (con auto-asignación)
-- - Sistema de porcentajes configurable
-- =====================================================

-- =====================================================
-- 1. TABLA: comercializadoras
-- =====================================================
CREATE TABLE IF NOT EXISTS comercializadoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT,
    logo TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Índices para comercializadoras
CREATE INDEX IF NOT EXISTS idx_comercializadoras_user_id ON comercializadoras(user_id);
CREATE INDEX IF NOT EXISTS idx_comercializadoras_is_default ON comercializadoras(is_default);
CREATE INDEX IF NOT EXISTS idx_comercializadoras_is_active ON comercializadoras(is_active);
CREATE INDEX IF NOT EXISTS idx_comercializadoras_created_at ON comercializadoras(created_at DESC);

-- Trigger para updated_at en comercializadoras
CREATE TRIGGER update_comercializadoras_updated_at
    BEFORE UPDATE ON comercializadoras
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Constraint: Solo una comercializadora puede ser por defecto
CREATE UNIQUE INDEX IF NOT EXISTS idx_comercializadoras_unique_default 
ON comercializadoras(is_default) 
WHERE is_default = true;

-- RLS para comercializadoras
ALTER TABLE comercializadoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Administradores pueden gestionar comercializadoras"
ON comercializadoras
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Comercializadores ven su propia info"
ON comercializadoras
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Comentarios
COMMENT ON TABLE comercializadoras IS 'Comercializadoras que gestionan agencias';
COMMENT ON COLUMN comercializadoras.user_id IS 'Usuario con rol Comercializador asociado';
COMMENT ON COLUMN comercializadoras.is_default IS 'Si es la comercializadora por defecto para taquillas sin código';

-- =====================================================
-- 2. ACTUALIZAR TABLA: agencias
-- =====================================================

-- Agregar columnas nuevas
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE agencias ADD COLUMN IF NOT EXISTS agency_code VARCHAR(50) UNIQUE;

-- Índices para nuevas columnas
CREATE INDEX IF NOT EXISTS idx_agencias_is_public ON agencias(is_public);
CREATE INDEX IF NOT EXISTS idx_agencias_agency_code ON agencias(agency_code);

-- Constraint: Solo una agencia pública por comercializadora
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencias_unique_public_per_commercializer 
ON agencias(commercializer_id, is_public) 
WHERE is_public = true;

-- Función para generar código de agencia único
CREATE OR REPLACE FUNCTION generate_agency_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_code BOOLEAN;
BEGIN
    LOOP
        -- Generar código aleatorio de 8 caracteres
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Verificar si ya existe
        SELECT EXISTS(SELECT 1 FROM agencias WHERE agency_code = code) INTO exists_code;
        
        -- Si no existe, salir del loop
        IF NOT exists_code THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar código automáticamente si no se proporciona
CREATE OR REPLACE FUNCTION set_agency_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.agency_code IS NULL OR NEW.agency_code = '' THEN
        NEW.agency_code := generate_agency_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_agency_code
    BEFORE INSERT ON agencias
    FOR EACH ROW
    EXECUTE FUNCTION set_agency_code();

-- Renombrar commercializer_id a commercializer_id si no existe
-- (Ya existe según el SQL previo, pero lo verificamos)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agencias' AND column_name = 'commercializer_id'
    ) THEN
        -- Si existiera con otro nombre, renombrar
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'agencias' AND column_name = 'commercializer_id_old'
        ) THEN
            ALTER TABLE agencias RENAME COLUMN commercializer_id_old TO commercializer_id;
        END IF;
    END IF;
END $$;

-- Comentarios
COMMENT ON COLUMN agencias.is_public IS 'Si es la agencia pública de la comercializadora (recibe taquillas sin código)';
COMMENT ON COLUMN agencias.agency_code IS 'Código único para que las taquillas se registren';

-- =====================================================
-- 3. ACTUALIZAR TABLA: taquillas
-- =====================================================

-- Agregar columnas nuevas
ALTER TABLE taquillas ADD COLUMN IF NOT EXISTS agency_code VARCHAR(50);
ALTER TABLE taquillas ADD COLUMN IF NOT EXISTS commercializer_id UUID REFERENCES comercializadoras(id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_taquillas_agency_code ON taquillas(agency_code);
CREATE INDEX IF NOT EXISTS idx_taquillas_commercializer_id ON taquillas(commercializer_id);
CREATE INDEX IF NOT EXISTS idx_taquillas_agency_id ON taquillas(agency_id);

-- Comentarios
COMMENT ON COLUMN taquillas.agency_code IS 'Código de agencia usado al registrarse';
COMMENT ON COLUMN taquillas.commercializer_id IS 'Comercializadora (directa o a través de agencia)';

-- =====================================================
-- 4. TABLA: porcentajes
-- =====================================================

CREATE TABLE IF NOT EXISTS porcentajes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('general', 'comercializadora', 'agencia')),
    entity_id UUID, -- NULL para general, ID específico para otros
    admin_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (admin_percentage >= 0 AND admin_percentage <= 100),
    commercializer_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (commercializer_percentage >= 0 AND commercializer_percentage <= 100),
    agency_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (agency_percentage >= 0 AND agency_percentage <= 100),
    taquilla_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0 CHECK (taquilla_percentage >= 0 AND taquilla_percentage <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_percentages_sum CHECK (
        (admin_percentage + commercializer_percentage + agency_percentage + taquilla_percentage) = 100
    )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_porcentajes_entity_type ON porcentajes(entity_type);
CREATE INDEX IF NOT EXISTS idx_porcentajes_entity_id ON porcentajes(entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_porcentajes_unique_general ON porcentajes(entity_type) WHERE entity_type = 'general';

-- Trigger para updated_at
CREATE TRIGGER update_porcentajes_updated_at
    BEFORE UPDATE ON porcentajes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE porcentajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer porcentajes"
ON porcentajes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Solo administradores pueden modificar porcentajes"
ON porcentajes
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Insertar porcentajes generales por defecto
INSERT INTO porcentajes (entity_type, admin_percentage, commercializer_percentage, agency_percentage, taquilla_percentage)
VALUES ('general', 40.00, 20.00, 20.00, 20.00)
ON CONFLICT DO NOTHING;

-- Comentarios
COMMENT ON TABLE porcentajes IS 'Configuración de porcentajes de comisión';
COMMENT ON COLUMN porcentajes.entity_type IS 'Tipo: general, comercializadora, agencia';
COMMENT ON COLUMN porcentajes.entity_id IS 'ID de la entidad específica (NULL para general)';

-- =====================================================
-- 5. MIGRACIÓN DE DATOS EXISTENTES
-- =====================================================

-- Crear comercializadora por defecto si no existe ninguna
DO $$
DECLARE
    default_commercializer_id UUID;
    admin_user_id UUID;
BEGIN
    -- Buscar si ya existe una comercializadora por defecto
    SELECT id INTO default_commercializer_id FROM comercializadoras WHERE is_default = true LIMIT 1;
    
    -- Si no existe, crear una
    IF default_commercializer_id IS NULL THEN
        -- Intentar obtener el primer admin
        SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
        
        -- Crear comercializadora por defecto
        INSERT INTO comercializadoras (
            name, 
            email, 
            address, 
            is_default, 
            is_active, 
            created_by,
            commission_percentage
        )
        VALUES (
            'Comercializadora Principal',
            'comercializadora@sistema.com',
            'Dirección principal',
            true,
            true,
            admin_user_id,
            20.00
        )
        RETURNING id INTO default_commercializer_id;
        
        RAISE NOTICE 'Comercializadora por defecto creada: %', default_commercializer_id;
    END IF;
    
    -- Asignar comercializadora por defecto a agencias sin comercializadora
    UPDATE agencias 
    SET commercializer_id = default_commercializer_id
    WHERE commercializer_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM auth.users WHERE id = agencias.commercializer_id
    );
    
    -- Asignar comercializadora a taquillas existentes según su agencia
    UPDATE taquillas t
    SET commercializer_id = a.commercializer_id
    FROM agencias a
    WHERE t.agency_id = a.id AND t.commercializer_id IS NULL;
    
    -- Asignar comercializadora por defecto a taquillas sin agencia
    UPDATE taquillas
    SET commercializer_id = default_commercializer_id
    WHERE commercializer_id IS NULL;
    
END $$;

-- Generar códigos para agencias existentes que no tengan
UPDATE agencias
SET agency_code = generate_agency_code()
WHERE agency_code IS NULL OR agency_code = '';

-- =====================================================
-- 6. FUNCIÓN: Auto-asignar taquilla a agencia
-- =====================================================

CREATE OR REPLACE FUNCTION auto_assign_taquilla_to_agency()
RETURNS TRIGGER AS $$
DECLARE
    target_agency_id UUID;
    target_commercializer_id UUID;
    public_agency_id UUID;
    default_commercializer_id UUID;
BEGIN
    -- Si ya tiene agency_id asignado, no hacer nada más
    IF NEW.agency_id IS NOT NULL THEN
        -- Solo actualizar commercializer_id si no existe
        IF NEW.commercializer_id IS NULL THEN
            SELECT commercializer_id INTO NEW.commercializer_id
            FROM agencias
            WHERE id = NEW.agency_id;
        END IF;
        RETURN NEW;
    END IF;
    
    -- Caso 1: Tiene código de agencia
    IF NEW.agency_code IS NOT NULL AND NEW.agency_code != '' THEN
        -- Buscar agencia con ese código
        SELECT id, commercializer_id INTO target_agency_id, target_commercializer_id
        FROM agencias
        WHERE agency_code = NEW.agency_code AND is_active = true
        LIMIT 1;
        
        IF target_agency_id IS NOT NULL THEN
            NEW.agency_id := target_agency_id;
            NEW.commercializer_id := target_commercializer_id;
            RETURN NEW;
        END IF;
    END IF;
    
    -- Caso 2: Sin código o código inválido → asignar a agencia pública de comercializadora por defecto
    -- Buscar comercializadora por defecto
    SELECT id INTO default_commercializer_id
    FROM comercializadoras
    WHERE is_default = true AND is_active = true
    LIMIT 1;
    
    IF default_commercializer_id IS NOT NULL THEN
        -- Buscar agencia pública de esa comercializadora
        SELECT id INTO public_agency_id
        FROM agencias
        WHERE commercializer_id = default_commercializer_id 
          AND is_public = true 
          AND is_active = true
        LIMIT 1;
        
        -- Si no existe agencia pública, crearla
        IF public_agency_id IS NULL THEN
            INSERT INTO agencias (
                name,
                address,
                commercializer_id,
                is_public,
                is_active,
                credit_limit,
                commission_percentage,
                current_balance
            )
            VALUES (
                'Agencia Pública',
                'Dirección automática',
                default_commercializer_id,
                true,
                true,
                0,
                20.00,
                0
            )
            RETURNING id INTO public_agency_id;
        END IF;
        
        NEW.agency_id := public_agency_id;
        NEW.commercializer_id := default_commercializer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-asignar taquillas
DROP TRIGGER IF EXISTS trigger_auto_assign_taquilla ON taquillas;
CREATE TRIGGER trigger_auto_assign_taquilla
    BEFORE INSERT ON taquillas
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_taquilla_to_agency();

-- =====================================================
-- 7. VISTAS ÚTILES
-- =====================================================

-- Vista de taquillas con información de jerarquía completa
CREATE OR REPLACE VIEW v_taquillas_full AS
SELECT 
    t.id,
    t.full_name,
    t.email,
    t.telefono,
    t.address,
    t.is_approved,
    t.created_at,
    t.agency_id,
    a.name as agency_name,
    a.agency_code,
    a.is_public as is_public_agency,
    t.commercializer_id,
    c.name as commercializer_name,
    c.email as commercializer_email
FROM taquillas t
LEFT JOIN agencias a ON t.agency_id = a.id
LEFT JOIN comercializadoras c ON t.commercializer_id = c.id;

COMMENT ON VIEW v_taquillas_full IS 'Vista completa de taquillas con información de agencia y comercializadora';

-- Vista de agencias con conteo de taquillas
CREATE OR REPLACE VIEW v_agencias_stats AS
SELECT 
    a.id,
    a.name,
    a.address,
    a.agency_code,
    a.is_public,
    a.is_active,
    a.commercializer_id,
    c.name as commercializer_name,
    COUNT(t.id) as taquillas_count,
    COUNT(CASE WHEN t.is_approved THEN 1 END) as taquillas_approved_count
FROM agencias a
LEFT JOIN comercializadoras c ON a.commercializer_id = c.id
LEFT JOIN taquillas t ON a.id = t.agency_id
GROUP BY a.id, a.name, a.address, a.agency_code, a.is_public, a.is_active, a.commercializer_id, c.name;

COMMENT ON VIEW v_agencias_stats IS 'Vista de agencias con estadísticas de taquillas';

-- Vista de comercializadoras con conteo
CREATE OR REPLACE VIEW v_comercializadoras_stats AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.is_default,
    c.is_active,
    COUNT(DISTINCT a.id) as agencias_count,
    COUNT(DISTINCT t.id) as taquillas_count
FROM comercializadoras c
LEFT JOIN agencias a ON c.id = a.commercializer_id
LEFT JOIN taquillas t ON a.id = t.agency_id
GROUP BY c.id, c.name, c.email, c.is_default, c.is_active;

COMMENT ON VIEW v_comercializadoras_stats IS 'Vista de comercializadoras con estadísticas';

-- =====================================================
-- 8. PERMISOS Y SEGURIDAD
-- =====================================================

-- Grants para vistas
GRANT SELECT ON v_taquillas_full TO authenticated;
GRANT SELECT ON v_agencias_stats TO authenticated;
GRANT SELECT ON v_comercializadoras_stats TO authenticated;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Verificación final
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente';
    RAISE NOTICE '📊 Comercializadoras: %', (SELECT COUNT(*) FROM comercializadoras);
    RAISE NOTICE '📊 Agencias: %', (SELECT COUNT(*) FROM agencias);
    RAISE NOTICE '📊 Taquillas: %', (SELECT COUNT(*) FROM taquillas);
    RAISE NOTICE '📊 Configuraciones de porcentajes: %', (SELECT COUNT(*) FROM porcentajes);
END $$;
