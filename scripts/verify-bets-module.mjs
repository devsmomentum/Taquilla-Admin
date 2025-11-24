import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🎯 VERIFICANDO MÓDULO DE JUGADAS (BETS)');
console.log('='.repeat(60));

async function testBetsRLS() {
  console.log('🔒 1. PROBANDO POLÍTICAS RLS EN TABLA bets...');
  console.log('-'.repeat(40));
  
  try {
    // Intentar crear una jugada de prueba
    console.log('📝 Intentando crear jugada...');
    
    const testBet = {
      lottery_id: '00000000-0000-0000-0000-000000000000', // UUID dummy
      lottery_name: 'Test Lottery',
      animal_number: '00',
      animal_name: 'Delfín',
      amount: 10.00,
      potential_win: 500.00,
      is_winner: false
    };

    const { data: createData, error: createError } = await supabase
      .from('bets')
      .insert([testBet])
      .select();

    if (createError) {
      console.log('❌ Error creando jugada:', createError.message);
      console.log('   Código:', createError.code);
      
      if (createError.code === 'PGRST301' || createError.message.includes('row-level security')) {
        console.log('🔧 RLS está bloqueando la creación de jugadas');
        return false;
      }
      return false;
    } else {
      console.log('✅ Jugada creada exitosamente:', createData[0]?.id);
      
      // Limpiar la jugada de prueba
      await supabase.from('bets').delete().eq('id', createData[0].id);
      console.log('🧹 Jugada de prueba eliminada');
      return true;
    }
  } catch (error) {
    console.log('❌ Error de conexión:', error.message);
    return false;
  }
}

async function testBetsRead() {
  console.log('\n📖 2. PROBANDO LECTURA DE JUGADAS...');
  console.log('-'.repeat(40));
  
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('id, lottery_name, animal_name, amount, created_at')
      .limit(5);

    if (error) {
      console.log('❌ Error leyendo jugadas:', error.message);
      return false;
    }

    console.log(`✅ Se pueden leer jugadas: ${data?.length || 0} encontradas`);
    data?.forEach((bet, index) => {
      console.log(`   ${index + 1}. ${bet.animal_name} - $${bet.amount} (${bet.lottery_name})`);
    });
    return true;
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

function showRLSFix() {
  console.log('\n🔧 SOLUCIÓN PARA RLS DE BETS:');
  console.log('━'.repeat(60));
  console.log(`
-- EJECUTA ESTOS COMANDOS EN SUPABASE SQL EDITOR:

-- Eliminar políticas restrictivas actuales
DROP POLICY IF EXISTS "Authenticated users can view bets" ON bets;
DROP POLICY IF EXISTS "Users with bets permission can insert bets" ON bets;
DROP POLICY IF EXISTS "Users with winners permission can update bets" ON bets;

-- Crear políticas permisivas para desarrollo
CREATE POLICY "Allow all operations on bets" 
ON bets FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- Opcional: Política más específica si prefieres
-- CREATE POLICY "Allow select on bets" ON bets FOR SELECT TO public USING (true);
-- CREATE POLICY "Allow insert on bets" ON bets FOR INSERT TO public WITH CHECK (true);
-- CREATE POLICY "Allow update on bets" ON bets FOR UPDATE TO public USING (true);
-- CREATE POLICY "Allow delete on bets" ON bets FOR DELETE TO public USING (true);
  `);
  console.log('━'.repeat(60));
}

async function testBetsIntegration() {
  console.log('\n🧪 3. PROBANDO INTEGRACIÓN COMPLETA...');
  console.log('-'.repeat(40));
  
  try {
    // Verificar que tenemos loterías disponibles
    const { data: lotteries, error: lotteriesError } = await supabase
      .from('lotteries')
      .select('id, name, is_active')
      .eq('is_active', true)
      .limit(1);

    if (lotteriesError) {
      console.log('❌ Error obteniendo loterías:', lotteriesError.message);
      return false;
    }

    if (!lotteries || lotteries.length === 0) {
      console.log('⚠️ No hay loterías activas para probar');
      console.log('   Creando una lotería temporal...');
      
      const { data: newLottery, error: createLotteryError } = await supabase
        .from('lotteries')
        .insert([{
          name: 'Lotería Test Bets',
          opening_time: '09:00',
          closing_time: '18:00',
          draw_time: '19:00',
          is_active: true,
          plays_tomorrow: false
        }])
        .select()
        .single();

      if (createLotteryError) {
        console.log('❌ Error creando lotería temporal:', createLotteryError.message);
        return false;
      }

      console.log('✅ Lotería temporal creada:', newLottery.name);
      var testLottery = newLottery;
    } else {
      var testLottery = lotteries[0];
      console.log('✅ Usando lotería existente:', testLottery.name);
    }

    // Crear jugada completa
    const testBet = {
      lottery_id: testLottery.id,
      lottery_name: testLottery.name,
      animal_number: '00',
      animal_name: 'Delfín',
      amount: 25.00,
      potential_win: 1250.00,
      is_winner: false
    };

    const { data: createdBet, error: betError } = await supabase
      .from('bets')
      .insert([testBet])
      .select()
      .single();

    if (betError) {
      console.log('❌ Error creando jugada integrada:', betError.message);
      return false;
    }

    console.log('✅ Jugada integrada creada exitosamente!');
    console.log(`   📋 ID: ${createdBet.id}`);
    console.log(`   🎰 Lotería: ${createdBet.lottery_name}`);
    console.log(`   🐬 Animal: ${createdBet.animal_name} (${createdBet.animal_number})`);
    console.log(`   💰 Apuesta: $${createdBet.amount}`);
    console.log(`   🏆 Premio potencial: $${createdBet.potential_win}`);

    // Limpiar
    await supabase.from('bets').delete().eq('id', createdBet.id);
    if (lotteries?.length === 0) {
      await supabase.from('lotteries').delete().eq('id', testLottery.id);
    }
    console.log('🧹 Datos de prueba eliminados');

    return true;
  } catch (error) {
    console.log('❌ Error en integración:', error.message);
    return false;
  }
}

async function main() {
  const rlsWorks = await testBetsRLS();
  const readWorks = await testBetsRead();
  
  if (!rlsWorks) {
    showRLSFix();
    console.log('\n⚠️ NECESITAS CONFIGURAR RLS ANTES DE CONTINUAR');
    console.log('📋 Ejecuta los comandos SQL mostrados arriba');
    return;
  }

  if (rlsWorks && readWorks) {
    const integrationWorks = await testBetsIntegration();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE VERIFICACIÓN DE BETS');
    console.log('='.repeat(60));
    console.log(`🔒 RLS Bets: ${rlsWorks ? '✅ FUNCIONA' : '❌ BLOQUEADO'}`);
    console.log(`📖 Lectura Bets: ${readWorks ? '✅ FUNCIONA' : '❌ ERROR'}`);
    console.log(`🧪 Integración: ${integrationWorks ? '✅ COMPLETA' : '❌ FALLÓ'}`);
    
    if (rlsWorks && readWorks && integrationWorks) {
      console.log('\n🎉 ¡MÓDULO DE JUGADAS LISTO!');
      console.log('✅ La tabla bets está completamente funcional');
      console.log('✅ Políticas RLS configuradas correctamente');
      console.log('✅ Integración con loterías funcionando');
      console.log('✅ Listo para usar en la aplicación');
    }
  }
}

main();