#!/usr/bin/env node

/**
 * 🔧 SIMULADOR DE LOGIN Y PRUEBA DE API KEYS
 * Simula el flujo completo de autenticación y creación de API Keys
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 SIMULADOR DE LOGIN Y API KEYS')
console.log('=' .repeat(50))

async function simulateLoginAndApiKeyCreation() {
  try {
    console.log('\n1️⃣ Obteniendo usuario existente para simular login...')
    
    // Obtener un usuario existente de la base de datos
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(1)

    if (usersError || !users || users.length === 0) {
      console.error('❌ No se encontraron usuarios:', usersError?.message)
      return false
    }

    const testUser = users[0]
    console.log(`✅ Usuario encontrado: ${testUser.name} (${testUser.id})`)

    console.log('\n2️⃣ Simulando creación de API Key con usuario válido...')
    
    // Simular los datos que enviaría el hook
    const apiKeyData = {
      name: 'API Key de Prueba - ' + new Date().toLocaleTimeString(),
      description: 'API Key creada para probar la persistencia correcta',
      isActive: true,
      permissions: ['create_bets', 'read_lotteries'],
      createdBy: testUser.id
    }

    // Generar API Key como lo hace el hook
    const generateSecureApiKey = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      let key = "sk_"
      
      const timestamp = Date.now().toString(36)
      key += timestamp.slice(-4) + "_"
      
      for (let i = 0; i < 40; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      
      return key
    }

    // Crear hash SHA-256
    const createKeyHash = async (apiKey) => {
      const encoder = new TextEncoder()
      const data = encoder.encode(apiKey)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    }

    const newKey = generateSecureApiKey()
    const keyHash = await createKeyHash(newKey)
    const keyPrefix = newKey.substring(0, 7)

    console.log(`🔑 API Key generada: ${newKey}`)
    console.log(`🔐 Hash: ${keyHash.substring(0, 16)}...`)
    console.log(`📝 Prefijo: ${keyPrefix}`)

    console.log('\n3️⃣ Insertando en Supabase...')
    
    const { data: insertResult, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        id: crypto.randomUUID(),
        name: apiKeyData.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        description: apiKeyData.description,
        is_active: apiKeyData.isActive,
        permissions: apiKeyData.permissions,
        created_by: testUser.id
      })
      .select()

    if (insertError) {
      console.error('❌ Error insertando API Key:', insertError.message)
      return false
    }

    console.log('✅ API Key insertada exitosamente en Supabase')
    console.log(`   ID: ${insertResult[0]?.id}`)

    console.log('\n4️⃣ Verificando que se puede consultar...')
    
    const { data: selectResult, error: selectError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('created_by', testUser.id)
      .order('created_at', { ascending: false })

    if (selectError) {
      console.error('❌ Error consultando API Keys:', selectError.message)
      return false
    }

    console.log(`✅ Se encontraron ${selectResult?.length || 0} API Keys para el usuario`)
    
    if (selectResult && selectResult.length > 0) {
      console.log('\n📋 API Keys del usuario:')
      selectResult.forEach((key, index) => {
        console.log(`${index + 1}. ${key.name}`)
        console.log(`   Activa: ${key.is_active ? '✅' : '❌'}`)
        console.log(`   Permisos: ${key.permissions}`)
        console.log(`   Creada: ${new Date(key.created_at).toLocaleString()}`)
        console.log()
      })
    }

    console.log('\n5️⃣ Simulando localStorage...')
    
    // Simular guardado en localStorage (como haría el navegador)
    const localStorageData = selectResult.map(item => ({
      id: item.id,
      name: item.name,
      key: `${item.key_prefix}••••••••••••••••••••••••••••••••••••••••••••••`,
      description: item.description,
      isActive: item.is_active,
      permissions: Array.isArray(item.permissions) ? item.permissions : [],
      createdAt: item.created_at,
      createdBy: item.created_by,
      lastUsed: item.last_used_at
    }))

    console.log('💾 Datos simulados para localStorage:')
    console.log(JSON.stringify(localStorageData, null, 2))

    console.log('\n✅ SIMULACIÓN COMPLETADA EXITOSAMENTE')
    console.log('\n📋 RESUMEN:')
    console.log('- ✅ Usuario válido encontrado')
    console.log('- ✅ API Key generada correctamente')
    console.log('- ✅ Guardado en Supabase exitoso')
    console.log('- ✅ Consulta desde Supabase funciona')
    console.log('- ✅ Datos listos para localStorage')

    return true

  } catch (error) {
    console.error('❌ Error durante simulación:', error.message)
    return false
  }
}

// Ejecutar simulación
simulateLoginAndApiKeyCreation()
  .then(success => {
    if (success) {
      console.log('\n🎉 ¡La funcionalidad está trabajando correctamente!')
      console.log('💡 SOLUCIÓN: Necesitas estar autenticado en la aplicación')
      console.log('   para que las API Keys aparezcan por las políticas RLS')
    } else {
      console.log('\n❌ Hubo problemas durante la simulación')
    }
  })
  .catch(console.error)