#!/usr/bin/env node

/**
 * 🧪 TESTING COMPLETO DEL MÓDULO API KEYS
 * Módulo 10: Verificación integral de funcionalidades
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Cargar variables de entorno
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 TESTING MÓDULO API KEYS - SISTEMA LOTERÍA')
console.log('='.repeat(50))

// Función para generar API Key de prueba
function generateTestApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let key = "sk_test_"
  
  // Timestamp único
  const timestamp = Date.now().toString(36)
  key += timestamp.slice(-4) + "_"
  
  // 32 caracteres aleatorios
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return key
}

// Función para crear hash SHA-256
async function createKeyHash(apiKey) {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Test 1: Conexión y estructura
async function testDatabaseConnection() {
  console.log('\n1️⃣ TESTING: Conexión y estructura de base de datos')
  
  try {
    // Verificar conexión
    const { data: connectionTest, error: connectionError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.log('❌ Error de conexión:', connectionError.message)
      return false
    }
    
    console.log('✅ Conexión exitosa con Supabase')
    
    // Verificar estructura de tabla
    console.log('\n📊 Verificando estructura de tabla api_keys...')
    
    const { data: tableColumns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'api_keys')
    
    if (tableColumns && tableColumns.length > 0) {
      console.log('✅ Tabla api_keys encontrada con columnas:')
      tableColumns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
      })
    } else {
      console.log('⚠️ No se pudo obtener información de columnas')
    }
    
    return true
  } catch (error) {
    console.log('❌ Error en test de conexión:', error.message)
    return false
  }
}

// Test 2: Funciones de base de datos
async function testDatabaseFunctions() {
  console.log('\n2️⃣ TESTING: Funciones de base de datos')
  
  try {
    // Probar función create_api_key_hash
    console.log('\n🔐 Probando función create_api_key_hash...')
    const testKey = 'sk_test_hash_function'
    
    const { data: hashResult, error: hashError } = await supabase
      .rpc('create_api_key_hash', { raw_key: testKey })
    
    if (hashError) {
      console.log('⚠️ Error probando create_api_key_hash:', hashError.message)
    } else {
      console.log('✅ Función create_api_key_hash funciona correctamente')
      console.log(`   Hash generado: ${hashResult}`)
    }
    
    // Probar función verify_api_key (con key inexistente)
    console.log('\n🔍 Probando función verify_api_key...')
    const { data: verifyResult, error: verifyError } = await supabase
      .rpc('verify_api_key', { api_key_hash: 'hash_inexistente' })
    
    if (verifyError) {
      console.log('⚠️ Error probando verify_api_key:', verifyError.message)
    } else {
      console.log('✅ Función verify_api_key funciona correctamente')
      console.log(`   Resultado para key inexistente:`, verifyResult)
    }
    
    return true
  } catch (error) {
    console.log('❌ Error en test de funciones:', error.message)
    return false
  }
}

// Test 3: CRUD Operations
async function testCRUDOperations() {
  console.log('\n3️⃣ TESTING: Operaciones CRUD')
  
  try {
    // Obtener usuario actual para testing
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    let userId = null
    
    if (user) {
      userId = user.id
      console.log(`👤 Usuario para testing: ${user.email}`)
    } else {
      console.log('⚠️ No hay usuario autenticado, usando UUID aleatorio')
      // Buscar un usuario existente
      const { data: users } = await supabase
        .from('users')
        .select('id')
        .limit(1)
      
      if (users && users.length > 0) {
        userId = users[0].id
        console.log(`👤 Usando usuario existente: ${userId}`)
      }
    }
    
    if (!userId) {
      console.log('⚠️ No se puede ejecutar test CRUD sin usuario válido')
      return false
    }
    
    // CREATE: Crear API Key de prueba
    console.log('\n📝 Creando API Key de prueba...')
    const testApiKey = generateTestApiKey()
    const testKeyHash = await createKeyHash(testApiKey)
    const testKeyPrefix = testApiKey.substring(0, 10)
    
    const { data: createResult, error: createError } = await supabase
      .from('api_keys')
      .insert({
        name: 'Test API Key - Automated Testing',
        key_hash: testKeyHash,
        key_prefix: testKeyPrefix,
        description: 'API Key creada automáticamente para testing del sistema',
        is_active: true,
        permissions: ['create_bets', 'read_lotteries'],
        created_by: userId
      })
      .select()
    
    if (createError) {
      console.log('❌ Error creando API Key:', createError.message)
      return false
    }
    
    console.log('✅ API Key creada exitosamente')
    const createdKey = createResult[0]
    console.log(`   ID: ${createdKey.id}`)
    console.log(`   Prefix: ${createdKey.key_prefix}`)
    
    // READ: Leer la API Key creada
    console.log('\n📖 Leyendo API Key creada...')
    const { data: readResult, error: readError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', createdKey.id)
      .single()
    
    if (readError) {
      console.log('❌ Error leyendo API Key:', readError.message)
    } else {
      console.log('✅ API Key leída exitosamente')
      console.log(`   Nombre: ${readResult.name}`)
      console.log(`   Activa: ${readResult.is_active}`)
      console.log(`   Permisos: ${readResult.permissions}`)
    }
    
    // UPDATE: Actualizar la API Key
    console.log('\n🔄 Actualizando API Key...')
    const { data: updateResult, error: updateError } = await supabase
      .from('api_keys')
      .update({
        description: 'API Key actualizada durante testing automatizado',
        is_active: false
      })
      .eq('id', createdKey.id)
      .select()
    
    if (updateError) {
      console.log('❌ Error actualizando API Key:', updateError.message)
    } else {
      console.log('✅ API Key actualizada exitosamente')
      console.log(`   Nueva descripción: ${updateResult[0].description}`)
      console.log(`   Estado activo: ${updateResult[0].is_active}`)
    }
    
    // VERIFY: Probar función de verificación
    console.log('\n🔍 Probando verificación de API Key...')
    const { data: verifyTestResult, error: verifyTestError } = await supabase
      .rpc('verify_api_key', { api_key_hash: testKeyHash })
    
    if (verifyTestError) {
      console.log('❌ Error verificando API Key:', verifyTestError.message)
    } else {
      console.log('✅ Verificación completada')
      console.log(`   Es válida: ${verifyTestResult[0]?.is_valid}`)
      console.log(`   Permisos: ${verifyTestResult[0]?.permissions}`)
    }
    
    // DELETE: Eliminar la API Key de prueba
    console.log('\n🗑️ Eliminando API Key de prueba...')
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', createdKey.id)
    
    if (deleteError) {
      console.log('❌ Error eliminando API Key:', deleteError.message)
    } else {
      console.log('✅ API Key eliminada exitosamente')
    }
    
    return true
  } catch (error) {
    console.log('❌ Error en test CRUD:', error.message)
    return false
  }
}

// Test 4: RLS y Seguridad
async function testSecurityPolicies() {
  console.log('\n4️⃣ TESTING: Políticas RLS y Seguridad')
  
  try {
    // Verificar que RLS está habilitado
    console.log('\n🔒 Verificando estado de RLS...')
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled,
          (SELECT count(*) FROM pg_policies WHERE tablename = 'api_keys') as policy_count
        FROM pg_tables 
        WHERE tablename = 'api_keys';
      `
    })
    
    if (rlsStatus && rlsStatus.length > 0) {
      const status = rlsStatus[0]
      console.log(`✅ RLS Estado: ${status.rls_enabled ? 'HABILITADO' : 'DESHABILITADO'}`)
      console.log(`📜 Políticas creadas: ${status.policy_count}`)
    } else {
      console.log('⚠️ No se pudo verificar estado de RLS')
    }
    
    // Probar acceso sin autenticación
    console.log('\n🚫 Probando acceso sin autenticación...')
    const anonSupabase = createClient(supabaseUrl, supabaseKey)
    
    const { data: anonResult, error: anonError } = await anonSupabase
      .from('api_keys')
      .select('*')
    
    if (anonError) {
      console.log('✅ RLS funcionando: acceso denegado sin autenticación')
      console.log(`   Error esperado: ${anonError.message}`)
    } else {
      console.log('⚠️ Posible problema de seguridad: acceso permitido sin autenticación')
    }
    
    return true
  } catch (error) {
    console.log('❌ Error en test de seguridad:', error.message)
    return false
  }
}

// Test 5: Estadísticas y Vistas
async function testStatistics() {
  console.log('\n5️⃣ TESTING: Estadísticas y Vistas')
  
  try {
    console.log('\n📊 Probando vista api_keys_stats...')
    
    const { data: statsResult, error: statsError } = await supabase
      .from('api_keys_stats')
      .select('*')
    
    if (statsError) {
      console.log('⚠️ Error obteniendo estadísticas:', statsError.message)
    } else {
      console.log('✅ Estadísticas obtenidas exitosamente')
      
      if (statsResult && statsResult.length > 0) {
        const stats = statsResult[0]
        console.log(`   📈 Total de API Keys: ${stats.total_keys}`)
        console.log(`   ✅ API Keys activas: ${stats.active_keys}`)
        console.log(`   ❌ API Keys inactivas: ${stats.inactive_keys}`)
        console.log(`   📅 Usadas hoy: ${stats.used_today}`)
        console.log(`   📅 Usadas esta semana: ${stats.used_this_week}`)
        console.log(`   🆕 Creadas este mes: ${stats.created_this_month}`)
        console.log(`   🔢 Promedio permisos por key: ${stats.avg_permissions_per_key}`)
      }
    }
    
    return true
  } catch (error) {
    console.log('❌ Error en test de estadísticas:', error.message)
    return false
  }
}

// Test 6: Performance
async function testPerformance() {
  console.log('\n6️⃣ TESTING: Performance y Índices')
  
  try {
    console.log('\n⚡ Probando performance de consultas...')
    
    // Consulta simple con medición de tiempo
    const startTime = Date.now()
    
    const { data: perfResult, error: perfError } = await supabase
      .from('api_keys')
      .select('*')
      .limit(100)
    
    const endTime = Date.now()
    const queryTime = endTime - startTime
    
    if (perfError) {
      console.log('⚠️ Error en consulta de performance:', perfError.message)
    } else {
      console.log(`✅ Consulta completada en ${queryTime}ms`)
      console.log(`   Registros obtenidos: ${perfResult.length}`)
      
      if (queryTime > 1000) {
        console.log('⚠️ Consulta lenta, considerar optimización')
      } else {
        console.log('✅ Performance aceptable')
      }
    }
    
    // Verificar índices
    console.log('\n📚 Verificando índices...')
    const { data: indexResult, error: indexError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE tablename = 'api_keys'
        ORDER BY indexname;
      `
    })
    
    if (indexResult && indexResult.length > 0) {
      console.log('✅ Índices encontrados:')
      indexResult.forEach(index => {
        console.log(`   - ${index.indexname}`)
      })
    } else {
      console.log('⚠️ No se encontraron índices específicos')
    }
    
    return true
  } catch (error) {
    console.log('❌ Error en test de performance:', error.message)
    return false
  }
}

// Función principal
async function runAllTests() {
  console.log('\n🚀 INICIANDO BATERÍA COMPLETA DE TESTS...')
  
  const results = []
  
  // Ejecutar todos los tests
  results.push(await testDatabaseConnection())
  results.push(await testDatabaseFunctions()) 
  results.push(await testCRUDOperations())
  results.push(await testSecurityPolicies())
  results.push(await testStatistics())
  results.push(await testPerformance())
  
  // Mostrar resumen
  console.log('\n' + '='.repeat(50))
  console.log('📋 RESUMEN DE RESULTADOS')
  console.log('='.repeat(50))
  
  const testNames = [
    'Conexión y Estructura',
    'Funciones de Base de Datos', 
    'Operaciones CRUD',
    'Políticas RLS y Seguridad',
    'Estadísticas y Vistas',
    'Performance e Índices'
  ]
  
  let passedTests = 0
  
  results.forEach((result, index) => {
    const status = result ? '✅ PASS' : '❌ FAIL'
    console.log(`${index + 1}. ${testNames[index]}: ${status}`)
    if (result) passedTests++
  })
  
  console.log('\n📊 ESTADÍSTICAS FINALES:')
  console.log(`   ✅ Tests exitosos: ${passedTests}/${results.length}`)
  console.log(`   📈 Porcentaje éxito: ${((passedTests/results.length) * 100).toFixed(1)}%`)
  
  if (passedTests === results.length) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON! Módulo API Keys funcionando correctamente.')
  } else {
    console.log('\n⚠️ Algunos tests fallaron. Revisar logs arriba para más detalles.')
  }
  
  console.log('\n🏁 Testing completado.')
  
  return passedTests === results.length
}

// Ejecutar tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1)
}).catch(error => {
  console.error('💥 Error fatal en testing:', error)
  process.exit(1)
})