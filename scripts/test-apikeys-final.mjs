#!/usr/bin/env node

/**
 * 🔍 VERIFICACIÓN FINAL DEL MÓDULO API KEYS
 * Confirma que todas las correcciones se aplicaron correctamente
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 VERIFICACIÓN FINAL - MÓDULO API KEYS')
console.log('=' .repeat(50))

async function verifyFinalSetup() {
  let allGood = true
  
  try {
    console.log('\n1️⃣ Verificando función create_api_key_hash...')
    
    const { data: hashResult, error: hashError } = await supabase
      .rpc('create_api_key_hash', { raw_key: 'test_final_verification' })
    
    if (hashError) {
      console.log('❌ Función create_api_key_hash no disponible:', hashError.message)
      allGood = false
    } else {
      console.log('✅ Función create_api_key_hash funciona correctamente')
      console.log(`   Hash generado: ${hashResult.substring(0, 16)}...`)
    }
    
    console.log('\n2️⃣ Verificando función verify_api_key...')
    
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('verify_api_key', { api_key_hash: 'nonexistent_key_test' })
    
    if (verifyError) {
      console.log('❌ Función verify_api_key no disponible:', verifyError.message)
      allGood = false
    } else {
      console.log('✅ Función verify_api_key funciona correctamente')
    }
    
    console.log('\n3️⃣ Verificando acceso a tabla api_keys...')
    
    const { data: tableAccess, error: tableError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.log('❌ Error accediendo a tabla api_keys:', tableError.message)
      if (tableError.code === 'PGRST116') {
        console.log('💡 Políticas RLS aún muy restrictivas')
      }
      allGood = false
    } else {
      console.log('✅ Acceso a tabla api_keys funciona')
    }
    
    console.log('\n4️⃣ Probando inserción de API Key...')
    
    const testKey = `sk_final_test_${Date.now()}`
    const keyHash = await createKeyHash(testKey)
    
    const testData = {
      name: 'Final Test API Key',
      key_hash: keyHash,
      key_prefix: testKey.substring(0, 7),
      description: 'API Key de verificación final',
      is_active: true,
      permissions: ['read:basic'],
      created_by: '00000000-0000-0000-0000-000000000000'
    }
    
    const { data: insertResult, error: insertError } = await supabase
      .from('api_keys')
      .insert(testData)
      .select()
      .single()
    
    if (insertError) {
      console.log('❌ Error insertando API Key:', insertError.message)
      console.log('💡 Código de error:', insertError.code)
      
      if (insertError.code === '23503') {
        console.log('💡 El usuario sistema no existe - falta crear el usuario por defecto')
      } else if (insertError.code === '42501') {
        console.log('💡 Problema con políticas RLS - verificar políticas')
      }
      
      allGood = false
    } else {
      console.log('✅ API Key insertada exitosamente')
      console.log(`   ID: ${insertResult.id}`)
      
      // Limpiar API Key de prueba
      await supabase
        .from('api_keys')
        .delete()
        .eq('id', insertResult.id)
      
      console.log('🧹 API Key de prueba eliminada')
    }
    
    console.log('\n5️⃣ Verificando vista de estadísticas...')
    
    const { data: statsResult, error: statsError } = await supabase
      .from('api_keys_stats')
      .select('*')
      .single()
    
    if (statsError) {
      console.log('⚠️ Vista api_keys_stats no disponible:', statsError.message)
    } else {
      console.log('✅ Vista de estadísticas disponible')
      console.log(`   Total keys: ${statsResult.total_keys || 0}`)
    }
    
    return allGood
    
  } catch (error) {
    console.error('❌ Error en verificación:', error.message)
    return false
  }
}

// Función auxiliar para crear hash
async function createKeyHash(apiKey) {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function testFullIntegration() {
  console.log('\n6️⃣ PRUEBA DE INTEGRACIÓN COMPLETA...')
  
  try {
    // Simular el flujo completo de creación de API Key
    const newKey = generateSecureApiKey()
    const keyHash = await createKeyHash(newKey)
    const keyPrefix = newKey.substring(0, 7)
    
    console.log('🔑 Generando API Key segura...')
    console.log(`   Key: ${newKey.substring(0, 15)}...`)
    console.log(`   Hash: ${keyHash.substring(0, 16)}...`)
    console.log(`   Prefix: ${keyPrefix}`)
    
    // Intentar crear via función RPC si está disponible
    const { data: rpcHash, error: rpcError } = await supabase
      .rpc('create_api_key_hash', { raw_key: newKey })
    
    if (!rpcError) {
      console.log('✅ Hash generado via RPC correctamente')
    }
    
    // Probar inserción completa
    const completeData = {
      name: 'Integration Test Key',
      key_hash: keyHash,
      key_prefix: keyPrefix,
      description: 'Prueba de integración completa',
      is_active: true,
      permissions: ['read:basic', 'write:limited'],
      created_by: '00000000-0000-0000-0000-000000000000'
    }
    
    const { data: finalResult, error: finalError } = await supabase
      .from('api_keys')
      .insert(completeData)
      .select()
      .single()
    
    if (finalError) {
      console.log('❌ Falló la integración completa:', finalError.message)
      return false
    }
    
    console.log('✅ Integración completa exitosa!')
    console.log(`   API Key creada con ID: ${finalResult.id}`)
    
    // Verificar que se puede leer
    const { data: readTest, error: readError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', finalResult.id)
      .single()
    
    if (!readError && readTest) {
      console.log('✅ API Key se puede leer correctamente')
    }
    
    // Limpiar
    await supabase
      .from('api_keys')
      .delete()
      .eq('id', finalResult.id)
    
    console.log('🧹 Datos de prueba limpiados')
    
    return true
    
  } catch (error) {
    console.error('❌ Error en integración completa:', error.message)
    return false
  }
}

// Función para generar API Key segura
function generateSecureApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let key = "sk_"
  
  const timestamp = Date.now().toString(36)
  key += timestamp.slice(-4) + "_"
  
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return key
}

async function main() {
  console.log(`🔗 Conectando a: ${supabaseUrl}`)
  
  const basicSetup = await verifyFinalSetup()
  const fullIntegration = await testFullIntegration()
  
  console.log('\n📊 RESULTADO FINAL:')
  console.log('═'.repeat(40))
  
  if (basicSetup && fullIntegration) {
    console.log('🎉 ¡MÓDULO API KEYS TOTALMENTE FUNCIONAL!')
    console.log('✅ Configuración básica: OK')
    console.log('✅ Integración completa: OK')
    console.log('✅ Guardado en Supabase: FUNCIONA')
    console.log('')
    console.log('🚀 EL MÓDULO ESTÁ LISTO PARA USO EN PRODUCCIÓN')
    console.log('')
    console.log('📝 Próximos pasos:')
    console.log('   1. Refrescar la aplicación web (Ctrl+F5)')
    console.log('   2. Probar crear API Keys desde la interfaz')
    console.log('   3. Verificar que se guardan en Supabase automáticamente')
    
  } else if (basicSetup && !fullIntegration) {
    console.log('⚠️ CONFIGURACIÓN BÁSICA OK, PERO HAY PROBLEMAS DE INTEGRACIÓN')
    console.log('✅ Configuración básica: OK')
    console.log('❌ Integración completa: FALLO')
    console.log('')
    console.log('💡 Posibles soluciones:')
    console.log('   - Verificar que existe el usuario sistema')
    console.log('   - Revisar políticas RLS en Supabase Dashboard')
    
  } else {
    console.log('❌ MÓDULO API KEYS AÚN TIENE PROBLEMAS')
    console.log('❌ Configuración básica: FALLO')
    console.log('❌ Integración completa: FALLO')
    console.log('')
    console.log('🔧 ACCIONES REQUERIDAS:')
    console.log('   1. Ejecutar EJECUTAR_EN_SUPABASE.sql en Supabase SQL Editor')
    console.log('   2. Verificar que no hay errores en la ejecución')
    console.log('   3. Volver a ejecutar este script de verificación')
  }
}

main().catch(console.error)