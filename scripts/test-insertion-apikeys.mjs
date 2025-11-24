#!/usr/bin/env node

/**
 * 🧪 PRUEBA RÁPIDA DE INSERCIÓN API KEYS
 * Verifica que se puedan crear API keys en Supabase
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

console.log('🧪 PRUEBA RÁPIDA - INSERCIÓN API KEYS')
console.log('=' .repeat(40))

async function testApiKeyInsertion() {
  try {
    console.log('\n1️⃣ Generando API Key de prueba...')
    
    const testKey = `sk_test_${Date.now()}`
    
    // Crear hash usando la función de Supabase
    const { data: hashResult, error: hashError } = await supabase
      .rpc('create_api_key_hash', { raw_key: testKey })
    
    if (hashError) {
      console.log('❌ Error generando hash:', hashError.message)
      return false
    }
    
    console.log('✅ Hash generado correctamente')
    console.log(`   Key: ${testKey}`)
    console.log(`   Hash: ${hashResult.substring(0, 16)}...`)
    
    console.log('\n2️⃣ Intentando insertar en Supabase...')
    
    const testData = {
      name: 'Test API Key - Inserción',
      key_hash: hashResult,
      key_prefix: testKey.substring(0, 7),
      description: 'Prueba de inserción directa',
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
      console.log('❌ Error insertando:', insertError.message)
      console.log('   Código:', insertError.code)
      console.log('   Detalles:', insertError.details || 'N/A')
      
      if (insertError.code === '42501') {
        console.log('\n💡 Problema de políticas RLS detectado')
        console.log('   Ejecuta FIX_RLS_APIKEYS.sql en Supabase SQL Editor')
      } else if (insertError.code === '23503') {
        console.log('\n💡 Problema de foreign key (usuario no existe)')
        console.log('   El usuario sistema necesita ser creado')
      }
      
      return false
    }
    
    console.log('✅ ¡API Key insertada exitosamente!')
    console.log(`   ID: ${insertResult.id}`)
    console.log(`   Nombre: ${insertResult.name}`)
    
    console.log('\n3️⃣ Verificando que se puede leer...')
    
    const { data: readTest, error: readError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', insertResult.id)
      .single()
    
    if (readError) {
      console.log('❌ Error leyendo API Key:', readError.message)
    } else {
      console.log('✅ API Key se puede leer correctamente')
    }
    
    console.log('\n4️⃣ Limpiando datos de prueba...')
    
    await supabase
      .from('api_keys')
      .delete()
      .eq('id', insertResult.id)
    
    console.log('🧹 Datos de prueba eliminados')
    
    return true
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
    return false
  }
}

async function main() {
  console.log(`🔗 Conectando a: ${supabaseUrl}`)
  
  const success = await testApiKeyInsertion()
  
  console.log('\n📊 RESULTADO:')
  console.log('─'.repeat(20))
  
  if (success) {
    console.log('🎉 ¡INSERCIÓN FUNCIONANDO!')
    console.log('✅ Las API Keys se pueden guardar en Supabase')
    console.log('')
    console.log('🔄 Próximo paso:')
    console.log('   Refrescar la aplicación web y probar crear API Keys')
    console.log('   Deberían guardarse automáticamente en Supabase')
  } else {
    console.log('❌ INSERCIÓN FALLANDO')
    console.log('🔧 Ejecuta FIX_RLS_APIKEYS.sql en Supabase SQL Editor')
    console.log('   Luego vuelve a ejecutar este test')
  }
}

main().catch(console.error)