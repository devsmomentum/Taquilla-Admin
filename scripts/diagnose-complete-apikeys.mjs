#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO COMPLETO DEL FLUJO API KEYS
 * Verifica tanto Supabase como localStorage
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

console.log('🔍 DIAGNÓSTICO COMPLETO - FLUJO API KEYS')
console.log('=' .repeat(50))

async function testSupabaseFlow() {
  console.log('\n🔴 FLUJO SUPABASE')
  console.log('─'.repeat(20))
  
  try {
    // Test 1: Conexión básica
    console.log('\n1️⃣ Probando conexión básica...')
    const { data: connectionTest, error: connError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1)
    
    if (connError) {
      console.log('❌ Error de conexión:', connError.message)
      return { connection: false, functions: false, insertion: false }
    }
    
    console.log('✅ Conexión a tabla api_keys OK')
    
    // Test 2: Funciones
    console.log('\n2️⃣ Probando funciones...')
    const { data: hashTest, error: hashError } = await supabase
      .rpc('create_api_key_hash', { raw_key: 'test_function' })
    
    if (hashError) {
      console.log('❌ Función create_api_key_hash falló:', hashError.message)
      return { connection: true, functions: false, insertion: false }
    }
    
    console.log('✅ Función create_api_key_hash OK')
    
    // Test 3: Inserción
    console.log('\n3️⃣ Probando inserción...')
    const testData = {
      name: 'Test Diagnóstico',
      key_hash: hashTest,
      key_prefix: 'sk_test',
      description: 'Prueba de diagnóstico completo',
      is_active: true,
      permissions: ['read:basic'],
      created_by: '00000000-0000-0000-0000-000000000000'
    }
    
    const { data: insertTest, error: insertError } = await supabase
      .from('api_keys')
      .insert(testData)
      .select()
      .single()
    
    if (insertError) {
      console.log('❌ Inserción falló:', insertError.message)
      console.log('   Código:', insertError.code)
      
      if (insertError.code === '42501') {
        console.log('   💡 Problema: Políticas RLS muy restrictivas')
      } else if (insertError.code === '23503') {
        console.log('   💡 Problema: Usuario sistema no existe')
      }
      
      return { connection: true, functions: true, insertion: false }
    }
    
    console.log('✅ Inserción en Supabase OK')
    
    // Limpiar
    await supabase.from('api_keys').delete().eq('id', insertTest.id)
    console.log('🧹 Datos de prueba limpiados')
    
    return { connection: true, functions: true, insertion: true }
    
  } catch (error) {
    console.log('❌ Error general en Supabase:', error.message)
    return { connection: false, functions: false, insertion: false }
  }
}

function testLocalStorageFlow() {
  console.log('\n🟡 FLUJO LOCALSTORAGE')
  console.log('─'.repeat(20))
  
  try {
    // Test 1: Verificar si localStorage está disponible
    console.log('\n1️⃣ Verificando disponibilidad localStorage...')
    
    if (typeof localStorage === 'undefined') {
      console.log('❌ localStorage no disponible (entorno Node.js)')
      return { available: false, read: false, write: false }
    }
    
    console.log('✅ localStorage disponible')
    
    // Test 2: Leer datos existentes
    console.log('\n2️⃣ Leyendo datos existentes...')
    const existingData = localStorage.getItem('apiKeys')
    
    if (existingData) {
      try {
        const parsed = JSON.parse(existingData)
        console.log(`✅ Datos existentes encontrados: ${parsed.length || 0} API keys`)
        console.log('   Ejemplo:', parsed[0] ? parsed[0].name : 'N/A')
      } catch (parseError) {
        console.log('❌ Datos corruptos en localStorage')
        localStorage.removeItem('apiKeys')
      }
    } else {
      console.log('⚠️ No hay datos existentes en localStorage')
    }
    
    // Test 3: Escribir datos de prueba
    console.log('\n3️⃣ Probando escritura...')
    const testApiKeys = [
      {
        id: 'test-local-' + Date.now(),
        name: 'Test Local API Key',
        key: 'sk_test_local_123456789',
        description: 'Prueba de localStorage',
        isActive: true,
        permissions: ['read:basic'],
        createdAt: new Date().toISOString(),
        createdBy: 'test'
      }
    ]
    
    localStorage.setItem('apiKeys', JSON.stringify(testApiKeys))
    
    // Verificar que se escribió
    const writtenData = localStorage.getItem('apiKeys')
    const parsed = JSON.parse(writtenData)
    
    if (parsed && parsed.length > 0) {
      console.log('✅ Escritura en localStorage OK')
      console.log(`   Guardado: ${parsed.length} API keys`)
      
      // Limpiar
      localStorage.removeItem('apiKeys')
      console.log('🧹 Datos de prueba limpiados')
      
      return { available: true, read: true, write: true }
    } else {
      console.log('❌ Error escribiendo en localStorage')
      return { available: true, read: true, write: false }
    }
    
  } catch (error) {
    console.log('❌ Error en localStorage:', error.message)
    return { available: false, read: false, write: false }
  }
}

async function testHookIntegration() {
  console.log('\n🔵 FLUJO HOOK INTEGRATION')
  console.log('─'.repeat(20))
  
  // Simular el comportamiento del hook useSupabaseApiKeys
  console.log('\n1️⃣ Simulando carga inicial del hook...')
  
  try {
    // Test conexión como lo hace el hook
    const { error: testConnectionError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1)
    
    const isConnected = !testConnectionError
    console.log(`   Supabase conectado: ${isConnected ? '✅' : '❌'}`)
    
    if (isConnected) {
      console.log('   💡 Hook debería intentar cargar desde Supabase primero')
      
      // Simular carga desde Supabase
      const { data: supabaseData, error: loadError } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (loadError) {
        console.log(`   ❌ Error cargando desde Supabase: ${loadError.message}`)
        console.log('   💡 Hook debería hacer fallback a localStorage')
      } else {
        console.log(`   ✅ Carga desde Supabase OK: ${supabaseData.length} API keys`)
      }
    } else {
      console.log('   💡 Hook debería usar solo localStorage')
    }
    
    console.log('\n2️⃣ Simulando creación de API Key...')
    
    // Generar API key como lo hace el hook
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let newKey = "sk_"
    const timestamp = Date.now().toString(36)
    newKey += timestamp.slice(-4) + "_"
    
    for (let i = 0; i < 40; i++) {
      newKey += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    console.log(`   Generada: ${newKey.substring(0, 15)}...`)
    
    if (isConnected) {
      console.log('   💡 Hook intentaría guardar en Supabase primero')
      
      // Generar hash
      const { data: hashResult, error: hashError } = await supabase
        .rpc('create_api_key_hash', { raw_key: newKey })
      
      if (!hashError) {
        console.log('   ✅ Hash generado correctamente')
        
        // Intentar insertar
        const newApiKey = {
          name: 'Test Hook Integration',
          key_hash: hashResult,
          key_prefix: newKey.substring(0, 7),
          description: 'Prueba de integración del hook',
          is_active: true,
          permissions: ['read:basic'],
          created_by: '00000000-0000-0000-0000-000000000000'
        }
        
        const { data: insertResult, error: insertError } = await supabase
          .from('api_keys')
          .insert(newApiKey)
          .select()
          .single()
        
        if (insertError) {
          console.log('   ❌ Inserción en Supabase falló:', insertError.message)
          console.log('   💡 Hook debería hacer fallback a localStorage')
        } else {
          console.log('   ✅ Inserción en Supabase exitosa')
          
          // Limpiar
          await supabase.from('api_keys').delete().eq('id', insertResult.id)
          console.log('   🧹 Datos de prueba limpiados')
        }
      } else {
        console.log('   ❌ Error generando hash:', hashError.message)
      }
    }
    
    return true
    
  } catch (error) {
    console.log('❌ Error en simulación de hook:', error.message)
    return false
  }
}

async function main() {
  console.log(`🔗 Conectando a: ${supabaseUrl}`)
  
  const supabaseResults = await testSupabaseFlow()
  const localStorageResults = testLocalStorageFlow()
  const hookResults = await testHookIntegration()
  
  console.log('\n📊 RESUMEN DIAGNÓSTICO:')
  console.log('═'.repeat(50))
  
  console.log('\n🔴 SUPABASE:')
  console.log(`   Conexión: ${supabaseResults.connection ? '✅' : '❌'}`)
  console.log(`   Funciones: ${supabaseResults.functions ? '✅' : '❌'}`)
  console.log(`   Inserción: ${supabaseResults.insertion ? '✅' : '❌'}`)
  
  console.log('\n🟡 LOCALSTORAGE:')
  console.log(`   Disponible: ${localStorageResults.available ? '✅' : '❌'}`)
  console.log(`   Lectura: ${localStorageResults.read ? '✅' : '❌'}`)
  console.log(`   Escritura: ${localStorageResults.write ? '✅' : '❌'}`)
  
  console.log('\n🔵 HOOK INTEGRATION:')
  console.log(`   Simulación: ${hookResults ? '✅' : '❌'}`)
  
  console.log('\n🎯 PROBLEMAS IDENTIFICADOS:')
  console.log('─'.repeat(30))
  
  if (!supabaseResults.insertion) {
    console.log('❌ PROBLEMA CRÍTICO: No se puede insertar en Supabase')
    console.log('   💡 Solución: Ejecutar FIX_RLS_APIKEYS.sql en Supabase')
    console.log('   📋 SQL necesario:')
    console.log('      ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;')
    console.log('      CREATE POLICY "api_keys_allow_all" ON api_keys FOR ALL USING (true);')
    console.log('      ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;')
  }
  
  if (!localStorageResults.available) {
    console.log('❌ PROBLEMA: localStorage no disponible en este entorno')
    console.log('   💡 Normal en Node.js, debería funcionar en navegador')
  }
  
  if (supabaseResults.insertion && localStorageResults.write) {
    console.log('✅ TODOS LOS FLUJOS FUNCIONAN')
    console.log('   🎉 El módulo debería guardar correctamente')
    console.log('   🔄 Si sigue fallando, revisar el código del hook')
  }
}

main().catch(console.error)