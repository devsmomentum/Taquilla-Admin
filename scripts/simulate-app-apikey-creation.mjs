#!/usr/bin/env node

/**
 * 🧪 SIMULAR CREACIÓN DE API KEY DESDE LA APP
 * Replica exactamente lo que hace el hook cuando creas una API Key
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { createHash } from 'crypto'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('\n🧪 SIMULACIÓN DE CREACIÓN DE API KEY DESDE LA APP\n')
console.log('━'.repeat(80))

// Simular el usuario actual (desde App.tsx - currentUserId)
const currentUserId = '3e188dd5-4cdc-483f-b705-d2034005e1f0' // Admin

console.log('\n📋 Datos de entrada (lo que envía App.tsx):')
console.log('   currentUserId:', currentUserId)

const apiKeyData = {
  name: 'Test desde App',
  description: 'API Key de prueba simulando la app',
  isActive: true,
  permissions: ['read_lotteries', 'read_draws'],
  createdBy: currentUserId
}

console.log('   apiKeyData:', JSON.stringify(apiKeyData, null, 2))

// Funciones del hook
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

async function createKeyHash(apiKey) {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function getKeyPrefix(key) {
  return key.substring(0, 7)
}

async function testConnection() {
  try {
    const { error } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1)
    
    return !error
  } catch (err) {
    return false
  }
}

// EJECUTAR LA LÓGICA DEL HOOK
console.log('\n1️⃣ Generando API Key...')
const newKey = generateSecureApiKey()
const keyHash = await createKeyHash(newKey)
const keyPrefix = getKeyPrefix(newKey)

console.log('✅ Key generada:', newKey)
console.log('   Hash:', keyHash.substring(0, 20) + '...')
console.log('   Prefijo:', keyPrefix)

const newApiKey = {
  id: crypto.randomUUID(),
  key: newKey,
  createdAt: new Date().toISOString(),
  ...apiKeyData
}

console.log('\n2️⃣ Verificando conexión a Supabase...')
const isConnected = await testConnection()
console.log(isConnected ? '✅ Conectado' : '❌ No conectado')

let supabaseSuccess = false

if (isConnected && apiKeyData.createdBy) {
  console.log('\n3️⃣ Intentando crear API Key en Supabase...')
  console.log('   Usuario creador:', apiKeyData.createdBy)
  
  const insertData = {
    id: newApiKey.id,
    name: apiKeyData.name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    description: apiKeyData.description,
    is_active: apiKeyData.isActive,
    permissions: apiKeyData.permissions,
    created_by: apiKeyData.createdBy
  }
  
  console.log('\n📋 Datos a insertar en Supabase:')
  console.log(JSON.stringify(insertData, null, 2))
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert(insertData)
    .select()

  if (error) {
    console.error('\n❌ Error guardando en Supabase:', error.message)
    console.log('   Código:', error.code)
    console.log('   Detalles:', error.details)
    console.log('   Hint:', error.hint)
    console.log('\n🔄 Continuando con localStorage...')
  } else {
    console.log('\n✅ API Key creada exitosamente en Supabase')
    console.log('   ID:', data[0].id)
    console.log('   Nombre:', data[0].name)
    console.log('   Prefijo:', data[0].key_prefix)
    supabaseSuccess = true
  }
} else {
  if (!isConnected) {
    console.log('\n📱 Supabase no disponible, guardando en localStorage...')
  } else {
    console.log('\n⚠️ No hay createdBy, guardando solo en localStorage')
  }
}

// Simular guardado en localStorage
console.log('\n4️⃣ Guardando en localStorage...')
console.log('   API Key local:', {
  id: newApiKey.id,
  name: newApiKey.name,
  key: newApiKey.key.substring(0, 15) + '...',
  isActive: newApiKey.isActive
})

console.log('\n━'.repeat(80))
console.log('\n📊 RESULTADO:')
console.log(`   Supabase: ${supabaseSuccess ? '✅ GUARDADO' : '❌ NO GUARDADO'}`)
console.log(`   localStorage: ✅ GUARDADO`)
console.log(`   Key generada: ${newKey}`)

if (supabaseSuccess) {
  console.log('\n✅ TODO FUNCIONÓ CORRECTAMENTE')
  console.log('   La API Key está en Supabase')
  
  // Verificar que se puede leer
  console.log('\n5️⃣ Verificando lectura desde Supabase...')
  const { data: readData, error: readError } = await supabase
    .from('api_keys')
    .select('*')
    .eq('id', newApiKey.id)
    .single()
  
  if (readError) {
    console.error('❌ Error leyendo:', readError.message)
  } else {
    console.log('✅ API Key leída correctamente desde Supabase')
    console.log('   Nombre:', readData.name)
    console.log('   Permisos:', readData.permissions)
  }
  
  // Limpiar
  console.log('\n6️⃣ Limpiando...')
  await supabase.from('api_keys').delete().eq('id', newApiKey.id)
  console.log('✅ API Key de prueba eliminada')
} else {
  console.log('\n❌ PROBLEMA DETECTADO')
  console.log('   La API Key NO se guardó en Supabase')
  console.log('   Solo está en localStorage')
}

console.log('\n━'.repeat(80))
console.log('')
