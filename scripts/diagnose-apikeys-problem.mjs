#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO DEL PROBLEMA DE API KEYS DESAPARECIDAS
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DIAGNÓSTICO: API Keys Desaparecidas')
console.log('=' .repeat(50))

async function diagnoseApiKeys() {
  try {
    console.log('\n1️⃣ Verificando API Keys en Supabase...')
    
    const { data: apiKeys, error: selectError } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false })

    if (selectError) {
      console.error('❌ Error consultando Supabase:', selectError.message)
      return
    }

    console.log(`📊 Total API Keys en Supabase: ${apiKeys?.length || 0}`)
    
    if (apiKeys && apiKeys.length > 0) {
      console.log('\n📋 API Keys encontradas:')
      apiKeys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.name}`)
        console.log(`   ID: ${key.id}`)
        console.log(`   Prefijo: ${key.key_prefix}`)
        console.log(`   Activa: ${key.is_active ? '✅' : '❌'}`)
        console.log(`   Creada: ${new Date(key.created_at).toLocaleString()}`)
        console.log(`   Permisos: ${key.permissions}`)
        console.log(`   ---`)
      })
    } else {
      console.log('❌ No se encontraron API Keys en Supabase')
    }

    console.log('\n2️⃣ Verificando acceso de usuario...')
    
    // Verificar usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('⚠️ No hay usuario autenticado')
      console.log('   Esto puede explicar por qué las API Keys no aparecen')
      
      // Intentar obtener usuarios existentes para usar uno
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .limit(5)

      if (usersError) {
        console.log('❌ Error obteniendo usuarios:', usersError.message)
      } else {
        console.log(`📥 Usuarios disponibles: ${users?.length || 0}`)
        if (users && users.length > 0) {
          console.log('   Usuarios encontrados:')
          users.forEach(user => {
            console.log(`   - ${user.name} (ID: ${user.id})`)
          })
        }
      }
    } else {
      console.log(`✅ Usuario autenticado: ${user.id}`)
    }

    console.log('\n3️⃣ Verificando RLS (Row Level Security)...')
    
    // Intentar crear una API Key de prueba
    const testApiKey = {
      name: 'Test Diagnostic Key',
      key_hash: 'test_hash_' + Date.now(),
      key_prefix: 'sk_test',
      description: 'API Key de prueba para diagnóstico',
      is_active: true,
      permissions: ['create_bets'],
      created_by: user?.id || '550e8400-e29b-41d4-a716-446655440000' // ID genérico si no hay usuario
    }

    console.log('🧪 Intentando crear API Key de prueba...')
    
    const { data: createResult, error: createError } = await supabase
      .from('api_keys')
      .insert(testApiKey)
      .select()

    if (createError) {
      console.error('❌ Error creando API Key de prueba:', createError.message)
      console.log('   Esto indica un problema con RLS o permisos')
      
      if (createError.message.includes('RLS')) {
        console.log('🔒 Problema detectado: Row Level Security está bloqueando el acceso')
      }
      
      if (createError.message.includes('foreign key')) {
        console.log('🔗 Problema detectado: Referencia de usuario inválida')
      }
    } else {
      console.log('✅ API Key de prueba creada exitosamente')
      console.log(`   ID: ${createResult[0]?.id}`)
      
      // Limpiar la API Key de prueba
      await supabase
        .from('api_keys')
        .delete()
        .eq('id', createResult[0]?.id)
      console.log('🗑️ API Key de prueba eliminada')
    }

  } catch (error) {
    console.error('❌ Error durante diagnóstico:', error.message)
  }
}

// Ejecutar diagnóstico
diagnoseApiKeys().catch(console.error)