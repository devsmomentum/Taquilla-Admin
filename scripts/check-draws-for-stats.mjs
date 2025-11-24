#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🎰 VERIFICANDO SORTEOS EN SUPABASE')
console.log('=' .repeat(60))
console.log('')

async function checkDraws() {
  try {
    console.log('📊 Obteniendo sorteos desde Supabase...')
    
    const { data: draws, error } = await supabase
      .from('draws')
      .select('*')
      .order('draw_time', { ascending: false })

    if (error) {
      console.log('❌ Error obteniendo sorteos:', error.message)
      console.log('')
      console.log('💡 Esto puede ser por:')
      console.log('   1. La tabla "draws" no existe')
      console.log('   2. Políticas RLS bloquean el acceso')
      console.log('   3. No tienes permisos para ver sorteos')
      console.log('')
      return false
    }

    if (!draws || draws.length === 0) {
      console.log('📋 NO HAY SORTEOS EN LA BASE DE DATOS')
      console.log('')
      console.log('⚠️  Por eso la sección "Estadísticas por Animalito" está vacía')
      console.log('')
      console.log('💡 SOLUCIÓN:')
      console.log('   1. Ve a la pestaña "Sorteos" en la aplicación')
      console.log('   2. Haz clic en "Nuevo Sorteo"')
      console.log('   3. Selecciona una lotería')
      console.log('   4. Elige el animal ganador')
      console.log('   5. Ingresa fecha/hora del sorteo')
      console.log('   6. Guarda el sorteo')
      console.log('')
      console.log('   Después de crear un sorteo, podrás:')
      console.log('   - Verlo en la lista de sorteos')
      console.log('   - Seleccionarlo en "Estadísticas por Animalito"')
      console.log('   - Ver qué animales se jugaron más en ese sorteo')
      console.log('')
      return true
    }

    console.log(`✅ Se encontraron ${draws.length} sorteos`)
    console.log('')
    console.log('📋 Detalles de los sorteos:')
    console.log('─'.repeat(60))

    draws.slice(0, 5).forEach((draw, index) => {
      console.log(`${index + 1}. ${draw.lottery_name || 'Sin nombre'}`)
      console.log(`   Ganador: ${draw.winning_animal_number} - ${draw.winning_animal_name}`)
      console.log(`   Fecha: ${new Date(draw.draw_time).toLocaleString('es-VE')}`)
      console.log(`   Premios pagados: Bs. ${draw.total_payout || 0}`)
      console.log(`   Ganadores: ${draw.winners_count || 0}`)
      console.log('─'.repeat(60))
    })

    if (draws.length > 5) {
      console.log(`... y ${draws.length - 5} sorteos más`)
    }

    console.log('')
    console.log('✅ Los sorteos deberían aparecer en la aplicación')
    console.log('')
    console.log('💡 Si no aparecen en "Estadísticas por Animalito":')
    console.log('   1. Recarga la aplicación (Ctrl+R)')
    console.log('   2. Limpia el caché del navegador')
    console.log('   3. Verifica que estés en la pestaña "Reportes"')
    console.log('')

    return true

  } catch (error) {
    console.error('')
    console.error('❌ ERROR:', error.message)
    console.error('')
    return false
  }
}

checkDraws()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    console.error('Error fatal:', err)
    process.exit(1)
  })
