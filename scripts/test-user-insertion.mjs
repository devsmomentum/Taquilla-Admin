#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

console.log('🧪 Probando inserción de usuario después de arreglar políticas...')

const testUser = {
  id: crypto.randomUUID(),
  name: 'Usuario de Prueba',
  email: 'test@example.com',
  password_hash: 'test123hashed',
  is_active: true,
  created_by: null
}

try {
  const { data, error } = await supabase
    .from('users')
    .insert([testUser])
    .select()

  if (error) {
    console.error('❌ Error:', error.message)
  } else {
    console.log('✅ ¡Éxito! Usuario insertado:', data[0].email)
    
    // Limpiar usuario de prueba
    await supabase.from('users').delete().eq('id', testUser.id)
    console.log('🧹 Usuario de prueba eliminado')
    
    console.log('🎉 ¡Las políticas RLS están arregladas!')
    console.log('💡 Ahora puedes crear usuarios desde la aplicación')
  }
} catch (error) {
  console.error('❌ Error general:', error)
}