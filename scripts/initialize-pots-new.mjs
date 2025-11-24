#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 INICIALIZACIÓN DE POTES CON NUEVOS PORCENTAJES')
console.log('=' .repeat(60))
console.log('')

const NEW_POTS = [
  {
    name: 'Pote de Premios',
    percentage: 60,
    balance: 0,
    color: 'bg-accent',
    description: 'Fondos destinados a pagar premios ganadores'
  },
  {
    name: 'Costos',
    percentage: 30,
    balance: 0,
    color: 'bg-secondary',
    description: 'Costos operativos y gastos del sistema'
  },
  {
    name: 'Pote de Ganancias',
    percentage: 10,
    balance: 0,
    color: 'bg-primary',
    description: 'Ganancias acumuladas del sistema'
  }
]

async function initializePots() {
  try {
    console.log('🔍 1. Verificando potes existentes...')
    const { data: existingPots, error: fetchError } = await supabase
      .from('pots')
      .select('*')

    if (fetchError) {
      console.log('   ⚠️  Error al verificar:', fetchError.message)
    }

    if (existingPots && existingPots.length > 0) {
      console.log(`   ℹ️  Ya existen ${existingPots.length} potes en la base de datos`)
      console.log('')
      console.log('📋 Potes actuales:')
      existingPots.forEach(pot => {
        console.log(`   - ${pot.name}: ${pot.percentage}% (Balance: Bs. ${pot.balance})`)
      })
      console.log('')
      console.log('💡 Para actualizar los potes existentes, ejecuta: node update-pots.mjs')
      return true
    }

    console.log('   ✅ No hay potes existentes, creando nuevos...')
    console.log('')

    console.log('📊 2. Creando potes con los siguientes valores:')
    NEW_POTS.forEach(pot => {
      console.log(`   - ${pot.name}: ${pot.percentage}%`)
    })
    console.log('')

    // Insertar potes
    const { data: insertedPots, error: insertError } = await supabase
      .from('pots')
      .insert(NEW_POTS)
      .select()

    if (insertError) {
      throw new Error(`Error creando potes: ${insertError.message}`)
    }

    console.log('✅ 3. Potes creados exitosamente!')
    console.log('')
    
    // Verificar
    const { data: verifiedPots, error: verifyError } = await supabase
      .from('pots')
      .select('*')
      .order('id')

    if (verifyError) {
      throw new Error(`Error verificando potes: ${verifyError.message}`)
    }

    console.log('📊 Potes creados:')
    let totalPercentage = 0
    verifiedPots?.forEach(pot => {
      console.log(`   ✅ ${pot.name}: ${pot.percentage}% (ID: ${pot.id})`)
      totalPercentage += pot.percentage
    })

    console.log('')
    console.log('─'.repeat(60))
    console.log(`   TOTAL: ${totalPercentage}%`)
    console.log('─'.repeat(60))

    if (totalPercentage === 100) {
      console.log('')
      console.log('✅ ¡Verificación exitosa! El total es 100%')
    } else {
      console.log('')
      console.log(`❌ ERROR: El total debería ser 100% pero es ${totalPercentage}%`)
    }

    console.log('')
    console.log('=' .repeat(60))
    console.log('🎉 INICIALIZACIÓN COMPLETADA')
    console.log('=' .repeat(60))
    console.log('')
    console.log('🔄 PRÓXIMOS PASOS:')
    console.log('   1. Inicia o recarga la aplicación')
    console.log('   2. Ve al Dashboard')
    console.log('   3. Verifica que los potes muestren:')
    console.log('      • Pote de Premios: 60%')
    console.log('      • Costos: 30%')
    console.log('      • Pote de Ganancias: 10%')
    console.log('')

    return true

  } catch (error) {
    console.error('')
    console.error('❌ ERROR:', error)
    console.error('')
    console.error('💡 SOLUCIÓN:')
    console.error('   Ejecuta el SQL manualmente en Supabase Dashboard:')
    console.error('')
    console.error('   INSERT INTO pots (name, percentage, balance, color, description) VALUES')
    console.error('     (\'Pote de Premios\', 60, 0, \'bg-accent\', \'Fondos destinados a pagar premios ganadores\'),')
    console.error('     (\'Costos\', 30, 0, \'bg-secondary\', \'Costos operativos y gastos del sistema\'),')
    console.error('     (\'Pote de Ganancias\', 10, 0, \'bg-primary\', \'Ganancias acumuladas del sistema\');')
    console.error('')
    return false
  }
}

initializePots()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
  })