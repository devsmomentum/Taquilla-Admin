#!/usr/bin/env node

/**
 * 🧪 TEST DE CREACIÓN DE API KEY CON USUARIO AUTENTICADO
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { createHash } from 'crypto'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('\n🧪 TEST DE CREACIÓN DE API KEY\n')
console.log('━'.repeat(80))

// Función para crear hash
function createKeyHash(key) {
  return createHash('sha256').update(key).digest('hex')
}

// 1. Intentar autenticarse
console.log('\n1️⃣ Autenticando usuario...')

const testEmail = 'admin@loteria.com'
const testPassword = 'admin123'

try {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })

  if (signInError) {
    console.error('❌ Error autenticando:', signInError.message)
    console.log('\n💡 Intenta crear el usuario primero o verifica las credenciales')
    process.exit(1)
  }

  console.log('✅ Usuario autenticado:', signInData.user.email)
  console.log('   User ID:', signInData.user.id)

  // 2. Verificar permisos del usuario
  console.log('\n2️⃣ Verificando permisos del usuario...')
  
  try {
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_permissions', { user_id: signInData.user.id })

    if (permError) {
      console.log('⚠️ No se pudieron obtener permisos:', permError.message)
    } else {
      console.log('✅ Permisos del usuario:', permissions)
      
      const hasApiKeysPermission = permissions && permissions.includes('api-keys')
      if (!hasApiKeysPermission) {
        console.log('⚠️ El usuario NO tiene el permiso "api-keys"')
        console.log('   Esto puede impedir crear API Keys en Supabase')
      } else {
        console.log('✅ El usuario tiene el permiso "api-keys"')
      }
    }
  } catch (err) {
    console.log('⚠️ Error verificando permisos:', err.message)
  }

  // 3. Intentar crear una API Key de prueba
  console.log('\n3️⃣ Intentando crear API Key de prueba...')

  const testKey = `sk_test_${Date.now()}_${Math.random().toString(36).substring(2, 42)}`
  const keyHash = createKeyHash(testKey)
  const keyPrefix = testKey.substring(0, 7)

  const testApiKey = {
    id: crypto.randomUUID(),
    name: 'Test API Key ' + new Date().toISOString(),
    key_hash: keyHash,
    key_prefix: keyPrefix,
    description: 'API Key de prueba para diagnóstico',
    is_active: true,
    permissions: ['read_lotteries', 'read_draws'],
    created_by: signInData.user.id
  }

  console.log('   Datos a insertar:')
  console.log('   - Nombre:', testApiKey.name)
  console.log('   - Prefijo:', testApiKey.key_prefix)
  console.log('   - Permisos:', testApiKey.permissions)
  console.log('   - Creado por:', testApiKey.created_by)

  const { data: insertData, error: insertError } = await supabase
    .from('api_keys')
    .insert(testApiKey)
    .select()

  if (insertError) {
    console.error('\n❌ ERROR AL CREAR API KEY:', insertError.message)
    console.log('\n⚠️ Detalles del error:')
    console.log('   Código:', insertError.code)
    console.log('   Detalles:', insertError.details)
    console.log('   Hint:', insertError.hint)
    
    console.log('\n💡 Posibles soluciones:')
    console.log('   1. Verificar que las RLS policies permitan INSERT')
    console.log('   2. Asegurar que el usuario tenga el rol/permiso correcto')
    console.log('   3. Revisar que la tabla users tenga el id del usuario')
    console.log('   4. Ejecutar: SELECT * FROM users WHERE id = \'' + signInData.user.id + '\'')
  } else {
    console.log('\n✅ API KEY CREADA EXITOSAMENTE!')
    console.log('   ID:', insertData[0].id)
    console.log('   Nombre:', insertData[0].name)
    console.log('   Key completa:', testKey)
    console.log('   Hash:', keyHash.substring(0, 16) + '...')
    
    // 4. Verificar que se pueda leer
    console.log('\n4️⃣ Verificando lectura de la API Key creada...')
    
    const { data: readData, error: readError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('id', insertData[0].id)
      .single()

    if (readError) {
      console.error('❌ Error leyendo API Key:', readError.message)
    } else {
      console.log('✅ API Key leída correctamente')
      console.log('   Nombre:', readData.name)
      console.log('   Activa:', readData.is_active)
      console.log('   Permisos:', readData.permissions)
    }

    // 5. Limpiar - eliminar la key de prueba
    console.log('\n5️⃣ Limpiando API Key de prueba...')
    
    const { error: deleteError } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', insertData[0].id)

    if (deleteError) {
      console.error('❌ Error eliminando API Key de prueba:', deleteError.message)
      console.log('   Puedes eliminarla manualmente con ID:', insertData[0].id)
    } else {
      console.log('✅ API Key de prueba eliminada')
    }
  }

  // Cerrar sesión
  await supabase.auth.signOut()
  console.log('\n✅ Sesión cerrada')

} catch (err) {
  console.error('\n❌ Error en el test:', err.message)
  console.error(err)
}

console.log('\n━'.repeat(80))
console.log('')
