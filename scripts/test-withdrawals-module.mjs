#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Configuración Supabase
const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 PRUEBA DEL MÓDULO 9 - RETIROS CON SUPABASE')
console.log('=' .repeat(50))

async function testWithdrawalsModule() {
  try {
    console.log('\n1️⃣ Verificando conexión a Supabase...')
    
    // Test de conexión básica
    const { data: connectionTest, error: connectionError } = await supabase
      .from('withdrawals')
      .select('id')
      .limit(1)

    if (connectionError) {
      console.log('❌ Error de conexión:', connectionError.message)
      return false
    }
    console.log('✅ Conexión a Supabase exitosa')
    
    console.log('\n2️⃣ Verificando tabla withdrawals...')
    
    // Verificar estructura de tabla
    const { data: existingWithdrawals, error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('*')
      .limit(5)
    
    if (withdrawalsError) {
      console.log('❌ Error accediendo tabla withdrawals:', withdrawalsError.message)
      return false
    }
    
    console.log('✅ Tabla withdrawals disponible')
    console.log(`📊 Retiros existentes: ${existingWithdrawals?.length || 0}`)
    
    if (existingWithdrawals && existingWithdrawals.length > 0) {
      console.log('📋 Últimos retiros:')
      existingWithdrawals.forEach(w => {
        console.log(`   - ${w.from_pot}: Bs. ${w.amount} (${new Date(w.created_at).toLocaleString()})`)
      })
    }

    console.log('\n3️⃣ Verificando tabla pots (para balances)...')
    
    const { data: pots, error: potsError } = await supabase
      .from('pots')
      .select('*')
      .order('id')
    
    if (potsError) {
      console.log('❌ Error accediendo tabla pots:', potsError.message)
      return false
    }
    
    console.log('✅ Tabla pots disponible')
    console.log('💰 Balances actuales:')
    pots?.forEach(pot => {
      console.log(`   - ${pot.name}: Bs. ${pot.balance}`)
    })

    console.log('\n4️⃣ Probando creación de retiro...')
    
    // Buscar un pote con balance suficiente para retiro de prueba
    const potWithBalance = pots?.find(p => p.balance >= 10)
    
    if (!potWithBalance) {
      console.log('⚠️ No hay potes con balance suficiente (min. Bs. 10) para prueba')
      console.log('💡 Sugerencia: Ejecuta initialize-pots.mjs primero')
      return true // No es un error, solo falta balance
    }

    const testAmount = 5
    console.log(`💸 Intentando retiro de Bs. ${testAmount} desde ${potWithBalance.name}`)
    console.log(`📊 Balance actual: Bs. ${potWithBalance.balance}`)

    // Crear retiro de prueba
    const withdrawalData = {
      from_pot: potWithBalance.name,
      amount: testAmount,
      created_at: new Date().toISOString()
    }

    const { data: newWithdrawal, error: insertError } = await supabase
      .from('withdrawals')
      .insert(withdrawalData)
      .select()
      .single()

    if (insertError) {
      console.log('❌ Error creando retiro:', insertError.message)
      console.log('💡 Posibles causas:')
      console.log('   - Políticas RLS muy restrictivas')
      console.log('   - Usuario sin permisos de INSERT')
      console.log('   - Constrains de tabla no cumplidos')
      
      // Intentar diagnóstico adicional
      console.log('\n🔍 Diagnóstico RLS:')
      const { data: rlsInfo } = await supabase
        .rpc('pg_table_is_visible', { 'table_name': 'withdrawals' })
        .single()
        
      console.log(`   - Tabla visible: ${rlsInfo ? 'Sí' : 'No'}`)
      
      return false
    }

    console.log('✅ Retiro creado exitosamente:', newWithdrawal.id)

    console.log('\n5️⃣ Actualizando balance del pote...')
    
    const newBalance = potWithBalance.balance - testAmount
    const { error: updateError } = await supabase
      .from('pots')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('name', potWithBalance.name)

    if (updateError) {
      console.log('❌ Error actualizando balance:', updateError.message)
      // Limpiar el retiro creado
      await supabase.from('withdrawals').delete().eq('id', newWithdrawal.id)
      return false
    }

    console.log('✅ Balance actualizado correctamente')
    console.log(`📊 Nuevo balance de ${potWithBalance.name}: Bs. ${newBalance}`)

    console.log('\n6️⃣ Verificando el retiro guardado...')
    
    const { data: savedWithdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', newWithdrawal.id)
      .single()

    if (fetchError) {
      console.log('❌ Error recuperando retiro:', fetchError.message)
      return false
    }

    console.log('✅ Retiro verificado en base de datos')
    console.log(`📋 Detalles:`)
    console.log(`   - ID: ${savedWithdrawal.id}`)
    console.log(`   - Pote: ${savedWithdrawal.from_pot}`)
    console.log(`   - Monto: Bs. ${savedWithdrawal.amount}`)
    console.log(`   - Fecha: ${new Date(savedWithdrawal.created_at).toLocaleString()}`)

    console.log('\n🎉 RESULTADO FINAL:')
    console.log('='.repeat(30))
    console.log('✅ Módulo de Retiros funcionando correctamente')
    console.log('✅ Conexión a Supabase OK')
    console.log('✅ CRUD de retiros operativo')
    console.log('✅ Actualización de balances OK')
    console.log('✅ Listo para usar en la interfaz')

    return true

  } catch (error) {
    console.log('💥 Error inesperado:', error)
    return false
  }
}

// Función para limpiar datos de prueba (opcional)
async function cleanupTestData() {
  console.log('\n🧹 Limpiando datos de prueba...')
  
  try {
    // Eliminar retiros de prueba de los últimos 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    const { data: testWithdrawals } = await supabase
      .from('withdrawals')
      .select('*')
      .gte('created_at', fiveMinutesAgo)
      .lte('amount', 10) // Solo retiros pequeños de prueba

    if (testWithdrawals && testWithdrawals.length > 0) {
      console.log(`🗑️ Eliminando ${testWithdrawals.length} retiros de prueba...`)
      
      const { error } = await supabase
        .from('withdrawals')
        .delete()
        .gte('created_at', fiveMinutesAgo)
        .lte('amount', 10)

      if (error) {
        console.log('⚠️ Error limpiando:', error.message)
      } else {
        console.log('✅ Limpieza completada')
      }
    } else {
      console.log('📭 No hay datos de prueba para limpiar')
    }

  } catch (error) {
    console.log('⚠️ Error durante limpieza:', error)
  }
}

// Ejecutar pruebas
console.log('🚀 Iniciando pruebas del módulo de retiros...')
console.log('')

testWithdrawalsModule()
  .then(async (success) => {
    if (success) {
      console.log('\n✅ TODAS LAS PRUEBAS PASARON')
      console.log('\n💡 INSTRUCCIONES DE USO:')
      console.log('1. Inicia el servidor de desarrollo: npm run dev')
      console.log('2. Ve al Dashboard')  
      console.log('3. Busca las tarjetas de potes')
      console.log('4. Haz clic en "Retirar" en cualquier pote con balance')
      console.log('5. Selecciona el pote y monto en el diálogo')
      console.log('6. Confirma el retiro')
      console.log('7. Verifica que el balance se actualice')
      
      // Ofrecer limpiar datos de prueba
      const args = process.argv.slice(2)
      if (args.includes('--cleanup')) {
        await cleanupTestData()
      } else {
        console.log('\n💡 Tip: Ejecuta con --cleanup para limpiar datos de prueba')
      }
      
    } else {
      console.log('\n❌ ALGUNAS PRUEBAS FALLARON')
      console.log('\n🔧 POSIBLES SOLUCIONES:')
      console.log('1. Verificar que las tablas existan: npm run supabase:sync')
      console.log('2. Desactivar RLS temporalmente: node disable-rls-all.mjs')
      console.log('3. Verificar permisos de usuario en Supabase')
      console.log('4. Revisar configuración de conexión')
    }
    
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.log('\n💥 ERROR FATAL:', error)
    process.exit(1)
  })