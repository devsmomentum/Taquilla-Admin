#!/usr/bin/env node

/**
 * 🧪 TEST DIRECTO DE INSERT EN api_keys
 * Intenta insertar una API Key directamente sin autenticación
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { createHash } from 'crypto'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('\n🧪 TEST DIRECTO DE INSERT EN API KEYS\n')
console.log('━'.repeat(80))

// Función para crear hash
function createKeyHash(key) {
  return createHash('sha256').update(key).digest('hex')
}

// 1. Obtener usuario existente de la tabla users
console.log('\n1️⃣ Obteniendo usuario de la tabla users...')

const { data: users, error: usersError } = await supabase
  .from('users')
  .select('*')
  .eq('is_active', true)
  .limit(1)

if (usersError || !users || users.length === 0) {
  console.error('❌ No se encontraron usuarios activos:', usersError?.message)
  process.exit(1)
}

const user = users[0]
console.log('✅ Usuario encontrado:', user.name, '(' + user.email + ')')
console.log('   ID:', user.id)

// 2. Generar API Key
console.log('\n2️⃣ Generando API Key...')

const testKey = `sk_test_${Date.now()}_${Math.random().toString(36).substring(2, 42)}`
const keyHash = createKeyHash(testKey)
const keyPrefix = testKey.substring(0, 10)

console.log('✅ Key generada:', testKey)
console.log('   Hash:', keyHash.substring(0, 20) + '...')
console.log('   Prefijo:', keyPrefix)

// 3. Intentar INSERT directo
console.log('\n3️⃣ Intentando INSERT en api_keys...')

const apiKeyData = {
  id: crypto.randomUUID(),
  name: 'Test API Key ' + new Date().toISOString(),
  key_hash: keyHash,
  key_prefix: keyPrefix,
  description: 'API Key de prueba - Insert directo',
  is_active: true,
  permissions: ['read_lotteries', 'read_draws'],
  created_by: user.id
}

console.log('\n📋 Datos a insertar:')
console.log(JSON.stringify(apiKeyData, null, 2))

const { data: insertData, error: insertError } = await supabase
  .from('api_keys')
  .insert(apiKeyData)
  .select()

if (insertError) {
  console.error('\n❌ ERROR AL INSERTAR:', insertError.message)
  console.log('\n📋 Detalles completos del error:')
  console.log(JSON.stringify(insertError, null, 2))
  
  console.log('\n💡 Posibles causas:')
  console.log('   1. RLS policies aún bloqueando (verifica que se ejecutó fix-apikeys-policies.sql)')
  console.log('   2. El usuario no cumple con el CHECK constraint')
  console.log('   3. Problema con el formato de permissions (debe ser array JSON)')
  
  // Verificar las policies actuales
  console.log('\n4️⃣ Verificando policies actuales...')
  const { data: policies, error: policiesError } = await supabase
    .rpc('exec', { sql: "SELECT * FROM pg_policies WHERE tablename = 'api_keys'" })
    .catch(() => ({ data: null, error: { message: 'No se pueden consultar policies directamente' } }))
  
  if (policiesError) {
    console.log('⚠️ No se pueden verificar policies automáticamente')
    console.log('   Verifica manualmente en Supabase Dashboard > Database > Policies')
  }
  
  process.exit(1)
}

console.log('\n✅ ¡API KEY INSERTADA EXITOSAMENTE!')
console.log('   ID:', insertData[0].id)
console.log('   Nombre:', insertData[0].name)
console.log('   Prefijo:', insertData[0].key_prefix)
console.log('   Creada por:', insertData[0].created_by)

// 4. Verificar que se puede leer
console.log('\n5️⃣ Verificando lectura...')

const { data: readData, error: readError } = await supabase
  .from('api_keys')
  .select('*')
  .eq('id', insertData[0].id)
  .single()

if (readError) {
  console.error('❌ Error leyendo:', readError.message)
} else {
  console.log('✅ API Key leída correctamente')
  console.log('   Nombre:', readData.name)
  console.log('   Permisos:', JSON.stringify(readData.permissions))
}

// 5. Limpiar
console.log('\n6️⃣ Limpiando API Key de prueba...')

const { error: deleteError } = await supabase
  .from('api_keys')
  .delete()
  .eq('id', insertData[0].id)

if (deleteError) {
  console.error('❌ Error eliminando:', deleteError.message)
  console.log('   ID para eliminar manualmente:', insertData[0].id)
} else {
  console.log('✅ API Key de prueba eliminada')
}

console.log('\n━'.repeat(80))
console.log('\n✅ TEST COMPLETADO - Las policies funcionan correctamente')
console.log('   El problema puede estar en el hook use-supabase-apikeys.ts')
console.log('\n━'.repeat(80))
console.log('')
