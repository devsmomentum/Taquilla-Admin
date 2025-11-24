import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Configurando políticas RLS para loterías...\n');

async function setupLotteryPolicies() {
  try {
    // 1. Verificar estado actual de la tabla lotteries
    console.log('1. Verificando tabla lotteries...');
    const { data: lotteries, error: checkError } = await supabase
      .from('lotteries')
      .select('count');
    
    if (checkError) {
      console.log('❌ Error accediendo a lotteries:', checkError.message);
      return false;
    }
    
    console.log('✅ Tabla lotteries accesible');
    
    // 2. Intentar crear una lotería de prueba para ver el error actual
    console.log('\n2. Probando creación de lotería (para ver error actual)...');
    const testLottery = {
      name: `Lotería Prueba RLS ${Date.now()}`,
      opening_time: '09:00',
      closing_time: '18:00',
      draw_time: '19:00',
      is_active: true,
      plays_tomorrow: false
    };
    
    const { data: createResult, error: createError } = await supabase
      .from('lotteries')
      .insert([testLottery])
      .select();
    
    if (createError) {
      console.log('❌ Error creando lotería (esperado):', createError.message);
      
      if (createError.message.includes('row-level security policy') || 
          createError.message.includes('RLS') ||
          createError.code === 'PGRST301') {
        console.log('🎯 Confirmado: Error de RLS detectado');
        console.log('📝 Procediendo a configurar políticas permisivas...');
        
        // Configurar políticas simples para desarrollo
        await setupSimplePolicies();
        
        // Probar de nuevo
        console.log('\n3. Probando creación después de políticas...');
        const { data: retryResult, error: retryError } = await supabase
          .from('lotteries')
          .insert([{
            name: `Lotería Prueba Después RLS ${Date.now()}`,
            opening_time: '09:00',
            closing_time: '18:00', 
            draw_time: '19:00',
            is_active: true,
            plays_tomorrow: false
          }])
          .select();
        
        if (retryError) {
          console.log('❌ Aún hay error después de políticas:', retryError.message);
          console.log('💡 Necesitas ejecutar las políticas manualmente en Supabase Dashboard');
        } else {
          console.log('✅ ¡Éxito! Lotería creada después de configurar RLS');
          
          // Limpiar loterías de prueba
          if (retryResult && retryResult[0]) {
            await supabase
              .from('lotteries')
              .delete()
              .eq('id', retryResult[0].id);
            console.log('🧹 Lotería de prueba eliminada');
          }
        }
        
      } else {
        console.log('❓ Error diferente a RLS:', createError);
      }
    } else {
      console.log('✅ ¡Lotería creada exitosamente! RLS ya está configurado correctamente');
      
      // Limpiar lotería de prueba
      if (createResult && createResult[0]) {
        await supabase
          .from('lotteries')
          .delete()
          .eq('id', createResult[0].id);
        console.log('🧹 Lotería de prueba eliminada');
      }
    }
    
  } catch (error) {
    console.error('💥 Error general:', error.message);
  }
}

async function setupSimplePolicies() {
  console.log('\n📋 Nota: Las políticas RLS deben configurarse desde el Dashboard de Supabase');
  console.log('🔗 Ve a: https://supabase.com/dashboard/project/dxfivioylmbpumzcpwtu/editor');
  console.log('\n📝 Ejecuta este SQL en el SQL Editor:');
  
  const sqlScript = `
-- Configurar políticas simples para lotteries
ALTER TABLE lotteries ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Enable all operations for lotteries" ON lotteries;

-- Crear política permisiva simple
CREATE POLICY "Enable all operations for lotteries" 
ON lotteries FOR ALL 
USING (true) 
WITH CHECK (true);

-- Lo mismo para prizes
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for prizes" ON prizes;
CREATE POLICY "Enable all operations for prizes" 
ON prizes FOR ALL 
USING (true) 
WITH CHECK (true);
`;
  
  console.log('```sql');
  console.log(sqlScript);
  console.log('```');
}

setupLotteryPolicies();