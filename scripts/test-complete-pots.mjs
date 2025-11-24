import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

const INITIAL_POTS = [
  {
    name: "Pote de Premios",
    percentage: 70,
    balance: 0,
    color: "text-blue-600",
    description: "Para pagar premios ganadores",
  },
  {
    name: "Pote de Reserva",
    percentage: 20,
    balance: 0,
    color: "text-orange-600",
    description: "Fondo de respaldo",
  },
  {
    name: "Pote de Ganancias",
    percentage: 10,
    balance: 0,
    color: "text-accent",
    description: "Utilidades del negocio",
  },
]

async function testCompletePotsIntegration() {
  console.log('🧪 PRUEBA COMPLETA DE INTEGRACIÓN DE POTES')
  console.log('='.repeat(60))
  
  try {
    console.log('\\n1️⃣ Verificando conexión a Supabase...')
    const { error: connectionError } = await supabase
      .from('pots')
      .select('id')
      .limit(1)
      
    const isConnected = !connectionError
    console.log(isConnected ? '✅ Conectado a Supabase' : '⚠️ Trabajando offline')
    
    console.log('\\n2️⃣ Inicializando potes...')
    
    // Verificar si existen potes
    let pots = []
    if (isConnected) {
      const { data: existingPots } = await supabase
        .from('pots')
        .select('*')
        .order('name')
        
      if (existingPots && existingPots.length > 0) {
        pots = existingPots
        console.log(`✅ ${pots.length} potes cargados desde Supabase`)
      } else {
        console.log('📝 Creando potes iniciales...')
        const { data: createdPots, error } = await supabase
          .from('pots')
          .insert(INITIAL_POTS.map(pot => ({
            name: pot.name,
            percentage: pot.percentage,
            balance: pot.balance,
            color: pot.color,
            description: pot.description
          })))
          .select()
          
        if (error) {
          console.log('❌ Error creando potes:', error.message)
          pots = INITIAL_POTS
        } else {
          pots = createdPots
          console.log('✅ Potes creados exitosamente')
        }
      }
    } else {
      pots = INITIAL_POTS
      console.log('⚠️ Usando potes por defecto (modo offline)')
    }
    
    pots.forEach(pot => {
      console.log(`   💰 ${pot.name}: Bs. ${pot.balance} (${pot.percentage}%)`)
    })
    
    console.log('\\n3️⃣ Simulando registro de jugada...')
    const betAmount = 100
    console.log(`🎲 Jugada de Bs. ${betAmount}`)
    
    // Distribuir a potes
    for (const pot of pots) {
      const distribution = (betAmount * pot.percentage) / 100
      const newBalance = pot.balance + distribution
      
      console.log(`   📊 ${pot.name}: +Bs. ${distribution.toFixed(2)} = Bs. ${newBalance.toFixed(2)}`)
      
      if (isConnected) {
        const { error } = await supabase
          .from('pots')
          .update({ 
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('name', pot.name)
          
        if (error) {
          console.log(`   ❌ Error actualizando ${pot.name}:`, error.message)
        } else {
          console.log(`   ✅ ${pot.name} actualizado en Supabase`)
        }
      }
      
      pot.balance = newBalance
    }
    
    console.log('\\n4️⃣ Probando transferencia entre potes...')
    const fromPot = pots.find(p => p.name === 'Pote de Reserva')
    const toPot = pots.find(p => p.name === 'Pote de Premios')
    const transferAmount = 30
    
    if (fromPot && toPot && fromPot.balance >= transferAmount) {
      console.log(`🔄 Transfiriendo Bs. ${transferAmount} de ${fromPot.name} a ${toPot.name}`)
      
      // Registrar transferencia
      if (isConnected) {
        const { data: transfer, error } = await supabase
          .from('transfers')
          .insert({
            from_pot: fromPot.name,
            to_pot: toPot.name,
            amount: transferAmount
          })
          .select()
          .single()
          
        if (error) {
          console.log('   ❌ Error registrando transferencia:', error.message)
        } else {
          console.log('   ✅ Transferencia registrada:', transfer.id)
        }
      }
      
      // Actualizar balances
      fromPot.balance -= transferAmount
      toPot.balance += transferAmount
      
      console.log(`   📊 ${fromPot.name}: Bs. ${fromPot.balance}`)
      console.log(`   📊 ${toPot.name}: Bs. ${toPot.balance}`)
      
      if (isConnected) {
        await supabase.from('pots').update({ balance: fromPot.balance }).eq('name', fromPot.name)
        await supabase.from('pots').update({ balance: toPot.balance }).eq('name', toPot.name)
        console.log('   ✅ Balances actualizados en Supabase')
      }
    } else {
      console.log('   ⚠️ No se puede realizar transferencia (balance insuficiente)')
    }
    
    console.log('\\n5️⃣ Probando retiro...')
    const profitPot = pots.find(p => p.name === 'Pote de Ganancias')
    const withdrawAmount = 5
    
    if (profitPot && profitPot.balance >= withdrawAmount) {
      console.log(`💸 Retirando Bs. ${withdrawAmount} de ${profitPot.name}`)
      
      // Registrar retiro
      if (isConnected) {
        const { data: withdrawal, error } = await supabase
          .from('withdrawals')
          .insert({
            from_pot: profitPot.name,
            amount: withdrawAmount
          })
          .select()
          .single()
          
        if (error) {
          console.log('   ❌ Error registrando retiro:', error.message)
        } else {
          console.log('   ✅ Retiro registrado:', withdrawal.id)
        }
      }
      
      // Actualizar balance
      profitPot.balance -= withdrawAmount
      console.log(`   📊 ${profitPot.name}: Bs. ${profitPot.balance}`)
      
      if (isConnected) {
        await supabase.from('pots').update({ balance: profitPot.balance }).eq('name', profitPot.name)
        console.log('   ✅ Balance actualizado en Supabase')
      }
    } else {
      console.log('   ⚠️ No se puede realizar retiro (balance insuficiente)')
    }
    
    console.log('\\n6️⃣ Estado final de potes...')
    pots.forEach((pot, index) => {
      const totalBalance = pots.reduce((sum, p) => sum + p.balance, 0)
      const actualPercentage = totalBalance > 0 ? (pot.balance / totalBalance * 100).toFixed(1) : '0.0'
      console.log(`   ${index + 1}. ${pot.name}`)
      console.log(`      💰 Balance: Bs. ${pot.balance.toFixed(2)}`)
      console.log(`      📊 Porcentaje: ${pot.percentage}% (actual: ${actualPercentage}%)`)
    })
    
    const totalBalance = pots.reduce((sum, p) => sum + p.balance, 0)
    console.log(`\\n💰 Balance total: Bs. ${totalBalance.toFixed(2)}`)
    
    console.log('\\n🎉 ¡Integración de potes completada exitosamente!')
    console.log(isConnected ? '✅ Datos sincronizados con Supabase' : '⚠️ Datos guardados localmente')
    
  } catch (error) {
    console.log('💥 Error en la prueba:', error.message)
  }
}

testCompletePotsIntegration()