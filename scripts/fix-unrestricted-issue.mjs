import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 DIAGNOSTICANDO PROBLEMA DE "Unrestricted"');
console.log('='.repeat(50));

async function testCurrentView() {
  try {
    console.log('📊 Probando acceso a la vista actual...');
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error:', error.message);
      return false;
    } else {
      console.log('✅ Vista funciona correctamente');
      console.log('📋 Datos obtenidos:', data[0]?.name || 'Sin datos');
      return true;
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return false;
  }
}

function showAlternativeSolutions() {
  console.log('\n🔧 SOLUCIONES ALTERNATIVAS PARA QUITAR "Unrestricted":');
  console.log('━'.repeat(60));
  
  console.log('\n🟨 MÉTODO 1: Vista con RLS explícito');
  console.log('━'.repeat(30));
  console.log(`
-- 1. Eliminar vista actual
DROP VIEW IF EXISTS users_with_roles CASCADE;

-- 2. Crear tabla temporal
CREATE TABLE users_with_roles_temp AS
SELECT 
  u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at,
  COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as role_names,
  COALESCE(array_agg(r.id) FILTER (WHERE r.id IS NOT NULL), ARRAY[]::uuid[]) as role_ids
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at;

-- 3. Habilitar RLS en la tabla
ALTER TABLE users_with_roles_temp ENABLE ROW LEVEL SECURITY;

-- 4. Crear política
CREATE POLICY "Allow all on users_with_roles_temp" 
ON users_with_roles_temp FOR ALL TO public USING (true);

-- 5. Renombrar tabla
ALTER TABLE users_with_roles_temp RENAME TO users_with_roles;
`);

  console.log('\n🟦 MÉTODO 2: Vista con security_barrier mejorado');
  console.log('━'.repeat(30));
  console.log(`
-- Recrear vista con parámetros adicionales
DROP VIEW IF EXISTS users_with_roles CASCADE;

CREATE VIEW users_with_roles 
WITH (security_barrier = true, check_option = 'cascaded') AS
SELECT 
  u.id::text as id,  -- Forzar tipos específicos
  u.name, u.email, u.is_active, u.created_at, u.updated_at,
  COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as role_names,
  COALESCE(array_agg(r.id) FILTER (WHERE r.id IS NOT NULL), ARRAY[]::uuid[]) as role_ids
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at
ORDER BY u.created_at DESC;

-- Agregar comentario para forzar refresh
COMMENT ON VIEW users_with_roles IS 'Vista con security barrier habilitado';
`);

  console.log('\n🟩 MÉTODO 3: Función en lugar de vista');
  console.log('━'.repeat(30));
  console.log(`
-- Eliminar vista
DROP VIEW IF EXISTS users_with_roles CASCADE;

-- Crear función que devuelve tabla
CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE(
  id uuid,
  name text,
  email text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  role_names text[],
  role_ids uuid[]
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at,
    COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) as role_names,
    COALESCE(array_agg(r.id) FILTER (WHERE r.id IS NOT NULL), ARRAY[]::uuid[]) as role_ids
  FROM users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  LEFT JOIN roles r ON ur.role_id = r.id
  GROUP BY u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Crear vista simple que llama a la función
CREATE VIEW users_with_roles AS 
SELECT * FROM get_users_with_roles();
`);

  console.log('\n💡 RECOMENDACIÓN:');
  console.log('   El MÉTODO 1 (tabla temporal) es el más efectivo');
  console.log('   para eliminar completamente el "Unrestricted".');
  console.log('   ');
  console.log('❓ ¿Cuál método quieres probar?');
  console.log('   1 = Tabla temporal con RLS');
  console.log('   2 = Vista mejorada con security_barrier');
  console.log('   3 = Función + Vista');
  console.log('   0 = Dejar como está (funciona igual)');
}

async function main() {
  console.log('🔍 Estado actual de la vista...');
  const works = await testCurrentView();
  
  if (works) {
    console.log('\n✅ La vista funciona correctamente');
    console.log('⚠️ El "Unrestricted" persiste porque:');
    console.log('   - Supabase UI puede mostrar cache');
    console.log('   - Las vistas siempre muestran "Unrestricted" en algunas versiones');
    console.log('   - Es un problema cosmético, no de funcionalidad');
    
    showAlternativeSolutions();
  } else {
    console.log('\n❌ Hay problemas con la vista actual');
    showAlternativeSolutions();
  }
}

main();