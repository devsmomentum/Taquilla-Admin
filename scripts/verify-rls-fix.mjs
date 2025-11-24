import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Verificando que RLS está arreglado...\n');

async function verifyFix() {
  try {
    const testLottery = {
      name: `Verificación RLS ${Date.now()}`,
      opening_time: '09:00',
      closing_time: '18:00',
      draw_time: '19:00',
      is_active: true,
      plays_tomorrow: false
    };
    
    console.log('📝 Intentando crear lotería de prueba...');
    const { data, error } = await supabase
      .from('lotteries')
      .insert([testLottery])
      .select();
    
    if (error) {
      console.log('❌ RLS aún no está arreglado:', error.message);
      console.log('💡 Asegúrate de haber ejecutado el SQL en Supabase Dashboard');
    } else {
      console.log('✅ ¡ÉXITO! RLS está arreglado correctamente');
      console.log('🎉 Lotería creada:', data[0].name);
      
      // Limpiar
      await supabase.from('lotteries').delete().eq('id', data[0].id);
      console.log('🧹 Lotería de prueba eliminada');
    }
    
  } catch (err) {
    console.log('💥 Error:', err.message);
  }
}

verifyFix();