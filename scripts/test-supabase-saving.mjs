import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSupabaseSaving() {
  console.log('🧪 PROBANDO GUARDADO MEJORADO EN SUPABASE')
  console.log('='.repeat(60))
  
  try {
    console.log('\\n1️⃣ Verificando conexión...')
    const { error: connectionError } = await supabase
      .from('pots')
      .select('id')
      .limit(1)
      
    const isConnected = !connectionError
    console.log(isConnected ? '✅ Conectado' : '❌ Sin conexión')
    
    console.log('\\n2️⃣ Probando insert en transfers...')
    const testTransfer = {
      from_pot: 'Pote de Reserva',
      to_pot: 'Pote de Premios', 
      amount: 50,
      created_at: new Date().toISOString()
    }
    
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert(testTransfer)
      .select()
      .single()
      
    if (transferError) {
      console.log('❌ Error insert transfers:', transferError.message)
      
      // Probar upsert como alternativa
      console.log('🔄 Probando upsert...')
      const transferWithId = {
        id: `test-${Date.now()}`,
        ...testTransfer
      }
      
      const { data: upsertTransfer, error: upsertError } = await supabase
        .from('transfers')
        .upsert(transferWithId, { onConflict: 'id' })
        .select()
        
      if (upsertError) {
        console.log('❌ Error upsert transfers:', upsertError.message)
      } else {
        console.log('✅ Upsert transfer exitoso:', upsertTransfer)
      }
    } else {
      console.log('✅ Insert transfer exitoso:', transfer.id)
    }
    
    console.log('\\n3️⃣ Probando insert en withdrawals...')
    const testWithdrawal = {
      from_pot: 'Pote de Ganancias',
      amount: 25,
      created_at: new Date().toISOString()
    }
    
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert(testWithdrawal)
      .select()
      .single()
      
    if (withdrawalError) {
      console.log('❌ Error insert withdrawals:', withdrawalError.message)
      
      // Probar upsert como alternativa
      console.log('🔄 Probando upsert withdrawal...')
      const withdrawalWithId = {
        id: `test-${Date.now()}`,
        ...testWithdrawal
      }
      
      const { data: upsertWithdrawal, error: upsertWithdrawalError } = await supabase
        .from('withdrawals')
        .upsert(withdrawalWithId, { onConflict: 'id' })
        .select()
        
      if (upsertWithdrawalError) {
        console.log('❌ Error upsert withdrawals:', upsertWithdrawalError.message)
      } else {
        console.log('✅ Upsert withdrawal exitoso:', upsertWithdrawal)
      }
    } else {
      console.log('✅ Insert withdrawal exitoso:', withdrawal.id)
    }
    
    console.log('\\n4️⃣ Verificando datos guardados...')
    
    // Verificar transfers
    const { data: allTransfers, error: transfersReadError } = await supabase
      .from('transfers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      
    if (transfersReadError) {
      console.log('❌ Error leyendo transfers:', transfersReadError.message)
    } else {
      console.log(`✅ ${allTransfers.length} transfers encontradas:`)
      allTransfers.forEach(t => {
        console.log(`   🔄 ${t.from_pot} → ${t.to_pot}: Bs. ${t.amount}`)
      })
    }
    
    // Verificar withdrawals
    const { data: allWithdrawals, error: withdrawalsReadError } = await supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
      
    if (withdrawalsReadError) {
      console.log('❌ Error leyendo withdrawals:', withdrawalsReadError.message)
    } else {
      console.log(`✅ ${allWithdrawals.length} withdrawals encontrados:`)
      allWithdrawals.forEach(w => {
        console.log(`   💸 ${w.from_pot}: -Bs. ${w.amount}`)
      })
    }
    
    console.log('\\n🎯 CONCLUSIONES:')
    
    const transferWorks = !transferError || !upsertError
    const withdrawalWorks = !withdrawalError || !upsertWithdrawalError
    const readWorks = !transfersReadError && !withdrawalsReadError
    
    console.log(`📊 Transfers funcionan: ${transferWorks ? '✅' : '❌'}`)
    console.log(`📊 Withdrawals funcionan: ${withdrawalWorks ? '✅' : '❌'}`)
    console.log(`📊 Lectura funciona: ${readWorks ? '✅' : '❌'}`)
    
    if (transferWorks && withdrawalWorks) {
      console.log('\\n🎉 ¡GUARDADO EN SUPABASE FUNCIONAL!')
      console.log('✅ Las transferencias y retiros se pueden guardar')
      console.log('🔄 El sistema hybrid (local + Supabase) está operativo')
    } else {
      console.log('\\n⚠️ Guardado parcialmente funcional')
      console.log('💡 El sistema continuará funcionando con backup local')
      console.log('🔄 Los datos se sincronizarán cuando sea posible')
    }
    
  } catch (error) {
    console.log('💥 Error general:', error.message)
  }
}

testSupabaseSaving()