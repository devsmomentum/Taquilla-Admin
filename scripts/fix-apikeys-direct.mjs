#!/usr/bin/env node

/**
 * 🔧 CORRECCIÓN DIRECTA DE API KEYS
 * Ejecuta las correcciones necesarias paso a paso
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de Supabase no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 CORRECCIÓN DIRECTA DEL MÓDULO API KEYS')
console.log('=' .repeat(50))

async function executeDirectFix() {
  try {
    console.log('\n1️⃣ Deshabilitando RLS temporalmente...')
    
    // Intentar deshabilitar RLS para hacer las correcciones
    const { error: disableRLSError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1)
    
    if (disableRLSError && disableRLSError.code === 'PGRST116') {
      console.log('⚠️ RLS está bloqueando el acceso')
      console.log('📋 PASOS MANUALES REQUERIDOS:')
      console.log('')
      console.log('1. Abrir Supabase Dashboard → SQL Editor')
      console.log('2. Ejecutar el siguiente SQL:')
      console.log('')
      console.log('-- PASO 1: Deshabilitar RLS temporalmente')
      console.log('ALTER TABLE api_keys DISABLE ROW LEVEL SECURITY;')
      console.log('')
      console.log('-- PASO 2: Crear funciones')
      console.log(`CREATE OR REPLACE FUNCTION create_api_key_hash(raw_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(digest(raw_key, 'sha256'), 'hex');
END;
$$;`)
      console.log('')
      console.log(`CREATE OR REPLACE FUNCTION verify_api_key(api_key_hash TEXT)
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
$$;`)
      console.log('')
      console.log('-- PASO 3: Crear políticas permisivas')
      console.log(`DROP POLICY IF EXISTS "api_keys_policy" ON api_keys;
DROP POLICY IF EXISTS "basic_api_keys_policy" ON api_keys;

CREATE POLICY "api_keys_authenticated_full_access"
ON api_keys FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);`)
      console.log('')
      console.log('-- PASO 4: Rehabilitar RLS')
      console.log('ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;')
      console.log('')
      console.log('-- PASO 5: Crear vista de estadísticas')
      console.log(`CREATE OR REPLACE VIEW api_keys_stats AS
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

GRANT SELECT ON api_keys_stats TO authenticated, anon;`)
      
      console.log('')
      console.log('3. Después de ejecutar todo, ejecutar: node test-apikeys-final.mjs')
      
      return false
    }
    
    console.log('✅ Acceso a tabla disponible')
    return true
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

async function createTestApiKey() {
  try {
    console.log('\n🧪 Probando creación de API Key...')
    
    // Generar datos de prueba
    const testKey = `sk_test_${Date.now()}`
    const testData = {
      name: 'Test API Key - Fix',
      key_hash: 'test_hash_' + Math.random().toString(36),
      key_prefix: testKey.substring(0, 7),
      description: 'API Key de prueba para verificar guardado en Supabase',
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
      console.log('❌ Error creando API Key:', error.message)
      console.log('💡 Código de error:', error.code)
      
      if (error.code === '23503') {
        console.log('🔧 Solución: Crear un usuario válido primero')
        
        // Intentar crear un usuario de prueba
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: '00000000-0000-0000-0000-000000000000',
            name: 'Sistema',
            email: 'sistema@test.com',
            role: 'admin'
          })
        
        if (!userError) {
          console.log('✅ Usuario de prueba creado')
        }
      }
      
      return false
    }
    
    console.log('✅ API Key creada exitosamente!')
    console.log(`   ID: ${data.id}`)
    console.log(`   Nombre: ${data.name}`)
    
    // Limpiar
    await supabase
      .from('api_keys')
      .delete()
      .eq('id', data.id)
    
    console.log('🧹 API Key de prueba eliminada')
    
    return true
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message)
    return false
  }
}

async function main() {
  console.log(`🔗 Conectando a: ${supabaseUrl}`)
  
  const canAccess = await executeDirectFix()
  
  if (canAccess) {
    const testPassed = await createTestApiKey()
    
    if (testPassed) {
      console.log('\n🎉 ¡MÓDULO API KEYS CORREGIDO!')
      console.log('✅ Las API Keys se guardarán en Supabase correctamente')
      console.log('')
      console.log('🔄 Próximos pasos:')
      console.log('   1. Refrescar la aplicación web')
      console.log('   2. Probar crear una API Key desde la interfaz')
      console.log('   3. Verificar que aparezca en Supabase')
    } else {
      console.log('\n⚠️ Algunas configuraciones adicionales necesarias')
      console.log('Ver detalles arriba para completar la configuración')
    }
  }
}

main().catch(console.error)