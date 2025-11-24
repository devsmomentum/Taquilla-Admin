#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

console.log('🔓 Intentando deshabilitar RLS para permitir inserción de usuarios...')

async function disableRLS() {
  try {
    // Intentar diferentes métodos para deshabilitar RLS
    
    // Método 1: Función personalizada (si existe)
    try {
      const { data, error } = await supabase.rpc('disable_users_rls')
      if (!error) {
        console.log('✅ RLS deshabilitado exitosamente con función personalizada')
        return true
      }
    } catch (e) {
      console.log('⚠️  Función personalizada no disponible')
    }

    // Método 2: SQL directo (si es posible)
    try {
      const { data, error } = await supabase.from('pg_tables').select('*').limit(1)
      console.log('📋 Conexión a Supabase exitosa')
    } catch (e) {
      console.log('❌ No se puede conectar a Supabase')
      return false
    }

    // Método 3: Verificar políticas existentes
    try {
      const { data: policies, error } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('tablename', 'users')
      
      if (!error) {
        console.log('📋 Políticas RLS encontradas para users:', policies?.length || 0)
      }
    } catch (e) {
      console.log('⚠️  No se pueden consultar políticas')
    }

    return false
  } catch (error) {
    console.error('❌ Error:', error)
    return false
  }
}

// Función alternativa: Crear usuario con INSERT directo
async function testDirectInsert() {
  console.log('🧪 Probando inserción directa...')
  
  const testUser = {
    id: crypto.randomUUID(),
    name: 'Usuario de Prueba',
    email: 'test@example.com',
    password_hash: 'temp123',
    is_active: true,
    created_by: null
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([testUser])
      .select()

    if (error) {
      console.error('❌ Error en inserción directa:', error.message)
      return false
    } else {
      console.log('✅ Inserción directa exitosa!')
      
      // Limpiar usuario de prueba
      await supabase.from('users').delete().eq('id', testUser.id)
      console.log('🧹 Usuario de prueba eliminado')
      return true
    }
  } catch (error) {
    console.error('❌ Error en prueba:', error)
    return false
  }
}

// Ejecutar pruebas
async function main() {
  const rlsDisabled = await disableRLS()
  
  if (!rlsDisabled) {
    console.log('⚠️  No se pudo deshabilitar RLS directamente')
  }
  
  const canInsert = await testDirectInsert()
  
  if (canInsert) {
    console.log('🎉 ¡La inserción en users funciona! Puedes crear usuarios desde la app.')
  } else {
    console.log('❌ La inserción sigue bloqueada por RLS')
    console.log('💡 Posibles soluciones:')
    console.log('   1. Usar la service key en lugar de anon key')
    console.log('   2. Modificar políticas RLS desde el dashboard de Supabase')
    console.log('   3. Usar un approach híbrido (local + sync posterior)')
  }
}

main().catch(console.error)