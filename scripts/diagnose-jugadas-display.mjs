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

console.log('🔍 DIAGNÓSTICO: ¿Por qué no aparecen las jugadas?\n')

async function diagnoseJugadasDisplay() {
  try {
    console.log('1️⃣ Verificando jugadas existentes en Supabase...')
    
    const { data: allBets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .order('created_at', { ascending: false })

    if (betsError) {
      console.log('❌ Error leyendo jugadas:', betsError.message)
      return
    }

    console.log(`📊 Total jugadas en base de datos: ${allBets.length}`)
    
    if (allBets.length === 0) {
      console.log('📋 No hay jugadas en la base de datos')
      console.log('💡 Esto explica por qué la lista está vacía')
      console.log('\n🧪 Voy a crear una jugada de prueba...')
      
      // Obtener una lotería para crear jugada de prueba
      const { data: lottery } = await supabase
        .from('lotteries')
        .select('id, name')
        .eq('is_active', true)
        .limit(1)
        .single()

      if (lottery) {
        const testBet = {
          lottery_id: lottery.id,
          lottery_name: lottery.name,
          animal_number: '01',
          animal_name: 'Carnero',
          amount: 100,
          potential_win: 3700,
          is_winner: false
        }

        const { data: createdBet, error: createError } = await supabase
          .from('bets')
          .insert([testBet])
          .select()
          .single()

        if (createError) {
          console.log('❌ Error creando jugada de prueba:', createError.message)
        } else {
          console.log('✅ Jugada de prueba creada:', createdBet.id)
          console.log('🔄 Ahora deberías ver una jugada en la lista')
        }
      }
      return
    }

    console.log('\n📋 Jugadas encontradas:')
    allBets.slice(0, 5).forEach((bet, index) => {
      console.log(`${index + 1}. ${bet.animal_number} - ${bet.animal_name} (Bs. ${bet.amount})`)
      console.log(`   Lotería: ${bet.lottery_name}`)
      console.log(`   Creada: ${bet.created_at}`)
      console.log(`   Ganadora: ${bet.is_winner ? '✅' : '❌'}`)
      console.log('')
    })

    console.log('2️⃣ Verificando carga de jugadas con JOIN...')
    
    // Esta es la misma consulta que usa el hook
    const { data: betsWithLotteries, error: joinError } = await supabase
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

    if (joinError) {
      console.log('❌ PROBLEMA ENCONTRADO: Error en JOIN con lotteries')
      console.log('   Error:', joinError.message)
      console.log('\n💡 POSIBLES CAUSAS:')
      console.log('   1. Jugadas con lottery_id inválido (lotería eliminada)')
      console.log('   2. El !inner en la consulta filtra jugadas huérfanas')
      console.log('\n🔧 PROBANDO SIN INNER JOIN...')
      
      const { data: betsWithoutInner, error: outerError } = await supabase
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
          lotteries (
            name,
            closing_time,
            draw_time,
            is_active
          )
        `)
        .order('created_at', { ascending: false })

      if (outerError) {
        console.log('❌ Error también sin inner:', outerError.message)
      } else {
        console.log(`✅ Sin inner JOIN: ${betsWithoutInner.length} jugadas`)
        
        // Verificar cuáles tienen lottery NULL
        const orphanBets = betsWithoutInner.filter(bet => !bet.lotteries)
        if (orphanBets.length > 0) {
          console.log(`⚠️ ${orphanBets.length} jugadas huérfanas (sin lotería válida):`)
          orphanBets.forEach(bet => {
            console.log(`   - ${bet.animal_name} (lottery_id: ${bet.lottery_id})`)
          })
        }
      }
      
    } else {
      console.log(`✅ JOIN exitoso: ${betsWithLotteries.length} jugadas cargadas`)
      
      if (betsWithLotteries.length !== allBets.length) {
        console.log(`⚠️ DISCREPANCIA: ${allBets.length} jugadas totales vs ${betsWithLotteries.length} con JOIN`)
        console.log('   El INNER JOIN está filtrando jugadas huérfanas')
      }
    }

    console.log('\n3️⃣ Verificando loterías activas...')
    
    const { data: activeLotteries } = await supabase
      .from('lotteries')
      .select('id, name, is_active')
      .eq('is_active', true)

    console.log(`🎰 ${activeLotteries.length} loterías activas`)
    
    console.log('\n4️⃣ Recomendaciones...')
    
    if (allBets.length > 0 && (!betsWithLotteries || betsWithLotteries.length === 0)) {
      console.log('🔧 PROBLEMA: Jugadas existen pero no se cargan con JOIN')
      console.log('💡 SOLUCIÓN: Modificar el hook para usar LEFT JOIN en lugar de INNER JOIN')
      console.log('\n📝 Cambio necesario en use-supabase-bets.ts:')
      console.log('   Cambiar: lotteries!inner → lotteries!left')
    } else if (betsWithLotteries && betsWithLotteries.length > 0) {
      console.log('✅ Las jugadas se cargan correctamente desde la base de datos')
      console.log('🤔 Si no aparecen en la UI, el problema puede ser:')
      console.log('   1. Estado de React no se actualiza')
      console.log('   2. Filtros están ocultando las jugadas')
      console.log('   3. Error en el componente de UI')
      console.log('\n🔄 Intenta recargar la página (F5)')
    }

  } catch (error) {
    console.error('💥 Error en diagnóstico:', error.message)
  }
}

diagnoseJugadasDisplay()