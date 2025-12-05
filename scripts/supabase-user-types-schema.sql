-- ============================================
-- SCHEMA PARA NUEVA ARQUITECTURA DE USUARIOS
-- Sistema de Jerarquía de Negocio Separado de Roles/Permisos
-- ============================================

-- 1. Actualizar tabla de usuarios para incluir user_type
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'admin' 
CHECK (user_type IN ('admin', 'comercializadora', 'agencia', 'taquilla'));

-- Índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- 2. Actualizar tabla de comercializadoras
-- ============================================
-- Ya existe la columna user_id, aseguramos que sea única
ALTER TABLE comercializadoras 
DROP CONSTRAINT IF EXISTS comercializadoras_user_id_unique;

ALTER TABLE comercializadoras 
ADD CONSTRAINT comercializadoras_user_id_unique UNIQUE (user_id);

-- Índice para búsquedas por user_id
CREATE INDEX IF NOT EXISTS idx_comercializadoras_user_id ON comercializadoras(user_id);

-- 3. Actualizar tabla de agencias
-- ============================================
-- Ya existe la columna user_id, aseguramos que sea única
ALTER TABLE agencias 
DROP CONSTRAINT IF EXISTS agencias_user_id_unique;

ALTER TABLE agencias 
ADD CONSTRAINT agencias_user_id_unique UNIQUE (user_id);

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_agencias_user_id ON agencias(user_id);
CREATE INDEX IF NOT EXISTS idx_agencias_comercializadora_id ON agencias(comercializadora_id);

-- 4. Actualizar tabla de taquillas para incluir user_id
-- ============================================
ALTER TABLE taquillas 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE taquillas 
DROP CONSTRAINT IF EXISTS taquillas_user_id_unique;

ALTER TABLE taquillas 
ADD CONSTRAINT taquillas_user_id_unique UNIQUE (user_id);

-- Columna denormalizada para comercializadora (para queries rápidas)
ALTER TABLE taquillas 
ADD COLUMN IF NOT EXISTS comercializadora_id UUID REFERENCES comercializadoras(id) ON DELETE SET NULL;

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_taquillas_user_id ON taquillas(user_id);
CREATE INDEX IF NOT EXISTS idx_taquillas_agencia_id ON taquillas(agencia_id);
CREATE INDEX IF NOT EXISTS idx_taquillas_comercializadora_id ON taquillas(comercializadora_id);

-- 5. Función para actualizar automáticamente el user_type
-- ============================================
CREATE OR REPLACE FUNCTION sync_user_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se vincula a una taquilla
  IF TG_TABLE_NAME = 'taquillas' AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET user_type = 'taquilla' WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- Si se vincula a una agencia
  IF TG_TABLE_NAME = 'agencias' AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET user_type = 'agencia' WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  -- Si se vincula a una comercializadora
  IF TG_TABLE_NAME = 'comercializadoras' AND NEW.user_id IS NOT NULL THEN
    UPDATE users SET user_type = 'comercializadora' WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Triggers para mantener user_type sincronizado
-- ============================================
DROP TRIGGER IF EXISTS sync_user_type_taquillas ON taquillas;
CREATE TRIGGER sync_user_type_taquillas
  AFTER INSERT OR UPDATE OF user_id ON taquillas
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_type();

DROP TRIGGER IF EXISTS sync_user_type_agencias ON agencias;
CREATE TRIGGER sync_user_type_agencias
  AFTER INSERT OR UPDATE OF user_id ON agencias
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_type();

DROP TRIGGER IF EXISTS sync_user_type_comercializadoras ON comercializadoras;
CREATE TRIGGER sync_user_type_comercializadoras
  AFTER INSERT OR UPDATE OF user_id ON comercializadoras
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_type();

-- 7. Función para actualizar automáticamente comercializadora_id en taquillas
-- ============================================
CREATE OR REPLACE FUNCTION sync_taquilla_comercializadora()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar comercializadora_id basado en la agencia
  IF NEW.agencia_id IS NOT NULL THEN
    UPDATE taquillas 
    SET comercializadora_id = (
      SELECT comercializadora_id 
      FROM agencias 
      WHERE id = NEW.agencia_id
    )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para mantener comercializadora_id sincronizado
-- ============================================
DROP TRIGGER IF EXISTS sync_taquilla_comercializadora_trigger ON taquillas;
CREATE TRIGGER sync_taquilla_comercializadora_trigger
  AFTER INSERT OR UPDATE OF agencia_id ON taquillas
  FOR EACH ROW
  EXECUTE FUNCTION sync_taquilla_comercializadora();

-- 9. Vista actualizada de usuarios con sus entidades
-- ============================================
CREATE OR REPLACE VIEW users_with_entities AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.is_active,
  u.user_type,
  u.created_at,
  u.created_by,
  u.updated_at,
  -- IDs de entidades vinculadas
  c.id as comercializadora_id,
  a.id as agencia_id,
  t.id as taquilla_id,
  -- Nombres de entidades vinculadas
  c.name as comercializadora_name,
  a.name as agencia_name,
  t.full_name as taquilla_name,
  -- Roles (solo para admins)
  COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'id', r.id,
          'name', r.name,
          'description', r.description,
          'permissions', r.permissions,
          'is_system', r.is_system
        )
      )
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = u.id
    ),
    '[]'::json
  ) as roles,
  -- Permisos combinados (solo para admins)
  COALESCE(
    (
      SELECT array_agg(DISTINCT p)
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      CROSS JOIN unnest(r.permissions) as p
      WHERE ur.user_id = u.id
    ),
    ARRAY[]::text[]
  ) as all_permissions
FROM users u
LEFT JOIN comercializadoras c ON c.user_id = u.id
LEFT JOIN agencias a ON a.user_id = u.id
LEFT JOIN taquillas t ON t.user_id = u.id;

-- 10. RLS Policies para control de acceso
-- ============================================

-- Comercializadoras: Los usuarios solo pueden ver/editar su propia comercializadora
ALTER TABLE comercializadoras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS comercializadoras_admin_all ON comercializadoras;
CREATE POLICY comercializadoras_admin_all ON comercializadoras
  FOR ALL TO authenticated
  USING (
    -- Admins pueden ver todo
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
    OR
    -- Comercializadoras solo ven la suya
    user_id = auth.uid()
  );

-- Agencias: Los usuarios pueden ver agencias de su comercializadora
ALTER TABLE agencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agencias_visibility ON agencias;
CREATE POLICY agencias_visibility ON agencias
  FOR ALL TO authenticated
  USING (
    -- Admins pueden ver todo
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
    OR
    -- Comercializadoras ven sus agencias
    EXISTS (
      SELECT 1 FROM comercializadoras c
      WHERE c.user_id = auth.uid()
      AND c.id = agencias.comercializadora_id
    )
    OR
    -- Agencias solo ven la suya
    user_id = auth.uid()
  );

-- Taquillas: Control de acceso jerárquico
ALTER TABLE taquillas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS taquillas_visibility ON taquillas;
CREATE POLICY taquillas_visibility ON taquillas
  FOR ALL TO authenticated
  USING (
    -- Admins pueden ver todo
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_type = 'admin'
    )
    OR
    -- Comercializadoras ven taquillas de sus agencias
    EXISTS (
      SELECT 1 FROM comercializadoras c
      WHERE c.user_id = auth.uid()
      AND c.id = taquillas.comercializadora_id
    )
    OR
    -- Agencias ven sus taquillas
    EXISTS (
      SELECT 1 FROM agencias a
      WHERE a.user_id = auth.uid()
      AND a.id = taquillas.agencia_id
    )
    OR
    -- Taquillas solo ven la suya
    user_id = auth.uid()
  );

-- 11. Comentarios para documentación
-- ============================================
COMMENT ON COLUMN users.user_type IS 'Tipo de usuario: admin (sistema de roles), comercializadora/agencia/taquilla (jerarquía de negocio)';
COMMENT ON COLUMN taquillas.user_id IS 'Usuario vinculado con userType=taquilla';
COMMENT ON COLUMN taquillas.comercializadora_id IS 'Comercializadora (denormalizado para queries rápidas)';
COMMENT ON COLUMN agencias.user_id IS 'Usuario vinculado con userType=agencia';
COMMENT ON COLUMN comercializadoras.user_id IS 'Usuario vinculado con userType=comercializadora';

-- ============================================
-- FIN DEL SCHEMA
-- ============================================

-- NOTAS IMPORTANTES:
-- 1. Este script actualiza la estructura existente sin perder datos
-- 2. Los triggers mantienen automáticamente la sincronización
-- 3. Las RLS policies aseguran que cada usuario solo vea sus datos
-- 4. Los admins mantienen acceso completo a través de permisos
-- 5. La jerarquía de negocio es completamente independiente de roles/permisos
