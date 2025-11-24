#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO DE API KEYS EN SUPABASE
 * Verifica la configuración y estado de las API Keys
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('\n🔍 DIAGNÓSTICO DE API KEYS EN SUPABASE\n')
console.log('━'.repeat(80))

// 1. Verificar conexión
console.log('\n1️⃣ Verificando conexión a Supabase...')
try {
  const { data: testData, error: testError } = await supabase
    .from('api_keys')
    .select('count')
    .limit(1)

  if (testError) {
    console.error('❌ Error de conexión:', testError.message)
    console.log('\n⚠️ Posibles causas:')
    console.log('   - La tabla api_keys no existe')
    console.log('   - RLS está bloqueando el acceso')
    console.log('   - Usuario no autenticado')
  } else {
    console.log('✅ Conexión exitosa a Supabase')
  }
} catch (err) {
  console.error('❌ Error grave de conexión:', err.message)
  process.exit(1)
}

// 2. Verificar estado de la tabla
console.log('\n2️⃣ Verificando estructura de la tabla api_keys...')
try {
  const { data: tableData, error: tableError } = await supabase
    .from('api_keys')
    .select('*')
    .limit(0)

  if (tableError) {
    console.error('❌ Error accediendo a la tabla:', tableError.message)
    console.log('\n💡 Solución sugerida:')
    console.log('   Ejecuta el archivo setup-apikeys-complete.sql en Supabase SQL Editor')
  } else {
    console.log('✅ Tabla api_keys existe y es accesible')
  }
} catch (err) {
  console.error('❌ Error:', err.message)
}

// 3. Intentar leer API Keys (sin autenticación)
console.log('\n3️⃣ Intentando leer API Keys (sin autenticación)...')
try {
  const { data: apiKeys, error: readError } = await supabase
    .from('api_keys')
    .select('*')

  if (readError) {
    console.log('⚠️ No se pueden leer API Keys sin autenticación:', readError.message)
    console.log('   Esto es normal debido a RLS (Row Level Security)')
  } else {
    console.log(`✅ Se encontraron ${apiKeys?.length || 0} API Keys`)
    if (apiKeys && apiKeys.length > 0) {
      console.log('\nAPI Keys encontradas:')
      apiKeys.forEach((key, idx) => {
        console.log(`   ${idx + 1}. ${key.name} (${key.key_prefix}) - ${key.is_active ? '✅ Activa' : '❌ Inactiva'}`)
      })
    }
  }
} catch (err) {
  console.error('❌ Error:', err.message)
}

// 4. Verificar si hay usuario autenticado
console.log('\n4️⃣ Verificando usuario autenticado...')
try {
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    console.log('⚠️ No hay usuario autenticado')
    console.log('   El hook funciona pero guarda solo en localStorage')
    console.log('   Para guardar en Supabase, el usuario debe estar logueado')
  } else {
    console.log('✅ Usuario autenticado:', user.email || user.id)
    
    // Intentar leer con usuario autenticado
    console.log('\n5️⃣ Intentando leer API Keys con usuario autenticado...')
    const { data: authApiKeys, error: authReadError } = await supabase
      .from('api_keys')
      .select('*')

    if (authReadError) {
      console.error('❌ Error leyendo con usuario autenticado:', authReadError.message)
      console.log('\n⚠️ Posibles causas:')
      console.log('   - RLS policies no permiten acceso a este usuario')
      console.log('   - El usuario no tiene el permiso "api-keys"')
      console.log('   - Las policies necesitan ajustes')
    } else {
      console.log(`✅ Se encontraron ${authApiKeys?.length || 0} API Keys con usuario autenticado`)
      if (authApiKeys && authApiKeys.length > 0) {
        console.log('\nAPI Keys encontradas:')
        authApiKeys.forEach((key, idx) => {
          console.log(`   ${idx + 1}. ${key.name} (${key.key_prefix})`)
          console.log(`      - Activa: ${key.is_active ? 'Sí' : 'No'}`)
          console.log(`      - Permisos: ${JSON.stringify(key.permissions)}`)
          console.log(`      - Creada: ${new Date(key.created_at).toLocaleString()}`)
          console.log(`      - Creada por: ${key.created_by}`)
          if (key.last_used_at) {
            console.log(`      - Último uso: ${new Date(key.last_used_at).toLocaleString()}`)
          }
        })
      }
    }
  }
} catch (err) {
  console.error('❌ Error verificando usuario:', err.message)
}

// 6. Verificar vista de estadísticas
console.log('\n6️⃣ Verificando vista api_keys_stats...')
try {
  const { data: stats, error: statsError } = await supabase
    .from('api_keys_stats')
    .select('*')
    .single()

  if (statsError) {
    console.log('⚠️ Vista de estadísticas no disponible:', statsError.message)
    console.log('   Esto no es crítico, las estadísticas son opcionales')
  } else {
    console.log('✅ Vista de estadísticas disponible')
    if (stats) {
      console.log('   Estadísticas actuales:')
      console.log(`   - Total de keys: ${stats.total_keys || 0}`)
      console.log(`   - Keys activas: ${stats.active_keys || 0}`)
      console.log(`   - Keys inactivas: ${stats.inactive_keys || 0}`)
      console.log(`   - Usadas hoy: ${stats.used_today || 0}`)
      console.log(`   - Usadas esta semana: ${stats.used_this_week || 0}`)
    }
  }
} catch (err) {
  console.log('⚠️ Error accediendo a estadísticas:', err.message)
}

// 7. Verificar funciones disponibles
console.log('\n7️⃣ Verificando funciones RPC...')
try {
  // Probar verify_api_key con un hash ficticio
  const { data: verifyData, error: verifyError } = await supabase
    .rpc('verify_api_key', { api_key_hash: 'test_hash_ficticio' })

  if (verifyError) {
    console.log('⚠️ Función verify_api_key no disponible:', verifyError.message)
  } else {
    console.log('✅ Función verify_api_key disponible')
  }
} catch (err) {
  console.log('⚠️ Error verificando funciones:', err.message)
}

// Resumen final
console.log('\n━'.repeat(80))
console.log('\n📊 RESUMEN DEL DIAGNÓSTICO\n')
console.log('✅ = Funcionando correctamente')
console.log('⚠️ = Advertencia o configuración pendiente')
console.log('❌ = Error que requiere atención')
console.log('\n💡 RECOMENDACIONES:')
console.log('   1. Si la tabla no existe, ejecuta: setup-apikeys-complete.sql')
console.log('   2. Asegúrate de estar autenticado para guardar en Supabase')
console.log('   3. Verifica que el usuario tenga el permiso "api-keys"')
console.log('   4. Si RLS bloquea el acceso, revisa las policies en Supabase')
console.log('   5. El sistema funciona con localStorage como fallback')
console.log('\n━'.repeat(80))
console.log('')
