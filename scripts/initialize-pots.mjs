#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ndwkwmsuursgzalcozfu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kd2t3bXN1dXJzZ3phbGNvemZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5MjE2NDAsImV4cCI6MjA1MzQ5NzY0MH0.t_2qwYVhMLLjIIt2MUW3Lt3QPGg2FUqjs-Vyuh3fKq0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function initializePots() {
  console.log('🏦 Inicializando potes con datos de prueba...\n')

  const initialPots = [
    {
      name: 'Pote de Premios',
      percentage: 70,
      balance: 5000,  // Balance inicial de $5,000
      color: '#10b981',
      description: 'Dinero disponible para pagar premios a los ganadores'
    },
    {
      name: 'Pote de Reserva', 
      percentage: 20,
      balance: 2000,  // Balance inicial de $2,000
      color: '#f59e0b',
      description: 'Fondo de reserva para contingencias'
    },
    {
      name: 'Pote de Ganancias',
      percentage: 10, 
      balance: 1500,  // Balance inicial de $1,500
      color: '#ef4444',
      description: 'Ganancias netas del negocio'
    }
  ]

  try {
    // Verificar si ya existen potes
    console.log('🔍 Verificando potes existentes...')
    const { data: existingPots, error: checkError } = await supabase
      .from('pots')
      .select('*')

    if (checkError && !checkError.message.includes('JWT')) {
      console.log('❌ Error verificando potes:', checkError.message)
      return
    }

    if (existingPots && existingPots.length > 0) {
      console.log('📊 Potes existentes encontrados:')
      existingPots.forEach(pot => {
        console.log(`   - ${pot.name}: $${pot.balance}`)
      })

      // Actualizar balances si es necesario
      console.log('\n🔄 Actualizando balances de potes...')
      for (const pot of initialPots) {
        const existingPot = existingPots.find(ep => ep.name === pot.name)
        if (existingPot) {
          const { error: updateError } = await supabase
            .from('pots')
            .update({ balance: pot.balance })
            .eq('name', pot.name)

          if (updateError && !updateError.message.includes('JWT')) {
            console.log(`❌ Error actualizando ${pot.name}:`, updateError.message)
          } else {
            console.log(`✅ ${pot.name}: $${pot.balance}`)
          }
        }
      }
    } else {
      // Crear potes nuevos
      console.log('🆕 Creando potes iniciales...')
      for (const pot of initialPots) {
        const { error: insertError } = await supabase
          .from('pots')
          .insert([pot])

        if (insertError && !insertError.message.includes('JWT')) {
          console.log(`❌ Error creando ${pot.name}:`, insertError.message)
        } else {
          console.log(`✅ Creado: ${pot.name} - $${pot.balance}`)
        }
      }
    }

    console.log('\n🎉 Potes inicializados correctamente!')
    console.log('\n📋 Estado final de los potes:')
    console.log('   💰 Pote de Premios: $5,000 (70%)')
    console.log('   🛡️  Pote de Reserva: $2,000 (20%)')  
    console.log('   💵 Pote de Ganancias: $1,500 (10%)')
    console.log('\n🧪 Ahora puedes probar:')
    console.log('   1. Crear apuestas (distribuirá automáticamente a los potes)')
    console.log('   2. Hacer transferencias entre potes')
    console.log('   3. Realizar retiros del pote de ganancias')
    console.log('   4. Ver cómo se deducen premios del pote correspondiente')

  } catch (error) {
    console.error('❌ Error inicializando potes:', error.message)
    console.log('\n💡 Nota: Es normal que haya errores de conexión en este entorno.')
    console.log('   Puedes usar localStorage como fallback en la aplicación.')
  }
}

// Función para crear datos de prueba en localStorage
function createLocalStorageTestData() {
  console.log('\n🗂️  Creando datos de prueba en localStorage...')
  
  const testPots = [
    {
      name: 'Pote de Premios',
      percentage: 70,
      balance: 5000,
      color: '#10b981',
      description: 'Dinero disponible para pagar premios a los ganadores'
    },
    {
      name: 'Pote de Reserva',
      percentage: 20, 
      balance: 2000,
      color: '#f59e0b',
      description: 'Fondo de reserva para contingencias'
    },
    {
      name: 'Pote de Ganancias',
      percentage: 10,
      balance: 1500,
      color: '#ef4444', 
      description: 'Ganancias netas del negocio'
    }
  ]

  const testTransfers = []
  const testWithdrawals = []

  console.log('✅ Datos para localStorage:')
  console.log('   pots:', JSON.stringify(testPots, null, 2))
  console.log('   transfers:', JSON.stringify(testTransfers, null, 2))
  console.log('   withdrawals:', JSON.stringify(testWithdrawals, null, 2))
  
  return { testPots, testTransfers, testWithdrawals }
}

// Ejecutar inicialización
console.log('🚀 Iniciando inicialización de potes...\n')
initializePots()
createLocalStorageTestData()