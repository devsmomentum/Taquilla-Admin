import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 ARREGLANDO POLÍTICAS RLS PARA USER_ROLES');
console.log('='.repeat(50));

async function fixUserRolesPolicies() {
  try {
    console.log('🛡️ Verificando políticas RLS para user_roles...');
    
    // Probar si podemos insertar en user_roles
    console.log('📝 Probando inserción en user_roles...');
    
    // Primero crear un usuario y rol temporales
    const tempUser = {
      name: 'Test User',
      email: `test-${Date.now()}@test.com`,
      password_hash: 'hash',
      is_active: true
    };

    const tempRole = {
      name: `Test Role ${Date.now()}`,
      description: 'Test role',
      permissions: ['test'],
      is_system: false
    };

    const { data: users } = await supabase.from('users').insert([tempUser]).select();
    const { data: roles } = await supabase.from('roles').insert([tempRole]).select();

    if (!users || !roles) {
      throw new Error('No se pudieron crear usuario y rol temporales');
    }

    const userId = users[0].id;
    const roleId = roles[0].id;

    // Intentar crear relación user_role
    const { data: userRole, error: userRoleError } = await supabase
      .from('user_roles')
      .insert([{ user_id: userId, role_id: roleId }])
      .select();

    if (userRoleError) {
      console.log('❌ Error RLS detectado:', userRoleError.message);
      console.log('\n🔧 Las políticas RLS para user_roles necesitan ser configuradas.');
      console.log('\n📋 EJECUTA ESTOS COMANDOS EN SUPABASE SQL EDITOR:');
      console.log('━'.repeat(60));
      console.log(`
-- Políticas RLS para user_roles
CREATE POLICY "Allow all operations on user_roles" ON "public"."user_roles"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);
`);
      console.log('━'.repeat(60));
      
      // Limpiar datos temporales
      await supabase.from('users').delete().eq('id', userId);
      await supabase.from('roles').delete().eq('id', roleId);
      
      return false;
    } else {
      console.log('✅ RLS para user_roles funciona correctamente');
      
      // Limpiar datos temporales
      await supabase.from('user_roles').delete().eq('user_id', userId);
      await supabase.from('users').delete().eq('id', userId);
      await supabase.from('roles').delete().eq('id', roleId);
      
      return true;
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
    return false;
  }
}

fixUserRolesPolicies().then(success => {
  if (success) {
    console.log('\n🎉 ¡Políticas RLS funcionando correctamente!');
  } else {
    console.log('\n⚠️ Necesitas configurar las políticas RLS mostradas arriba.');
  }
});