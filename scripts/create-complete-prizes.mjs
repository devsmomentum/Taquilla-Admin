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

console.log('🔧 CREANDO PREMIOS COMPLETOS PARA LAS LOTERÍAS\n')

// Lista completa de animales (del archivo types.ts)
const ANIMALS = [
  { number: "00", name: "Delfín" },
  { number: "01", name: "Carnero" },
  { number: "02", name: "Toro" },
  { number: "03", name: "Ciempiés" },
  { number: "04", name: "Alacrán" },
  { number: "05", name: "León" },
  { number: "06", name: "Rana" },
  { number: "07", name: "Perico" },
  { number: "08", name: "Ratón" },
  { number: "09", name: "Águila" },
  { number: "10", name: "Tigre" },
  { number: "11", name: "Gato" },
  { number: "12", name: "Caballo" },
  { number: "13", name: "Mono" },
  { number: "14", name: "Paloma" },
  { number: "15", name: "Zorro" },
  { number: "16", name: "Oso" },
  { number: "17", name: "Pavón" },
  { number: "18", name: "Burro" },
  { number: "19", name: "Chivo" },
  { number: "20", name: "Cochino" },
  { number: "21", name: "Zamuro" },
  { number: "22", name: "Caimán" },
  { number: "23", name: "Zebra" },
  { number: "24", name: "Iguana" },
  { number: "25", name: "Gallina" },
  { number: "26", name: "Vaca" },
  { number: "27", name: "Perro" },
  { number: "28", name: "Elefante" },
  { number: "29", name: "Gallo" },
  { number: "30", name: "Camarón" },
  { number: "31", name: "Lapa" },
  { number: "32", name: "Ardilla" },
  { number: "33", name: "Pescado" },
  { number: "34", name: "Venado" },
  { number: "35", name: "Jirafa" },
  { number: "36", name: "Culebra" }
]

async function createCompletePrizes() {
  try {
    console.log('1️⃣ Buscando loterías sin premios completos...')
    
    const { data: lotteries, error: lotteriesError } = await supabase
      .from('lotteries')
      .select('id, name, is_active')
      .eq('is_active', true)

    if (lotteriesError) throw lotteriesError

    const lotteriesNeedingPrizes = []
    
    for (const lottery of lotteries) {
      const { data: prizes, error: prizesError } = await supabase
        .from('prizes')
        .select('animal_number')
        .eq('lottery_id', lottery.id)

      if (prizesError) throw prizesError

      const existingNumbers = prizes ? prizes.map(p => p.animal_number) : []
      const missingAnimals = ANIMALS.filter(animal => !existingNumbers.includes(animal.number))
      
      console.log(`🎰 ${lottery.name}:`)
      console.log(`   Premios existentes: ${existingNumbers.length}/${ANIMALS.length}`)
      
      if (missingAnimals.length > 0) {
        console.log(`   ⚠️ Faltan ${missingAnimals.length} premios`)
        lotteriesNeedingPrizes.push({
          lottery,
          missingAnimals
        })
      } else {
        console.log(`   ✅ Todos los premios configurados`)
      }
    }

    if (lotteriesNeedingPrizes.length === 0) {
      console.log('\n✅ Todas las loterías tienen premios completos')
      return true
    }

    console.log('\n2️⃣ Creando premios faltantes...')
    
    for (const { lottery, missingAnimals } of lotteriesNeedingPrizes) {
      console.log(`\n🎯 Procesando: ${lottery.name}`)
      console.log(`   Creando ${missingAnimals.length} premios faltantes...`)
      
      const prizesToCreate = missingAnimals.map(animal => ({
        lottery_id: lottery.id,
        animal_number: animal.number,
        animal_name: animal.name,
        multiplier: 37 // Multiplicador estándar
      }))

      // Crear en lotes de 10 para evitar problemas de rendimiento
      const batchSize = 10
      let created = 0
      
      for (let i = 0; i < prizesToCreate.length; i += batchSize) {
        const batch = prizesToCreate.slice(i, i + batchSize)
        
        const { data: createdPrizes, error: createError } = await supabase
          .from('prizes')
          .insert(batch)
          .select()

        if (createError) {
          console.log(`   ❌ Error en lote ${Math.floor(i/batchSize) + 1}:`, createError.message)
        } else {
          created += createdPrizes.length
          console.log(`   ✅ Lote ${Math.floor(i/batchSize) + 1}: ${createdPrizes.length} premios creados`)
        }
      }
      
      console.log(`   🎉 Total creados: ${created}/${missingAnimals.length}`)
    }

    console.log('\n3️⃣ Verificación final...')
    
    for (const { lottery } of lotteriesNeedingPrizes) {
      const { data: finalPrizes } = await supabase
        .from('prizes')
        .select('animal_number')
        .eq('lottery_id', lottery.id)

      console.log(`✅ ${lottery.name}: ${finalPrizes.length}/${ANIMALS.length} premios`)
    }

    return true

  } catch (error) {
    console.error('💥 Error creando premios:', error.message)
    return false
  }
}

createCompletePrizes().then(success => {
  console.log('\n' + '='.repeat(50))
  if (success) {
    console.log('🎉 ¡PREMIOS CREADOS EXITOSAMENTE!')
    console.log('\n✨ SIGUIENTE PASO:')
    console.log('   1. Recarga la página en el navegador (F5)')
    console.log('   2. Abre el diálogo de "Nueva Jugada"')
    console.log('   3. Selecciona una lotería')
    console.log('   4. Ahora deberías poder seleccionar cualquier animal')
    console.log('\n🎯 Todos los animales (00-36) ahora tienen multiplicador x37')
  } else {
    console.log('❌ Hubo problemas creando los premios')
    console.log('   Revisa los errores anteriores')
  }
})