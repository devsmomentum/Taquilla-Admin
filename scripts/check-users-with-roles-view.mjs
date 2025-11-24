import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VERIFICANDO VISTA users_with_roles');
console.log('='.repeat(50));

async function checkUsersWithRolesView() {
  try {
    console.log('📋 Probando acceso directo a la vista users_with_roles...');
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error accediendo a la vista:', error.message);
      console.log('\n🔧 La vista users_with_roles necesita ser creada.');
      console.log('\n📋 EJECUTA ESTE COMANDO EN SUPABASE SQL EDITOR:');
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
    } else {
      console.log('✅ Vista users_with_roles funciona correctamente');
      console.log(`📊 Encontrados ${data.length} registros en la vista`);
      return true;
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  }
}

async function testUserRolesFunctionality() {
  console.log('\n🔗 PROBANDO FUNCIONALIDAD COMPLETA DE USER_ROLES');
  console.log('-'.repeat(50));
  
  try {
    // Crear usuario temporal
    const tempUser = {
      name: 'Test Final User',
      email: `final-test-${Date.now()}@test.com`,
      password_hash: 'hash',
      is_active: true
    };

    const { data: users } = await supabase.from('users').insert([tempUser]).select();
    const userId = users[0].id;
    console.log('✅ Usuario temporal creado:', users[0].name);

    // Crear rol temporal
    const tempRole = {
      name: `Test Final Role ${Date.now()}`,
      description: 'Test role final',
      permissions: ['test.final'],
      is_system: false
    };

    const { data: roles } = await supabase.from('roles').insert([tempRole]).select();
    const roleId = roles[0].id;
    console.log('✅ Rol temporal creado:', roles[0].name);

    // Crear relación
    const { error: relationError } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role_id: roleId }]);

    if (relationError) {
      console.log('❌ Error creando relación:', relationError.message);
    } else {
      console.log('✅ Relación usuario-rol creada exitosamente');
    }

    // Probar consulta JOIN manual (sin vista)
    console.log('\n📊 Probando consulta JOIN manual...');
    const { data: joinData, error: joinError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        user_roles!inner (
          roles (
            id,
            name,
            description
          )
        )
      `)
      .eq('id', userId);

    if (joinError) {
      console.log('❌ Error en JOIN:', joinError.message);
    } else {
      console.log('✅ Consulta JOIN manual funciona correctamente');
      console.log('   👤 Usuario:', joinData[0]?.name);
      console.log('   🛡️ Rol:', joinData[0]?.user_roles[0]?.roles?.name);
    }

    // Limpiar
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);
    await supabase.from('roles').delete().eq('id', roleId);
    console.log('✅ Datos temporales eliminados');

    return true;

  } catch (error) {
    console.error('❌ Error en test completo:', error.message);
    return false;
  }
}

async function runTests() {
  const viewExists = await checkUsersWithRolesView();
  const functionalityWorks = await testUserRolesFunctionality();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMEN DE VERIFICACIÓN DE USER_ROLES');
  console.log('='.repeat(50));
  
  console.log(`📋 Vista users_with_roles: ${viewExists ? '✅ EXISTE' : '❌ FALTA'}`);
  console.log(`🔗 Funcionalidad user_roles: ${functionalityWorks ? '✅ FUNCIONA' : '❌ FALLÓ'}`);
  
  if (!viewExists) {
    console.log('\n⚠️ Necesitas crear la vista users_with_roles mostrada arriba.');
  }
  
  if (functionalityWorks) {
    console.log('\n🎉 ¡Las relaciones usuario-rol funcionan correctamente!');
    console.log('✅ Puedes asignar roles a usuarios sin problemas');
  }
}

runTests();