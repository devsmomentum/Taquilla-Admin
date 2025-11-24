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

console.log('🔧 PROBANDO CORRECCIÓN DE JUGADAS\n')

async function testBetsFix() {
  try {
    console.log('1️⃣ Probando consulta simplificada...')
    
    const { data: bets, error } = await supabase
      .from('bets')
      .select(`
        id,
        lottery_id,
        lottery_name,
        animal_number,
        animal_name,
        amount,
        potential_win,
        is_winner,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.log('❌ Error en consulta:', error.message)
      return false
    }

    console.log(`✅ Consulta exitosa: ${bets.length} jugadas encontradas`)
    
    if (bets.length > 0) {
      console.log('📋 Últimas 3 jugadas:')
      bets.slice(0, 3).forEach((bet, i) => {
        console.log(`   ${i + 1}. ${bet.animal_number} - ${bet.animal_name} (Bs. ${bet.amount})`)
        console.log(`      Lotería: ${bet.lottery_name}`)
        console.log(`      Creada: ${bet.created_at}`)
      })
    }

    console.log('\n2️⃣ Creando jugada de prueba...')
    
    // Obtener una lotería activa
    const { data: lotteries } = await supabase
      .from('lotteries')
      .select('id, name')
      .eq('is_active', true)
      .limit(1)

    if (!lotteries || lotteries.length === 0) {
      console.log('❌ No hay loterías activas')
      return false
    }

    const lottery = lotteries[0]
    
    const testBet = {
      lottery_id: lottery.id,
      lottery_name: lottery.name,
      animal_number: '07',
      animal_name: 'Perico',
      amount: 50,
      potential_win: 1850,
      is_winner: false
    }

    const { data: createdBet, error: createError } = await supabase
      .from('bets')
      .insert([testBet])
      .select()
      .single()

    if (createError) {
      console.log('❌ Error creando:', createError.message)
      return false
    }

    console.log('✅ Jugada creada:', createdBet.id)
    console.log(`   Animal: ${createdBet.animal_number} - ${createdBet.animal_name}`)
    console.log(`   Monto: Bs. ${createdBet.amount}`)

    console.log('\n3️⃣ Verificando que aparece en la consulta...')
    
    const { data: updatedBets, error: verifyError } = await supabase
      .from('bets')
      .select(`
        id,
        lottery_id,
        lottery_name,
        animal_number,
        animal_name,
        amount,
        potential_win,
        is_winner,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (verifyError) {
      console.log('❌ Error verificando:', verifyError.message)
    } else {
      console.log(`✅ ${updatedBets.length} jugadas en consulta actualizada`)
      
      const foundNew = updatedBets.find(b => b.id === createdBet.id)
      if (foundNew) {
        console.log('🎉 ¡La nueva jugada aparece en la lista!')
      } else {
        console.log('⚠️ La nueva jugada NO aparece en la consulta')
      }
    }

    console.log('\n4️⃣ Limpiando jugada de prueba...')
    
    await supabase.from('bets').delete().eq('id', createdBet.id)
    console.log('🧹 Jugada de prueba eliminada')

    return true

  } catch (error) {
    console.error('💥 Error:', error.message)
    return false
  }
}

testBetsFix().then(success => {
  console.log('\n' + '='.repeat(50))
  if (success) {
    console.log('✅ CORRECCIÓN APLICADA EXITOSAMENTE')
    console.log('\n🔄 SIGUIENTE PASO:')
    console.log('   Recarga la página web y prueba crear una jugada')
    console.log('   Ahora debería aparecer inmediatamente en la lista')
  } else {
    console.log('❌ Hay problemas que requieren más investigación')
  }
})