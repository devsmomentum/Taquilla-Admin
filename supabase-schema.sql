-- =====================================================
-- LOTERÍA DE ANIMALITOS - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Este script crea todas las tablas, índices, funciones y
-- políticas de seguridad necesarias para el sistema.
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- TABLA: roles
-- Almacena los roles del sistema con sus permisos
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para roles
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_is_system ON roles(is_system);

-- =====================================================
-- TABLA: users
-- Almacena los usuarios del sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_by ON users(created_by);

-- =====================================================
-- TABLA: user_roles
-- Relación muchos a muchos entre usuarios y roles
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- Índices para user_roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- =====================================================
-- TABLA: api_keys
-- Almacena las API keys para acceso externo
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix VARCHAR(10) NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para api_keys
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_created_by ON api_keys(created_by);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);

-- =====================================================
-- TABLA: lotteries
-- Almacena las loterías configuradas
-- =====================================================
CREATE TABLE IF NOT EXISTS lotteries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  draw_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  plays_tomorrow BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para lotteries
CREATE INDEX idx_lotteries_is_active ON lotteries(is_active);
CREATE INDEX idx_lotteries_plays_tomorrow ON lotteries(plays_tomorrow);
CREATE INDEX idx_lotteries_name ON lotteries(name);

-- =====================================================
-- TABLA: prizes
-- Almacena los premios configurados para cada lotería
-- =====================================================
CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lottery_id UUID NOT NULL REFERENCES lotteries(id) ON DELETE CASCADE,
  animal_number VARCHAR(2) NOT NULL,
  animal_name VARCHAR(50) NOT NULL,
  multiplier DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lottery_id, animal_number)
);

-- Índices para prizes
CREATE INDEX idx_prizes_lottery_id ON prizes(lottery_id);
CREATE INDEX idx_prizes_animal_number ON prizes(animal_number);

-- =====================================================
-- TABLA: bets
-- Almacena todas las jugadas realizadas
-- =====================================================
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lottery_id UUID NOT NULL REFERENCES lotteries(id) ON DELETE RESTRICT,
  lottery_name VARCHAR(255) NOT NULL,
  animal_number VARCHAR(2) NOT NULL,
  animal_name VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  potential_win DECIMAL(10, 2) NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_api_key UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para bets
CREATE INDEX idx_bets_lottery_id ON bets(lottery_id);
CREATE INDEX idx_bets_animal_number ON bets(animal_number);
CREATE INDEX idx_bets_is_winner ON bets(is_winner);
CREATE INDEX idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX idx_bets_created_by_api_key ON bets(created_by_api_key);

-- =====================================================
-- TABLA: draws
-- Almacena los resultados de los sorteos
-- =====================================================
CREATE TABLE IF NOT EXISTS draws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lottery_id UUID NOT NULL REFERENCES lotteries(id) ON DELETE RESTRICT,
  lottery_name VARCHAR(255) NOT NULL,
  winning_animal_number VARCHAR(2) NOT NULL,
  winning_animal_name VARCHAR(50) NOT NULL,
  draw_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_payout DECIMAL(10, 2) NOT NULL DEFAULT 0,
  winners_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para draws
CREATE INDEX idx_draws_lottery_id ON draws(lottery_id);
CREATE INDEX idx_draws_draw_time ON draws(draw_time DESC);
CREATE INDEX idx_draws_winning_animal_number ON draws(winning_animal_number);

-- =====================================================
-- TABLA: pots
-- Almacena los balances de los potes del sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS pots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  percentage DECIMAL(5, 2) NOT NULL,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  color VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para pots
CREATE INDEX idx_pots_name ON pots(name);

-- =====================================================
-- TABLA: transfers
-- Almacena las transferencias entre potes
-- =====================================================
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_pot VARCHAR(100) NOT NULL,
  to_pot VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para transfers
CREATE INDEX idx_transfers_from_pot ON transfers(from_pot);
CREATE INDEX idx_transfers_to_pot ON transfers(to_pot);
CREATE INDEX idx_transfers_created_at ON transfers(created_at DESC);
CREATE INDEX idx_transfers_created_by ON transfers(created_by);

-- =====================================================
-- TABLA: withdrawals
-- Almacena los retiros de ganancias
-- =====================================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_pot VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para withdrawals
CREATE INDEX idx_withdrawals_from_pot ON withdrawals(from_pot);
CREATE INDEX idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX idx_withdrawals_created_by ON withdrawals(created_by);

-- =====================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at a las tablas correspondientes
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lotteries_updated_at
  BEFORE UPDATE ON lotteries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bets_updated_at
  BEFORE UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pots_updated_at
  BEFORE UPDATE ON pots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCIÓN: get_user_permissions
-- Obtiene todos los permisos de un usuario combinando sus roles
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  all_permissions JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(DISTINCT perm),
    '[]'::jsonb
  ) INTO all_permissions
  FROM (
    SELECT jsonb_array_elements(r.permissions) as perm
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
  ) perms;
  
  RETURN all_permissions;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: verify_api_key
-- Verifica si una API key es válida y actualiza last_used_at
-- =====================================================
CREATE OR REPLACE FUNCTION verify_api_key(api_key_hash TEXT)
RETURNS TABLE(
  id UUID,
  is_valid BOOLEAN,
  permissions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.id,
    ak.is_active AS is_valid,
    ak.permissions
  FROM api_keys ak
  WHERE ak.key_hash = verify_api_key.api_key_hash
    AND ak.is_active = TRUE;
  
  -- Actualizar last_used_at si la key es válida
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE key_hash = verify_api_key.api_key_hash
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Insertar potes iniciales
INSERT INTO pots (name, percentage, balance, color, description) VALUES
  ('Pote de Premios', 40, 0, 'bg-accent', 'Fondos destinados a pagar premios ganadores'),
  ('Pote de Reserva', 35, 0, 'bg-secondary', 'Reserva para contingencias y respaldo'),
  ('Pote de Ganancias', 25, 0, 'bg-primary', 'Ganancias acumuladas del sistema')
ON CONFLICT (name) DO NOTHING;

-- Insertar roles del sistema
INSERT INTO roles (id, name, description, permissions, is_system) VALUES
  (
    uuid_generate_v4(),
    'Administrador',
    'Acceso completo al sistema',
    '["dashboard", "reports", "lotteries", "bets", "winners", "history", "users", "roles", "api-keys"]'::jsonb,
    TRUE
  ),
  (
    uuid_generate_v4(),
    'Vendedor',
    'Puede registrar jugadas y ver loterías',
    '["lotteries", "bets", "reports"]'::jsonb,
    TRUE
  )
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE pots ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA LA TABLA: roles
-- =====================================================

-- Los usuarios autenticados pueden ver todos los roles
CREATE POLICY "Anyone can view roles"
  ON roles FOR SELECT
  USING (true);

-- Solo usuarios con permiso 'roles' pueden insertar roles
CREATE POLICY "Users with roles permission can insert roles"
  ON roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"roles"'::jsonb
    )
  );

-- Solo usuarios con permiso 'roles' pueden actualizar roles no-sistema
CREATE POLICY "Users with roles permission can update non-system roles"
  ON roles FOR UPDATE
  USING (
    NOT is_system AND
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"roles"'::jsonb
    )
  );

-- Solo usuarios con permiso 'roles' pueden eliminar roles no-sistema
CREATE POLICY "Users with roles permission can delete non-system roles"
  ON roles FOR DELETE
  USING (
    NOT is_system AND
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"roles"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: users
-- =====================================================

-- Los usuarios autenticados pueden ver todos los usuarios
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios con permiso 'users' pueden insertar usuarios
CREATE POLICY "Users with users permission can insert users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"users"'::jsonb
    )
  );

-- Los usuarios pueden actualizar su propio perfil o usuarios con permiso 'users'
CREATE POLICY "Users can update own profile or with users permission"
  ON users FOR UPDATE
  USING (
    id = auth.uid()::uuid OR
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"users"'::jsonb
    )
  );

-- Solo usuarios con permiso 'users' pueden eliminar usuarios (excepto a sí mismos)
CREATE POLICY "Users with users permission can delete other users"
  ON users FOR DELETE
  USING (
    id != auth.uid()::uuid AND
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"users"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: user_roles
-- =====================================================

-- Los usuarios autenticados pueden ver todas las relaciones user-role
CREATE POLICY "Authenticated users can view user roles"
  ON user_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios con permiso 'users' pueden asignar roles
CREATE POLICY "Users with users permission can assign roles"
  ON user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"users"'::jsonb
    )
  );

-- Solo usuarios con permiso 'users' pueden remover roles
CREATE POLICY "Users with users permission can remove roles"
  ON user_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"users"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: api_keys
-- =====================================================

-- Solo usuarios con permiso 'api-keys' pueden ver API keys
CREATE POLICY "Users with api-keys permission can view api keys"
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"api-keys"'::jsonb
    )
  );

-- Solo usuarios con permiso 'api-keys' pueden crear API keys
CREATE POLICY "Users with api-keys permission can insert api keys"
  ON api_keys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"api-keys"'::jsonb
    )
  );

-- Solo usuarios con permiso 'api-keys' pueden actualizar API keys
CREATE POLICY "Users with api-keys permission can update api keys"
  ON api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"api-keys"'::jsonb
    )
  );

-- Solo usuarios con permiso 'api-keys' pueden eliminar API keys
CREATE POLICY "Users with api-keys permission can delete api keys"
  ON api_keys FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"api-keys"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: lotteries
-- =====================================================

-- Los usuarios autenticados pueden ver todas las loterías
CREATE POLICY "Authenticated users can view lotteries"
  ON lotteries FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios con permiso 'lotteries' pueden crear loterías
CREATE POLICY "Users with lotteries permission can insert lotteries"
  ON lotteries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"lotteries"'::jsonb
    )
  );

-- Solo usuarios con permiso 'lotteries' pueden actualizar loterías
CREATE POLICY "Users with lotteries permission can update lotteries"
  ON lotteries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"lotteries"'::jsonb
    )
  );

-- Solo usuarios con permiso 'lotteries' pueden eliminar loterías
CREATE POLICY "Users with lotteries permission can delete lotteries"
  ON lotteries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"lotteries"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: prizes
-- =====================================================

-- Los usuarios autenticados pueden ver todos los premios
CREATE POLICY "Authenticated users can view prizes"
  ON prizes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios con permiso 'lotteries' pueden crear premios
CREATE POLICY "Users with lotteries permission can insert prizes"
  ON prizes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"lotteries"'::jsonb
    )
  );

-- Solo usuarios con permiso 'lotteries' pueden actualizar premios
CREATE POLICY "Users with lotteries permission can update prizes"
  ON prizes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"lotteries"'::jsonb
    )
  );

-- Solo usuarios con permiso 'lotteries' pueden eliminar premios
CREATE POLICY "Users with lotteries permission can delete prizes"
  ON prizes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"lotteries"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: bets
-- =====================================================

-- Los usuarios autenticados pueden ver todas las jugadas
CREATE POLICY "Authenticated users can view bets"
  ON bets FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Usuarios con permiso 'bets' o API keys válidas pueden crear jugadas
CREATE POLICY "Users with bets permission can insert bets"
  ON bets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"bets"'::jsonb
    )
  );

-- Solo usuarios con permiso 'winners' pueden actualizar jugadas (marcar ganadores)
CREATE POLICY "Users with winners permission can update bets"
  ON bets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"winners"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: draws
-- =====================================================

-- Los usuarios autenticados pueden ver todos los sorteos
CREATE POLICY "Authenticated users can view draws"
  ON draws FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios con permiso 'winners' pueden crear sorteos
CREATE POLICY "Users with winners permission can insert draws"
  ON draws FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"winners"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: pots
-- =====================================================

-- Los usuarios autenticados pueden ver todos los potes
CREATE POLICY "Authenticated users can view pots"
  ON pots FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios con permiso 'dashboard' pueden actualizar potes
CREATE POLICY "Users with dashboard permission can update pots"
  ON pots FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"dashboard"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: transfers
-- =====================================================

-- Los usuarios autenticados pueden ver todas las transferencias
CREATE POLICY "Authenticated users can view transfers"
  ON transfers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios con permiso 'dashboard' pueden crear transferencias
CREATE POLICY "Users with dashboard permission can insert transfers"
  ON transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"dashboard"'::jsonb
    )
  );

-- =====================================================
-- POLÍTICAS PARA LA TABLA: withdrawals
-- =====================================================

-- Los usuarios autenticados pueden ver todos los retiros
CREATE POLICY "Authenticated users can view withdrawals"
  ON withdrawals FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios con permiso 'dashboard' pueden crear retiros
CREATE POLICY "Users with dashboard permission can insert withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_user_permissions(auth.uid()::uuid) AS perms
      WHERE perms @> '"dashboard"'::jsonb
    )
  );



-- =====================================================
-- COMENTARIOS EN LAS TABLAS
-- =====================================================

COMMENT ON TABLE roles IS 'Roles del sistema con permisos modulares';
COMMENT ON TABLE users IS 'Usuarios del sistema administrativo';
COMMENT ON TABLE user_roles IS 'Relación muchos a muchos entre usuarios y roles';
COMMENT ON TABLE api_keys IS 'Claves API para acceso externo al sistema';
COMMENT ON TABLE lotteries IS 'Loterías configuradas en el sistema';
COMMENT ON TABLE prizes IS 'Premios y multiplicadores por animal en cada lotería';
COMMENT ON TABLE bets IS 'Jugadas realizadas por los usuarios';
COMMENT ON TABLE draws IS 'Resultados de los sorteos realizados';
COMMENT ON TABLE pots IS 'Potes del sistema (premios, reserva, ganancias)';
COMMENT ON TABLE transfers IS 'Transferencias de fondos entre potes';
COMMENT ON TABLE withdrawals IS 'Retiros de ganancias del sistema';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
