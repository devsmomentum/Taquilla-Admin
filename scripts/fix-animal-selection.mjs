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

console.log('🔍 DIAGNÓSTICO CORREGIDO: PROBLEMAS CON SELECCIÓN DE ANIMALES\n')

async function diagnoseBetDialogIssuesFixed() {
  try {
    console.log('1️⃣ Verificando loterías activas...')
    
    const { data: lotteries, error: lotteriesError } = await supabase
      .from('lotteries')
      .select(`
        id,
        name,
        closing_time,
        draw_time,
        is_active
      `)
      .eq('is_active', true)

    if (lotteriesError) {
      console.log('❌ Error cargando loterías:', lotteriesError.message)
      return
    }

    if (lotteries.length === 0) {
      console.log('❌ PROBLEMA: No hay loterías activas')
      console.log('💡 SOLUCIÓN: Necesitas crear al menos una lotería activa')
      return
    }

    console.log(`✅ ${lotteries.length} loterías activas encontradas\n`)

    console.log('2️⃣ Verificando premios para cada lotería...')
    
    for (let i = 0; i < lotteries.length; i++) {
      const lottery = lotteries[i]
      console.log(`${i + 1}. 🎰 ${lottery.name}`)
      console.log(`   ID: ${lottery.id}`)
      console.log(`   Horarios: Cierra ${lottery.closing_time} | Sorteo ${lottery.draw_time}`)
      
      // Buscar premios para esta lotería
      const { data: prizes, error: prizesError } = await supabase
        .from('prizes')
        .select('*')
        .eq('lottery_id', lottery.id)

      if (prizesError) {
        console.log(`   ❌ Error cargando premios:`, prizesError.message)
        continue
      }

      if (!prizes || prizes.length === 0) {
        console.log(`   ❌ PROBLEMA: Esta lotería NO tiene premios configurados`)
        console.log(`   💡 Los animales aparecerán deshabilitados`)
      } else {
        console.log(`   ✅ ${prizes.length} premios configurados`)
        
        // Mostrar algunos ejemplos
        const samplePrizes = prizes.slice(0, 5)
        samplePrizes.forEach(prize => {
          console.log(`      Animal ${prize.animal_number}: x${prize.multiplier}`)
        })
        
        if (prizes.length > 5) {
          console.log(`      ... y ${prizes.length - 5} más`)
        }
      }
      console.log('')
    }

    console.log('3️⃣ Verificando definición de animales...')
    
    const fs = await import('fs')
    const typesPath = './src/lib/types.ts'
    
    if (fs.existsSync(typesPath)) {
      const typesContent = fs.readFileSync(typesPath, 'utf8')
      
      if (typesContent.includes('export const ANIMALS')) {
        console.log('✅ Lista ANIMALS encontrada en types.ts')
        
        // Buscar cuántos animales están definidos
        const animalMatches = typesContent.match(/{ number: ['"](\d+)['"], name: ['"]([^'"]+)['"] }/g);
        if (animalMatches) {
          console.log(`   📝 ${animalMatches.length} animales definidos`)
          
          // Mostrar los primeros 5
          const firstFive = animalMatches.slice(0, 5).map(match => {
            const parts = match.match(/number: ['"](\d+)['"], name: ['"]([^'"]+)['"]/);
            return `${parts[1]} - ${parts[2]}`;
          });
          console.log(`   Ejemplos: ${firstFive.join(', ')}`)
        }
      } else {
        console.log('❌ Lista ANIMALS no encontrada en types.ts')
      }
    }

    console.log('\n4️⃣ Identificando el problema principal...')
    
    // Verificar qué loterías no tienen premios
    const lotteriesWithoutPrizes = []
    
    for (const lottery of lotteries) {
      const { data: prizes } = await supabase
        .from('prizes')
        .select('id')
        .eq('lottery_id', lottery.id)
        .limit(1)

      if (!prizes || prizes.length === 0) {
        lotteriesWithoutPrizes.push(lottery)
      }
    }
    
    if (lotteriesWithoutPrizes.length > 0) {
      console.log('❌ PROBLEMA IDENTIFICADO: Loterías sin premios')
      console.log(`   Loterías afectadas: ${lotteriesWithoutPrizes.map(l => l.name).join(', ')}`)
      console.log('\n🔧 SOLUCIÓN AUTOMÁTICA: Voy a crear premios básicos...')
      
      // Crear premios básicos para las loterías que no los tienen
      for (const lottery of lotteriesWithoutPrizes) {
        console.log(`\n🎯 Creando premios para: ${lottery.name}`)
        
        const prizesToCreate = []
        for (let i = 1; i <= 36; i++) {
          const animalNumber = i.toString().padStart(2, '0')
          prizesToCreate.push({
            lottery_id: lottery.id,
            animal_number: animalNumber,
            multiplier: 37 // Multiplicador estándar
          })
        }
        
        const { data: createdPrizes, error: createError } = await supabase
          .from('prizes')
          .insert(prizesToCreate)
          .select()

        if (createError) {
          console.log(`   ❌ Error creando premios:`, createError.message)
        } else {
          console.log(`   ✅ ${createdPrizes.length} premios creados (01-36, x37)`)
        }
      }
      
      console.log('\n🎉 ¡PROBLEMA RESUELTO!')
      console.log('   Ahora deberías poder seleccionar animales en el diálogo de jugadas')
      console.log('   Recarga la página (F5) para ver los cambios')
      
    } else {
      console.log('✅ Todas las loterías tienen premios configurados')
      console.log('\n🤔 Si aún no puedes seleccionar animales, verifica:')
      console.log('   1. ¿Seleccionaste una lotería primero?')
      console.log('   2. ¿El diálogo está totalmente cargado?')
      console.log('   3. ¿Hay errores en la consola del navegador?')
      console.log('   4. Prueba recargar la página (F5)')
    }

  } catch (error) {
    console.error('💥 Error en diagnóstico:', error.message)
  }
}

diagnoseBetDialogIssuesFixed()