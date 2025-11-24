#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

console.log('🔧 Intentando arreglar políticas RLS para users...')

async function fixUsersPolicies() {
  try {
    // Método 1: Crear función de utilidad si no existe
    console.log('📝 Creando función para gestionar políticas...')
    
    const createFunction = `
      CREATE OR REPLACE FUNCTION enable_users_access()
      RETURNS void AS $$
      BEGIN
        -- Eliminar políticas existentes
        DROP POLICY IF EXISTS "Enable read access for all users" ON users;
        DROP POLICY IF EXISTS "Enable insert access for all users" ON users;
        DROP POLICY IF EXISTS "Enable update access for all users" ON users;
        DROP POLICY IF EXISTS "Enable delete access for all users" ON users;
        
        -- Crear políticas permisivas
        CREATE POLICY "Enable read access for all users" ON users FOR SELECT USING (true);
        CREATE POLICY "Enable insert access for all users" ON users FOR INSERT WITH CHECK (true);
        CREATE POLICY "Enable update access for all users" ON users FOR UPDATE USING (true);
        CREATE POLICY "Enable delete access for all users" ON users FOR DELETE USING (true);
        
        -- Asegurar que RLS esté habilitado
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `

    const { error: functionError } = await supabase.rpc('exec_sql', { sql: createFunction })
    
    if (functionError) {
      console.log('⚠️ No se pudo crear la función:', functionError.message)
    } else {
      console.log('✅ Función creada exitosamente')
      
      // Ejecutar la función
      const { error: execError } = await supabase.rpc('enable_users_access')
      
      if (execError) {
        console.log('⚠️ Error ejecutando función:', execError.message)
      } else {
        console.log('✅ Políticas actualizadas exitosamente')
        return true
      }
    }

    return false
    
  } catch (error) {
    console.error('❌ Error:', error)
    return false
  }
}

async function testUserInsertion() {
  console.log('🧪 Probando inserción de usuario...')
  
  const testUser = {
    id: crypto.randomUUID(),
    name: 'Usuario de Prueba',
    email: 'test@example.com',
    password_hash: await hashPassword('test123'),
    is_active: true,
    created_by: null
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([testUser])
      .select()

    if (error) {
      console.error('❌ Error en inserción:', error.message)
      return false
    } else {
      console.log('✅ ¡Inserción exitosa!')
      
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

// Función simple de hash (para prueba)
async function hashPassword(password) {
  // En un entorno real usarías bcrypt, aquí simplificamos
  return `hashed_${password}_${Date.now()}`
}

async function main() {
  console.log('🚀 Iniciando arreglo de políticas RLS...')
  
  const policiesFixed = await fixUsersPolicies()
  
  if (policiesFixed) {
    console.log('✅ Políticas arregladas, probando inserción...')
    const canInsert = await testUserInsertion()
    
    if (canInsert) {
      console.log('🎉 ¡Éxito! Los usuarios ahora se pueden crear en Supabase')
      console.log('💡 Ahora puedes crear usuarios desde la aplicación')
    }
  } else {
    console.log('❌ No se pudieron arreglar las políticas automáticamente')
    console.log('📋 Opciones manuales:')
    console.log('   1. Ve al Dashboard de Supabase → SQL Editor')
    console.log('   2. Ejecuta el archivo: disable-users-rls.sql')
    console.log('   3. O ejecuta: create-permissive-policies.sql')
  }
}

main().catch(console.error)