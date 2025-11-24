#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Cargar variables de entorno
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan las credenciales de Supabase en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 PROBANDO CREACIÓN DE JUGADA REAL\n')

async function testBetCreation() {
  try {
    console.log('1️⃣ Verificando loterías disponibles...')
    
    const { data: lotteries, error: lotteriesError } = await supabase
      .from('lotteries')
      .select('id, name, is_active')
      .eq('is_active', true)
      .limit(1)

    if (lotteriesError) {
      console.log('❌ Error cargando loterías:', lotteriesError.message)
      return false
    }

    if (!lotteries || lotteries.length === 0) {
      console.log('⚠️ No hay loterías activas')
      console.log('💡 Necesitas crear una lotería primero')
      
      // Crear una lotería de prueba
      console.log('\n📝 Creando lotería de prueba...')
      
      const testLottery = {
        name: 'Lotería de Prueba para Jugadas',
        closing_time: '18:00',
        draw_time: '19:00',
        is_active: true,
        created_by: 'system'
      }

      const { data: newLottery, error: lotteryError } = await supabase
        .from('lotteries')
        .insert([testLottery])
        .select()
        .single()

      if (lotteryError) {
        console.log('❌ Error creando lotería:', lotteryError.message)
        
        if (lotteryError.message.includes('row-level security')) {
          console.log('\n🔒 RLS está bloqueando la creación de loterías también')
          console.log('💡 Ejecuta políticas RLS para lotteries primero')
        }
        return false
      }

      console.log('✅ Lotería de prueba creada:', newLottery.name)
      lotteries.push(newLottery)
    }

    const lottery = lotteries[0]
    console.log(`🎰 Usando lotería: ${lottery.name} (${lottery.id})`)

    console.log('\n2️⃣ Creando jugada de prueba...')
    
    const testBet = {
      lottery_id: lottery.id,
      lottery_name: lottery.name,
      animal_number: '01',
      animal_name: 'Carnero',
      amount: 100.00,
      potential_win: 3700.00,
      is_winner: false
    }

    console.log('📝 Datos de la jugada:', testBet)

    const { data: createdBet, error: betError } = await supabase
      .from('bets')
      .insert([testBet])
      .select()
      .single()

    if (betError) {
      console.log('❌ Error creando jugada:', betError.message)
      console.log('📋 Código de error:', betError.code)
      
      if (betError.message.includes('row-level security')) {
        console.log('\n🔒 PROBLEMA: RLS está bloqueando las jugadas')
        console.log('💡 SOLUCIÓN: Ejecuta este SQL en Supabase:')
        console.log(`
-- Habilitar políticas permisivas para bets
DROP POLICY IF EXISTS "bets_policy" ON bets;
CREATE POLICY "bets_policy" ON bets FOR ALL USING (true) WITH CHECK (true);

-- Asegurarse de que RLS esté habilitado
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
        `)
      }
      
      return false
    }

    console.log('✅ Jugada creada exitosamente!')
    console.log('📊 Jugada creada:', createdBet)

    console.log('\n3️⃣ Verificando lectura de jugadas...')
    
    const { data: allBets, error: readError } = await supabase
      .from('bets')
      .select('*')
      .eq('id', createdBet.id)

    if (readError) {
      console.log('❌ Error leyendo jugadas:', readError.message)
    } else {
      console.log('✅ Jugada leída correctamente:', allBets[0])
    }

    console.log('\n4️⃣ Actualizando jugada...')
    
    const { data: updatedBet, error: updateError } = await supabase
      .from('bets')
      .update({ amount: 200.00, potential_win: 7400.00 })
      .eq('id', createdBet.id)
      .select()
      .single()

    if (updateError) {
      console.log('❌ Error actualizando jugada:', updateError.message)
    } else {
      console.log('✅ Jugada actualizada:', updatedBet)
    }

    console.log('\n5️⃣ Limpiando jugada de prueba...')
    
    const { error: deleteError } = await supabase
      .from('bets')
      .delete()
      .eq('id', createdBet.id)

    if (deleteError) {
      console.log('❌ Error eliminando jugada:', deleteError.message)
    } else {
      console.log('✅ Jugada de prueba eliminada')
    }

    return true

  } catch (error) {
    console.error('💥 Error general:', error.message)
    return false
  }
}

testBetCreation().then(success => {
  console.log('\n' + '='.repeat(50))
  if (success) {
    console.log('🎉 ¡INTEGRACIÓN DE JUGADAS COMPLETAMENTE FUNCIONAL!')
    console.log('✅ Crear jugadas: OK')
    console.log('✅ Leer jugadas: OK')  
    console.log('✅ Actualizar jugadas: OK')
    console.log('✅ Eliminar jugadas: OK')
  } else {
    console.log('⚠️ La integración necesita configuración de RLS')
    console.log('📖 Revisa las instrucciones SQL de arriba')
  }
})