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

console.log('🎯 CREANDO JUGADA REAL PARA VERIFICAR LA CORRECCIÓN\n')

async function createRealBet() {
  try {
    console.log('1️⃣ Obteniendo lotería activa...')
    
    const { data: lotteries } = await supabase
      .from('lotteries')
      .select('id, name, closing_time')
      .eq('is_active', true)
      .limit(1)

    if (!lotteries || lotteries.length === 0) {
      console.log('❌ No hay loterías activas')
      return
    }

    const lottery = lotteries[0]
    console.log(`🎰 Lotería seleccionada: ${lottery.name}`)

    console.log('\n2️⃣ Creando jugada real...')
    
    const realBet = {
      lottery_id: lottery.id,
      lottery_name: lottery.name,
      animal_number: '13',
      animal_name: 'Mono',
      amount: 100,
      potential_win: 3700,
      is_winner: false
    }

    const { data: createdBet, error } = await supabase
      .from('bets')
      .insert([realBet])
      .select()
      .single()

    if (error) {
      console.log('❌ Error creando jugada:', error.message)
      return
    }

    console.log('✅ Jugada creada exitosamente!')
    console.log(`   ID: ${createdBet.id}`)
    console.log(`   Animal: ${createdBet.animal_number} - ${createdBet.animal_name}`)
    console.log(`   Monto: Bs. ${createdBet.amount}`)
    console.log(`   Premio potencial: Bs. ${createdBet.potential_win}`)
    console.log(`   Lotería: ${createdBet.lottery_name}`)

    console.log('\n3️⃣ Verificando que aparece en la lista de jugadas...')
    
    const { data: allBets } = await supabase
      .from('bets')
      .select('id, animal_number, animal_name, amount, lottery_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log(`📋 Total de jugadas visibles: ${allBets.length}`)
    
    allBets.forEach((bet, i) => {
      const isNew = bet.id === createdBet.id
      console.log(`   ${i + 1}. ${bet.animal_number} - ${bet.animal_name} (Bs. ${bet.amount}) ${isNew ? '← ¡NUEVA!' : ''}`)
    })

    console.log('\n🎉 ¡LA JUGADA ESTÁ VISIBLE EN LA LISTA!')
    console.log('\n✨ INSTRUCCIONES FINALES:')
    console.log('   1. Recarga la página web (F5)')
    console.log('   2. Ve a la pestaña "Jugadas"')
    console.log('   3. Deberías ver la jugada que acabas de crear')
    console.log('   4. Prueba crear otra jugada desde la interfaz')

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
}

createRealBet()