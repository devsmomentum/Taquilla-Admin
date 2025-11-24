import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

console.log('🔍 Verificando loterías en Supabase...\n')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas')
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLotteries() {
  try {
    // Obtener todas las loterías
    const { data: lotteries, error } = await supabase
      .from('lotteries')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error al obtener loterías:', error.message)
      return
    }

    console.log(`📊 Total de loterías: ${lotteries.length}\n`)

    if (lotteries.length === 0) {
      console.log('⚠️  No hay loterías creadas en la base de datos')
      console.log('\n💡 Solución: Crear loterías desde la interfaz')
      console.log('   1. Ve a la pestaña "Loterías"')
      console.log('   2. Haz clic en "Nueva Lotería"')
      console.log('   3. Completa los datos y guarda')
    } else {
      console.log('✅ Loterías encontradas:\n')
      lotteries.forEach((lottery, index) => {
        console.log(`${index + 1}. ${lottery.name}`)
        console.log(`   ID: ${lottery.id}`)
        console.log(`   Hora de jugada: ${lottery.draw_time}`)
        console.log(`   Activa: ${lottery.is_active ? '✅' : '❌'}`)
        console.log(`   Juega mañana: ${lottery.plays_tomorrow ? '✅' : '❌'}`)
        console.log('')
      })
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkLotteries()
