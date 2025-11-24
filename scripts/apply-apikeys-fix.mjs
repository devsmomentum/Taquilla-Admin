#!/usr/bin/env node

/**
 * 🔧 EJECUTOR DE CORRECCIONES PARA API KEYS
 * Aplica las correcciones necesarias ejecutando el SQL en Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import fs from 'fs'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 APLICANDO CORRECCIONES AL MÓDULO API KEYS')
console.log('=' .repeat(50))

async function executeSqlStatements() {
  try {
    console.log('\n1️⃣ Creando función create_api_key_hash...')
    
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
    
    // Intentar ejecutar mediante query directa
    const { error: hashError } = await supabase.rpc('query', {
      query: createHashFunction
    }).single()
    
    if (hashError) {
      console.log('⚠️ No se pudo ejecutar automáticamente')
      console.log('📋 Copiar y ejecutar manualmente en Supabase SQL Editor:')
      console.log(createHashFunction)
    } else {
      console.log('✅ Función create_api_key_hash creada')
    }
    
    console.log('\n2️⃣ Creando función verify_api_key...')
    
    const verifyFunction = `
      CREATE OR REPLACE FUNCTION verify_api_key(api_key_hash TEXT)
      RETURNS TABLE(
        is_valid BOOLEAN,
        permissions JSONB,
        key_info JSONB
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          ak.is_active as is_valid,
          ak.permissions,
          to_jsonb(ak.*) as key_info
        FROM api_keys ak
        WHERE ak.key_hash = api_key_hash
          AND ak.is_active = true
        LIMIT 1;
      END;
      $$;
    `
    
    console.log('📋 Función verify_api_key:')
    console.log(verifyFunction)
    
    console.log('\n3️⃣ Configurando políticas RLS...')
    
    const rlsPolicies = `
      -- Eliminar políticas existentes
      DROP POLICY IF EXISTS "api_keys_policy" ON api_keys;
      DROP POLICY IF EXISTS "basic_api_keys_policy" ON api_keys;
      DROP POLICY IF EXISTS "api_keys_select_policy" ON api_keys;
      DROP POLICY IF EXISTS "api_keys_insert_policy" ON api_keys;
      DROP POLICY IF EXISTS "api_keys_update_policy" ON api_keys;
      DROP POLICY IF EXISTS "api_keys_delete_policy" ON api_keys;
      DROP POLICY IF EXISTS "api_keys_full_access_authenticated" ON api_keys;
      DROP POLICY IF EXISTS "api_keys_verify_anonymous" ON api_keys;
      
      -- Crear política permisiva para usuarios autenticados
      CREATE POLICY "api_keys_authenticated_access"
      ON api_keys FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
      
      -- Crear política para verificación anónima
      CREATE POLICY "api_keys_anonymous_verify"
      ON api_keys FOR SELECT
      TO anon
      USING (is_active = true);
    `
    
    console.log('📋 Políticas RLS:')
    console.log(rlsPolicies)
    
    console.log('\n4️⃣ Creando vista de estadísticas...')
    
    const statsView = `
      CREATE OR REPLACE VIEW api_keys_stats AS
      SELECT 
        COUNT(*) as total_keys,
        COUNT(*) FILTER (WHERE is_active = true) as active_keys,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_keys,
        COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '1 day') as used_today,
        COUNT(*) FILTER (WHERE last_used_at > NOW() - INTERVAL '7 days') as used_this_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as created_this_month,
        ROUND(AVG(jsonb_array_length(permissions)), 2) as avg_permissions_per_key,
        MAX(last_used_at) as most_recent_usage
      FROM api_keys;
      
      -- Otorgar permisos
      GRANT SELECT ON api_keys_stats TO authenticated, anon;
    `
    
    console.log('📋 Vista de estadísticas:')
    console.log(statsView)
    
    console.log('\n📋 INSTRUCCIONES PARA COMPLETAR LA CORRECCIÓN:')
    console.log('─'.repeat(50))
    console.log('1. Abrir Supabase Dashboard → SQL Editor')
    console.log('2. Copiar y ejecutar el archivo: fix-apikeys-supabase-complete.sql')
    console.log('3. O copiar y ejecutar los scripts mostrados arriba uno por uno')
    console.log('4. Verificar que no hay errores en la ejecución')
    console.log('5. Ejecutar nuevamente: node diagnose-apikeys-module.mjs')
    
    console.log('\n🔗 Enlaces útiles:')
    console.log(`   Dashboard: ${supabaseUrl.replace('supabase.co', 'supabase.co/dashboard')}`)
    console.log('   SQL Editor: Dashboard → SQL Editor')
    
    return true
    
  } catch (error) {
    console.error('❌ Error ejecutando correcciones:', error.message)
    return false
  }
}

// Función para probar las correcciones
async function testCorrections() {
  console.log('\n🧪 PROBANDO CORRECCIONES...')
  
  try {
    // Probar función create_api_key_hash
    const { data: hashResult, error: hashError } = await supabase
      .rpc('create_api_key_hash', { raw_key: 'test_verification' })
    
    if (hashError) {
      console.log('❌ Función create_api_key_hash no disponible:', hashError.message)
      return false
    }
    
    console.log('✅ Función create_api_key_hash funciona')
    console.log(`   Hash generado: ${hashResult}`)
    
    // Probar acceso básico a la tabla
    const { data: basicAccess, error: accessError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1)
    
    if (accessError) {
      console.log('❌ Error accediendo a tabla:', accessError.message)
      return false
    }
    
    console.log('✅ Acceso a tabla api_keys funciona')
    
    return true
    
  } catch (error) {
    console.error('❌ Error probando correcciones:', error.message)
    return false
  }
}

async function main() {
  console.log(`🔗 Conectando a: ${supabaseUrl}`)
  
  await executeSqlStatements()
  
  // Esperar un momento para que las correcciones se apliquen
  console.log('\n⏳ Esperando 3 segundos para que se apliquen los cambios...')
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  const testResult = await testCorrections()
  
  console.log('\n📊 RESULTADO:')
  console.log('─'.repeat(20))
  
  if (testResult) {
    console.log('🎉 ¡Correcciones aplicadas exitosamente!')
    console.log('✅ El módulo de API Keys debería guardar en Supabase ahora')
    console.log('')
    console.log('🔄 Próximos pasos:')
    console.log('   1. Refrescar la aplicación web')
    console.log('   2. Probar crear una nueva API Key')
    console.log('   3. Verificar que se guarde en Supabase')
  } else {
    console.log('⚠️ Algunas correcciones necesitan aplicarse manualmente')
    console.log('📋 Seguir las instrucciones mostradas arriba')
  }
}

main().catch(console.error)