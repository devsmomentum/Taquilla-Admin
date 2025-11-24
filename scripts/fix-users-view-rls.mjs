import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔒 CONFIGURANDO RLS PARA users_with_roles');
console.log('='.repeat(50));

async function testViewAccess() {
  try {
    console.log('🧪 Probando acceso actual a users_with_roles...');
    
    const { data, error } = await supabase
      .from('users_with_roles')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error accediendo a la vista:', error.message);
      return false;
    } else {
      console.log('✅ Vista accesible actualmente (sin RLS)');
      return true;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

async function showRLSCommands() {
  console.log('\n🔧 NECESITAS EJECUTAR ESTOS COMANDOS EN SUPABASE SQL EDITOR:');
  console.log('━'.repeat(70));
  console.log(`
-- 1. Habilitar RLS en la vista users_with_roles
ALTER VIEW users_with_roles SET (security_invoker = on);

-- O si prefieres usar una política más específica:
-- (Ejecuta UNA de estas dos opciones)

-- OPCIÓN A: Política permisiva (recomendada para desarrollo)
CREATE POLICY "Allow authenticated users to view users_with_roles" 
ON users_with_roles FOR SELECT 
TO authenticated 
USING (true);

-- OPCIÓN B: Política más restrictiva (para producción)
CREATE POLICY "Allow users to view users_with_roles" 
ON users_with_roles FOR SELECT 
TO public 
USING (true);
`);
  console.log('━'.repeat(70));
  
  console.log('\n📋 PASOS:');
  console.log('1. Ve a Supabase SQL Editor');
  console.log('2. Ejecuta el primer comando (ALTER VIEW)');
  console.log('3. Ejecuta UNA de las opciones de política');
  console.log('4. Vuelve aquí para verificar');
}

async function main() {
  const canAccess = await testViewAccess();
  
  if (canAccess) {
    console.log('\n⚠️ La vista users_with_roles está "Unrestricted"');
    console.log('🔓 Esto significa que no tiene políticas RLS configuradas');
    
    await showRLSCommands();
    
    console.log('\n💡 NOTA IMPORTANTE:');
    console.log('   Las vistas en PostgreSQL heredan las políticas de sus tablas base,');
    console.log('   pero para mayor seguridad es recomendable configurar RLS específico.');
  }
}

main();