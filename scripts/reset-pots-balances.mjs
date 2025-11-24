#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan credenciales de Supabase en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetPotsBalances() {
  console.log('🔄 Reseteando balances de potes a cero...\n')

  try {
    // Obtener todos los potes
    const { data: pots, error: fetchError } = await supabase
      .from('pots')
      .select('id, name, balance')
    
    if (fetchError) {
      console.error('❌ Error obteniendo potes:', fetchError.message)
      return
    }

    if (!pots || pots.length === 0) {
      console.log('⚠️ No hay potes en la base de datos')
      return
    }

    console.log('📋 Potes encontrados:')
    pots.forEach(pot => {
      console.log(`   • ${pot.name}: Bs. ${pot.balance.toFixed(2)}`)
    })

    // Actualizar todos los balances a 0
    const { error: updateError } = await supabase
      .from('pots')
      .update({ balance: 0 })
      .neq('id', 0) // Actualizar todos (condición siempre verdadera)

    if (updateError) {
      console.error('\n❌ Error actualizando balances:', updateError.message)
      return
    }

    console.log('\n✅ Todos los balances han sido reseteados a Bs. 0.00')
    
    // Verificar actualización
    const { data: updatedPots } = await supabase
      .from('pots')
      .select('name, balance')
    
    console.log('\n📊 Balances actualizados:')
    updatedPots?.forEach(pot => {
      console.log(`   • ${pot.name}: Bs. ${pot.balance.toFixed(2)}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

resetPotsBalances()
