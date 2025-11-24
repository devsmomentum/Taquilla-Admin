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

async function syncPotsWithRealData() {
  console.log('🔄 SINCRONIZANDO POTES CON DATOS REALES')
  console.log('='.repeat(60))
  
  try {
    console.log('\\n1️⃣ Analizando jugadas existentes...')
    
    // Obtener todas las jugadas reales
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('amount, created_at, animal_name')
      .order('created_at', { ascending: true })
      
    if (betsError) {
      console.log('❌ Error obteniendo jugadas:', betsError.message)
      return
    }
    
    const totalBetAmount = bets.reduce((sum, bet) => sum + Number(bet.amount), 0)
    
    console.log(`✅ ${bets.length} jugadas encontradas`)
    console.log(`💰 Total apostado: Bs. ${totalBetAmount}`)
    
    if (bets.length > 0) {
      console.log('\\n📋 Últimas 5 jugadas:')
      bets.slice(-5).forEach((bet, index) => {
        console.log(`   ${index + 1}. ${bet.animal_name} - Bs. ${bet.amount}`)
      })
    }
    
    console.log('\\n2️⃣ Inicializando o verificando potes...')
    
    // Verificar si existen potes
    const { data: existingPots } = await supabase
      .from('pots')
      .select('*')
      .order('name')
      
    let pots = []
    
    if (!existingPots || existingPots.length === 0) {
      console.log('📝 Creando potes iniciales...')
      
      // Crear potes
      const { data: createdPots, error: createError } = await supabase
        .from('pots')
        .insert(INITIAL_POTS.map(pot => ({
          name: pot.name,
          percentage: pot.percentage,
          balance: 0, // Empezar en 0, luego distribuir
          color: pot.color,
          description: pot.description
        })))
        .select()
        
      if (createError) {
        console.log('❌ Error creando potes:', createError.message)
        console.log('⚠️ Usando datos por defecto para cálculos')
        pots = INITIAL_POTS
      } else {
        pots = createdPots
        console.log('✅ Potes creados exitosamente')
      }
    } else {
      pots = existingPots
      console.log(`✅ ${pots.length} potes existentes encontrados`)
    }
    
    console.log('\\n3️⃣ Calculando distribución correcta...')
    
    // Calcular balances según el total apostado
    const distributedBalances = INITIAL_POTS.map(pot => {
      const distribution = (totalBetAmount * pot.percentage) / 100
      console.log(`📊 ${pot.name}: ${pot.percentage}% de Bs. ${totalBetAmount} = Bs. ${distribution.toFixed(2)}`)
      return {
        name: pot.name,
        balance: distribution
      }
    })
    
    console.log('\\n4️⃣ Actualizando balances en Supabase...')
    
    // Actualizar cada pote con su balance correcto
    for (const potUpdate of distributedBalances) {
      const { error } = await supabase
        .from('pots')
        .update({ 
          balance: potUpdate.balance,
          updated_at: new Date().toISOString()
        })
        .eq('name', potUpdate.name)
        
      if (error) {
        console.log(`❌ Error actualizando ${potUpdate.name}:`, error.message)
      } else {
        console.log(`✅ ${potUpdate.name}: Bs. ${potUpdate.balance.toFixed(2)}`)
      }
    }
    
    console.log('\\n5️⃣ Verificando resultado final...')
    
    // Verificar balances finales
    const { data: finalPots } = await supabase
      .from('pots')
      .select('*')
      .order('name')
      
    if (finalPots) {
      const totalPotBalance = finalPots.reduce((sum, p) => sum + Number(p.balance), 0)
      
      console.log('💰 BALANCES FINALES:')
      finalPots.forEach(pot => {
        const actualPercentage = totalPotBalance > 0 ? (pot.balance / totalPotBalance * 100).toFixed(1) : '0.0'
        console.log(`   🏦 ${pot.name}`)
        console.log(`      💵 Balance: Bs. ${Number(pot.balance).toFixed(2)}`)
        console.log(`      📊 Porcentaje: ${pot.percentage}% (real: ${actualPercentage}%)`)
      })
      
      console.log(`\\n📈 RESUMEN:`)
      console.log(`💰 Total en jugadas: Bs. ${totalBetAmount}`)
      console.log(`🏦 Total en potes: Bs. ${totalPotBalance.toFixed(2)}`)
      console.log(`✅ Diferencia: Bs. ${(totalBetAmount - totalPotBalance).toFixed(2)}`)
      
      if (Math.abs(totalBetAmount - totalPotBalance) < 0.01) {
        console.log('\\n🎉 ¡SINCRONIZACIÓN PERFECTA!')
        console.log('✅ Los potes reflejan exactamente las jugadas registradas')
        console.log('💡 El sistema está balanceado financieramente')
      } else {
        console.log('\\n⚠️ Diferencia detectada')
        console.log('🔍 Puede ser por redondeo o jugadas procesadas después')
      }
    }
    
    console.log('\\n6️⃣ Actualizando backup local...')
    
    // Crear backup local compatible
    const localBackup = finalPots?.map(pot => ({
      name: pot.name,
      percentage: pot.percentage,
      balance: Number(pot.balance),
      color: pot.color,
      description: pot.description
    })) || INITIAL_POTS
    
    console.log('💾 Backup local creado para localStorage')
    console.log('📝 Estructura:', JSON.stringify(localBackup, null, 2))
    
    console.log('\\n🎯 ¡SINCRONIZACIÓN COMPLETA!')
    console.log('✅ Los datos reales han sido integrados correctamente')
    console.log('🚀 El sistema está listo para continuar operando')
    console.log('💰 Todas las jugadas futuras se distribuirán automáticamente')
    
  } catch (error) {
    console.log('💥 Error en sincronización:', error.message)
  }
}

syncPotsWithRealData()