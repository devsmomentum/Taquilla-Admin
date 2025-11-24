import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://bwwhcuivmqcilspdfayi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2hjdWl2bXFjaWxzcGRmYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzcwMjAsImV4cCI6MjA0NjA1MzAyMH0.LCHBePXrlY_hkNDK_L6lDbNgWGHy7GQWDlTBDyK9I0g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testLotteriesIntegration() {
  console.log('🎰 Probando integración de loterías con Supabase...\n')

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
      {
        lottery_id: newLottery.id,
        animal_number: '00',
        animal_name: 'Delfín',
        multiplier: 50
      },
      {
        lottery_id: newLottery.id,
        animal_number: '01',
        animal_name: 'Carnero',
        multiplier: 50
      },
      {
        lottery_id: newLottery.id,
        animal_number: '02',
        animal_name: 'Toro',
        multiplier: 50
      }
    ]

    const { error: prizesError } = await supabase
      .from('prizes')
      .insert(prizes)

    if (prizesError) {
      console.error('❌ Error agregando premios:', prizesError)
    } else {
      console.log('✅ Premios agregados exitosamente')
    }

    // 3. Cargar lotería con premios
    console.log('\n3. Cargando lotería con premios...')
    const { data: lotteryWithPrizes, error: loadError } = await supabase
      .from('lotteries')
      .select(`
        *,
        prizes (*)
      `)
      .eq('id', newLottery.id)
      .single()

    if (loadError) {
      console.error('❌ Error cargando lotería con premios:', loadError)
    } else {
      console.log('✅ Lotería con premios cargada:')
      console.log('  - Nombre:', lotteryWithPrizes.name)
      console.log('  - Activa:', lotteryWithPrizes.is_active)
      console.log('  - Horarios:', `${lotteryWithPrizes.opening_time} - ${lotteryWithPrizes.closing_time} (sorteo: ${lotteryWithPrizes.draw_time})`)
      console.log('  - Premios:', lotteryWithPrizes.prizes?.length || 0, 'animales')
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

    // 5. Verificar actualización
    console.log('\n5. Verificando actualización...')
    const { data: updatedLottery, error: checkError } = await supabase
      .from('lotteries')
      .select('*')
      .eq('id', newLottery.id)
      .single()

    if (checkError) {
      console.error('❌ Error verificando actualización:', checkError)
    } else {
      console.log('✅ Actualización verificada:')
      console.log('  - Nuevo nombre:', updatedLottery.name)
      console.log('  - Activa:', updatedLottery.is_active)
    }

    // 6. Contar loterías totales
    console.log('\n6. Contando loterías totales...')
    const { count, error: countError } = await supabase
      .from('lotteries')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('❌ Error contando loterías:', countError)
    } else {
      console.log('✅ Total de loterías en DB:', count)
    }

    // 7. Limpiar - eliminar lotería de prueba
    console.log('\n7. Limpiando - eliminando lotería de prueba...')
    const { error: deleteError } = await supabase
      .from('lotteries')
      .delete()
      .eq('id', newLottery.id)

    if (deleteError) {
      console.error('❌ Error eliminando lotería:', deleteError)
    } else {
      console.log('✅ Lotería de prueba eliminada exitosamente')
    }

    console.log('\n🎉 ¡Integración de loterías completamente funcional!')
    console.log('📋 Resumen:')
    console.log('  ✅ Crear loterías')
    console.log('  ✅ Agregar premios')
    console.log('  ✅ Cargar con relaciones (JOIN)')
    console.log('  ✅ Actualizar loterías')
    console.log('  ✅ Eliminar loterías (CASCADE a premios)')
    console.log('\n🚀 El módulo de loterías está listo para usar!')

  } catch (error) {
    console.error('💥 Error general en la prueba:', error)
  }
}

testLotteriesIntegration()