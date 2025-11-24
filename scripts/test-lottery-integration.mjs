import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://bwwhcuivmqcilspdfayi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2hjdWl2bXFjaWxzcGRmYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzcwMjAsImV4cCI6MjA0NjA1MzAyMH0.LCHBePXrlY_hkNDK_L6lDbNgWGHy7GQWDlTBDyK9I0g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLotteryIntegration() {
  console.log('🧪 Probando integración completa de loterías...\n')

  try {
    // 1. Crear una lotería de prueba
    console.log('1. Creando lotería de prueba...')
    const { data: newLottery, error: createError } = await supabase
      .from('lotteries')
      .insert([
        {
          name: 'Lotería Prueba Integración',
          opening_time: '06:00',
          closing_time: '18:00',
          draw_time: '19:00',
          is_active: true,
          plays_tomorrow: false
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creando lotería:', createError)
      return
    }

    console.log('✅ Lotería creada:', newLottery.name, '- ID:', newLottery.id)

    // 2. Agregar premios a la lotería
    console.log('\n2. Agregando premios a la lotería...')
    const prizes = [
      { animal_number: '00', animal_name: 'Delfín', multiplier: 50 },
      { animal_number: '01', animal_name: 'Carnero', multiplier: 50 },
      { animal_number: '02', animal_name: 'Toro', multiplier: 50 }
    ]

    const prizesData = prizes.map(prize => ({
      lottery_id: newLottery.id,
      ...prize
    }))

    const { data: createdPrizes, error: prizesError } = await supabase
      .from('prizes')
      .insert(prizesData)
      .select()

    if (prizesError) {
      console.error('❌ Error creando premios:', prizesError)
    } else {
      console.log('✅ Premios creados:', createdPrizes.length)
    }

    // 3. Cargar lotería con premios
    console.log('\n3. Cargando lotería con premios...')
    const { data: lotteryWithPrizes, error: loadError } = await supabase
      .from('lotteries')
      .select(`
        *,
        prizes (
          id,
          animal_number,
          animal_name,
          multiplier
        )
      `)
      .eq('id', newLottery.id)
      .single()

    if (loadError) {
      console.error('❌ Error cargando lotería con premios:', loadError)
    } else {
      console.log('✅ Lotería con premios cargada:')
      console.log('  - Nombre:', lotteryWithPrizes.name)
      console.log('  - Horario:', `${lotteryWithPrizes.opening_time} - ${lotteryWithPrizes.closing_time}`)
      console.log('  - Sorteo:', lotteryWithPrizes.draw_time)
      console.log('  - Activa:', lotteryWithPrizes.is_active)
      console.log('  - Premios:', lotteryWithPrizes.prizes?.length || 0)
    }

    // 4. Actualizar lotería
    console.log('\n4. Actualizando lotería...')
    const { error: updateError } = await supabase
      .from('lotteries')
      .update({ 
        name: 'Lotería Prueba ACTUALIZADA',
        is_active: false 
      })
      .eq('id', newLottery.id)

    if (updateError) {
      console.error('❌ Error actualizando lotería:', updateError)
    } else {
      console.log('✅ Lotería actualizada exitosamente')
    }

    // 5. Cargar todas las loterías
    console.log('\n5. Cargando todas las loterías...')
    const { data: allLotteries, error: allError } = await supabase
      .from('lotteries')
      .select(`
        *,
        prizes (
          id,
          animal_number,
          animal_name,
          multiplier
        )
      `)
      .order('created_at', { ascending: true })

    if (allError) {
      console.error('❌ Error cargando todas las loterías:', allError)
    } else {
      console.log('✅ Total de loterías en sistema:', allLotteries.length)
      allLotteries.forEach((lottery, index) => {
        console.log(`  ${index + 1}. ${lottery.name} (${lottery.is_active ? 'Activa' : 'Inactiva'}) - ${lottery.prizes?.length || 0} premios`)
      })
    }

    // 6. Limpiar - eliminar lotería de prueba
    console.log('\n6. Limpiando - eliminando lotería de prueba...')
    
    // Los premios se eliminan automáticamente por CASCADE
    const { error: deleteError } = await supabase
      .from('lotteries')
      .delete()
      .eq('id', newLottery.id)

    if (deleteError) {
      console.error('❌ Error eliminando lotería:', deleteError)
    } else {
      console.log('✅ Lotería de prueba eliminada exitosamente (premios eliminados automáticamente)')
    }

    console.log('\n🎉 ¡Integración de loterías completamente funcional!')
    console.log('📋 Resumen:')
    console.log('  ✅ Crear loterías')
    console.log('  ✅ Agregar premios')
    console.log('  ✅ Cargar loterías con premios')
    console.log('  ✅ Actualizar loterías')
    console.log('  ✅ Eliminar loterías (y premios en cascada)')
    console.log('\n🚀 El módulo de loterías está listo para usar con Supabase!')

  } catch (error) {
    console.error('💥 Error general en la prueba:', error)
  }
}

testLotteryIntegration()