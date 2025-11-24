#!/usr/bin/env node

// Este script simula el comportamiento del hook useSupabaseBets
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

console.log('🔬 SIMULANDO HOOK useSupabaseBets\n')

// Función de mapeo exacta del hook
const mapSupabaseBet = (supabaseBet) => ({
  id: supabaseBet.id,
  lotteryId: supabaseBet.lottery_id,
  lotteryName: supabaseBet.lottery_name,
  animalNumber: supabaseBet.animal_number,
  animalName: supabaseBet.animal_name,
  amount: Number(supabaseBet.amount),
  potentialWin: Number(supabaseBet.potential_win),
  isWinner: supabaseBet.is_winner || false,
  timestamp: supabaseBet.created_at
})

async function simulateHookBehavior() {
  try {
    console.log('🎯 Ejecutando loadBets() como lo haría el hook...\n')
    
    // Consulta exacta del hook
    const { data: supabaseBets, error } = await supabase
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
        created_at,
        lotteries!inner (
          name,
          closing_time,
          draw_time,
          is_active
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.log('❌ Error en loadBets():', error.message)
      console.log('📋 El hook devolvería datos locales como fallback')
      return []
    }

    if (!supabaseBets || supabaseBets.length === 0) {
      console.log('📋 No hay jugadas desde el hook (array vacío)')
      return []
    }

    const mappedBets = supabaseBets.map(mapSupabaseBet)
    console.log(`✅ Hook devolvería ${mappedBets.length} jugadas:`)
    
    mappedBets.forEach((bet, index) => {
      console.log(`${index + 1}. ID: ${bet.id}`)
      console.log(`   Lotería: ${bet.lotteryName} (${bet.lotteryId})`)
      console.log(`   Animal: ${bet.animalNumber} - ${bet.animalName}`)
      console.log(`   Monto: Bs. ${bet.amount}`)
      console.log(`   Premio: Bs. ${bet.potentialWin}`)
      console.log(`   Ganadora: ${bet.isWinner}`)
      console.log(`   Timestamp: ${bet.timestamp}`)
      console.log('')
    })

    console.log('🔍 Verificando cómo se procesarían en App.tsx...\n')
    
    // Simular lógica de App.tsx
    const currentBets = mappedBets // supabaseBets || bets || []
    const winners = currentBets.filter((b) => b.isWinner)
    const activeBets = currentBets.filter((b) => !b.isWinner)
    
    console.log(`📊 Procesamiento en App.tsx:`)
    console.log(`   Total bets: ${currentBets.length}`)
    console.log(`   Active bets: ${activeBets.length}`)
    console.log(`   Winners: ${winners.length}`)
    
    // Simular filtros (sin filtros aplicados)
    const betSearch = ""
    const betFilters = {}
    
    // Función filterBets simplificada
    const filteredBets = activeBets.filter(bet => {
      const matchesSearch = betSearch === "" || 
        bet.lotteryName.toLowerCase().includes(betSearch.toLowerCase()) ||
        bet.animalName.toLowerCase().includes(betSearch.toLowerCase()) ||
        bet.animalNumber.includes(betSearch)
      
      const matchesLottery = !betFilters.lotteryId || bet.lotteryId === betFilters.lotteryId
      
      return matchesSearch && matchesLottery
    })
    
    console.log(`   Filtered bets (que aparecerían en UI): ${filteredBets.length}`)
    
    if (filteredBets.length === 0 && activeBets.length > 0) {
      console.log('⚠️ PROBLEMA: Hay jugadas activas pero los filtros las están ocultando')
    } else if (filteredBets.length > 0) {
      console.log('✅ Las jugadas deberían aparecer en la interfaz')
    }
    
    return mappedBets

  } catch (error) {
    console.error('💥 Error:', error.message)
    return []
  }
}

async function checkReactState() {
  console.log('\n🔄 Verificando posibles problemas de estado de React...\n')
  
  // Verificar si el hook se está ejecutando
  console.log('🧪 Creando una jugada nueva para forzar actualización...')
  
  const { data: lottery } = await supabase
    .from('lotteries')
    .select('id, name')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (lottery) {
    const newBet = {
      lottery_id: lottery.id,
      lottery_name: lottery.name,
      animal_number: '02',
      animal_name: 'Toro',
      amount: 200,
      potential_win: 7400,
      is_winner: false
    }

    const { data: createdBet, error } = await supabase
      .from('bets')
      .insert([newBet])
      .select()
      .single()

    if (error) {
      console.log('❌ Error creando jugada:', error.message)
    } else {
      console.log('✅ Nueva jugada creada:', createdBet.id)
      console.log('🔄 Ahora deberías ver 2 jugadas en la interfaz')
      console.log('   Si aún no aparecen, el problema es de React/UI')
    }
  }
}

simulateHookBehavior().then(() => {
  return checkReactState()
}).then(() => {
  console.log('\n' + '='.repeat(50))
  console.log('📋 DIAGNÓSTICO COMPLETADO')
  console.log('='.repeat(50))
  console.log('\n🔧 PASOS PARA RESOLVER:')
  console.log('1. Recarga la página (F5) - problema de estado React')
  console.log('2. Abre Developer Tools (F12) y revisa Console por errores')
  console.log('3. Verifica que el hook se está ejecutando sin errores')
  console.log('4. Verifica que no hay filtros activos ocultando las jugadas')
})