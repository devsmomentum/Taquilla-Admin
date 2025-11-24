#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔄 ACTUALIZACIÓN DE POTES - NUEVOS PORCENTAJES')
console.log('=' .repeat(60))
console.log('')
console.log('📊 CAMBIOS A APLICAR:')
console.log('   Pote de Premios:  40% → 60%')
console.log('   Pote de Reserva:  35% → 30% (renombrar a "Costos")')
console.log('   Pote de Ganancias: 25% → 10%')
console.log('')

async function updatePots() {
  try {
    console.log('🔍 1. Obteniendo potes actuales...')
    const { data: currentPots, error: fetchError } = await supabase
      .from('pots')
      .select('*')
      .order('id')

    if (fetchError) {
      throw new Error(`Error obteniendo potes: ${fetchError.message}`)
    }

    console.log(`   ✅ ${currentPots?.length || 0} potes encontrados`)
    console.log('')

    if (currentPots && currentPots.length > 0) {
      console.log('📋 Potes actuales:')
      currentPots.forEach(pot => {
        console.log(`   - ${pot.name}: ${pot.percentage}% (Balance: Bs. ${pot.balance})`)
      })
      console.log('')
    }

    // Actualizar Pote de Premios
    console.log('🔄 2. Actualizando Pote de Premios...')
    const { error: premiosError } = await supabase
      .from('pots')
      .update({ percentage: 60 })
      .eq('name', 'Pote de Premios')

    if (premiosError) {
      console.log('   ⚠️  No se pudo actualizar:', premiosError.message)
    } else {
      console.log('   ✅ Pote de Premios actualizado a 60%')
    }

    // Actualizar y renombrar Pote de Reserva
    console.log('🔄 3. Actualizando Pote de Reserva → Costos...')
    const { error: reservaError } = await supabase
      .from('pots')
      .update({ 
        name: 'Costos',
        percentage: 30,
        description: 'Costos operativos y gastos del sistema'
      })
      .eq('name', 'Pote de Reserva')

    if (reservaError) {
      console.log('   ⚠️  No se pudo actualizar:', reservaError.message)
    } else {
      console.log('   ✅ Pote de Reserva renombrado a "Costos" y actualizado a 30%')
    }

    // Actualizar Pote de Ganancias
    console.log('🔄 4. Actualizando Pote de Ganancias...')
    const { error: gananciasError } = await supabase
      .from('pots')
      .update({ percentage: 10 })
      .eq('name', 'Pote de Ganancias')

    if (gananciasError) {
      console.log('   ⚠️  No se pudo actualizar:', gananciasError.message)
    } else {
      console.log('   ✅ Pote de Ganancias actualizado a 10%')
    }

    // Verificar cambios
    console.log('')
    console.log('✅ 5. Verificando cambios aplicados...')
    const { data: updatedPots, error: verifyError } = await supabase
      .from('pots')
      .select('*')
      .order('id')

    if (verifyError) {
      throw new Error(`Error verificando cambios: ${verifyError.message}`)
    }

    console.log('')
    console.log('📊 Potes actualizados:')
    let totalPercentage = 0
    updatedPots?.forEach(pot => {
      console.log(`   - ${pot.name}: ${pot.percentage}% (Balance: Bs. ${pot.balance})`)
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
    console.log('🎉 ACTUALIZACIÓN COMPLETADA')
    console.log('=' .repeat(60))
    console.log('')
    console.log('📝 NOTAS IMPORTANTES:')
    console.log('   ✅ Los balances de los potes NO fueron modificados')
    console.log('   ✅ Las transferencias y retiros anteriores se mantienen')
    console.log('   ✅ Los nuevos porcentajes se aplicarán a futuras jugadas')
    console.log('')
    console.log('🔄 PRÓXIMOS PASOS:')
    console.log('   1. Recarga la aplicación (Ctrl+R o F5)')
    console.log('   2. Verifica que los potes muestren los nuevos porcentajes')
    console.log('   3. Realiza una jugada de prueba para verificar la distribución')
    console.log('')

    return true

  } catch (error) {
    console.error('')
    console.error('❌ ERROR:', error)
    console.error('')
    console.error('💡 SOLUCIÓN:')
    console.error('   Si el error es de permisos, ejecuta manualmente el SQL:')
    console.error('   1. Abre Supabase Dashboard → SQL Editor')
    console.error('   2. Copia el contenido de update-pots-percentages.sql')
    console.error('   3. Ejecuta el SQL')
    console.error('')
    return false
  }
}

updatePots()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
  })