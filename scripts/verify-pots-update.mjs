#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 VERIFICACIÓN DE ACTUALIZACIÓN DE POTES')
console.log('=' .repeat(60))
console.log('')

async function verifyPots() {
  try {
    console.log('📊 Obteniendo potes desde Supabase...')
    
    const { data: pots, error } = await supabase
      .from('pots')
      .select('*')
      .order('id')

    if (error) {
      throw new Error(`Error obteniendo potes: ${error.message}`)
    }

    if (!pots || pots.length === 0) {
      console.log('❌ No se encontraron potes en Supabase')
      console.log('')
      console.log('💡 Ejecuta INICIALIZAR_POTES_NUEVOS.sql en Supabase Dashboard')
      return false
    }

    console.log(`✅ Se encontraron ${pots.length} potes`)
    console.log('')
    console.log('📋 Detalles de los potes:')
    console.log('─'.repeat(60))

    let totalPercentage = 0
    const expectedPots = {
      'Pote de Premios': { percentage: 60, found: false },
      'Costos': { percentage: 30, found: false },
      'Pote de Ganancias': { percentage: 10, found: false }
    }

    pots.forEach((pot, index) => {
      console.log(`${index + 1}. ${pot.name}`)
      console.log(`   Porcentaje: ${pot.percentage}%`)
      console.log(`   Balance: Bs. ${pot.balance}`)
      console.log(`   Color: ${pot.color}`)
      console.log(`   Descripción: ${pot.description}`)
      console.log('')
      
      totalPercentage += pot.percentage

      // Verificar si el pote coincide con los esperados
      if (expectedPots[pot.name]) {
        expectedPots[pot.name].found = true
        if (expectedPots[pot.name].percentage === pot.percentage) {
          console.log(`   ✅ Porcentaje correcto`)
        } else {
          console.log(`   ❌ Porcentaje incorrecto (esperado: ${expectedPots[pot.name].percentage}%)`)
        }
      } else {
        console.log(`   ⚠️  Nombre inesperado (debería ser: Pote de Premios, Costos, o Pote de Ganancias)`)
      }
      console.log('─'.repeat(60))
    })

    console.log('')
    console.log('📊 RESUMEN DE VERIFICACIÓN')
    console.log('=' .repeat(60))
    console.log(`Total de potes: ${pots.length}`)
    console.log(`Suma de porcentajes: ${totalPercentage}%`)
    console.log('')

    let allCorrect = true

    // Verificar total de porcentajes
    if (totalPercentage === 100) {
      console.log('✅ La suma de porcentajes es 100%')
    } else {
      console.log(`❌ La suma de porcentajes NO es 100% (actual: ${totalPercentage}%)`)
      allCorrect = false
    }

    // Verificar potes esperados
    console.log('')
    console.log('🔍 Verificación de potes:')
    Object.entries(expectedPots).forEach(([name, data]) => {
      if (data.found) {
        console.log(`✅ "${name}" encontrado`)
      } else {
        console.log(`❌ "${name}" NO encontrado`)
        allCorrect = false
      }
    })

    // Verificar que no exista "Pote de Reserva"
    const hasOldReserva = pots.some(p => p.name === 'Pote de Reserva')
    console.log('')
    if (hasOldReserva) {
      console.log('❌ Todavía existe "Pote de Reserva" (debería ser "Costos")')
      allCorrect = false
    } else {
      console.log('✅ "Pote de Reserva" fue renombrado correctamente a "Costos"')
    }

    console.log('')
    console.log('=' .repeat(60))
    
    if (allCorrect) {
      console.log('🎉 ¡ACTUALIZACIÓN EXITOSA!')
      console.log('=' .repeat(60))
      console.log('')
      console.log('📋 PRÓXIMOS PASOS:')
      console.log('   1. Limpia el localStorage de la aplicación')
      console.log('   2. Recarga la aplicación completamente')
      console.log('   3. Verifica que la interfaz muestre:')
      console.log('      • Pote de Premios: 60%')
      console.log('      • Costos: 30%')
      console.log('      • Pote de Ganancias: 10%')
      console.log('')
      console.log('💡 Para limpiar localStorage, ejecuta en la consola del navegador:')
      console.log('   localStorage.removeItem("supabase_pots_backup_v2")')
      console.log('   Luego recarga la página (Ctrl+R o Cmd+R)')
      console.log('')
    } else {
      console.log('⚠️  HAY PROBLEMAS CON LA ACTUALIZACIÓN')
      console.log('=' .repeat(60))
      console.log('')
      console.log('💡 Ejecuta el script update-pots-percentages.sql nuevamente')
      console.log('   en Supabase Dashboard para corregir los problemas')
      console.log('')
    }

    return allCorrect

  } catch (error) {
    console.error('')
    console.error('❌ ERROR:', error.message)
    console.error('')
    return false
  }
}

verifyPots()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
  })
