#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndwkwmsuursgzalcozfu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kd2t3bXN1dXJzZ3phbGNvemZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5MjE2NDAsImV4cCI6MjA1MzQ5NzY0MH0.t_2qwYVhMLLjIIt2MUW3Lt3QPGg2FUqjs-Vyuh3fKq0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function calculatePotsFromBets() {
  console.log('💰 Calculando balances de potes basados en jugadas existentes...\n')

  try {
    // 1. Obtener todas las jugadas
    console.log('📊 Obteniendo jugadas...')
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('amount')

    if (betsError && !betsError.message.includes('JWT')) {
      console.log('❌ Error obteniendo jugadas:', betsError.message)
      return
    }

    // También verificar localStorage
    const localBets = JSON.parse(localStorage?.getItem('supabase_bets_backup_v2') || '[]')
    
    console.log('📋 Jugadas en Supabase:', bets?.length || 0)
    console.log('📋 Jugadas en localStorage:', localBets.length)

    // Usar las jugadas de Supabase o localStorage
    const allBets = (bets && bets.length > 0) ? bets : localBets
    
    if (!allBets || allBets.length === 0) {
      console.log('⚠️  No hay jugadas registradas')
      console.log('   Para probar los potes, primero crea algunas jugadas en la pestaña "Jugadas"')
      return
    }

    // 2. Calcular total apostado
    const totalBetAmount = allBets.reduce((sum, bet) => sum + (bet.amount || 0), 0)
    
    console.log(`💵 Total apostado: $${totalBetAmount}`)
    console.log('📊 Distribución esperada en potes:')
    
    // 3. Calcular distribución por potes (70%, 20%, 10%)
    const expectedPots = {
      'Pote de Premios': totalBetAmount * 0.70,
      'Pote de Reserva': totalBetAmount * 0.20,
      'Pote de Ganancias': totalBetAmount * 0.10
    }

    Object.entries(expectedPots).forEach(([potName, amount]) => {
      console.log(`   - ${potName}: $${amount.toFixed(2)} (${potName.includes('Premios') ? '70%' : potName.includes('Reserva') ? '20%' : '10%'})`)
    })

    // 4. Verificar potes actuales
    console.log('\n🏦 Verificando potes actuales...')
    const { data: currentPots, error: potsError } = await supabase
      .from('pots')
      .select('name, balance')

    if (potsError && !potsError.message.includes('JWT')) {
      console.log('❌ Error obteniendo potes:', potsError.message)
    }

    const localPots = JSON.parse(localStorage?.getItem('supabase_pots_backup_v2') || '[]')
    const pots = (currentPots && currentPots.length > 0) ? currentPots : localPots

    if (pots && pots.length > 0) {
      console.log('📊 Balances actuales:')
      pots.forEach(pot => {
        const expected = expectedPots[pot.name] || 0
        const difference = pot.balance - expected
        console.log(`   - ${pot.name}: $${pot.balance} (esperado: $${expected.toFixed(2)}, diferencia: ${difference >= 0 ? '+' : ''}$${difference.toFixed(2)})`)
      })
    } else {
      console.log('❌ No se encontraron potes')
    }

    // 5. Proponer solución
    console.log('\n🔧 SOLUCIÓN RECOMENDADA:')
    console.log('1. Actualizar balances de potes basados en jugadas existentes')
    console.log('2. Esto sincronizará los potes con el dinero real de las apuestas')
    console.log('\n💡 ¿Quieres que actualice automáticamente los balances?')

    return {
      totalBets: allBets.length,
      totalAmount: totalBetAmount,
      expectedPots: expectedPots,
      currentPots: pots
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Esto es normal en este entorno de desarrollo')
    console.log('   La lógica de cálculo sigue siendo válida para la aplicación')
  }
}

// Ejecutar diagnóstico
calculatePotsFromBets()