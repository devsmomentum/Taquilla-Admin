import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🏗️ CREANDO VISTA users_with_roles');
console.log('='.repeat(50));

async function createUsersWithRolesView() {
  try {
    console.log('📝 Creando vista users_with_roles en Supabase...');
    
    const viewSQL = `
CREATE OR REPLACE VIEW users_with_roles AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.is_active,
  u.created_at,
  u.updated_at,
  COALESCE(
    array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), 
    ARRAY[]::text[]
  ) as role_names,
  COALESCE(
    array_agg(r.id) FILTER (WHERE r.id IS NOT NULL), 
    ARRAY[]::uuid[]
  ) as role_ids
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at
ORDER BY u.created_at DESC;
    `;

    // Ejecutar el SQL para crear la vista
    const { error: viewError } = await supabase.rpc('exec_sql', { 
      sql: viewSQL 
    });

    if (viewError) {
      console.log('❌ No se puede crear la vista automáticamente:', viewError.message);
      console.log('\n🔧 NECESITAS EJECUTAR ESTE SQL MANUALMENTE EN SUPABASE:');
      console.log('━'.repeat(60));
      console.log(viewSQL);
      console.log('━'.repeat(60));
      console.log('\n📋 PASOS:');
      console.log('1. Ve a tu proyecto Supabase');
      console.log('2. Abre el SQL Editor');
      console.log('3. Pega el SQL de arriba');
      console.log('4. Haz clic en "Run"');
      return false;
    }

    console.log('✅ Vista users_with_roles creada exitosamente');
    return true;

  } catch (error) {
    console.log('❌ Error creando la vista:', error.message);
    console.log('\n🔧 EJECUTA ESTE SQL MANUALMENTE EN SUPABASE SQL EDITOR:');
    console.log('━'.repeat(60));
    console.log(`
-- Vista users_with_roles
CREATE OR REPLACE VIEW users_with_roles AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.is_active,
  u.created_at,
  u.updated_at,
  COALESCE(
    array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), 
    ARRAY[]::text[]
  ) as role_names,
  COALESCE(
    array_agg(r.id) FILTER (WHERE r.id IS NOT NULL), 
    ARRAY[]::uuid[]
  ) as role_ids
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at
ORDER BY u.created_at DESC;
    `);
    console.log('━'.repeat(60));
    return false;
  }
}

async function testViewAfterCreation() {
  console.log('\n🧪 PROBANDO LA VISTA CREADA');
  console.log('-'.repeat(30));
  
  try {
    console.log('📊 Probando acceso a users_with_roles...');
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('id, name, email, role_names')
      .limit(3);

    if (error) {
      console.log('❌ Error accediendo a la vista:', error.message);
      return false;
    }

    console.log('✅ Vista funciona correctamente!');
    console.log(`📈 Encontrados ${data.length} usuarios:`);
    
    data.forEach((user, index) => {
      const roles = user.role_names?.length > 0 ? user.role_names.join(', ') : 'Sin roles';
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
      console.log(`      🛡️ Roles: ${roles}`);
    });

    return true;
  } catch (error) {
    console.log('❌ Error probando la vista:', error.message);
    return false;
  }
}

async function runCreation() {
  const created = await createUsersWithRolesView();
  
  if (created) {
    const tested = await testViewAfterCreation();
    
    if (tested) {
      console.log('\n🎉 ¡VISTA CREADA Y FUNCIONANDO!');
      console.log('✅ users_with_roles está lista para usar');
      console.log('✅ Sistema ahora está 100% funcional');
    }
  } else {
    console.log('\n⚠️ Necesitas crear la vista manualmente');
    console.log('📋 Sigue las instrucciones mostradas arriba');
  }
}

runCreation();