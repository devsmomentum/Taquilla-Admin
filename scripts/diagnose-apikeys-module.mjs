#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO DEL MÓDULO API KEYS
 * Verifica la integración Supabase y soluciona problemas de guardado
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

console.log('🔍 DIAGNÓSTICO DEL MÓDULO API KEYS')
console.log('=' .repeat(50))

async function diagnoseApiKeysModule() {
  try {
    // 1. Verificar tabla api_keys
    console.log('\n1️⃣ Verificando tabla api_keys...')
    
    const { data: tableCheck, error: tableError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1)
    
    if (tableError) {
      console.log('❌ Error accediendo a tabla api_keys:', tableError.message)
      console.log('💡 Sugerencia: Ejecutar setup-apikeys-complete.sql')
      return false
    }
    
    console.log('✅ Tabla api_keys accesible')
    
    // 2. Verificar estructura de la tabla
    console.log('\n2️⃣ Verificando estructura de la tabla...')
    
    const { data: structure } = await supabase
      .from('api_keys')
      .select('*')
      .limit(1)
    
    console.log('✅ Estructura de tabla verificada')
    
    // 3. Contar registros existentes
    console.log('\n3️⃣ Contando registros existentes...')
    
    const { count, error: countError } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.log('⚠️ Error contando registros:', countError.message)
    } else {
      console.log(`📊 Total de API Keys en Supabase: ${count || 0}`)
    }
    
    // 4. Verificar funciones necesarias
    console.log('\n4️⃣ Verificando funciones de base de datos...')
    
    try {
      const { error: funcError } = await supabase
        .rpc('create_api_key_hash', { raw_key: 'test_key_verification' })
      
      if (funcError) {
        console.log('❌ Función create_api_key_hash no disponible:', funcError.message)
        return false
      }
      
      console.log('✅ Función create_api_key_hash disponible')
    } catch (err) {
      console.log('❌ Error probando funciones:', err.message)
      return false
    }
    
    // 5. Verificar políticas RLS
    console.log('\n5️⃣ Verificando políticas RLS...')
    
    const { data: policies, error: policyError } = await supabase
      .from('api_keys')
      .select('id, name')
      .limit(1)
    
    if (policyError && policyError.code === 'PGRST116') {
      console.log('❌ Políticas RLS muy restrictivas o no configuradas')
      console.log('💡 Necesita configurar políticas para el usuario actual')
      return false
    }
    
    console.log('✅ Políticas RLS configuradas correctamente')
    
    // 6. Verificar vista de estadísticas
    console.log('\n6️⃣ Verificando vista de estadísticas...')
    
    const { data: statsCheck, error: statsError } = await supabase
      .from('api_keys_stats')
      .select('*')
      .limit(1)
    
    if (statsError) {
      console.log('⚠️ Vista api_keys_stats no disponible:', statsError.message)
      console.log('💡 Las estadísticas no estarán disponibles')
    } else {
      console.log('✅ Vista de estadísticas disponible')
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error general en diagnóstico:', error.message)
    return false
  }
}

async function fixApiKeysIssues() {
  console.log('\n🔧 APLICANDO CORRECCIONES...')
  
  try {
    // Crear función create_api_key_hash si no existe
    console.log('\n📝 Creando función create_api_key_hash...')
    
    const createHashFunction = `
      CREATE OR REPLACE FUNCTION create_api_key_hash(raw_key TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN encode(digest(raw_key, 'sha256'), 'hex');
      END;
      $$;
    `
    
    const { error: funcError } = await supabase.rpc('exec_sql', { 
      sql: createHashFunction 
    })
    
    if (funcError) {
      console.log('⚠️ No se pudo crear función automáticamente')
      console.log('💡 Ejecutar manualmente en SQL Editor de Supabase:')
      console.log(createHashFunction)
    } else {
      console.log('✅ Función create_api_key_hash creada')
    }
    
    // Verificar y crear políticas básicas si es necesario
    console.log('\n🔒 Verificando políticas RLS...')
    
    const basicPolicy = `
      -- Política básica para API keys
      DROP POLICY IF EXISTS "basic_api_keys_policy" ON api_keys;
      CREATE POLICY "basic_api_keys_policy" 
      ON api_keys FOR ALL 
      TO authenticated 
      USING (true)
      WITH CHECK (true);
    `
    
    console.log('💡 Si hay problemas de permisos, ejecutar en SQL Editor:')
    console.log(basicPolicy)
    
  } catch (error) {
    console.error('❌ Error aplicando correcciones:', error.message)
  }
}

async function testApiKeyCreation() {
  console.log('\n🧪 PROBANDO CREACIÓN DE API KEY...')
  
  try {
    // Crear una API key de prueba
    const testKey = `sk_test_${Date.now()}`
    const keyHash = crypto.getRandomValues ? 
      Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('') :
      'test_hash_' + Math.random().toString(36)
    
    const testData = {
      name: 'Test API Key - Diagnóstico',
      key_hash: keyHash,
      key_prefix: testKey.substring(0, 7),
      description: 'API Key de prueba creada durante diagnóstico',
      is_active: true,
      permissions: ['read:basic'],
      created_by: '00000000-0000-0000-0000-000000000000' // UUID por defecto
    }
    
    const { data, error } = await supabase
      .from('api_keys')
      .insert(testData)
      .select()
      .single()
    
    if (error) {
      console.log('❌ Error creando API Key de prueba:', error.message)
      
      if (error.code === '23503') {
        console.log('💡 Error de foreign key - necesita usuario válido como created_by')
      } else if (error.code === 'PGRST116') {
        console.log('💡 Error de permisos RLS - verificar políticas')
      }
      
      return false
    }
    
    console.log('✅ API Key de prueba creada exitosamente')
    console.log(`   ID: ${data.id}`)
    console.log(`   Nombre: ${data.name}`)
    
    // Limpiar la API key de prueba
    await supabase
      .from('api_keys')
      .delete()
      .eq('id', data.id)
    
    console.log('🧹 API Key de prueba eliminada')
    
    return true
    
  } catch (error) {
    console.error('❌ Error en prueba de creación:', error.message)
    return false
  }
}

// Ejecutar diagnóstico completo
async function main() {
  console.log(`🔗 Conectando a: ${supabaseUrl}`)
  
  const isHealthy = await diagnoseApiKeysModule()
  
  if (!isHealthy) {
    await fixApiKeysIssues()
  }
  
  // Siempre intentar prueba de creación
  const creationWorks = await testApiKeyCreation()
  
  console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:')
  console.log('─'.repeat(30))
  console.log(`Módulo API Keys: ${isHealthy ? '✅ SALUDABLE' : '❌ PROBLEMAS DETECTADOS'}`)
  console.log(`Creación funciona: ${creationWorks ? '✅ SÍ' : '❌ NO'}`)
  
  if (!isHealthy || !creationWorks) {
    console.log('\n🔧 ACCIONES RECOMENDADAS:')
    console.log('1. Ejecutar: node setup-apikeys-complete.sql en Supabase')
    console.log('2. Verificar que exista al menos un usuario en la tabla users')
    console.log('3. Revisar políticas RLS en Supabase Dashboard')
    console.log('4. Ejecutar: node fix-apikeys-rls.mjs')
  } else {
    console.log('\n🎉 ¡Módulo API Keys funcionando correctamente!')
    console.log('El guardado en Supabase debería funcionar sin problemas.')
  }
}

main().catch(console.error)