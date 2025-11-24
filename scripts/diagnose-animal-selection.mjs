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

console.log('🔍 DIAGNÓSTICO: PROBLEMAS CON SELECCIÓN DE ANIMALES\n')

async function diagnoseBetDialogIssues() {
  try {
    console.log('1️⃣ Verificando loterías activas...')
    
    const { data: lotteries, error: lotteriesError } = await supabase
      .from('lotteries')
      .select(`
        id,
        name,
        closing_time,
        draw_time,
        is_active,
        prizes (
          id,
          animal_number,
          multiplier,
          is_active
        )
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

    lotteries.forEach((lottery, index) => {
      console.log(`${index + 1}. 🎰 ${lottery.name}`)
      console.log(`   ID: ${lottery.id}`)
      console.log(`   Estado: ${lottery.is_active ? 'Activa ✅' : 'Inactiva ❌'}`)
      console.log(`   Horarios: Cierra ${lottery.closing_time} | Sorteo ${lottery.draw_time}`)
      
      if (!lottery.prizes || lottery.prizes.length === 0) {
        console.log(`   ⚠️ PROBLEMA: Esta lotería NO tiene premios configurados`)
        console.log(`   💡 Los animales aparecerán deshabilitados`)
      } else {
        console.log(`   ✅ ${lottery.prizes.length} premios configurados:`)
        
        const activePrizes = lottery.prizes.filter(p => p.is_active)
        const inactivePrizes = lottery.prizes.filter(p => !p.is_active)
        
        if (activePrizes.length > 0) {
          console.log(`      Activos: ${activePrizes.map(p => `${p.animal_number} (x${p.multiplier})`).join(', ')}`)
        }
        
        if (inactivePrizes.length > 0) {
          console.log(`      Inactivos: ${inactivePrizes.map(p => `${p.animal_number} (x${p.multiplier})`).join(', ')}`)
        }
      }
      console.log('')
    })

    console.log('2️⃣ Verificando lista de animales disponibles...')
    
    // Verificar si el archivo de tipos tiene los animales
    const fs = await import('fs')
    const typesPath = './src/lib/types.ts'
    
    if (fs.existsSync(typesPath)) {
      const typesContent = fs.readFileSync(typesPath, 'utf8')
      
      if (typesContent.includes('export const ANIMALS')) {
        console.log('✅ Lista ANIMALS encontrada en types.ts')
        
        // Extraer la lista de animales
        const animalsMatch = typesContent.match(/export const ANIMALS = \[([\s\S]*?)\]/);
        if (animalsMatch) {
          const animalNumbers = animalsMatch[1].match(/number: ['"](\d+)['"]/g);
          if (animalNumbers) {
            const numbers = animalNumbers.map(match => match.match(/['"](\d+)['"]/)[1]);
            console.log(`   📝 ${numbers.length} animales definidos: ${numbers.join(', ')}`)
          }
        }
      } else {
        console.log('❌ Lista ANIMALS no encontrada en types.ts')
      }
    }

    console.log('\n3️⃣ Analizando el problema...')
    
    const lotteriesWithoutPrizes = lotteries.filter(l => !l.prizes || l.prizes.length === 0)
    const lotteriesWithInactivePrizes = lotteries.filter(l => 
      l.prizes && l.prizes.length > 0 && l.prizes.every(p => !p.is_active)
    )
    
    if (lotteriesWithoutPrizes.length > 0) {
      console.log('❌ PROBLEMA PRINCIPAL: Loterías sin premios configurados')
      console.log(`   Loterías afectadas: ${lotteriesWithoutPrizes.map(l => l.name).join(', ')}`)
      console.log('\n💡 SOLUCIÓN: Configurar premios para estas loterías')
    }
    
    if (lotteriesWithInactivePrizes.length > 0) {
      console.log('⚠️ PROBLEMA SECUNDARIO: Loterías con todos los premios inactivos')
      console.log(`   Loterías afectadas: ${lotteriesWithInactivePrizes.map(l => l.name).join(', ')}`)
      console.log('\n💡 SOLUCIÓN: Activar los premios necesarios')
    }

    console.log('\n4️⃣ Recomendaciones para arreglar...')
    
    if (lotteriesWithoutPrizes.length > 0 || lotteriesWithInactivePrizes.length > 0) {
      console.log('🔧 PASOS PARA ARREGLAR:')
      console.log('\n   1. Ve a la pestaña "Loterías" en la aplicación')
      console.log('   2. Edita las loterías que tienen problemas')
      console.log('   3. Agrega premios para los animales (01-36)')
      console.log('   4. Asegúrate de que los premios estén activos')
      console.log('   5. Guarda los cambios')
      
      console.log('\n🚀 ALTERNATIVA RÁPIDA - Ejecutar este SQL en Supabase:')
      
      lotteriesWithoutPrizes.forEach(lottery => {
        console.log(`\n-- Agregar premios básicos para ${lottery.name}`)
        for (let i = 1; i <= 36; i++) {
          const animalNumber = i.toString().padStart(2, '0')
          console.log(`INSERT INTO prizes (lottery_id, animal_number, multiplier, is_active) VALUES ('${lottery.id}', '${animalNumber}', 37, true);`)
        }
      })
      
      if (lotteriesWithInactivePrizes.length > 0) {
        console.log('\n-- Activar premios existentes')
        lotteriesWithInactivePrizes.forEach(lottery => {
          console.log(`UPDATE prizes SET is_active = true WHERE lottery_id = '${lottery.id}';`)
        })
      }
    } else {
      console.log('✅ Todas las loterías tienen premios configurados correctamente')
      console.log('⚠️ Si aún no puedes seleccionar animales, el problema puede estar en:')
      console.log('   1. Cache del navegador - Recarga la página (F5)')
      console.log('   2. Estado de React - Cierra y abre el diálogo nuevamente')
      console.log('   3. Consola del navegador - Revisa si hay errores de JavaScript')
    }

  } catch (error) {
    console.error('💥 Error en diagnóstico:', error.message)
  }
}

diagnoseBetDialogIssues()