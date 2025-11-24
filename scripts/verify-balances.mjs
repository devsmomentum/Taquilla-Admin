#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verificarBalances() {
  console.log('🏦 VERIFICANDO BALANCES DE POTES')
  console.log('=' .repeat(40))
  
  try {
    const { data: pots, error } = await supabase
      .from('pots')
      .select('name, balance, percentage')
      .order('id')
    
    if (error) {
      console.log('❌ Error:', error.message)
      return
    }
    
    if (!pots || pots.length === 0) {
      console.log('❌ No hay potes. Ejecuta el script SQL primero.')
      return
    }
    
    console.log('✅ Potes encontrados:')
    pots.forEach(pot => {
      console.log(`   💰 ${pot.name}: Bs. ${pot.balance} (${pot.percentage}%)`)
    })
    
    // Verificar si hay suficiente balance para retiros
    const potesConBalance = pots.filter(p => p.balance >= 10)
    
    console.log('')
    if (potesConBalance.length > 0) {
      console.log('🎉 ¡PERFECTO! Hay potes con balance suficiente para retiros')
      console.log('🚀 El botón "Retirar" ya debería funcionar')
      console.log('')
      console.log('📋 PRÓXIMOS PASOS:')
      console.log('1. Ve a http://localhost:5000/')
      console.log('2. Dashboard → Tarjetas de potes')
      console.log('3. Haz clic en "Retirar"')
      console.log('4. ¡Disfruta del sistema funcionando!')
    } else {
      console.log('⚠️  Los potes necesitan más balance')
      console.log('Ejecuta el script SQL para inicializar balances')
    }
    
  } catch (err) {
    console.log('💥 Error:', err.message)
  }
}

verificarBalances()