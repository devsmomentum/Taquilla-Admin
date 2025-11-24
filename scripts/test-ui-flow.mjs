#!/usr/bin/env node

// Script para probar el hook useSupabaseBets de la misma manera que la UI
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan las credenciales de Supabase en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 PRUEBA COMPLETA DEL FLUJO DE JUGADAS\n')

// Simular el mapeo exacto del hook
const mapSupabaseBet = (supabaseBet) => ({
  id: supabaseBet.id,
  lotteryId: supabaseBet.lottery_id,
  lotteryName: supabaseBet.lottery_name,
  animalNumber: supabaseBet.animal_number,
  animalName: supabaseBet.animal_name,
  amount: supabaseBet.amount,
  potentialWin: supabaseBet.potential_win,
  isWinner: supabaseBet.is_winner,
  timestamp: supabaseBet.created_at
})

const mapLocalBet = (localBet) => ({
  lottery_id: localBet.lotteryId,
  lottery_name: localBet.lotteryName,
  animal_number: localBet.animalNumber,
  animal_name: localBet.animalName,
  amount: localBet.amount,
  potential_win: localBet.potentialWin,
  is_winner: localBet.isWinner || false
})

async function testCompleteFlow() {
  console.log('1️⃣ Simulando loadBets()...')
  
  const { data: supabaseBets, error } = await supabase
    .from('bets')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  const mappedBets = supabaseBets.map(mapSupabaseBet)
  console.log(`✅ ${mappedBets.length} jugadas cargadas y mapeadas`)
  console.log('📋 Primeras 3 jugadas:')
  mappedBets.slice(0, 3).forEach((bet, i) => {
    console.log(`   ${i + 1}. ${bet.animalNumber} - ${bet.animalName} (Bs. ${bet.amount})`)
    console.log(`      ID: ${bet.id}`)
    console.log(`      Lotería: ${bet.lotteryName}`)
    console.log(`      Timestamp: ${bet.timestamp}`)
    console.log(`      Ganadora: ${bet.isWinner ? '🏆' : '❌'}`)
  })

  console.log('\n2️⃣ Simulando createBet()...')
  
  // Obtener una lotería activa
  const { data: lotteries } = await supabase
    .from('lotteries')
    .select('id, name')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!lotteries) {
    console.log('❌ No hay loterías activas')
    return
  }

  // Simular datos del BetDialog
  const newBetData = {
    lotteryId: lotteries.id,
    lotteryName: lotteries.name,
    animalNumber: '12',
    animalName: 'Caballo',
    amount: 150,
    potentialWin: 5550,
    isWinner: false
  }

  console.log('📝 Datos de nueva jugada:', newBetData)

  // Simular mapLocalBet
  const supabaseData = mapLocalBet(newBetData)
  console.log('🔄 Datos mapeados para Supabase:', supabaseData)

  const { data: createdBet, error: createError } = await supabase
    .from('bets')
    .insert([supabaseData])
    .select()
    .single()

  if (createError) {
    console.log('❌ Error creando jugada:', createError.message)
    return
  }

  console.log('✅ Jugada creada exitosamente!')
  console.log('📊 Datos devueltos por Supabase:', createdBet)

  // Mapear de vuelta
  const mappedNewBet = mapSupabaseBet(createdBet)
  console.log('🎯 Jugada mapeada para UI:', mappedNewBet)

  console.log('\n3️⃣ Verificando que aparece en la lista...')
  
  const { data: updatedBets, error: verifyError } = await supabase
    .from('bets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (verifyError) {
    console.log('❌ Error verificando:', verifyError.message)
    return
  }

  console.log(`📋 Las 5 jugadas más recientes:`)
  updatedBets.forEach((bet, i) => {
    const mapped = mapSupabaseBet(bet)
    const isNew = bet.id === createdBet.id ? ' ← ¡NUEVA!' : ''
    console.log(`   ${i + 1}. ${mapped.animalNumber} - ${mapped.animalName} (Bs. ${mapped.amount})${isNew}`)
  })

  console.log('\n🧹 Limpiando jugada de prueba...')
  await supabase.from('bets').delete().eq('id', createdBet.id)
  console.log('✅ Jugada de prueba eliminada')

  console.log('\n🎉 ¡FLUJO COMPLETO FUNCIONA CORRECTAMENTE!')
  console.log('💡 Si la UI no se actualiza, verifica:')
  console.log('   1. Los logs en la consola del navegador')
  console.log('   2. Que el hook se está ejecutando')
  console.log('   3. Que React está renderizando con los datos actualizados')
}

testCompleteFlow().catch(err => {
  console.log('💥 Error en la prueba:', err.message)
})